<script setup lang="ts">
import AccordionPanel from '@/volt/AccordionPanel.vue';
import AccordionHeader from '@/volt/AccordionHeader.vue';
import AccordionContent from '@/volt/AccordionContent.vue';

defineProps<{
  value: string;
}>();
</script>

<template>
<AccordionPanel :value="value">
  <AccordionHeader>
    <span class="italic">Q: <slot name="question" /></span>
  </AccordionHeader>
  <AccordionContent>
    <p class="answer text-base border-l-2 ms-3 ps-3 italic">
      <slot name="answer" />
    </p>
  </AccordionContent>
</AccordionPanel>
</template>

<style scoped>
.answer {
  color: var(--p-text-muted-color);
  border-color: var(--p-text-muted-color);
}
</style>
