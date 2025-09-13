import type { LoggerRepository, LogRecord } from 'orgnote-api';
import { okAsync } from 'neverthrow';

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
  let repository: LoggerRepository | null = null;
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

  const flush = (): void => {
    if (!repository) return;
    if (queue.length === 0) return;
    const size = options.batchSize;
    const chunk = queue.splice(0, size);
    repository.bulkAdd(chunk).map((): void => undefined);
  };

  const drain = (): void => {
    if (!repository) return;
    if (queue.length === 0) return;
    const chunk = queue.splice(0, options.batchSize);
    repository.bulkAdd(chunk).map(() => drain());
  };

  const attachRepository = (repo: LoggerRepository): void => {
    repository = repo;
    schedule();
    const retentionMs = options.retentionDays * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - retentionMs);
    repository
      .purgeOlderThan(cutoff)
      .andThen(() => repository.count())
      .andThen((cnt) => {
        const excess = cnt - options.maxRecords;
        if (excess <= 0) return okAsync(undefined);
        return repository.query({ limit: excess, offset: 0 }).andThen((records) => {
          if (records.length === 0) return okAsync(undefined);
          const last = records[records.length - 1]?.ts;
          if (!last) return okAsync(undefined);
          const threshold = new Date(last.getTime() + 1);
          return repository.purgeOlderThan(threshold);
        });
      })
      .map((): void => undefined);
    drain();
  };

  schedule();

  return { write, attachRepository, flush };
};

export type { LogSink, BufferedSinkOptions };
export { createBufferedSink };
