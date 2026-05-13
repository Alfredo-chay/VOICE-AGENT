<script lang="ts">
  import { onMount } from "svelte";

  type Pedido = {
    id: string;
    items: string[];
    time: string;
    estado: "nuevo" | "en preparación" | "listo";
  };

  let pedidos: Pedido[] = [];
  let ws: WebSocket;

  onMount(() => {
    ws = new WebSocket("ws://localhost:8001/ws/kitchen");

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "todos_pedidos") {
        pedidos = data.pedidos;
      }

      if (data.type === "pedido_nuevo") {
        pedidos = [...pedidos, data.pedido];
      }

      if (data.type === "pedido_actualizado") {
        pedidos = pedidos.map((p) =>
          p.id === data.pedido.id ? data.pedido : p
        );
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => ws?.close();
  });

  function cambiarEstado(pedido: Pedido, estado: Pedido["estado"]) {
    ws.send(
      JSON.stringify({
        type: "actualizar_estado",
        id: pedido.id,
        estado,
      })
    );
  }

  function getStateColor(estado: Pedido["estado"]) {
    switch (estado) {
      case "nuevo":
        return "new-order";
      case "en preparación":
        return "in-progress";
      case "listo":
        return "ready";
      default:
        return "";
    }
  }
</script>

<div class="kitchen-container">
  <h1>🍕 Kitchen Display System</h1>

  {#if pedidos.length === 0}
    <div class="empty-state">
      <p>No hay pedidos en cola</p>
    </div>
  {:else}
    <div class="orders-grid">
      {#each pedidos as pedido (pedido.id)}
        <div class="order-card {getStateColor(pedido.estado)}">
          <div class="order-header">
            <span class="order-id">{pedido.id.substring(0, 8)}</span>
            <span class="order-time">{pedido.time}</span>
          </div>

          <div class="order-items">
            <strong>Artículos:</strong>
            <ul>
              {#each pedido.items as item}
                <li>{item}</li>
              {/each}
            </ul>
          </div>

          <div class="order-status">
            <span class="status-label">Estado:</span>
            <span class="status-badge {pedido.estado}">{pedido.estado}</span>
          </div>

          <div class="order-actions">
            {#if pedido.estado !== "listo"}
              {#if pedido.estado === "nuevo"}
                <button
                  class="btn btn-prepare"
                  on:click={() => cambiarEstado(pedido, "en preparación")}
                >
                  En preparación
                </button>
              {/if}
              <button
                class="btn btn-ready"
                disabled={pedido.estado === "nuevo"}
                on:click={() => cambiarEstado(pedido, "listo")}
              >
                Listo
              </button>
            {:else}
              <div class="complete-badge">✓ Completado</div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .kitchen-container {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
    background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
    min-height: 100vh;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  }

  h1 {
    color: #fff;
    margin-bottom: 2rem;
    text-align: center;
    font-size: 2.5rem;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: #888;
    font-size: 1.2rem;
  }

  .orders-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .order-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    border-left: 5px solid #ccc;
    transition: all 0.3s ease;
  }

  .order-card.new-order {
    border-left-color: #ff6b6b;
    background: #fff5f5;
  }

  .order-card.in-progress {
    border-left-color: #ffd93d;
    background: #fffbf0;
  }

  .order-card.ready {
    border-left-color: #6bcf7f;
    background: #f0fff4;
  }

  .order-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #eee;
  }

  .order-id {
    font-weight: bold;
    font-size: 1.2rem;
    color: #333;
    font-family: monospace;
  }

  .order-time {
    color: #666;
    font-size: 0.9rem;
  }

  .order-items {
    margin-bottom: 1rem;
  }

  .order-items strong {
    display: block;
    margin-bottom: 0.5rem;
    color: #333;
  }

  .order-items ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .order-items li {
    padding: 0.5rem 0;
    color: #555;
    padding-left: 1.5rem;
    position: relative;
  }

  .order-items li:before {
    content: "→";
    position: absolute;
    left: 0;
    color: #999;
  }

  .order-status {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .status-label {
    font-weight: 600;
    color: #333;
  }

  .status-badge {
    padding: 0.4rem 0.8rem;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: capitalize;
  }

  .status-badge.nuevo {
    background: #ffe0e0;
    color: #c92a2a;
  }

  .status-badge.en\ preparación {
    background: #fff3cd;
    color: #997404;
  }

  .status-badge.listo {
    background: #d4edda;
    color: #155724;
  }

  .order-actions {
    display: flex;
    gap: 0.75rem;
  }

  .btn {
    padding: 0.7rem 1.2rem;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9rem;
  }

  .btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  .btn-prepare {
    background: #ffd93d;
    color: #333;
  }

  .btn-prepare:hover {
    background: #ffc700;
  }

  .btn-ready {
    background: #6bcf7f;
    color: white;
  }

  .btn-ready:hover:not(:disabled) {
    background: #5ab86e;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .complete-badge {
    padding: 0.7rem 1.2rem;
    background: #d4edda;
    color: #155724;
    border-radius: 6px;
    text-align: center;
    font-weight: 600;
  }
</style>
