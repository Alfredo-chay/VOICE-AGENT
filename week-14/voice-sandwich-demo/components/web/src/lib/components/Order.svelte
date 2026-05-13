<script lang="ts">
  import { order } from "../stores/order";
  import { derived } from "svelte/store";

  const items = derived(order, ($o) => $o.items);
  const confirmed = derived(order, ($o) => $o.confirmed);
  const summary = derived(order, ($o) => $o.summary);
</script>

<div class="bg-white rounded-2xl p-6 mb-5 border border-gray-200">
  <div class="flex items-center justify-between mb-4">
    <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Orden en tiempo real</span>
  </div>

  {#if $items.length === 0}
    <div class="text-gray-400 text-sm py-5 text-center">No hay artículos aún...</div>
  {:else}
    <ul class="space-y-2">
      {#each $items as it}
        <li class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div class="text-sm text-gray-900 capitalize">{it.name}</div>
          <div class="font-mono text-sm text-gray-700">x{it.quantity}</div>
        </li>
      {/each}
    </ul>
  {/if}

  {#if $confirmed}
    <div class="mt-4 p-3 bg-green-50 text-green-800 rounded-md">
      <div class="text-sm font-semibold">Pedido confirmado</div>
      <div class="text-sm mt-1">{$summary}</div>
    </div>
  {/if}
</div>
