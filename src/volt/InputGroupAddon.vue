<template>
    <InputGroupAddon
        unstyled
        :pt="theme"
        :ptOptions="{
            mergeProps: ptViewMerge
        }"
    >
        <slot />
    </InputGroupAddon>
</template>

<script setup lang="ts">
import InputGroupAddon, { type InputGroupAddonPassThroughOptions } from 'primevue/inputgroupaddon';
import { ref } from 'vue';
import { ptViewMerge } from './utils';

const theme = ref<InputGroupAddonPassThroughOptions>({
    root: `flex items-center justify-center shrink-0 px-2 text-sm
        bg-surface-100 dark:bg-surface-800
        border border-surface-300 dark:border-surface-700
        text-surface-500 dark:text-surface-400
        first:rounded-s-md last:rounded-e-md`
});
</script>
