<script setup lang="ts">
import InputsDrawer from '@/components/InputsDrawer.vue';
import ProjectionPanel from '@/components/projection/ProjectionPanel.vue';
import FAQ from '@/components/faq/FAQ.vue';

</script>

<template>
<div class="mx-auto max-w-7xl px-3 py-8 space-y-6">
  <h1 class="text-4xl lg:text-5xl mb-4 font-bold">Get Retirement Right</h1>
  <h4 class="text-xl lg:tex-2xl mb-8">A retirement calculator designed to answer the real questions about retirement planning.</h4>

  <div class="space-y-6 lg:flex lg:space-x-6 lg:space-y-0">
    <InputsDrawer class="flex-1 lg:min-w-120"/>

    <ProjectionPanel class="flex-2" />
  </div>

  <FAQ />
</div>
</template>

<style scoped>

</style>
