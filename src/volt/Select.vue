<template>
    <Select
        unstyled
        :pt="theme"
        :ptOptions="{
            mergeProps: ptViewMerge
        }"
    >
        <template #dropdownicon>
            <ChevronDownIcon />
        </template>
        <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps ?? {}" />
        </template>
    </Select>
</template>

<script setup lang="ts">
import ChevronDownIcon from '@primevue/icons/chevrondown';
import Select, { type SelectPassThroughOptions, type SelectProps } from 'primevue/select';
import { ref } from 'vue';
import { ptViewMerge } from './utils';

interface Props extends /* @vue-ignore */ SelectProps {}
defineProps<Props>();

const theme = ref<SelectPassThroughOptions>({
    root: `inline-flex cursor-pointer relative select-none rounded-md
        bg-surface-0 dark:bg-surface-950
        border border-surface-300 dark:border-surface-700
        enabled:hover:border-surface-400 dark:enabled:hover:border-surface-600
        p-focus:border-primary
        p-invalid:border-red-400 dark:p-invalid:border-red-300
        p-disabled:bg-surface-200 p-disabled:text-surface-500
        dark:p-disabled:bg-surface-700 dark:p-disabled:text-surface-400
        transition-colors duration-200 shadow-[0_1px_2px_0_rgba(18,18,23,0.05)]
        p-fluid:flex p-fluid:w-full`,
    label: `block flex-auto overflow-hidden overflow-ellipsis whitespace-nowrap cursor-pointer
        bg-transparent border-0 outline-none appearance-none
        text-surface-700 dark:text-surface-0
        placeholder:text-surface-500 dark:placeholder:text-surface-400
        px-3 py-2 p-fluid:w-[1%]
        p-small:text-sm p-small:px-[0.625rem] p-small:py-[0.375rem]
        p-large:text-lg p-large:px-[0.875rem] p-large:py-[0.625rem]`,
    dropdown: `flex items-center justify-center shrink-0 w-8 p-small:w-7
        bg-transparent text-surface-400 rounded-tr-md rounded-br-md`,
    dropdownIcon: ``,
    overlay: `absolute rounded-md
        bg-surface-0 dark:bg-surface-900
        border border-surface-200 dark:border-surface-700
        text-surface-700 dark:text-surface-0
        shadow-lg z-10`,
    list: `p-1 flex flex-col gap-0.5 outline-none`,
    option: `cursor-pointer whitespace-nowrap relative flex items-center px-3 py-2 rounded-sm
        text-surface-700 dark:text-surface-0
        p-focus:bg-surface-100 dark:p-focus:bg-surface-800
        p-selected:bg-primary-50 dark:p-selected:bg-primary/20
        p-selected:text-primary-700 dark:p-selected:text-primary-300
        p-disabled:opacity-50 p-disabled:pointer-events-none
        p-small:text-sm p-small:px-[0.625rem] p-small:py-[0.375rem]`,
    emptyMessage: `px-3 py-2 text-sm text-surface-500 dark:text-surface-400`
});
</script>
