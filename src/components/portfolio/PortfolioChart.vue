<script setup lang="ts">
import * as Plot from '@observablehq/plot';
import { computed } from 'vue';
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
</script>

<template>
<PlotFigure
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
</style>
