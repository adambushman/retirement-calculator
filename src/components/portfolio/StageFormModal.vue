<script setup lang="ts">
import Dialog from '@/volt/Dialog.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';

import { useRetirementPlanStore } from '@/stores/useRetirementPlanStore';
import { STAGE_PRESETS, type StagePresetKey } from '@/composeables/useStages';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const retirementPlan = useRetirementPlanStore();

// Unlike every other modal in the app (AccountFormModal, PortfolioAssumptionsModal),
// there's no draft/commit step here — picking a tile adds the stage immediately
// and closes, matching the Retirement Plan section's own live-edit convention
// (see RetirementPlanInputs.vue/StageCard.vue: nothing here has a Done button).
function pick(key: StagePresetKey | 'custom') {
  retirementPlan.addStage(key);
  emit('close');
}
</script>

<template>
  <Dialog :visible="true" @update:visible="emit('close')" modal dismissable-mask header="Add a Stage" class="max-w-lg w-full">
    <p class="text-sm text-gray-400 mb-4">
      Start from one of today's common stages, or build one entirely from scratch — every detail
      is yours to edit afterward either way.
    </p>

    <div class="grid grid-cols-2 gap-3">
      <button
        v-for="preset in STAGE_PRESETS"
        :key="preset.key"
        type="button"
        class="text-left p-4 rounded-lg border border-surface-200 dark:border-surface-700
          hover:border-primary transition-colors"
        @click="pick(preset.key)"
      >
        <p class="font-medium text-sm">{{ preset.name }}</p>
        <p class="text-xs text-gray-500 mt-1">{{ preset.description }}</p>
      </button>

      <button
        type="button"
        class="col-span-2 text-left p-4 rounded-lg border border-dashed border-surface-200
          dark:border-surface-700 hover:border-primary transition-colors"
        @click="pick('custom')"
      >
        <p class="font-medium text-sm">Custom</p>
        <p class="text-xs text-gray-500 mt-1">Start blank and set every detail yourself.</p>
      </button>
    </div>

    <template #footer>
      <div class="flex justify-end w-full">
        <SecondaryButton @click="emit('close')">Cancel</SecondaryButton>
      </div>
    </template>
  </Dialog>
</template>
