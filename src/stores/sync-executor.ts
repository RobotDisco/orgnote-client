import type {
  SyncPlan,
  SyncExecutor,
  LocalFile,
  RemoteFile,
  FileSystem,
  SyncContext,
  UploadResult,
} from 'orgnote-api';
import type { VersionConflictResponse } from 'orgnote-api/remote-api';
import {
  processUpload,
  processDownload,
  processDeleteLocal,
  processDeleteRemote,
} from 'orgnote-api';

import { reporter } from 'src/boot/report';
import { sdk } from 'src/boot/axios';
import axios, { type AxiosError } from 'axios';
import { to } from 'src/utils/to-error';

const isConflictError = (error: unknown): error is AxiosError<VersionConflictResponse> =>
  axios.isAxiosError(error) && error.response?.status === 409;

const extractConflictVersion = (error: AxiosError<VersionConflictResponse>): number =>
  error.response?.data?.serverVersion ?? 0;

const uploadFile =
  (fs: FileSystem) =>
  async (file: LocalFile, expectedVersion?: number): Promise<UploadResult> => {
    const content = await fs.readFile(file.path, 'binary');
    const blob = new File([content], file.path.split('/').pop() ?? 'file');
    const result = await to(sdk.sync.syncFilesPut)(file.path, blob, undefined, expectedVersion);

    if (result.isOk()) {
      return { status: 'ok', version: result.value.data.data?.version ?? 1 };
    }

    if (isConflictError(result.error)) {
      return { status: 'conflict', serverVersion: extractConflictVersion(result.error) };
    }

    throw result.error;
  };

const downloadFile =
  (fs: FileSystem) =>
  async (file: RemoteFile): Promise<void> => {
    const response = await sdk.sync.syncFilesGet(file.path, { responseType: 'arraybuffer' });
    const content = new Uint8Array(response.data as unknown as ArrayBuffer);
    await fs.writeFile(file.path, content);
  };

const deleteLocalFile =
  (fs: FileSystem) =>
  async (path: string): Promise<void> => {
    await fs.deleteFile(path);
  };

const deleteRemoteFile = async (path: string, expectedVersion: number): Promise<void> => {
  await sdk.sync.syncFilesDelete(path, expectedVersion);
};

export const createExecutor = (fs: FileSystem): SyncExecutor => ({
  upload: uploadFile(fs),
  download: downloadFile(fs),
  deleteLocal: deleteLocalFile(fs),
  deleteRemote: deleteRemoteFile,
});

interface SyncStats {
  uploaded: number;
  downloaded: number;
  deletedLocal: number;
  deletedRemote: number;
  errors: number;
}

const createStats = (): SyncStats => ({
  uploaded: 0,
  downloaded: 0,
  deletedLocal: 0,
  deletedRemote: 0,
  errors: 0,
});

const processItem = async <T>(
  item: T,
  processor: (item: T) => Promise<void>,
  getPath: (item: T) => string,
  operationName: string,
): Promise<boolean> => {
  const result = await to(processor)(item);

  if (result.isOk()) return true;

  reporter.reportWarning(`${operationName} failed: ${getPath(item)} - ${result.error}`);
  return false;
};

const executeWithErrorHandling = async <T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  getPath: (item: T) => string,
  operationName: string,
): Promise<{ success: number; errors: number }> => {
  const results = await Promise.all(
    items.map((item) => processItem(item, processor, getPath, operationName)),
  );

  const success = results.filter(Boolean).length;
  return { success, errors: results.length - success };
};

interface SyncOperation<T> {
  items: T[];
  processor: (item: T) => Promise<void>;
  getPath: (item: T) => string;
  name: string;
  statKey: keyof Omit<SyncStats, 'errors'>;
}

const createOperations = (
  plan: SyncPlan,
  ctx: SyncContext,
): SyncOperation<LocalFile | RemoteFile | string>[] => [
  {
    items: plan.toUpload,
    processor: (file) => processUpload(file as LocalFile, ctx),
    getPath: (file) => (file as LocalFile).path,
    name: 'Upload',
    statKey: 'uploaded',
  },
  {
    items: plan.toDownload,
    processor: (file) => processDownload(file as RemoteFile, ctx),
    getPath: (file) => (file as RemoteFile).path,
    name: 'Download',
    statKey: 'downloaded',
  },
  {
    items: plan.toDeleteLocal,
    processor: (path) => processDeleteLocal(path as string, ctx),
    getPath: (path) => path as string,
    name: 'Delete local',
    statKey: 'deletedLocal',
  },
  {
    items: plan.toDeleteRemote,
    processor: (path) => processDeleteRemote(path as string, ctx),
    getPath: (path) => path as string,
    name: 'Delete remote',
    statKey: 'deletedRemote',
  },
];

export const executePlanOperations = async (
  plan: SyncPlan,
  ctx: SyncContext,
): Promise<SyncStats> => {
  const operations = createOperations(plan, ctx);

  const results = await Promise.all(
    operations.map(async (op) => ({
      statKey: op.statKey,
      result: await executeWithErrorHandling(op.items, op.processor, op.getPath, op.name),
    })),
  );

  return results.reduce(
    (stats, { statKey, result }) => ({
      ...stats,
      [statKey]: result.success,
      errors: stats.errors + result.errors,
    }),
    createStats(),
  );
};

export const isPlanEmpty = (plan: SyncPlan): boolean =>
  plan.toUpload.length === 0 &&
  plan.toDownload.length === 0 &&
  plan.toDeleteLocal.length === 0 &&
  plan.toDeleteRemote.length === 0;
