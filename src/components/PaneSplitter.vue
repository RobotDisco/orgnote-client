<template>
  <div
    :class="['pane-splitter', orientation, { active: isResizing }]"
    @mousedown="startResize"
  />
</template>

<script lang="ts" setup>
import { ref, onUnmounted } from 'vue';

const MIN_PANE_SIZE_PERCENT = 25;

const props = defineProps<{
  orientation: 'horizontal' | 'vertical';
  sizes: number[];
  splitIndex: number;
}>();

const emit = defineEmits<{
  resize: [sizes: number[]];
}>();

const isResizing = ref(false);

const resizeState = {
  startPosition: 0,
  startSizes: [] as number[],
  containerSize: 0,
};

const getSplitterCount = (): number => props.sizes.length - 1;

const getContainerSize = (element: HTMLElement): number => {
  const parent = element.parentElement;
  if (!parent) return 0;

  const totalSize =
    props.orientation === 'horizontal' ? parent.offsetWidth : parent.offsetHeight;

  const splitterElement = element;
  const splitterSize =
    props.orientation === 'horizontal' ? splitterElement.offsetWidth : splitterElement.offsetHeight;

  return totalSize - splitterSize * getSplitterCount();
};

const clampSizes = (leftSize: number, rightSize: number): [number, number] => {
  const total = leftSize + rightSize;

  if (leftSize < MIN_PANE_SIZE_PERCENT) {
    return [MIN_PANE_SIZE_PERCENT, total - MIN_PANE_SIZE_PERCENT];
  }

  if (rightSize < MIN_PANE_SIZE_PERCENT) {
    return [total - MIN_PANE_SIZE_PERCENT, MIN_PANE_SIZE_PERCENT];
  }

  return [leftSize, rightSize];
};

const calculateNewSizes = (delta: number): number[] => {
  const deltaPercent = (delta / resizeState.containerSize) * 100;
  const newSizes = [...resizeState.startSizes];

  const leftIndex = props.splitIndex;
  const rightIndex = props.splitIndex + 1;

  let newLeftSize = resizeState.startSizes[leftIndex]! + deltaPercent;
  let newRightSize = resizeState.startSizes[rightIndex]! - deltaPercent;

  [newLeftSize, newRightSize] = clampSizes(newLeftSize, newRightSize);

  newSizes[leftIndex] = newLeftSize;
  newSizes[rightIndex] = newRightSize;

  return newSizes;
};

const onMouseMove = (e: MouseEvent): void => {
  if (!isResizing.value) return;

  const currentPosition = props.orientation === 'horizontal' ? e.clientX : e.clientY;
  const delta = currentPosition - resizeState.startPosition;

  const newSizes = calculateNewSizes(delta);
  emit('resize', newSizes);
};

const onMouseUp = (): void => {
  if (!isResizing.value) return;

  isResizing.value = false;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
};

const startResize = (e: MouseEvent): void => {
  e.preventDefault();
  e.stopPropagation();

  isResizing.value = true;
  resizeState.startPosition = props.orientation === 'horizontal' ? e.clientX : e.clientY;
  resizeState.startSizes = [...props.sizes];
  resizeState.containerSize = getContainerSize(e.target as HTMLElement);

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  const cursor = props.orientation === 'horizontal' ? 'col-resize' : 'row-resize';
  document.body.style.cursor = cursor;
  document.body.style.userSelect = 'none';
};

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});
</script>

<style scoped lang="scss">
.pane-splitter {
  flex-shrink: 0;
  background: var(--splitter-background);
  transition:
    background var(--splitter-transition-duration) ease,
    transform var(--splitter-transition-duration) ease;
  z-index: 1;

  &.horizontal {
    width: var(--splitter-size);
    height: 100%;
    cursor: col-resize;

    &:hover,
    &.active {
      background: var(--splitter-hover-background);
      transform: scaleX(var(--splitter-hover-scale));
    }
  }

  &.vertical {
    width: 100%;
    height: var(--splitter-size);
    cursor: row-resize;

    &:hover,
    &.active {
      background: var(--splitter-hover-background);
      transform: scaleY(var(--splitter-hover-scale));
    }
  }
}
</style>
