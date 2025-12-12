<script setup lang="ts">
import { format } from 'd3-format';

import { useRetirementStore } from "@/stores/useRetirementStore";

const store = useRetirementStore();
</script>

<template>
  <div v-if="store.finalNoGoBalance > 0">
    <p class="text-lg">Based on these assumptions, you are projected to
      <span class="lg-highlight">have money left over! 🥳</span>
    </p>
  </div>
  <div v-else class="space-y-4">
    <p class="text-lg">Based on these assumptions, you are projected to
      <span class="lg-highlight">run out of money... 😢</span>
    </p>
  </div>
  <p class="mt-4">Given a fund totaling
    <span class="md-highlight">{{ format("$,.2s")(store.finalPreRetirementBalance) }}</span>
    at the start of retirement and average monthly widthdrawals of
    <span class="md-highlight">{{ format("$,.0f")(store.avgMonthlyWithdrawal * -1) }}</span>,
    your balance at life end is expected to be
    <span class="md-highlight">{{ format("$,.2s")(store.finalNoGoBalance) }}</span>.
  </p>
</template>

<style scoped>
.md-highlight, .lg-highlight {
  font-weight: bold;
  color: var(--p-primary-color);
}
.md-highlight {
  font-size: var(--text-lg);
}
.lg-highlight {
  font-size: var(--text-xl);
}
</style>