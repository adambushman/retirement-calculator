<template>
    <InputGroup
        unstyled
        :pt="theme"
        :ptOptions="{
            mergeProps: ptViewMerge
        }"
    >
        <slot />
    </InputGroup>
</template>

<script setup lang="ts">
import InputGroup, { type InputGroupPassThroughOptions } from 'primevue/inputgroup';
import { ref } from 'vue';
import { ptViewMerge } from './utils';

const theme = ref<InputGroupPassThroughOptions>({
    root: `flex items-stretch w-full
        [&>*:not(:first-child)]:-ms-px
        [&>*:not(:first-child):not(:last-child)]:rounded-none
        [&>*:first-child:not(:last-child)]:rounded-e-none
        [&>*:last-child:not(:first-child)]:rounded-s-none
        [&>*:focus-within]:z-10`
});
</script>
