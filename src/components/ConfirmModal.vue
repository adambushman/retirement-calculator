<script setup lang="ts">
import Dialog from '@/volt/Dialog.vue';
import Button from '@/volt/Button.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';

withDefaults(defineProps<{
  title: string;
  message: string;
  confirmLabel?: string;
}>(), {
  confirmLabel: 'Confirm',
});

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();
</script>

<template>
  <Dialog
    :visible="true"
    @update:visible="emit('cancel')"
    modal
    dismissable-mask
    :header="title"
    class="max-w-sm w-full"
  >
    <p class="text-sm text-gray-400">{{ message }}</p>

    <template #footer>
      <div class="flex justify-between w-full">
        <SecondaryButton @click="emit('cancel')">Cancel</SecondaryButton>
        <Button
          class="!bg-red-600 !border-red-600 enabled:hover:!bg-red-700 enabled:hover:!border-red-700"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </Button>
      </div>
    </template>
  </Dialog>
</template>
