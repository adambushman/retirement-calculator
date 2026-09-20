<script setup lang="ts">
import * as Plot from '@observablehq/plot';
import { computed, onBeforeUnmount } from 'vue';
import { format } from 'd3-format';

import PlotFigure from '@/components/projection/PlotFigure.vue';
import { useRetirementPlanStore } from '@/stores/useRetirementPlanStore';
import { ACCUMULATION_ID, ACCUMULATION_LABEL, ACCUMULATION_COLOR, stageForAge } from '@/composeables/useStages';
import type { PortfolioProjectionRow } from '@/composeables/usePortfolioProjection';

const props = defineProps<{
  rows: PortfolioProjectionRow[];
}>();

const retirementPlan = useRetirementPlanStore();

// The fill/legend domain is built from whichever stages actually exist
// rather than a fixed list — a stage's own color travels with it. Keyed by
// id (not name) since a user is free to give two stages the same name.
const stageDomain = computed(() => [ACCUMULATION_ID, ...retirementPlan.stages.map((s) => s.id)]);
const stageRange = computed(() => [ACCUMULATION_COLOR, ...retirementPlan.stages.map((s) => s.color)]);

// Color every account's bar by which era its AGE falls in, not by whether
// that particular account has personally unlocked yet — a row's own `stage`
// (used for stageAggregates/the breakdown cards) stays per-account-accurate,
// but the chart is meant to show "what part of the plan are we in," so every
// stacked segment at a given age reads as one color even if only some
// accounts are actually being drawn from that year.
function stageIdAtAge(age: number): string {
  return stageForAge(retirementPlan.stages, age)?.id ?? ACCUMULATION_ID;
}

function nameForStage(stageId: string): string {
  if (stageId === ACCUMULATION_ID) return ACCUMULATION_LABEL;
  return retirementPlan.stages.find((s) => s.id === stageId)?.name || 'Untitled Stage';
}

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
    color: { domain: stageDomain, range: stageRange },
    style: { fontSize: '22px' },
    marks: [
      Plot.barY(rows, {
        x: 'age',
        y: 'balance',
        // One bar per account per age, stacked — total height is the
        // combined portfolio balance, every segment at a given age colored
        // by that age's own stage (see stageIdAtAge above).
        fill: (d) => stageIdAtAge(d.age),
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
          Stage: (d) => nameForStage(stageIdAtAge(d.age)),
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
