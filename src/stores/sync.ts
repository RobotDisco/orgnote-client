import { defineStore } from 'pinia';
import { computed, ref, type Ref } from 'vue';
import type {
  SyncStore,
  SyncStatus,
  SyncPlan,
  SyncMethod,
  SyncState,
  SyncStateData,
  SyncedFile,
  SyncExecutor,
  LocalFile,
  RemoteFile,
  FileSystem,
  ApplyPlanResult,
} from 'orgnote-api';
import { defaultSyncMethod, DEFAULT_SYNC_METHOD_ID } from 'orgnote-api';
import { useFileSystemManagerStore } from './file-system-manager';
import { reporter } from 'src/boot/report';
import { sdk } from 'src/boot/axios';
import { to } from 'src/utils/to-error';

const createSyncState = (stateData: Ref<SyncStateData | null>): SyncState => ({
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
    const { [path]: _, ...rest } = stateData.value.files;
    void _;
    stateData.value = { ...stateData.value, files: rest };
  },
  clear: async () => {
    stateData.value = { files: {} };
  },
});

const createSyncExecutor = (fs: FileSystem): SyncExecutor => ({
  upload: async (file: LocalFile) => {
    await fs.readFile(file.path);
    return { ...file, id: file.path, version: 1 };
  },
  download: async (file: RemoteFile) => ({
    path: file.path,
    mtime: Date.now(),
    size: 0,
    id: file.id,
    version: file.version,
  }),
  deleteLocal: async (path: string) => {
    await fs.deleteFile(path);
  },
  deleteRemote: async () => {},
});

const getStatusAfterPlan = (plan: SyncPlan): SyncStatus =>
  plan.conflicts.length > 0 ? 'pending-conflicts' : 'idle';

const hasConflicts = (plan: SyncPlan): boolean => plan.conflicts.length > 0;

const reportSyncErrors = (result: ApplyPlanResult): void => {
  result.errors.forEach((err) => reporter.reportWarning(`Sync error: ${err.message}`));
};

const getRequiredMethod = (method: SyncMethod | null): SyncMethod => {
  if (!method) {
    throw new Error('No sync method registered');
  }
  return method;
};

const getRequiredFs = (): FileSystem => {
  const fsManager = useFileSystemManagerStore();
  const fs = fsManager.currentFs;
  if (!fs) {
    throw new Error('No file system available');
  }
  return fs;
};

export const useSyncStore = defineStore<string, SyncStore>(
  'sync',
  () => {
    const status = ref<SyncStatus>('idle');
    const lastSyncTime = ref<string | null>(null);
    const currentPlan = ref<SyncPlan | null>(null);
    const registeredMethods = ref<SyncMethod[]>([]);
    const currentMethodId = ref<string>(DEFAULT_SYNC_METHOD_ID);
    const stateData = ref<SyncStateData | null>({ files: {} });

    const state = createSyncState(stateData);

    const currentMethod = computed<SyncMethod | null>(
      () => registeredMethods.value.find((m) => m.id === currentMethodId.value) ?? null,
    );

    const isMethodRegistered = (id: string): boolean =>
      registeredMethods.value.some((m) => m.id === id);

    const setFirstMethodAsCurrent = (): void => {
      if (registeredMethods.value.length !== 1) return;
      currentMethodId.value = registeredMethods.value[0]!.id;
    };

    const resetCurrentMethodIfNeeded = (removedId: string): void => {
      if (currentMethodId.value !== removedId) return;
      currentMethodId.value = registeredMethods.value[0]?.id || DEFAULT_SYNC_METHOD_ID;
    };

    const register = (method: SyncMethod): void => {
      if (isMethodRegistered(method.id)) return;
      registeredMethods.value = [...registeredMethods.value, method];
      setFirstMethodAsCurrent();
    };

    const unregister = (id: string): void => {
      if (id === DEFAULT_SYNC_METHOD_ID) return;
      registeredMethods.value = registeredMethods.value.filter((m) => m.id !== id);
      resetCurrentMethodIfNeeded(id);
    };

    const buildPlan = async (method: SyncMethod, fs: FileSystem): Promise<SyncPlan> =>
      method.createPlan({
        fs,
        api: sdk.sync,
        state,
        rootPath: '/',
      });

    const handlePlanSuccess = (plan: SyncPlan): SyncPlan => {
      currentPlan.value = plan;
      status.value = getStatusAfterPlan(plan);
      return plan;
    };

    const handlePlanError = (error: Error): never => {
      status.value = 'error';
      reporter.reportError(error);
      throw error;
    };

    const createPlan = async (): Promise<SyncPlan> => {
      const method = getRequiredMethod(currentMethod.value);
      const fs = getRequiredFs();

      status.value = 'planning';

      const safeBuildPlan = to(buildPlan, 'Failed to create sync plan');
      const result = await safeBuildPlan(method, fs);

      if (result.isErr()) {
        return handlePlanError(result.error);
      }

      return handlePlanSuccess(result.value);
    };

    const applyPlanChanges = async (
      method: SyncMethod,
      plan: SyncPlan,
      fs: FileSystem,
    ): Promise<ApplyPlanResult> => {
      const executor = createSyncExecutor(fs);
      return method.applyPlan(plan, executor);
    };

    const handleApplySuccess = (plan: SyncPlan): void => {
      lastSyncTime.value = plan.serverTime;
      currentPlan.value = null;
      status.value = 'idle';
    };

    const handleApplyErrors = (result: ApplyPlanResult): void => {
      status.value = 'error';
      reportSyncErrors(result);
    };

    const handleApplyError = (error: Error): never => {
      status.value = 'error';
      reporter.reportError(error);
      throw error;
    };

    const executePlan = async (plan: SyncPlan): Promise<void> => {
      const method = getRequiredMethod(currentMethod.value);
      const fs = getRequiredFs();

      status.value = 'syncing';

      const safeApply = to(applyPlanChanges, 'Failed to apply sync plan');
      const result = await safeApply(method, plan, fs);

      if (result.isErr()) {
        return handleApplyError(result.error);
      }

      if (result.value.errors.length > 0) {
        return handleApplyErrors(result.value);
      }

      handleApplySuccess(plan);
    };

    const sync = async (): Promise<void> => {
      const plan = await createPlan();
      if (hasConflicts(plan)) return;
      await executePlan(plan);
    };

    const reset = async (): Promise<void> => {
      await state.clear();
      currentPlan.value = null;
      lastSyncTime.value = null;
      status.value = 'idle';
    };

    register(defaultSyncMethod);

    return {
      status,
      lastSyncTime,
      currentPlan,
      stateData,
      state,
      registeredMethods,
      currentMethod,
      register,
      unregister,
      createPlan,
      executePlan,
      sync,
      reset,
    };
  },
  {
    persist: {
      pick: ['stateData', 'lastSyncTime', 'currentMethodId'],
    },
  },
);
