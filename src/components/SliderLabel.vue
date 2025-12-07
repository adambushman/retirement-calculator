<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps([
  'yearsInGoGo', 'yearsInNoGo', 'yearsInSlowGo'
]);

const goGoSpacing = computed(() => {
  return 100 * props.yearsInGoGo / (
    props.yearsInGoGo + props.yearsInSlowGo + props.yearsInNoGo
  );
});
const slowGoSpacing = computed(() => {
  return 100 * props.yearsInSlowGo / (
    props.yearsInGoGo + props.yearsInSlowGo + props.yearsInNoGo
  );
});
const noGoSpacing = computed(() => {
  return 100 * props.yearsInNoGo / (
    props.yearsInGoGo + props.yearsInSlowGo + props.yearsInNoGo
  );
});

</script>

<template>
<div class="labels-container text-sm">
  <div class="label" :style="{ '--x': goGoSpacing / 2 + '%'}">{{ yearsInGoGo }}</div>
  <div class="label" :style="{ '--x': (goGoSpacing + (slowGoSpacing / 2)) + '%'}">{{ yearsInSlowGo }}</div>
  <div class="label" :style="{ '--x': (goGoSpacing + slowGoSpacing + (noGoSpacing / 2)) + '%'}">{{ yearsInNoGo }}</div>
</div>
</template>

<style scoped>
.labels-container {
  position: relative;
  width: 100%;
  height: 30px;
}

.label {
  position: absolute;
  transform: translateX(-50%);
  left: var(--x);
  white-space: nowrap;
}
</style>