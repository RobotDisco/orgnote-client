import type { LoggerRepository, LogRecord } from 'orgnote-api';

import { to } from './to-error';
import { api } from 'src/boot/api';

type LogSink = {
  write: (record: LogRecord) => void;
  attachRepository: (repo: LoggerRepository) => void;
  flush: () => void;
};

type BufferedSinkOptions = {
  batchSize: number;
  flushIntervalMs: number;
  maxQueue: number;
  retentionDays: number;
  maxRecords: number;
};

const createBufferedSink = (options: BufferedSinkOptions): LogSink => {
  const queue: LogRecord[] = [];
  let repository: LoggerRepository | undefined;
  let timer: ReturnType<typeof setInterval> | null = null;

  const schedule = () => {
    if (timer) return;
    timer = setInterval(() => flush(), options.flushIntervalMs);
  };

  const write = (record: LogRecord): void => {
    queue.push(record);
    if (queue.length > options.maxQueue) queue.shift();
    if (!repository) return;
    if (queue.length < options.batchSize) return;
    flush();
  };

  const flush = async (): Promise<void> => {
    if (!repository) return;
    if (queue.length === 0) return;
    const size = options.batchSize;
    const chunk = queue.splice(0, size);
    const res = await to(repository.bulkAdd)(chunk);

    if (res.isErr()) {
      console.error('Failed to flush log records:', res.error);
      return;
    }

    const logStore = api.core.useLog();
    logStore.addLogs(chunk);
  };

  const drain = async (): Promise<void> => {
    if (!repository) return;
    if (queue.length === 0) return;
    const chunk = queue.splice(0, options.batchSize);
    const res = await to(repository.bulkAdd)(chunk);

    if (res.isErr()) {
      console.error('Failed to flush log records:', res.error);
    }
  };

  const clearOldRecords = async (): Promise<void> => {
    if (!repository) return;

    const retentionMs = options.retentionDays * 24 * 60 * 60 * 1000;

    const cutoff = new Date(Date.now() - retentionMs);

    const purge = await to(repository.purgeOlderThan)(cutoff);

    if (purge.isErr()) {
      console.error('Failed to purge old log records:', purge.error);
      return;
    }
  };

  const clearThreshold = async (): Promise<void> => {
    if (!repository) return;

    const cnt = await to(repository.count)();

    if (cnt.isErr()) {
      console.error('Failed to count log records:', cnt.error);
      return;
    }
    const excess = cnt.value - options.maxRecords;
    if (excess <= 0) return;

    const records = await to(repository.query)({ limit: excess, offset: 0 });

    if (records.isErr()) {
      console.error('Failed to query log records:', records.error);
      return;
    }

    if (records.value.length === 0) return;
    const last = records.value[records.value.length - 1]?.ts;
    if (!last) return;
    const threshold = new Date(last.getTime() + 1);
    return repository.purgeOlderThan(threshold);
  };

  const attachRepository = async (repo: LoggerRepository): Promise<void> => {
    repository = repo;
    schedule();

    await clearOldRecords();
    await clearThreshold();

    drain();
  };

  schedule();

  return { write, attachRepository, flush };
};

export type { LogSink, BufferedSinkOptions };
export { createBufferedSink };
