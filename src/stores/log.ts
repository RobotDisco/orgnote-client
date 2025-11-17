import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { LogRecord, LogLevel, LogStore } from 'orgnote-api';
import { isPresent } from 'src/utils/nullable-guards';
import { repositories } from 'src/boot/repositories';

const MAX_LOGS = 500;

export const useLogStore = defineStore('log', (): LogStore => {
  const logs = ref<LogRecord[]>([]);

  const loadFromRepository = async (): Promise<void> => {
    try {
      const records = await repositories.logRepository.query({ limit: MAX_LOGS });
      logs.value = records;
    } catch (error) {
      console.error('Failed to load logs from repository:', error);
    }
  };

  loadFromRepository();

  const addLog = (log: LogRecord): void => {
    logs.value.unshift(log);
    if (logs.value.length > MAX_LOGS) {
      logs.value.pop();
    }
  };

  const initLogStoreFromRepository = async (): Promise<void> => {
    const store = useLogStore();
    try {
      const records = await repositories.logRepository.query({ limit: MAX_LOGS });
      store.addLogs(records);
    } catch (error) {
      console.error('Failed to load logs from repository:', error);
    }
  };

  initLogStoreFromRepository().then();

  const addLogs = (newLogs: LogRecord[]): void => {
    logs.value.unshift(...newLogs);
    logs.value = logs.value.slice(0, MAX_LOGS);
  };

  const getLogsByLevel = (level: LogLevel): LogRecord[] =>
    logs.value.filter((log) => log.level === level);

  const getLogsSince = (timestamp: Date): LogRecord[] =>
    logs.value.filter((log) => {
      const logDate = log.ts instanceof Date ? log.ts : new Date(log.ts);
      return logDate >= timestamp;
    });

  const getCountByLevel = (level: LogLevel): number =>
    logs.value.filter((log) => log.level === level).length;

  const clearLogs = (): void => {
    logs.value = [];
  };

  const clearLogsByLevel = (level: LogLevel): void => {
    logs.value = logs.value.filter((log) => log.level !== level);
  };

  const extractContext = (context?: Record<string, unknown>): Record<string, unknown> => {
    if (!context) return {};
    const contextCopy = { ...context };
    delete contextCopy.stack;
    delete contextCopy.cause;
    return contextCopy;
  };

  const formatTimestamp = (ts: Date | string | number): string => {
    const date = ts instanceof Date ? ts : new Date(ts);
    return date.toISOString();
  };

  const formatMessage = (message: unknown): string => {
    if (typeof message === 'string') return message;
    if (message instanceof Error) return message.message;
    if (typeof message === 'object' && isPresent(message)) {
      try {
        return JSON.stringify(message, null, 2);
      } catch {
        return String(message);
      }
    }
    return String(message);
  };

  const formatStack = (context?: Record<string, unknown>): string | undefined => {
    if (!context?.stack) return undefined;
    return String(context.stack);
  };

  const formatContext = (context?: Record<string, unknown>): string | undefined => {
    const ctx = extractContext(context);
    if (Object.keys(ctx).length === 0) return undefined;
    return `Context: ${JSON.stringify(ctx, null, 2)}`;
  };

  const formatErrorRecord = (log: LogRecord, index: number, total: number): string => {
    const position = total - index;
    const timestamp = formatTimestamp(log.ts);
    const header = `[${position}] ${timestamp}`;

    const parts = [header, formatMessage(log.message)];

    const stack = formatStack(log.context);
    if (stack) parts.push(stack);

    const context = formatContext(log.context);
    if (context) parts.push(context);

    return parts.join('\n');
  };

  const exportAsText = (): string => {
    const errorLogs = getLogsByLevel('error');
    if (errorLogs.length === 0) return '';

    return errorLogs
      .map((log, index) => formatErrorRecord(log, index, errorLogs.length))
      .join('\n---\n');
  };

  return {
    logs,
    addLog,
    addLogs,
    getLogsByLevel,
    getLogsSince,
    getCountByLevel,
    clearLogs,
    clearLogsByLevel,
    exportAsText,
  };
});
