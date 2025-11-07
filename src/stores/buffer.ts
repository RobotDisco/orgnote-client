import { defineStore } from 'pinia';
import { computed, reactive, ref, watch } from 'vue';
import { debounce } from 'src/utils/debounce';
import { isOrgGpgFile, type BufferStore, type Buffer as OrgBuffer } from 'orgnote-api';
import { api } from 'src/boot/api';
import { to } from 'src/utils/to-error';
import { reporter } from 'src/boot/report';
import type { ResultAsync } from 'neverthrow';
import { errAsync, okAsync } from 'neverthrow';

const SAVE_DELAY_MS = 1000;

class EncryptionConfigRequiredError extends Error {
  constructor() {
    super('Encryption configuration is required to handle encrypted files.');
  }
}

export const useBufferStore = defineStore<string, BufferStore>('buffers', (): BufferStore => {
  const buffers = ref<Map<string, OrgBuffer>>(new Map());

  const debouncedSavers = new Map<string, () => void>();
  const fm = api.core.useFileSystemManager();
  const encryption = api.core.useEncryption();
  const config = api.core.useConfig();

  const _saveBuffer = async (buffer: OrgBuffer): Promise<void> => {
    buffer.isSaving = true;
    await writeBufferFile(buffer);
    buffer.isSaving = false;
  };

  const writeBufferFile = async (buffer: OrgBuffer): Promise<void> => {
    if (!fm.currentFs) {
      reporter.reportError(new Error('No file system selected'));
      return;
    }

    const w = await encryptContent(buffer.path, buffer.content)
      .andThen((content) => to(fm.currentFs!.writeFile)(buffer.path, content))
      .map(() => {
        buffer.metadata.originalContent = buffer.content;
      });

    if (w.isErr()) {
      reporter.reportError(new Error(`Failed to save: ${buffer.path}`, { cause: w.error }));
    }
  };

  const encryptContent = (filePath: string, content: string): ResultAsync<string, Error> => {
    if (!isOrgGpgFile(filePath)) {
      return okAsync(content);
    }
    if (isEncryptionConfigValid()) {
      return to(encryption.encrypt)(content);
    }
    return errAsync(new EncryptionConfigRequiredError());
  };

  const _loadBufferContent = async (buffer: OrgBuffer): Promise<void> => {
    buffer.isLoading = true;
    await readBufferFile(buffer);
    buffer.isLoading = false;
  };

  const readBufferFile = async (buffer: OrgBuffer): Promise<void> => {
    if (!fm.currentFs) {
      reporter.reportError(new Error('No file system selected'));
      return;
    }

    const safeRead = to(fm.currentFs.readFile, 'Failed to load buffer content');

    const res = await safeRead(buffer.path)
      .andThen((content) => decryptContent(buffer.path, content))
      .map((content) => {
        buffer.content = content;
        buffer.metadata.originalContent = content;
      });

    if (res.isErr()) {
      const errMsg = `Failed to load: ${buffer.path}`;
      reporter.reportError(new Error(errMsg, { cause: res.error }));
      buffer.errors.push(errMsg, res.error.message);
    }
  };

  const decryptContent = (filePath: string, content: string): ResultAsync<string, Error> => {
    if (!content || !isOrgGpgFile(filePath)) {
      return okAsync(content);
    }

    if (isEncryptionConfigValid()) {
      return to(encryption.decrypt)(content);
    }
    return errAsync(new EncryptionConfigRequiredError());
  };

  const isEncryptionConfigValid = (): boolean => {
    return config.config.encryption.type !== 'disabled';
  };

  const allBuffers = computed(() => Array.from(buffers.value.values()));

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
      errors: [],
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

  const getBufferByPath = (path: string): OrgBuffer | undefined => {
    return buffers.value.get(path);
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
    allBuffers,
    getOrCreateBuffer,
    releaseBuffer,
    closeBuffer,
    getBufferByPath,
    saveAllBuffers,
    cleanup,
  };

  return store;
});
