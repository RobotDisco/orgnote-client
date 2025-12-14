import { test, expect, vi, beforeEach } from 'vitest';
import type { SyncPlan, LocalFile, RemoteFile, SyncContext, SyncState, FileSystem } from 'orgnote-api';
import { isPlanEmpty, executePlanOperations } from './sync-executor';

vi.mock('orgnote-api', () => ({
  processUpload: vi.fn(),
  processDownload: vi.fn(),
  processDeleteLocal: vi.fn(),
  processDeleteRemote: vi.fn(),
}));

vi.mock('src/boot/report', () => ({
  reporter: {
    reportWarning: vi.fn(),
  },
}));

import { processUpload, processDownload, processDeleteLocal, processDeleteRemote } from 'orgnote-api';
import { reporter } from 'src/boot/report';

const createEmptyPlan = (): SyncPlan => ({
  toUpload: [],
  toDownload: [],
  toDeleteLocal: [],
  toDeleteRemote: [],
  serverTime: '2024-01-01T00:00:00Z',
});

const createLocalFile = (path: string): LocalFile => ({
  path,
  mtime: 1000,
  size: 100,
});

const createRemoteFile = (path: string): RemoteFile => ({
  path,
  version: 1,
  deleted: false,
  updatedAt: '2024-01-01T00:00:00Z',
});

const createMockState = (): SyncState => ({
  get: vi.fn(),
  getFile: vi.fn(),
  setFile: vi.fn(),
  removeFile: vi.fn(),
  setLastSyncTime: vi.fn(),
  clear: vi.fn(),
});

const createMockFs = (): FileSystem => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  deleteFile: vi.fn(),
  readDir: vi.fn(),
  mkdir: vi.fn(),
  rmdir: vi.fn(),
  fileInfo: vi.fn(),
  isDirExist: vi.fn(),
  isFileExist: vi.fn(),
  rename: vi.fn(),
  utimeSync: vi.fn(),
});

const createMockContext = (): SyncContext => ({
  executor: {
    upload: vi.fn(),
    download: vi.fn(),
    deleteLocal: vi.fn(),
    deleteRemote: vi.fn(),
  },
  state: createMockState(),
  fs: createMockFs(),
});

beforeEach(() => {
  vi.clearAllMocks();
});

test('isPlanEmpty returns true for empty plan', () => {
  const plan = createEmptyPlan();
  expect(isPlanEmpty(plan)).toBe(true);
});

test('isPlanEmpty returns false when toUpload has items', () => {
  const plan = createEmptyPlan();
  plan.toUpload = [createLocalFile('/test.org')];
  expect(isPlanEmpty(plan)).toBe(false);
});

test('isPlanEmpty returns false when toDownload has items', () => {
  const plan = createEmptyPlan();
  plan.toDownload = [createRemoteFile('/test.org')];
  expect(isPlanEmpty(plan)).toBe(false);
});

test('isPlanEmpty returns false when toDeleteLocal has items', () => {
  const plan = createEmptyPlan();
  plan.toDeleteLocal = ['/test.org'];
  expect(isPlanEmpty(plan)).toBe(false);
});

test('isPlanEmpty returns false when toDeleteRemote has items', () => {
  const plan = createEmptyPlan();
  plan.toDeleteRemote = ['/test.org'];
  expect(isPlanEmpty(plan)).toBe(false);
});

test('executePlanOperations returns zero stats for empty plan', async () => {
  const plan = createEmptyPlan();
  const ctx = createMockContext();

  const stats = await executePlanOperations(plan, ctx);

  expect(stats).toEqual({
    uploaded: 0,
    downloaded: 0,
    deletedLocal: 0,
    deletedRemote: 0,
    errors: 0,
  });
});

test('executePlanOperations counts successful uploads', async () => {
  const plan = createEmptyPlan();
  plan.toUpload = [createLocalFile('/file1.org'), createLocalFile('/file2.org')];
  const ctx = createMockContext();

  vi.mocked(processUpload).mockResolvedValue(undefined);

  const stats = await executePlanOperations(plan, ctx);

  expect(stats.uploaded).toBe(2);
  expect(stats.errors).toBe(0);
  expect(processUpload).toHaveBeenCalledTimes(2);
});

test('executePlanOperations counts successful downloads', async () => {
  const plan = createEmptyPlan();
  plan.toDownload = [createRemoteFile('/file1.org')];
  const ctx = createMockContext();

  vi.mocked(processDownload).mockResolvedValue(undefined);

  const stats = await executePlanOperations(plan, ctx);

  expect(stats.downloaded).toBe(1);
  expect(stats.errors).toBe(0);
});

test('executePlanOperations counts successful local deletions', async () => {
  const plan = createEmptyPlan();
  plan.toDeleteLocal = ['/file1.org', '/file2.org'];
  const ctx = createMockContext();

  vi.mocked(processDeleteLocal).mockResolvedValue(undefined);

  const stats = await executePlanOperations(plan, ctx);

  expect(stats.deletedLocal).toBe(2);
  expect(stats.errors).toBe(0);
});

test('executePlanOperations counts successful remote deletions', async () => {
  const plan = createEmptyPlan();
  plan.toDeleteRemote = ['/file1.org'];
  const ctx = createMockContext();

  vi.mocked(processDeleteRemote).mockResolvedValue(undefined);

  const stats = await executePlanOperations(plan, ctx);

  expect(stats.deletedRemote).toBe(1);
  expect(stats.errors).toBe(0);
});

test('executePlanOperations counts errors and reports warnings', async () => {
  const plan = createEmptyPlan();
  plan.toUpload = [createLocalFile('/file1.org'), createLocalFile('/file2.org')];
  const ctx = createMockContext();

  vi.mocked(processUpload)
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error('Upload failed'));

  const stats = await executePlanOperations(plan, ctx);

  expect(stats.uploaded).toBe(1);
  expect(stats.errors).toBe(1);
  expect(reporter.reportWarning).toHaveBeenCalledWith(
    expect.stringContaining('Upload failed'),
  );
});

test('executePlanOperations handles mixed operations', async () => {
  const plan = createEmptyPlan();
  plan.toUpload = [createLocalFile('/upload.org')];
  plan.toDownload = [createRemoteFile('/download.org')];
  plan.toDeleteLocal = ['/delete-local.org'];
  plan.toDeleteRemote = ['/delete-remote.org'];
  const ctx = createMockContext();

  vi.mocked(processUpload).mockResolvedValue(undefined);
  vi.mocked(processDownload).mockResolvedValue(undefined);
  vi.mocked(processDeleteLocal).mockResolvedValue(undefined);
  vi.mocked(processDeleteRemote).mockResolvedValue(undefined);

  const stats = await executePlanOperations(plan, ctx);

  expect(stats).toEqual({
    uploaded: 1,
    downloaded: 1,
    deletedLocal: 1,
    deletedRemote: 1,
    errors: 0,
  });
});

test('executePlanOperations accumulates errors from multiple operations', async () => {
  const plan = createEmptyPlan();
  plan.toUpload = [createLocalFile('/upload.org')];
  plan.toDownload = [createRemoteFile('/download.org')];
  const ctx = createMockContext();

  vi.mocked(processUpload).mockRejectedValue(new Error('Upload error'));
  vi.mocked(processDownload).mockRejectedValue(new Error('Download error'));

  const stats = await executePlanOperations(plan, ctx);

  expect(stats.uploaded).toBe(0);
  expect(stats.downloaded).toBe(0);
  expect(stats.errors).toBe(2);
});
