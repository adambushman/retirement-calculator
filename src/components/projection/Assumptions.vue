<script setup lang="ts">

</script>

<template>
<div>
  <ul class="list-disc ms-4 space-y-2">
    <li><span class="highlight">Growth rates</span> are applied annually at the end of the year after all contributions and withdrawals have taken place.</li>
    <li><span class="highlight">Years</span> are treated as complete. When "Age Today" is input as 25, the assumption is you have 12 months of being 25 years old.</li>
    <li><span class="highlight">Withdrawal rates</span> reference the estimated annual income in the final year before retirement. These amounts are static for the stage.</li>
    <li>Retirement <span class="highlight">stages</span> use a default split of 40% in "Go-Go", 40% in "Slow-Go", and 20% in "No-Go". Adjust to your situation.</li>
    <li>The selected <span class="highlight">inflation</span> figure is applied to every stage. It is meant to represent the annual amount anticipated for the remainder of life.</li>
  </ul>
</div>
</template>

<style scoped>
.highlight {
  color: var(--p-primary-color);
}
</style>