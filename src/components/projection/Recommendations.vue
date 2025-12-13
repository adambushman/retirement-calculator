<script setup lang="ts">
import { useRetirementStore } from '@/stores/useRetirementStore';

const store = useRetirementStore();
</script>

<template>
<div>
  <p v-if="store.recommendations.length === 0">Your plan is looking good so far!</p>
  <ol class="list-decimal ms-4 text-sm space-y-2">
    <li v-for="rec in store.recommendations" :key="rec">
      {{ rec }}
    </li>
  </ol>
</div>
</template>

<style scoped>

</style>