import { boot } from 'quasar/wrappers';
import { useQueueStore } from 'src/stores/queue';
import { createQueueTaskProcessor, createSyncExecutor } from 'src/infrastructure/sync';
import type { SyncContextProvider } from 'src/infrastructure/sync';
import { createSyncState } from 'src/utils/sync-state';
import { useFileSystemManagerStore } from 'src/stores/file-system-manager';
import { useSyncStore } from 'src/stores/sync';
import { storeToRefs } from 'pinia';
import { SYNC_QUEUE_ID } from 'src/constants/sync-queue';
import type { FileSystem } from 'orgnote-api';

const createSyncContextProvider = (): SyncContextProvider => ({
  getContext: (serverTime: string) => {
    const fsManager = useFileSystemManagerStore();
    const fs = fsManager.currentFs as FileSystem;
    if (!fs) return null;

    const syncStore = useSyncStore();
    const { stateData } = storeToRefs(syncStore);
    const state = createSyncState(stateData);

    return {
      executor: createSyncExecutor(fs),
      state,
      fs,
      serverTime,
    };
  },
});

export default boot(() => {
  const queueStore = useQueueStore();
  const provider = createSyncContextProvider();

  queueStore.register(SYNC_QUEUE_ID, {
    concurrent: 1,
    maxRetries: 2,
    retryDelay: 1000,
    failTaskOnProcessException: true,
    process: createQueueTaskProcessor(provider),
  });
});
