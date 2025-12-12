<script setup lang="ts">

</script>

<template>
<div class="question space-y-3 italic">
  <p class="text-lg font-bold">
    Q: <slot name="question" />
  </p>
  <p class="answer text-base border-l-2 ms-3 ps-3">
    <slot name="answer"/>
  </p>
</div>
</template>

<style scoped>
.answer {
  color: var(--p-text-muted-color);
  border-color: var(--p-text-muted-color);
}
</style>