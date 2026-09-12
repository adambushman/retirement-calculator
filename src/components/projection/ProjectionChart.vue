<script setup lang="ts">
import * as Plot from '@observablehq/plot';
import { computed, onBeforeUnmount } from 'vue';
import { format } from 'd3-format';

import ToggleSwitch from '@/volt/ToggleSwitch.vue';
import PlotFigure from '@/components/projection/PlotFigure.vue';

import { inject } from 'vue';
import { AccountStoreKey } from '@/stores/accountStoreKey';

const store = inject(AccountStoreKey)!;

const dollars = format('$,.0f');

const ageBin = computed(() => {
  const ages = store.projectionGraph.map(y => y.age);
  return ages.filter((a,i) => a % 10 === 0);
})

// Dim every bar except the one the pointer is on (hover on desktop, tap on
// mobile). Plot's `tip` interaction exposes the focused datum via the figure's
// `value` property and fires `input` on every change, including back to null.
let detachFocus: (() => void) | null = null;

function onPlotRender(el: HTMLElement | SVGElement) {
  detachFocus?.();

  const data = store.projectionGraph;
  const bars = Array.from(el.querySelectorAll<SVGRectElement>('g[aria-label="bar"] rect'));
  if (!bars.length) {
    detachFocus = null;
    return;
  }

  const dim = (activeAge: number | null) => {
    bars.forEach((bar, i) => {
      bar.style.opacity =
        activeAge === null || data[i]?.age === activeAge ? '' : '0.5';
    });
  };

  const onInput = () => dim((el as any).value?.age ?? null);
  // A touch tap outside the figure never reaches Plot's pointer handler, so it
  // never resets on its own — clear the focus on any pointerdown outside the plot.
  const onOutside = (e: Event) => {
    if (!el.contains(e.target as Node)) dim(null);
  };

  el.addEventListener('input', onInput);
  document.addEventListener('pointerdown', onOutside, true);

  detachFocus = () => {
    el.removeEventListener('input', onInput);
    document.removeEventListener('pointerdown', onOutside, true);
  };
}

onBeforeUnmount(() => detachFocus?.());
</script>

<template>
<div class="flex justify-end space-x-2 mb-2">
  <span class="self-center text-gray-400">Adjust for Inflation</span>
  <ToggleSwitch v-model="store.inflationAdjChoice" />
</div>
<PlotFigure
  @render="onPlotRender"
  :options="{
    width: 1000,
    height: 500,
    marginLeft: 70,
    y: { ticks: 5, tickFormat: '$,.1s', label: null },
    x: { ticks: ageBin, label: null },
    style: { fontSize: '22px' },
    marks: [
      Plot.barY(store.projectionGraph, {
        x: 'age',
        y: 'balance',
        fill: 'stage',
        // Hover (desktop) / tap (mobile) tooltip. Plot's pointer interaction
        // handles both; tapping empty space dismisses it.
        tip: {
          fontSize: 15,
          format: {
            x: null,
            y: null,
            fill: null,
            Age: true,
            Balance: (d) => dollars(d),
          },
        },
        channels: {
          Age: 'age',
          Balance: 'balance',
        },
      }),
    ],
  }"
/>
</template>

<style scoped>
/*
 * Observable Plot renders the tooltip as an SVG <g aria-label="tip">: the bubble
 * <path> fills with var(--plot-background) (white by default) and the text uses
 * currentColor. Point both at theme tokens so it matches the app's dark-tooltip
 * convention (see IconToolTip.vue) in light and dark mode.
 */
:deep(g[aria-label='tip']) {
  --plot-background: var(--p-surface-800);
  color: var(--p-surface-0);
}

/* Smooth the focus/dim transition driven by onPlotRender. */
:deep(g[aria-label='bar'] rect) {
  transition: opacity 0.15s ease;
}
</style>
