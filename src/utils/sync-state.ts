import type { Ref } from 'vue';
import type { SyncState, SyncStateData, SyncedFile } from 'orgnote-api';

export const createSyncState = (stateData: Ref<SyncStateData | null>): SyncState => ({
  get: async () => stateData.value ?? { files: {} },

  getFile: async (path: string) => stateData.value?.files[path] ?? null,

  setFile: async (path: string, file: SyncedFile) => {
    stateData.value = {
      ...stateData.value,
      files: { ...stateData.value?.files, [path]: file },
    };
  },

  removeFile: async (path: string) => {
    if (!stateData.value) return;
    const { [path]: removed, ...rest } = stateData.value.files;
    void removed;
    stateData.value = { ...stateData.value, files: rest };
  },

  clear: async () => {
    stateData.value = { files: {} };
  },
});
