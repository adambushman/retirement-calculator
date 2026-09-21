<script setup lang="ts">
import { computed, ref } from 'vue';

import { MIN_SHARE } from '@/composeables/useWithdrawalShares';

// One track whose full width is 100%, split into a colored segment per
// account. There is a draggable handle only *between* two neighboring
// segments, so N segments means N - 1 handles: none for a single account
// (its segment fills the whole track), one at 50% for two, and so on. Handles
// are added and removed by toggling accounts on and off elsewhere, never by
// clicking the track. Segments always sum to 100 and each keeps at least
// MIN_SHARE, so a handle can be dragged right up to its neighbors but never
// past them.
//
// Handle styling deliberately mirrors Volt's Slider (volt/Slider.vue) so the
// two read as the same control.
export interface ShareSegment {
  id: string;
  label: string;
  color: string;
  /** Whole-number percent; every segment's value sums to 100. */
  value: number;
}

const props = defineProps<{
  segments: ShareSegment[];
}>();

const emit = defineEmits<{
  (e: 'change', values: number[]): void;
}>();

const track = ref<HTMLElement | null>(null);
const dragging = ref<number | null>(null);

// Where each handle sits: the running total up to (and excluding) the last segment.
const boundaries = computed(() => {
  const out: number[] = [];
  let running = 0;
  for (let i = 0; i < props.segments.length - 1; i++) {
    running += props.segments[i]!.value;
    out.push(running);
  }
  return out;
});

const segmentStarts = computed(() => {
  let running = 0;
  return props.segments.map((s) => {
    const start = running;
    running += s.value;
    return start;
  });
});

// A handle can travel between its neighbors, leaving each side its minimum.
function limits(index: number) {
  const before = index > 0 ? boundaries.value[index - 1]! : 0;
  const after = index < boundaries.value.length - 1 ? boundaries.value[index + 1]! : 100;
  return { lo: before + MIN_SHARE, hi: after - MIN_SHARE };
}

function moveHandle(index: number, rawPercent: number) {
  const { lo, hi } = limits(index);
  const next = Math.min(Math.max(Math.round(rawPercent), lo), hi);
  if (next === boundaries.value[index]) return;

  const cuts = [...boundaries.value];
  cuts[index] = next;

  const values: number[] = [];
  let previous = 0;
  for (const cut of cuts) {
    values.push(cut - previous);
    previous = cut;
  }
  values.push(100 - previous);
  emit('change', values);
}

function onPointerDown(event: PointerEvent, index: number) {
  dragging.value = index;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent, index: number) {
  if (dragging.value !== index || !track.value) return;
  const rect = track.value.getBoundingClientRect();
  moveHandle(index, ((event.clientX - rect.left) / rect.width) * 100);
}

function onPointerUp() {
  dragging.value = null;
}

function onKeydown(event: KeyboardEvent, index: number) {
  const step = event.shiftKey ? 10 : 1;
  const current = boundaries.value[index]!;
  const { lo, hi } = limits(index);

  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      moveHandle(index, current - step);
      break;
    case 'ArrowRight':
    case 'ArrowUp':
      moveHandle(index, current + step);
      break;
    case 'Home':
      moveHandle(index, lo);
      break;
    case 'End':
      moveHandle(index, hi);
      break;
    default:
      return;
  }
  event.preventDefault();
}

function valueText(index: number) {
  const left = props.segments[index]!;
  const right = props.segments[index + 1]!;
  return `${left.label} ${left.value}%, ${right.label} ${right.value}%`;
}
</script>

<template>
  <div
    ref="track"
    class="relative h-5 select-none"
    :class="!segments.length && 'pointer-events-none'"
    role="group"
    aria-label="Split of this stage's income between accounts"
    :aria-disabled="!segments.length"
  >
    <div
      class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full overflow-hidden bg-surface-200 dark:bg-surface-700"
      :class="!segments.length && 'opacity-50'"
    >
      <div
        v-for="(segment, i) in segments"
        :key="segment.id"
        class="absolute inset-y-0"
        :class="dragging === null && 'transition-[left,width,background-color] duration-200'"
        :style="{ left: `${segmentStarts[i]}%`, width: `${segment.value}%`, backgroundColor: segment.color }"
        :title="`${segment.label}: ${segment.value}%`"
      />
    </div>

    <div
      v-for="(boundary, i) in boundaries"
      :key="`${segments[i]!.id}|${segments[i + 1]!.id}`"
      role="slider"
      tabindex="0"
      aria-orientation="horizontal"
      :aria-label="`Boundary between ${segments[i]!.label} and ${segments[i + 1]!.label}`"
      :aria-valuemin="limits(i).lo"
      :aria-valuemax="limits(i).hi"
      :aria-valuenow="boundary"
      :aria-valuetext="valueText(i)"
      class="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center h-5 w-5 rounded-full
        cursor-grab active:cursor-grabbing touch-none
        bg-surface-200 dark:bg-surface-700
        before:w-4 before:h-4 before:block before:rounded-full before:bg-surface-0 dark:before:bg-surface-950
        before:shadow-[0px_0.5px_0px_0px_rgba(0,0,0,0.08),0px_1px_1px_0px_rgba(0,0,0,0.14)]
        focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-primary"
      :class="dragging === null && 'transition-[left] duration-200'"
      :style="{ left: `${boundary}%` }"
      @pointerdown="onPointerDown($event, i)"
      @pointermove="onPointerMove($event, i)"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @keydown="onKeydown($event, i)"
    />
  </div>
</template>
