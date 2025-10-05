import { setActivePinia, createPinia } from 'pinia';
import { test, expect, beforeEach, vi } from 'vitest';

import type { Mock } from 'vitest';
let readFile: Mock;
let writeFile: Mock;

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useFileSystemManager: vi.fn(() => ({
        currentFs: {
          readFile,
          writeFile,
        },
      })),
      useNotifications: vi.fn(() => ({
        notify: vi.fn(),
      })),
      useEncryption: vi.fn(() => ({
        decrypt: vi.fn((content) => content),
        encrypt: vi.fn((content) => content),
      })),
      useConfig: vi.fn(() => ({
        autoSave: false,
        autoSaveDelay: 1000,
      })),
    },
  },
}));

import { useBufferStore } from './buffer';

beforeEach(() => {
  readFile = vi.fn().mockResolvedValue('test content');
  writeFile = vi.fn().mockResolvedValue(undefined);

  const pinia = createPinia();
  setActivePinia(pinia);
  vi.clearAllMocks();

  const store = useBufferStore();
  store.cleanup();
});

test('creates a new buffer on first request', async () => {
  const store = useBufferStore();
  const buf = await store.getOrCreateBuffer('/test/file.org');
  expect(buf).toBeDefined();
  expect(buf.path).toBe('/test/file.org');
  expect(buf.title).toBe('file.org');
  expect(buf.referenceCount).toBe(1);
});

test('increments referenceCount on repeated access', async () => {
  const store = useBufferStore();
  const b1 = await store.getOrCreateBuffer('/test/file.org');
  const b2 = await store.getOrCreateBuffer('/test/file.org');
  expect(b1.path).toBe(b2.path);
  expect(b1.referenceCount).toBe(2);
  expect(b2.referenceCount).toBe(2);
});

test('returns buffer by path', async () => {
  const store = useBufferStore();
  const b = await store.getOrCreateBuffer('/test/file.org');
  const found = store.getBufferByPath('/test/file.org');
  expect(found?.path).toBe(b.path);
});

test('releaseBuffer decrements referenceCount', async () => {
  const store = useBufferStore();
  const b = await store.getOrCreateBuffer('/test/file.org');
  expect(b.referenceCount).toBe(1);
  store.releaseBuffer('/test/file.org');
  expect(b.referenceCount).toBe(0);
});

test('allBuffers returns all created buffers', async () => {
  const store = useBufferStore();
  expect(store.allBuffers.length).toBe(0);
  await store.getOrCreateBuffer('/test/file1.org');
  await store.getOrCreateBuffer('/test/file2.org');
  expect(store.allBuffers.length).toBe(2);
});

test('closeBuffer returns true and removes buffer when no changes', async () => {
  const store = useBufferStore();
  await store.getOrCreateBuffer('/test/file.org');
  expect(store.allBuffers.length).toBe(1);
  const closed = await store.closeBuffer('/test/file.org');
  expect(closed).toBe(true);
  expect(store.getBufferByPath('/test/file.org')).toBeNull();
});

test('closeBuffer returns false when unsaved changes and force=false', async () => {
  const store = useBufferStore();
  const b = await store.getOrCreateBuffer('/test/file.org');
  b.content = 'modified content';
  const closed = await store.closeBuffer('/test/file.org');
  expect(closed).toBe(false);
  expect(store.getBufferByPath('/test/file.org')).not.toBeNull();
});

test('closeBuffer returns true when unsaved changes and force=true', async () => {
  const store = useBufferStore();
  const b = await store.getOrCreateBuffer('/test/file.org');
  b.content = 'modified content';
  const closed = await store.closeBuffer('/test/file.org', true);
  expect(closed).toBe(true);
  expect(store.getBufferByPath('/test/file.org')).toBeNull();
});

test('saveAllBuffers calls file system write for all buffers', async () => {
  const store = useBufferStore();
  writeFile.mockClear();
  const b1 = await store.getOrCreateBuffer('/test/file1.org');
  const b2 = await store.getOrCreateBuffer('/test/file2.org');
  b1.content = 'data1';
  b2.content = 'data2';
  await store.saveAllBuffers();
  const calls = (writeFile as Mock).mock.calls.map((args) => args[0]);
  expect(calls).toContain('/test/file1.org');
  expect(calls).toContain('/test/file2.org');
});
