import { setActivePinia, createPinia } from 'pinia';
import { test, expect, beforeEach, vi } from 'vitest';
import { useBufferStore } from './buffer';

// Mock API для тестов
const mockApi = {
  core: {
    useFileSystemManager: vi.fn(() => ({
      currentFs: {
        readFile: vi.fn().mockResolvedValue('test content'),
        writeFile: vi.fn().mockResolvedValue(undefined),
      },
    })),
    useNotifications: vi.fn(() => ({
      notify: vi.fn(),
    })),
  },
};

vi.mock('src/boot/api', () => ({
  api: mockApi,
}));

beforeEach(() => {
  setActivePinia(createPinia());
});

test('создает новый buffer при первом обращении', async () => {
  const bufferStore = useBufferStore();

  const buffer = await bufferStore.getOrCreateBuffer('/test/file.org');

  expect(buffer).toBeDefined();
  expect(buffer.path).toBe('/test/file.org');
  expect(buffer.title).toBe('file.org');
  expect(buffer.referenceCount).toBe(1);
});

test('увеличивает referenceCount при повторном обращении', async () => {
  const bufferStore = useBufferStore();

  const buffer1 = await bufferStore.getOrCreateBuffer('/test/file.org');
  const buffer2 = await bufferStore.getOrCreateBuffer('/test/file.org');

  expect(buffer1.path).toBe(buffer2.path); // Тот же путь
  expect(buffer1.referenceCount).toBe(2);
  expect(buffer2.referenceCount).toBe(2);
});

test('возвращает buffer по пути', async () => {
  const bufferStore = useBufferStore();

  const buffer = await bufferStore.getOrCreateBuffer('/test/file.org');
  const foundBuffer = bufferStore.getBufferByPath('/test/file.org');

  expect(foundBuffer?.path).toBe(buffer.path);
  expect(foundBuffer?.referenceCount).toBe(buffer.referenceCount);
});

test('уменьшает referenceCount при releaseBuffer', async () => {
  const bufferStore = useBufferStore();

  const buffer = await bufferStore.getOrCreateBuffer('/test/file.org');
  expect(buffer.referenceCount).toBe(1);

  bufferStore.releaseBuffer('/test/file.org');
  expect(buffer.referenceCount).toBe(0);
});

test('показывает dirty buffers в computed', async () => {
  const bufferStore = useBufferStore();

  const buffer = await bufferStore.getOrCreateBuffer('/test/file.org');
  expect(bufferStore.dirtyBuffers.length).toBe(0);

  // Изменяем содержимое
  buffer.content.value = 'modified content';
  expect(bufferStore.dirtyBuffers.length).toBe(1);
  expect(bufferStore.dirtyBuffers[0].path).toBe(buffer.path);
  expect(bufferStore.dirtyBuffers[0].hasChanges).toBe(true);
});

test('показывает все буферы в allBuffers', async () => {
  const bufferStore = useBufferStore();

  expect(bufferStore.allBuffers.length).toBe(0);

  await bufferStore.getOrCreateBuffer('/test/file1.org');
  await bufferStore.getOrCreateBuffer('/test/file2.org');

  expect(bufferStore.allBuffers.length).toBe(2);
});

test('закрывает buffer без несохраненных изменений', async () => {
  const bufferStore = useBufferStore();

  await bufferStore.getOrCreateBuffer('/test/file.org');
  expect(bufferStore.allBuffers.length).toBe(1);

  const closed = await bufferStore.closeBuffer('/test/file.org');
  expect(closed).toBe(true);
  expect(bufferStore.allBuffers.length).toBe(0);
});
