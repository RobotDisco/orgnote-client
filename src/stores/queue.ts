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

  const executeBatchTasks = <T = unknown[], R = unknown[]>(
    options: QueueCreationOptions,
    data: T[],
  ): Promise<R> => {
    if (!Array.isArray(data) || data.length === 0) {
      return Promise.resolve([] as R);
    }

    const originalProcess = options.process;
    if (!originalProcess) {
      return Promise.reject(new Error('process function is required in options'));
    }

    const queueId = `batch-${crypto.randomUUID()}`;
    const { promise, resolve, reject } = Promise.withResolvers<R>();

    const state = createBatchState<R>(data.length, resolve, reject);
    const queue = createBatchQueue(queueId, options, originalProcess, state);

    setupBatchEventHandlers(queue, queueId, state);
    enqueueBatchItems(queue, data);

    return promise;
  };

  const createBatchState = <R>(
    totalTasks: number,
    resolve: (value: R) => void,
    reject: (reason?: unknown) => void,
  ) => ({
    results: [] as unknown[],
    completedCount: 0,
    hasError: false,
    totalTasks,
    resolve,
    reject,
  });

  type BatchState<R> = ReturnType<typeof createBatchState<R>>;

  const createBatchQueue = <R>(
    queueId: string,
    options: QueueCreationOptions,
    originalProcess: NonNullable<QueueCreationOptions['process']>,
    state: BatchState<R>,
  ): Queue => {
    destroy(queueId);

    const wrappedProcess = (task: unknown, cb: (err?: unknown, result?: unknown) => void) => {
      if (state.hasError) {
        cb();
        return;
      }
      originalProcess(task, cb);
    };

    return register(queueId, { ...options, process: wrappedProcess });
  };

  const setupBatchEventHandlers = <R>(
    queue: Queue,
    queueId: string,
    state: BatchState<R>,
  ): void => {
    const cleanup = () => {
      queue.pause();
      queue.removeListener('task_finish', onTaskFinish);
      queue.removeListener('task_failed', onTaskFailed);
      queue.removeAllListeners();
      destroy(queueId);
      void repositories.queueRepository.clear(queueId);
    };

    const onTaskFinish = (_taskId: string, result: unknown) => {
      if (state.hasError) {
        return;
      }
      state.results.push(result);
      state.completedCount++;

      if (state.completedCount === state.totalTasks) {
        cleanup();
        state.resolve(state.results as R);
      }
    };

    const onTaskFailed = (_taskId: string, err: unknown) => {
      if (state.hasError) {
        return;
      }
      state.hasError = true;
      cleanup();
      state.reject(err);
    };

    queue.on('task_finish', onTaskFinish);
    queue.on('task_failed', onTaskFailed);
  };

  const enqueueBatchItems = <T>(queue: Queue, data: T[]): void => {
    data.forEach((item) => {
      queue.push({ id: crypto.randomUUID(), payload: item });
    });
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
    queueIds,
    executeBatchTasks,
  };

  return queueStore;
});
