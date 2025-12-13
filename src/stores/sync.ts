import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  SyncStore,
  SyncStoreStatus,
  SyncPlan,
  SyncStateData,
  FileSystem,
  SyncContext,
} from 'orgnote-api';
import {
  createPlan,
  fetchRemoteChanges,
  scanLocalFiles,
  findDeletedLocally,
  recoverState,
} from 'orgnote-api';
import { reporter } from 'src/boot/report';
import { sdk } from 'src/boot/axios';
import { createSyncState } from 'src/utils/sync-state';
import { to } from 'src/utils/to-error';
import { createExecutor, executePlanOperations, isPlanEmpty } from './sync-executor';
import { useFileSystemManagerStore } from './file-system-manager';

export const useSyncStore = defineStore<'sync', SyncStore>(
  'sync',
  (): SyncStore => {
    const status = ref<SyncStoreStatus>('idle');
    const lastSyncTime = ref<string | null>(null);
    const currentPlan = ref<SyncPlan | null>(null);
    const stateData = ref<SyncStateData | null>({ files: {} });

    const state = createSyncState(stateData);
    const fs = computed(() => useFileSystemManagerStore().currentFs as FileSystem);

    const buildSyncPlan = async (
      fs: FileSystem,
    ): Promise<{ plan: SyncPlan; serverTime: string }> => {
      const stateSnapshot = await state.get();
      const { files: remoteFiles, serverTime } = await fetchRemoteChanges(
        sdk.sync,
        stateSnapshot.lastSyncTime,
      );
      const localFiles = await scanLocalFiles(fs, '/');
      const deletedLocally = findDeletedLocally(localFiles, stateSnapshot);

      const plan = createPlan({
        localFiles,
        deletedLocally,
        remoteFiles,
        stateData: stateSnapshot,
        serverTime,
      });

      return { plan, serverTime };
    };

    const createSyncContext = (fs: FileSystem): SyncContext => ({
      executor: createExecutor(fs),
      state,
      fs,
    });

    const handleSyncError = (error: Error): null => {
      status.value = 'error';
      reporter.reportError(error);
      return null;
    };

    const createPlanAction = async (): Promise<SyncPlan | null> => {
      status.value = 'planning';

      const recoverResult = await to(recoverState)(state);
      if (recoverResult.isErr()) return handleSyncError(recoverResult.error);

      const planResult = await to(buildSyncPlan)(fs.value);
      if (planResult.isErr()) return handleSyncError(planResult.error);

      const { plan } = planResult.value;
      currentPlan.value = plan;
      status.value = 'idle';
      return plan;
    };

    const executePlan = async (plan: SyncPlan): Promise<void> => {
      status.value = 'syncing';

      const ctx = createSyncContext(fs.value);
      const result = await to(executePlanOperations)(plan, ctx);

      if (result.isErr()) {
        handleSyncError(result.error);
        return;
      }

      currentPlan.value = null;

      if (result.value.errors > 0) {
        status.value = 'error';
        return;
      }

      await state.setLastSyncTime(plan.serverTime);
      lastSyncTime.value = plan.serverTime;
      status.value = 'idle';
    };

    const sync = async (): Promise<void> => {
      const plan = await createPlanAction();

      if (!plan) {
        return;
      }

      if (isPlanEmpty(plan)) {
        await state.setLastSyncTime(plan.serverTime);
        lastSyncTime.value = plan.serverTime;
        return;
      }

      await executePlan(plan);
    };

    const reset = async (): Promise<void> => {
      await state.clear();
      currentPlan.value = null;
      lastSyncTime.value = null;
      status.value = 'idle';
    };

    return {
      status,
      lastSyncTime,
      currentPlan,
      stateData,
      createPlan: createPlanAction,
      executePlan,
      sync,
      reset,
    };
  },
  {
    persist: {
      pick: ['stateData', 'lastSyncTime'],
    },
  },
);
