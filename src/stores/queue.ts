import { defineStore } from 'pinia';
import { ref } from 'vue';
import Queue from 'better-queue';
import type { QueueOptions } from 'better-queue';
import { repositories } from 'src/boot/repositories';
import { QueueStore as BetterQueueStoreAdapter } from 'src/infrastructure/stores/queue-store';
import type {
  QueueTask,
  QueueStore,
  QueueCreationOptions,
  QueueTaskOptions,
  QueueStats,
} from 'orgnote-api';

const createProcessFn = (options: QueueCreationOptions) => {
  return options.process ?? ((_task: unknown, cb: (err?: unknown) => void) => cb());
};

const registerQueueEvents = (queue: Queue) => {
  const updateStatus = (taskId: string, status: string) =>
    repositories.queueRepository.setStatus(taskId, status);

  queue.on('task_finish', (taskId: string) => updateStatus(taskId, 'completed'));
  queue.on('task_failed', (taskId: string) => updateStatus(taskId, 'failed'));
};

export const useQueueStore = defineStore<'queue', QueueStore>('queue', () => {
  const queues = ref<Map<string, Queue>>(new Map());
  const queueIds = ref<string[]>([]);

  const addQueueId = (queueId: string) => {
    if (queueIds.value.includes(queueId)) return;
    queueIds.value = [...queueIds.value, queueId];
  };

  const removeQueueId = (queueId: string) => {
    queueIds.value = queueIds.value.filter((id) => id !== queueId);
  };

  const getQueue = (queueId: string = 'default'): Queue | undefined => {
    return queues.value.get(queueId);
  };

  const register = (queueId: string, options: QueueCreationOptions = {}): Queue => {
    const existingQueue = queues.value.get(queueId);
    if (existingQueue) {
      addQueueId(queueId);
      return existingQueue;
    }

    const storeAdapter = new BetterQueueStoreAdapter(repositories.queueRepository, queueId);
    const processFn = createProcessFn(options);

    const queueOptions: Partial<QueueOptions<unknown, unknown>> = {
      ...options,
      store: storeAdapter,
      id: 'id' as keyof unknown,
    };

    const queue = new Queue(processFn, queueOptions);

    registerQueueEvents(queue);
    queues.value.set(queueId, queue);
    addQueueId(queueId);

    return queue;
  };

  const ensureQueue = (queueId: string = 'default'): Queue => {
    const queue = getQueue(queueId);
    if (queue) {
      return queue;
    }
    return register(queueId);
  };

  const add = (
    payload: unknown,
    options?: QueueTaskOptions,
    queueId: string = 'default',
  ): Promise<string> => {
    const queue = ensureQueue(queueId);
    const id = crypto.randomUUID();
    const normalizedPayload = payload && typeof payload === 'object' ? payload : { value: payload };
    const task = { ...normalizedPayload, ...options, id };
    queue.push(task);
    return Promise.resolve(id);
  };

  const get = (taskId: string): Promise<QueueTask | undefined> => {
    return repositories.queueRepository.get(taskId);
  };

  const getAll = (queueId: string = 'default'): Promise<QueueTask[]> => {
    return repositories.queueRepository.getAll(queueId);
  };

  const cancel = (taskId: string, queueId: string = 'default'): Promise<void> => {
    return new Promise((resolve) => {
      ensureQueue(queueId).cancel(taskId, () => resolve());
    });
  };

  const remove = cancel;

  const pause = (queueId: string = 'default'): void => {
    ensureQueue(queueId).pause();
  };

  const resume = (queueId: string = 'default'): void => {
    ensureQueue(queueId).resume();
  };

  const destroy = (queueId: string = 'default'): void => {
    const queue = getQueue(queueId);
    if (!queue) {
      return;
    }
    queue.removeAllListeners();
    queue.destroy(() => null);
    queues.value.delete(queueId);
    removeQueueId(queueId);
  };

  const unregister = (queueId: string = 'default'): void => {
    destroy(queueId);
  };

  const clear = async (queueId: string = 'default'): Promise<void> => {
    await pauseQueue(queueId);
    await repositories.queueRepository.clear(queueId);
    const queue = getQueue(queueId);
    if (queue) {
      queue.resume();
    }
  };

  const pauseQueue = async (queueId: string): Promise<void> => {
    const queue = getQueue(queueId);
    if (!queue) {
      return;
    }

    queue.pause();
    const tasks = await repositories.queueRepository.getAll(queueId);
    await Promise.all(
      tasks
        .filter((t) => t.status === 'pending' || t.status === 'processing')
        .map((t) => new Promise<void>((resolve) => queue.cancel(t.id, () => resolve()))),
    );
  };

  const getStats = (queueId: string = 'default'): Promise<QueueStats> => {
    const stats = ensureQueue(queueId).getStats();
    return Promise.resolve({ ...stats });
  };


  const isQueueEmpty = (queue: Queue): boolean => {
    const queueWithInternals = queue as Queue & { length: number; _running: number };
    return queueWithInternals.length === 0 && queueWithInternals._running === 0;
  };

  const waitQeueueEmpty = <T = unknown[]>(queueId: string = 'default'): Promise<T> => {
    const queue = ensureQueue(queueId);
    const { promise, resolve } = Promise.withResolvers<T>();

    if (isQueueEmpty(queue)) {
      resolve([] as T);
      return promise;
    }

    const results: unknown[] = [];

    const onTaskFinish = (_taskId: string, result: unknown) => {
      results.push(result);
    };

    const onDrain = () => {
      queue.removeListener('task_finish', onTaskFinish);
      queue.removeListener('drain', onDrain);
      resolve(results as T);
    };

    queue.on('task_finish', onTaskFinish);
    queue.on('drain', onDrain);

    return promise;
  };

  const queueStore: QueueStore = {
    register,
    unregister,
    getQueue,
    add,
    get,
    getAll,
    remove,
    pause,
    resume,
    destroy,
    clear,
    getStats,
    waitQeueueEmpty,
    queueIds,
  };

  return queueStore;
});
