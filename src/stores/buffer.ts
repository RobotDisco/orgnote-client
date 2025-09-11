import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { debounce } from 'src/utils/debounce';
import type { Buffer as OrgBuffer } from 'orgnote-api';
import { useFileSystemManagerStore } from './file-system-manager';

const SAVE_DELAY_MS = 1000;

export const useBufferStore = defineStore('buffers', () => {
  const buffers = ref(new Map<string, OrgBuffer>());

  const allBuffers = computed(() => Array.from(buffers.value.values()));
  const recentBuffers = computed(() => [...allBuffers.value].slice(0, 10));
  const currentBuffer = computed((): OrgBuffer | null => null);

  const fm = useFileSystemManagerStore();

  const getOrCreateBuffer = async (path: string): Promise<OrgBuffer> => {
    if (buffers.value.has(path)) {
      const buffer = buffers.value.get(path)! as unknown as OrgBuffer;
      buffer.referenceCount++;
      buffer.lastAccessed = new Date();
      return buffer;
    }

    const buffer: OrgBuffer = {
      path,
      title: path.split('/').pop() || 'Untitled',
      content: '',
      isSaving: false,
      isLoading: true,
      lastAccessed: new Date(),
      referenceCount: 1,
      metadata: {},
    };

    try {
      if (fm.currentFs) {
        const fileContent = await fm.currentFs.readFile(path, 'utf8');
        buffer.content = fileContent;
      }
    } catch (error) {
      console.error('Failed to load file:', error);
    } finally {
      buffer.isLoading = false;
    }

    const debouncedSave = debounce(async () => {
      if (buffer.isSaving) return;

      buffer.isSaving = true;
      try {
        const { api } = await import('src/boot/api');
        const fileSystem = api.core.useFileSystemManager().currentFs;
        if (fileSystem) {
          await fileSystem.writeFile(buffer.path, buffer.content);
        }
      } catch (error) {
        console.error('Failed to save file:', error);
      } finally {
        buffer.isSaving = false;
      }
    }, SAVE_DELAY_MS);

    watch(() => buffer.content, debouncedSave);

    buffers.value.set(path, buffer);
    return buffer;
  };

  const releaseBuffer = (path: string): void => {
    const buffer = buffers.value.get(path);
    if (buffer) {
      buffer.referenceCount = Math.max(0, buffer.referenceCount - 1);
    }
  };

  const closeBuffer = async (path: string, force = false): Promise<boolean> => {
    const buffer = buffers.value.get(path);
    if (!buffer) return true;

    if (!force) {
      return false;
    }

    buffers.value.delete(path);
    return true;
  };

  const getBufferByPath = (path: string): OrgBuffer | null => {
    return (buffers.value.get(path) as unknown as OrgBuffer) || null;
  };

  const saveAllBuffers = async (): Promise<void> => {};

  const cleanup = (): void => {};

  return {
    buffers,
    currentBuffer,
    allBuffers,
    recentBuffers,
    getOrCreateBuffer,
    releaseBuffer,
    closeBuffer,
    getBufferByPath,
    saveAllBuffers,
    cleanup,
  };
});
