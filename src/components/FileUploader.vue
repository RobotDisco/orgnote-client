<template>
  <div
    class="file-uploader"
    :class="{ 'drag-target': dragInProgress }"
    @drop.prevent="onDrop"
    @dragenter.prevent="onDragEnter"
    @dragleave.prevent="onDragLeave"
    @dragover.prevent="onDragOver"
  >
    <transition name="fade">
      <div v-if="dragInProgress" class="upload-overlay">
        <div class="uploader-info">
          <div class="icon-wrapper">
            <q-icon name="cloud_upload" size="4rem" />
          </div>
          <div class="text-h4 q-mt-md">{{ label || 'Drop files here' }}</div>
        </div>
      </div>
    </transition>
    <slot></slot>
  </div>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted } from 'vue';
import { useDragStatus } from 'src/composables/use-drag-status';
import type { FileSystemFileEntry } from 'src/utils/file-traversal';
import { extractFiles } from 'src/utils/file-traversal';

const props = withDefaults(
  defineProps<{
    accept?: string[];
    label?: string;
  }>(),
  {
    accept: () => [],
  }
);

const emit = defineEmits<{
  (e: 'uploaded', files: FileSystemFileEntry[]): void;
  (e: 'dropped'): void;
}>();

const { dragInProgress, onDragEnter, onDragLeave, onDragOver, reset } = useDragStatus();

const onDrop = async (e: DragEvent) => {
  emit('dropped');
  reset();
  e.preventDefault();

  if (!e.dataTransfer) return;

  const files = await extractFiles(e.dataTransfer.items, props.accept);
  if (files.length > 0) {
    emit('uploaded', files);
  }
};

const preventDefault = (e: DragEvent) => e.preventDefault();

onMounted(() => {
  window.addEventListener('dragover', preventDefault, false);
  window.addEventListener('drop', preventDefault, false);
});

onBeforeUnmount(() => {
  window.removeEventListener('dragover', preventDefault);
  window.removeEventListener('drop', preventDefault);
});
</script>

<style lang="scss" scoped>
.file-uploader {
  position: relative;
  height: 100%;
  width: 100%;
}

.upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  pointer-events: none;
}

.uploader-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  border: 4px dashed rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
}

.drag-target {
  // Optional: add styles to the container when dragging
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
