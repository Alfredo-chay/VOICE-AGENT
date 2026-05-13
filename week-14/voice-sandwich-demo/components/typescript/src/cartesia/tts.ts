import WebSocket from "ws";
import { writableIterator } from "../utils";
import fs from "node:fs";
import path from "node:path";
import type {
  CartesiaTTSRequest,
  CartesiaTTSResponse,
  CartesiaOutputFormat,
  CartesiaVoice,
} from "./api-types";
import type { VoiceAgentEvent } from "../types";

function defaultCartesiaLanguage(): string {
  const raw = (process.env.CARTESIA_LANGUAGE ?? "").trim().toLowerCase();
  if (raw) return raw;
  const aai = (process.env.ASSEMBLYAI_STREAMING_LANGUAGE ?? "").trim().toLowerCase();
  if (["es", "spanish", "multi", "multilingual"].includes(aai)) return "es";
  if (["en", "english"].includes(aai)) return "en";
  return "en";
}

interface CartesiaTTSOptions {
  apiKey?: string;
  voiceId?: string;
  modelId?: string;
  sampleRate?: number;
  encoding?: CartesiaOutputFormat["encoding"];
  language?: string;
  cartesiaVersion?: string;
}

export class CartesiaTTS {
  apiKey: string;
  voiceId: string;
  modelId: string;
  sampleRate: number;
  encoding: CartesiaOutputFormat["encoding"];
  language: string;
  cartesiaVersion: string;
  disabled: boolean = false;

  protected _bufferIterator = writableIterator<VoiceAgentEvent.TTSChunk>();
  protected _connectionPromise: Promise<WebSocket> | null = null;
  protected _contextCounter = 0;

  /**
   * Generate a valid context_id for Cartesia.
   * Context IDs must only contain alphanumeric characters, underscores, and hyphens.
   */
  protected _generateContextId(): string {
    const timestamp = Date.now();
    const counter = this._contextCounter++;
    return `ctx_${timestamp}_${counter}`;
  }

  protected get _connection(): Promise<WebSocket> {
    if (this._connectionPromise) {
      return this._connectionPromise;
    }

    this._connectionPromise = new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        cartesia_version: this.cartesiaVersion,
      });
      const url = `wss://api.cartesia.ai/tts/websocket?${params.toString()}`;
      const ws = new WebSocket(url);

      ws.on("open", () => {
        resolve(ws);
      });

      ws.on("message", (data: WebSocket.RawData) => {
        try {
          const message: CartesiaTTSResponse = JSON.parse(data.toString());

          if (message.data) {
            this._bufferIterator.push({
              type: "tts_chunk",
              audio: message.data,
              ts: Date.now(),
            });
          } else if (message.error) {
            throw new Error(`Cartesia error: ${message.error}`);
          }
        } catch (error) {
          // TODO: better catch json parsing error
          console.error(error);
        }
      });

      ws.on("error", (error) => {
        this._bufferIterator.cancel();
        reject(error);
      });

      ws.on("close", () => {
        this._connectionPromise = null;
      });
    });

    return this._connectionPromise;
  }

  constructor(options: CartesiaTTSOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.CARTESIA_API_KEY ?? "";
    // Fallback: search upward for a .env file if env var is not set
    if (!this.apiKey) {
      try {
        const maxUp = 6;
        for (let i = 1; i <= maxUp && !this.apiKey; i++) {
          const parts = Array(i).fill('..');
          const candidate = path.join(__dirname, ...parts, '.env');
          if (fs.existsSync(candidate)) {
            const content = fs.readFileSync(candidate, 'utf8');
            const match = content.match(/^CARTESIA_API_KEY=(.+)$/m);
            if (match) {
              this.apiKey = match[1].trim();
              break;
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }

    if (!this.apiKey) {
      // Do not throw: allow server to run in environments without Cartesia key.
      // Mark as disabled; sendText and receiveEvents become no-ops.
      console.warn("Cartesia API key not found — TTS disabled.");
      this.disabled = true;
    }
    this.voiceId =
      options.voiceId ?? process.env.CARTESIA_VOICE_ID ?? "162e0f37-8504-474c-bb33-c606c01890dc";
    this.modelId = options.modelId ?? "sonic-3";
    this.sampleRate = options.sampleRate ?? 24000;
    this.encoding = options.encoding ?? "pcm_s16le";
    this.language = options.language ?? defaultCartesiaLanguage();
    this.cartesiaVersion = options.cartesiaVersion ?? "2025-04-16";
  }

  async sendText(text: string): Promise<void> {
    if (this.disabled) return;
    if (!text || !text.trim()) return;

    const conn = await this._connection;
    if (conn.readyState === WebSocket.OPEN) {
      const voice: CartesiaVoice = {
        mode: "id",
        id: this.voiceId,
      };

      const outputFormat: CartesiaOutputFormat = {
        container: "raw",
        encoding: this.encoding,
        sample_rate: this.sampleRate,
      };

      const payload: CartesiaTTSRequest = {
        model_id: this.modelId,
        transcript: text,
        voice: voice,
        output_format: outputFormat,
        language: this.language,
        context_id: this._generateContextId(),
      };
      conn.send(JSON.stringify(payload));
    }
  }

  async *receiveEvents(): AsyncGenerator<VoiceAgentEvent.TTSChunk> {
    if (this.disabled) {
      // empty generator
      return;
    }
    yield* this._bufferIterator;
  }

  async close(): Promise<void> {
    if (this.disabled) return;
    if (this._connectionPromise) {
      const ws = await this._connectionPromise;
      ws.close();
    }
  }
}
