<script setup lang="ts">
import * as Plot from '@observablehq/plot';
import { computed, onBeforeUnmount } from 'vue';
import { format } from 'd3-format';

import PlotFigure from '@/components/projection/PlotFigure.vue';
import { STAGE_NAMES, STAGE_COLORS } from '@/composeables/useStages';
import type { PortfolioProjectionRow } from '@/composeables/usePortfolioProjection';

const props = defineProps<{
  rows: PortfolioProjectionRow[];
}>();

const dollars = format('$,.0f');

const ageBin = computed(() => {
  const ages = [...new Set(props.rows.map((r) => r.age))];
  return ages.filter((a) => a % 10 === 0);
});

// Dim every bar except the ones at the hovered/tapped age (there's one bar
// per account stacked at each age) — same interaction as the per-account
// chart, see ProjectionChart.vue's onPlotRender for the full rationale.
let detachFocus: (() => void) | null = null;

function onPlotRender(el: HTMLElement | SVGElement) {
  detachFocus?.();

  const data = props.rows;
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
<PlotFigure
  @render="onPlotRender"
  :options="{
    width: 1000,
    height: 500,
    marginLeft: 70,
    y: { ticks: 5, tickFormat: '$,.1s', label: null },
    x: { ticks: ageBin, label: null },
    color: { domain: STAGE_NAMES, range: STAGE_NAMES.map((s) => STAGE_COLORS[s]) },
    style: { fontSize: '22px' },
    marks: [
      Plot.barY(rows, {
        x: 'age',
        y: 'balance',
        fill: 'stage',
        // One bar per account per age, stacked — total height is the
        // combined portfolio balance, colored by each account's own stage.
        tip: {
          fontSize: 15,
          format: {
            x: null,
            y: null,
            fill: null,
            Age: true,
            Account: true,
            Stage: true,
            Balance: (d) => dollars(d),
          },
        },
        channels: {
          Age: 'age',
          Account: 'accountName',
          Stage: 'stage',
          Balance: 'balance',
        },
      }),
    ],
  }"
/>
</template>

<style scoped>
:deep(g[aria-label='tip']) {
  --plot-background: var(--p-surface-800);
  color: var(--p-surface-0);
}

/* Smooth the focus/dim transition driven by onPlotRender. */
:deep(g[aria-label='bar'] rect) {
  transition: opacity 0.15s ease;
}
</style>
