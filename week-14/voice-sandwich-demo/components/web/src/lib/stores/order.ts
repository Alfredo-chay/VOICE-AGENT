import { writable, derived } from "svelte/store";

type OrderItem = { name: string; quantity: number };

function createOrderStore() {
  const { subscribe, update, set } = writable<{ items: OrderItem[]; confirmed: boolean; summary: string }>({
    items: [],
    confirmed: false,
    summary: "",
  });

  return {
    subscribe,

    reset() {
      set({ items: [], confirmed: false, summary: "" });
    },

    // Parse tool result text like: "Added 2 x pavo to the order."
    addFromToolResult(text: string) {
      try {
        const re = /Added\s+(\d+)\s*x\s+(.+?)\s+to the order\.?/i;
        const m = text.match(re);
        if (m) {
          const qty = parseInt(m[1], 10);
          const name = m[2].trim().toLowerCase();
          update((s) => {
            const idx = s.items.findIndex((it) => it.name === name);
            if (idx >= 0) {
              const items = [...s.items];
              items[idx] = { ...items[idx], quantity: items[idx].quantity + qty };
              return { ...s, items };
            }
            return { ...s, items: [...s.items, { name, quantity: qty }] };
          });
        }
      } catch (e) {
        // ignore parse errors
      }
    },

    // Parse confirmation like: "Order confirmed: {summary}. Sending to kitchen."
    confirmFromToolResult(text: string) {
      try {
        const re = /Order confirmed:\s*(.+?)(?:\.|$)/i;
        const m = text.match(re);
        if (m) {
          const summary = m[1].trim();
          update((s) => ({ ...s, confirmed: true, summary }));
        }
      } catch (e) {
        // ignore
      }
    },
  };
}

export const order = createOrderStore();

export const orderItems = derived(order, ($o) => $o.items);
