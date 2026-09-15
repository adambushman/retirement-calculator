<template>
    <Dialog
        unstyled
        :pt="theme"
        :ptOptions="{
            mergeProps: ptViewMerge
        }"
    >
        <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps ?? {}" />
        </template>
    </Dialog>
</template>

<script setup lang="ts">
import Dialog, { type DialogPassThroughOptions, type DialogProps } from 'primevue/dialog';
import { ref } from 'vue';
import { ptViewMerge } from './utils';

interface Props extends /* @vue-ignore */ DialogProps {}
defineProps<Props>();

const theme = ref<DialogPassThroughOptions>({
    mask: `fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black/50 p-4`,
    root: `border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg
        bg-surface-0 dark:bg-surface-900 text-surface-700 dark:text-surface-0
        max-h-[90vh] flex flex-col
        p-maximized:w-screen p-maximized:h-screen p-maximized:max-h-full p-maximized:rounded-none`,
    header: `flex items-center justify-between shrink-0 p-5 gap-2 border-b border-surface-200 dark:border-surface-700`,
    title: `font-bold text-xl`,
    headerActions: `flex items-center gap-1`,
    pcCloseButton: {
        root: `inline-flex items-center justify-center overflow-hidden relative w-8 h-8 rounded-full
            text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-0
            hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors duration-200
            focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-primary`
    },
    content: `overflow-y-auto p-5 grow`,
    footer: `flex justify-end gap-2 shrink-0 p-5 pt-0`
});
</script>
