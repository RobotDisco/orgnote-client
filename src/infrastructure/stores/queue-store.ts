import type { QueueRepository, QueueTask } from 'orgnote-api';
import type { Store } from 'better-queue';
import { to } from 'src/utils/to-error';

const restoreIdToPayload = (task: QueueTask): unknown => {
  if (!task.task || typeof task.task !== 'object') return task.task;
  return { ...(task.task as object), id: task.id };
};

const removeId = (obj: object): object => {
  if ('id' in obj) {
    delete (obj as { id?: unknown }).id;
  }
  return obj;
};

const cloneAndRemoveId = (task: unknown): unknown => {
  if (!task || typeof task !== 'object') return task;

  const structuredResult = to(() => structuredClone(task))();
  if (structuredResult.isOk()) return removeId(structuredResult.value);

  const jsonResult = to(() => JSON.parse(JSON.stringify(task)) as object)();
  if (jsonResult.isOk()) return removeId(jsonResult.value);

  const { id: _id, ...rest } = task as { id?: unknown };
  void _id;
  return rest;
};

export class QueueStore implements Store<unknown> {
  private readonly repo: QueueRepository;
  private readonly queueName: string;

  constructor(repo: QueueRepository, queueName = 'default') {
    this.repo = repo;
    this.queueName = queueName;
  }

  connect(cb: (err: unknown, length: number) => void) {
    cb(null, 0);
  }

  getTask(taskId: string, cb: (err: unknown, task?: unknown) => void) {
    this.repo
      .get(taskId)
      .then((task) => {
        if (!task) {
          cb(null, undefined);
          return;
        }
        cb(null, restoreIdToPayload(task));
      })
      .catch((err) => cb(err));
  }

  getAll(cb: (err: unknown, tasks: QueueTask[]) => void) {
    this.repo
      .getAll(this.queueName)
      .then((tasks) => cb(null, tasks))
      .catch((err) => cb(err, []));
  }

  putTask(taskId: string, task: unknown, priority: number, cb: (err: unknown) => void) {
    const normalizedPriority = Number.isFinite(priority) ? priority : 0;
    const safeTask = cloneAndRemoveId(task);

    const queueTask: QueueTask = {
      id: taskId,
      task: safeTask,
      priority: normalizedPriority,
      added: Date.now(),
      queueId: this.queueName,
    };

    this.repo
      .add(queueTask)
      .then(() => cb(null))
      .catch((err) => cb(err));
  }

  takeFirstN(n: number, cb: (err: unknown, lockId: string) => void) {
    this.repo
      .takeFirstN(n, this.queueName)
      .then((lockId) => cb(null, lockId))
      .catch((err) => cb(err, ''));
  }

  getLock(lockId: string, cb: (err: unknown, tasks: { [id: string]: unknown }) => void) {
    this.repo
      .getLock(lockId)
      .then((tasks) => {
        if (!tasks) {
          cb(null, {});
          return;
        }

        const payloads = Object.entries(tasks).reduce<{ [id: string]: unknown }>(
          (acc, [id, task]) => {
            acc[id] = restoreIdToPayload(task);
            return acc;
          },
          {},
        );
        cb(null, payloads);
      })
      .catch((err) => cb(err, {}));
  }

  deleteTask(taskId: string, cb: (err: unknown) => void) {
    this.repo
      .delete(taskId)
      .then(() => cb(null))
      .catch((err) => cb(err));
  }

  releaseLock(lockId: string, cb: (err: unknown) => void) {
    this.repo
      .getLock(lockId)
      .then((tasks) => {
        if (!tasks) {
          cb(null);
          return;
        }

        const promises = Object.values(tasks).map((t) => this.repo.release(t.id));
        return Promise.all(promises).then(() => cb(null));
      })
      .catch((err) => cb(err));
  }

  getRunningTasks(cb: (err: unknown, tasks: { [id: string]: QueueTask }) => void) {
    this.repo
      .getRunningTasks(this.queueName)
      .then((tasks) => {
        const tasksWithIds = Object.entries(tasks).reduce<{ [id: string]: QueueTask }>(
          (acc, [id, t]) => {
            acc[id] = { ...t, task: restoreIdToPayload(t) };
            return acc;
          },
          {},
        );
        cb(null, tasksWithIds);
      })
      .catch((err) => cb(err, {}));
  }

  takeLastN(_n: number, cb: (err: unknown, lockId: string) => void) {
    cb(null, '');
  }
}
