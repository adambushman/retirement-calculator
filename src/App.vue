<script setup lang="ts">
import PortfolioView from '@/components/portfolio/PortfolioView.vue';
import FAQ from '@/components/faq/FAQ.vue';

</script>

<template>
<div class="mx-auto w-full lg:w-4/5 xl:w-2/3 2xl:w-3/5 px-3 py-8 space-y-12">
  <h1 class="text-4xl lg:text-5xl mb-4 font-bold">Get Retirement Right</h1>
  <h4 class="text-xl lg:tex-2xl mb-8">A retirement calculator designed to answer the real questions about retirement planning.</h4>

  <PortfolioView />

  <FAQ />
</div>
</template>

<style scoped>

</style>
