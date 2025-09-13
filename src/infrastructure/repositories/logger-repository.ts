import type Dexie from 'dexie';
import type { LoggerRepository, LogRecord, LogFilter } from 'orgnote-api';
import { migrator } from './migrator';
import { fromPromise } from 'neverthrow';
import type { ResultAsync } from 'neverthrow';

export const LOGGER_REPOSITORY_NAME = 'logs';

export const LOGGER_MIGRATIONS = migrator<LogRecord>()
  .v(1)
  .indexes('++id,ts,level,message')
  .build();

export const createLoggerRepository = (db: Dexie): LoggerRepository => {
  const store = db.table<LogRecord, number>(LOGGER_REPOSITORY_NAME);

  const toError = (e: unknown): Error => (e instanceof Error ? e : new Error(String(e)));

  const normalizeRecord = (r: LogRecord): LogRecord => ({
    id: r.id,
    ts: r.ts ?? new Date(),
    level: r.level,
    message: r.message,
    bindings: r.bindings,
    context: r.context,
  });

  const add = (record: LogRecord): ResultAsync<void, Error> => {
    const data = normalizeRecord(record);
    return fromPromise(store.add(data), toError).map((): void => undefined);
  };

  const bulkAdd = (records: LogRecord[]): ResultAsync<void, Error> => {
    const data = records.map(normalizeRecord);
    return fromPromise(store.bulkAdd(data), toError).map((): void => undefined);
  };

  const applyFilter = (f: LogFilter) => {
    const text = f.text?.toLowerCase();
    const hasText = !!text && text.length > 0;

    const byLevel = (r: LogRecord) => (!f.level ? true : r.level === f.level);
    const byFrom = (r: LogRecord) => (!f.from ? true : r.ts >= f.from);
    const byTo = (r: LogRecord) => (!f.to ? true : r.ts <= f.to);
    const byText = (r: LogRecord) => (!hasText ? true : r.message.toLowerCase().includes(text!));

    return store.filter((r) => byLevel(r) && byFrom(r) && byTo(r) && byText(r));
  };

  const query = (filter: LogFilter): ResultAsync<LogRecord[], Error> => {
    const limit = filter.limit;
    const offset = filter.offset ?? 0;

    const collection = applyFilter(filter).reverse().sortBy('ts');

    return fromPromise(
      collection.then((arr) => {
        const start = offset < 0 ? 0 : offset;
        if (!limit || limit <= 0) return arr.slice(start);
        return arr.slice(start, start + limit);
      }),
      toError,
    );
  };

  const count = (filter?: Omit<LogFilter, 'limit' | 'offset'>): ResultAsync<number, Error> => {
    if (!filter) return fromPromise(store.count(), toError);
    return fromPromise(applyFilter(filter).count(), toError);
  };

  const clear = (): ResultAsync<void, Error> => {
    return fromPromise(store.clear(), toError).map((): void => undefined);
  };

  const purgeOlderThan = (date: Date): ResultAsync<void, Error> => {
    return fromPromise(store.where('ts').below(date).delete(), toError).map((): void => undefined);
  };

  return {
    add,
    bulkAdd,
    query,
    count,
    clear,
    purgeOlderThan,
  };
};
