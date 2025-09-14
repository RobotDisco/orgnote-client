import { defineStore } from 'pinia';
import { computed, reactive, ref, watch } from 'vue';
import { debounce } from 'src/utils/debounce';
import type { BufferStore, Buffer as OrgBuffer } from 'orgnote-api';
import { api } from 'src/boot/api';
import { to } from 'src/utils/to-error';
import { reporter } from 'src/boot/report';

const SAVE_DELAY_MS = 1000;

export const useBufferStore = defineStore<string, BufferStore>('buffers', (): BufferStore => {
  const buffers = ref<Map<string, OrgBuffer>>(new Map());

  const debouncedSavers = new Map<string, () => void>();

  const _saveBuffer = async (buffer: OrgBuffer): Promise<void> => {
    const fs = api.core.useFileSystemManager().currentFs;
    if (!fs) return;
    buffer.isSaving = true;

    const w = await to(fs.writeFile)(buffer.path, buffer.content).map(() => {
      buffer.metadata.originalContent = buffer.content;
    });

    buffer.isSaving = false;

    if (w.isErr()) {
      reporter.reportError(new Error(`Failed to save: ${buffer.path}`, { cause: w.error }));
    }
  };

  const _loadBufferContent = async (buffer: OrgBuffer): Promise<void> => {
    buffer.isLoading = true;
    const fs = api.core.useFileSystemManager().currentFs;
    if (!fs) {
      buffer.isLoading = false;
      return;
    }

    const safeRead = to(fs.readFile, 'Failed to load buffer content');

    const res = await safeRead(buffer.path).map((content) => {
      buffer.content = content;
      buffer.metadata.originalContent = content;
    });

    if (res.isErr()) {
      reporter.reportError(new Error(`Failed to load: ${buffer.path}`, { cause: res.error }));
    }

    buffer.isLoading = false;
  };

  const allBuffers = computed(() => Array.from(buffers.value.values()));
  const recentBuffers = computed(() =>
    [...allBuffers.value]
      .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
      .slice(0, 10),
  );

  const currentBuffer = computed((): OrgBuffer | null => {
    const all = allBuffers.value;
    return all.length > 0 ? all[0] : null;
  });

  const getOrCreateBuffer = async (path: string): Promise<OrgBuffer> => {
    const existing = buffers.value.get(path);
    if (existing) {
      existing.referenceCount += 1;
      existing.lastAccessed = new Date();
      return existing;
    }

    const base: OrgBuffer = reactive({
      path,
      title: path.split('/').pop() || 'Untitled',
      content: '',
      isSaving: false,
      isLoading: true,
      lastAccessed: new Date(),
      referenceCount: 1,
      metadata: {},
    });

    buffers.value.set(path, base);

    await _loadBufferContent(base);

    const debouncedSave = debounce(() => _saveBuffer(base), SAVE_DELAY_MS);
    debouncedSavers.set(path, debouncedSave);
    watch(
      () => base.content,
      () => debouncedSavers.get(path)?.(),
    );

    return base;
  };

  const releaseBuffer = (path: string): void => {
    const buffer = buffers.value.get(path);
    if (!buffer) return;
    buffer.referenceCount = Math.max(0, buffer.referenceCount - 1);
  };

  const getBufferByPath = (path: string): OrgBuffer | null => {
    return buffers.value.get(path) || null;
  };

  const saveBuffer = async (path: string): Promise<void> => {
    const buffer = getBufferByPath(path);
    if (!buffer) return;
    await _saveBuffer(buffer);
  };

  const closeBuffer = async (path: string, force = false): Promise<boolean> => {
    const buffer = getBufferByPath(path);
    if (!buffer) return true;
    const isDirty = buffer.content !== (buffer.metadata.originalContent || '');
    if (isDirty && !force) return false;
    await saveBuffer(path);
    buffers.value.delete(path);
    debouncedSavers.delete(path);
    return true;
  };

  const saveAllBuffers = async (): Promise<void> => {
    await Promise.all(allBuffers.value.map((b) => _saveBuffer(b)));
  };

  const cleanup = (): void => {
    for (const b of buffers.value.values()) {
      if (b.referenceCount === 0) void closeBuffer(b.path, true);
    }
  };

  const store: BufferStore = {
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

  return store;
});
