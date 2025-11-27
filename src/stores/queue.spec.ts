import { setActivePinia, createPinia } from 'pinia';
import { test, expect, beforeEach, vi, type Mock } from 'vitest';
import { toRaw } from 'vue';

interface MockQueue {
  push: Mock;
  pause: Mock;
  resume: Mock;
  cancel: Mock;
  destroy: Mock;
  getStats: Mock;
  on: Mock;
  removeAllListeners: Mock;
}

const { createMockQueue, mockQueueConstructor, mockQueueRepository } = vi.hoisted(() => {
  const createMockQueue = (): MockQueue => ({
    push: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    cancel: vi.fn((_id: string, cb: () => void) => cb()),
    destroy: vi.fn((cb: () => void) => cb()),
    getStats: vi.fn(() => ({
      total: 10,
      average: 100,
      successRate: 0.95,
      peak: 5,
    })),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  });

  const mockQueueConstructor = vi.fn(() => createMockQueue());

  const mockQueueRepository = {
    add: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(),
    delete: vi.fn(),
    lock: vi.fn(),
    release: vi.fn(),
    takeFirstN: vi.fn(),
    getLock: vi.fn(),
    getRunningTasks: vi.fn(),
    clear: vi.fn(),
    setStatus: vi.fn(),
  };

  return { createMockQueue, mockQueueConstructor, mockQueueRepository };
});

vi.mock('better-queue', () => ({
  default: mockQueueConstructor,
}));

vi.mock('src/boot/repositories', () => ({
  repositories: {
    get queueRepository() {
      return mockQueueRepository;
    },
  },
}));

vi.mock('src/infrastructure/stores/queue-store', () => ({
  QueueStore: vi.fn().mockImplementation(() => ({})),
}));

import { useQueueStore } from './queue';
import type { QueueTask } from 'orgnote-api';

const createMockTask = (overrides: Partial<QueueTask> = {}): QueueTask => ({
  id: 'task-1',
  task: { data: 'test' },
  queueId: 'default',
  priority: 0,
  added: Date.now(),
  ...overrides,
});

beforeEach(() => {
  mockQueueRepository.add.mockReset().mockResolvedValue(undefined);
  mockQueueRepository.get.mockReset().mockResolvedValue(undefined);
  mockQueueRepository.getAll.mockReset().mockResolvedValue([]);
  mockQueueRepository.delete.mockReset().mockResolvedValue(undefined);
  mockQueueRepository.lock.mockReset().mockResolvedValue(undefined);
  mockQueueRepository.release.mockReset().mockResolvedValue(undefined);
  mockQueueRepository.takeFirstN.mockReset().mockResolvedValue('lock-123');
  mockQueueRepository.getLock.mockReset().mockResolvedValue(undefined);
  mockQueueRepository.getRunningTasks.mockReset().mockResolvedValue({});
  mockQueueRepository.clear.mockReset().mockResolvedValue(undefined);
  mockQueueRepository.setStatus.mockReset().mockResolvedValue(undefined);

  mockQueueConstructor.mockClear();
  mockQueueConstructor.mockImplementation(() => createMockQueue());

  const pinia = createPinia();
  setActivePinia(pinia);
});

test('useQueueStore queueIds starts empty', () => {
  const store = useQueueStore();
  expect(store.queueIds).toEqual([]);
});

test('useQueueStore register creates new queue and adds queueId', () => {
  const store = useQueueStore();
  const queue = store.register('test-queue');

  expect(queue).toBeDefined();
  expect(store.queueIds).toContain('test-queue');
});

test('useQueueStore register returns existing queue on duplicate registration', () => {
  const store = useQueueStore();
  const queue1 = store.register('test-queue');
  const queue2 = store.register('test-queue');

  expect(toRaw(queue1)).toBe(toRaw(queue2));
  expect(store.queueIds.filter((id) => id === 'test-queue').length).toBe(1);
});

test('useQueueStore getQueue returns undefined for unregistered queue', () => {
  const store = useQueueStore();
  const queue = store.getQueue('non-existent');

  expect(queue).toBeUndefined();
});

test('useQueueStore getQueue returns queue after registration', () => {
  const store = useQueueStore();
  store.register('test-queue');
  const queue = store.getQueue('test-queue');

  expect(queue).toBeDefined();
});

test('useQueueStore add returns task id', async () => {
  const store = useQueueStore();
  const taskId = await store.add({ data: 'test' });

  expect(taskId).toBeDefined();
  expect(typeof taskId).toBe('string');
  expect(taskId.length).toBeGreaterThan(0);
});

test('useQueueStore add creates queue if not exists', async () => {
  const store = useQueueStore();
  expect(store.queueIds).not.toContain('default');

  await store.add({ data: 'test' });

  expect(store.queueIds).toContain('default');
});

test('useQueueStore add uses specified queueId', async () => {
  const store = useQueueStore();

  await store.add({ data: 'test' }, undefined, 'custom-queue');

  expect(store.queueIds).toContain('custom-queue');
});

test('useQueueStore get delegates to repository', async () => {
  const store = useQueueStore();
  const mockTask = createMockTask();
  mockQueueRepository.get.mockResolvedValue(mockTask);

  const task = await store.get('task-1');

  expect(mockQueueRepository.get).toHaveBeenCalledWith('task-1');
  expect(task).toEqual(mockTask);
});

test('useQueueStore get returns undefined when task not found', async () => {
  const store = useQueueStore();
  mockQueueRepository.get.mockResolvedValue(undefined);

  const task = await store.get('non-existent');

  expect(task).toBeUndefined();
});

test('useQueueStore getAll delegates to repository with queueId', async () => {
  const store = useQueueStore();
  const mockTasks = [createMockTask({ id: 'task-1' }), createMockTask({ id: 'task-2' })];
  mockQueueRepository.getAll.mockResolvedValue(mockTasks);

  const tasks = await store.getAll('test-queue');

  expect(mockQueueRepository.getAll).toHaveBeenCalledWith('test-queue');
  expect(tasks).toEqual(mockTasks);
});

test('useQueueStore getAll uses default queueId', async () => {
  const store = useQueueStore();

  await store.getAll();

  expect(mockQueueRepository.getAll).toHaveBeenCalledWith('default');
});

test('useQueueStore remove cancels task in queue', async () => {
  const store = useQueueStore();
  store.register('test-queue');

  await store.remove('task-1', 'test-queue');

  const queue = store.getQueue('test-queue') as MockQueue | undefined;
  expect(queue?.cancel).toHaveBeenCalled();
});

test('useQueueStore pause pauses the queue', () => {
  const store = useQueueStore();
  store.register('test-queue');

  store.pause('test-queue');

  const queue = store.getQueue('test-queue') as MockQueue | undefined;
  expect(queue?.pause).toHaveBeenCalled();
});

test('useQueueStore resume resumes the queue', () => {
  const store = useQueueStore();
  store.register('test-queue');

  store.resume('test-queue');

  const queue = store.getQueue('test-queue') as MockQueue | undefined;
  expect(queue?.resume).toHaveBeenCalled();
});

test('useQueueStore destroy removes queue from store', () => {
  const store = useQueueStore();
  store.register('test-queue');
  expect(store.queueIds).toContain('test-queue');

  store.destroy('test-queue');

  expect(store.queueIds).not.toContain('test-queue');
  expect(store.getQueue('test-queue')).toBeUndefined();
});

test('useQueueStore destroy does nothing for non-existent queue', () => {
  const store = useQueueStore();

  expect(() => store.destroy('non-existent')).not.toThrow();
});

test('useQueueStore unregister is alias for destroy', () => {
  const store = useQueueStore();
  store.register('test-queue');

  store.unregister('test-queue');

  expect(store.getQueue('test-queue')).toBeUndefined();
});

test('useQueueStore clear clears repository tasks for queueId', async () => {
  const store = useQueueStore();
  store.register('test-queue');

  await store.clear('test-queue');

  expect(mockQueueRepository.clear).toHaveBeenCalledWith('test-queue');
});

test('useQueueStore clear pauses and resumes queue during clearing', async () => {
  const store = useQueueStore();
  store.register('test-queue');
  const queue = store.getQueue('test-queue') as MockQueue | undefined;

  await store.clear('test-queue');

  expect(queue?.pause).toHaveBeenCalled();
  expect(queue?.resume).toHaveBeenCalled();
});

test('useQueueStore getStats returns queue statistics', async () => {
  const store = useQueueStore();
  store.register('test-queue');

  const stats = await store.getStats('test-queue');

  expect(stats).toEqual({
    total: 10,
    average: 100,
    successRate: 0.95,
    peak: 5,
  });
});

test('useQueueStore getStats creates queue if not exists', async () => {
  const store = useQueueStore();
  expect(store.queueIds).not.toContain('new-queue');

  await store.getStats('new-queue');

  expect(store.queueIds).toContain('new-queue');
});

test('useQueueStore multiple queues are independent', () => {
  const store = useQueueStore();

  store.register('queue-1');
  store.register('queue-2');

  expect(store.queueIds).toContain('queue-1');
  expect(store.queueIds).toContain('queue-2');
  expect(store.getQueue('queue-1')).not.toBe(store.getQueue('queue-2'));

  store.destroy('queue-1');

  expect(store.queueIds).not.toContain('queue-1');
  expect(store.queueIds).toContain('queue-2');
});

test('useQueueStore destroy removes event listeners to prevent memory leak', () => {
  const store = useQueueStore();
  store.register('test-queue');

  const queue = store.getQueue('test-queue') as MockQueue | undefined;

  store.destroy('test-queue');

  expect(queue?.removeAllListeners).toHaveBeenCalled();
});
