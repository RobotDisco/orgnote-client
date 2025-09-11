import { api } from 'src/boot/api';
import { computed, onMounted, onUnmounted, watch, type Ref } from 'vue';

export function useNoteEditor(notePath: Ref<string | undefined>) {
  const bufferStore = api.core.useBuffers();

  const currentBuffer = computed(() => {
    return notePath.value ? bufferStore.getBufferByPath(notePath.value) : null;
  });

  // При монтировании создаем/получаем buffer
  onMounted(async () => {
    if (notePath.value) {
      await bufferStore.getOrCreateBuffer(notePath.value);
    }
  });

  // При размонтировании освобождаем buffer
  onUnmounted(() => {
    if (notePath.value) {
      bufferStore.releaseBuffer(notePath.value);
    }
  });

  // Отслеживаем изменения пути и создаем новые буферы
  watch(notePath, async (newPath, oldPath) => {
    if (oldPath) {
      bufferStore.releaseBuffer(oldPath);
    }
    if (newPath) {
      await bufferStore.getOrCreateBuffer(newPath);
    }
  });

  const noteText = computed({
    get: (): string => {
      const buffer = currentBuffer.value;
      if (!buffer) return '';

      // Type assertion due to Buffer type collision
      const typedBuffer = buffer as unknown as {
        content: { value: string };
      };
      return typedBuffer.content.value;
    },
    set: (value: string) => {
      const buffer = currentBuffer.value;
      if (!buffer) return;

      // Type assertion due to Buffer type collision
      const typedBuffer = buffer as unknown as {
        content: { value: string };
      };
      typedBuffer.content.value = value;
    },
  });

  const hasChanges = computed((): boolean => {
    const buffer = currentBuffer.value;
    if (!buffer) return false;

    // Type assertion due to Buffer type collision
    const typedBuffer = buffer as unknown as {
      hasChanges: { value: boolean };
    };
    return typedBuffer.hasChanges.value;
  });

  const isSaving = computed((): boolean => {
    const buffer = currentBuffer.value;
    if (!buffer) return false;

    // Type assertion due to Buffer type collision
    const typedBuffer = buffer as unknown as {
      isSaving: { value: boolean };
    };
    return typedBuffer.isSaving.value;
  });

  const isLoading = computed((): boolean => {
    const buffer = currentBuffer.value;
    if (!buffer) return false;

    // Type assertion due to Buffer type collision
    const typedBuffer = buffer as unknown as {
      isLoading: { value: boolean };
    };
    return typedBuffer.isLoading.value;
  });

  // Вспомогательные методы
  const saveBuffer = async (): Promise<void> => {
    if (notePath.value && currentBuffer.value) {
      // BufferStore автоматически сохраняет файл через debounce
      // Этот метод принудительно сохраняет файл сейчас
      return bufferStore.saveAllBuffers();
    }
  };

  const closeBuffer = async (force = false): Promise<boolean> => {
    if (notePath.value) {
      return bufferStore.closeBuffer(notePath.value, force);
    }
    return true;
  };

  return {
    noteText,
    hasChanges,
    isSaving,
    isLoading,
    saveBuffer,
    closeBuffer,
    currentBuffer,
  };
}
