import { api } from 'src/boot/api';
import { debounce } from 'src/utils/debounce';
import { computed, onUnmounted, ref, watch, type Ref } from 'vue';

const SAVE_DELAY_MS = 1000;

export function useNoteEditor(notePath: Ref<string | undefined>) {
  const fileSystemManager = api.core.useFileSystemManager();
  const notifications = api.core.useNotifications();

  const noteText = ref<string>('');
  const originalText = ref<string>('');
  const isSaving = ref<boolean>(false);

  const hasChanges = computed(() => {
    return originalText.value !== noteText.value;
  });

  const validatePath = (path: string): boolean => {
    if (!path) return false;
    if (path.includes('..')) {
      notifications.notify({
        message: 'Invalid file path',
        level: 'danger',
      });
      return false;
    }
    return true;
  };

  const readNote = async () => {
    const currentPath = notePath.value;
    if (!currentPath) {
      noteText.value = '';
      originalText.value = '';
      return;
    }

    if (!validatePath(currentPath)) {
      return;
    }

    const fileSystem = fileSystemManager.currentFs;
    if (!fileSystem) {
      notifications.notify({
        message: 'No file system available',
        level: 'danger',
      });
      return;
    }

    try {
      const content = await fileSystem.readFile(currentPath, 'utf8');
      noteText.value = content;
      originalText.value = content;
    } catch {
      notifications.notify({
        message: 'Failed to read file',
        level: 'danger',
      });
      noteText.value = '';
      originalText.value = '';
    }
  };

  const saveNote = async () => {
    const currentPath = notePath.value;
    if (!currentPath || !hasChanges.value || isSaving.value) {
      return;
    }

    if (!validatePath(currentPath)) {
      return;
    }

    const fileSystem = fileSystemManager.currentFs;
    if (!fileSystem) {
      notifications.notify({
        message: 'No file system available',
        level: 'danger',
      });
      return;
    }

    try {
      isSaving.value = true;
      await fileSystem.writeFile(currentPath, noteText.value);
      originalText.value = noteText.value;
    } catch {
      notifications.notify({
        message: 'Failed to save file',
        level: 'danger',
      });
    } finally {
      isSaving.value = false;
    }
  };

  const debouncedSave = debounce(saveNote, SAVE_DELAY_MS);

  watch(notePath, readNote);
  watch(noteText, () => {
    if (hasChanges.value) {
      debouncedSave();
    }
  });

  onUnmounted(() => {
    debouncedSave.cancel();
  });

  return {
    noteText,
    hasChanges,
    isSaving,
    readNote,
    saveNote,
  };
}
