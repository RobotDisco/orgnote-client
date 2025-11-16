import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { LogRecord, LogLevel, LogStore } from 'orgnote-api';

const MAX_LOGS = 500;

export const useLogStore = defineStore(
  'log',
  (): LogStore => {
    const logs = ref<LogRecord[]>([]);

    const addLog = (log: LogRecord): void => {
      logs.value.unshift(log);
      if (logs.value.length > MAX_LOGS) {
        logs.value.pop();
      }
    };

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
      return contextCopy;
    };

    const formatErrorRecord = (log: LogRecord, index: number): string => {
      const parts: string[] = [];
      const position = index + 1;

      const timestamp = log.ts instanceof Date ? log.ts : new Date(log.ts);
      parts.push(`[${position}] ${timestamp.toISOString()}`);
      parts.push(log.message);

      if (log.context?.stack) {
        parts.push(String(log.context.stack));
      }

      const ctx = extractContext(log.context);
      if (Object.keys(ctx).length > 0) {
        parts.push(`Context: ${JSON.stringify(ctx, null, 2)}`);
      }

      return parts.join('\n');
    };

    const exportAsText = (): string => {
      const errorLogs = getLogsByLevel('error');
      if (errorLogs.length === 0) return '';

      return errorLogs.map((log, index) => formatErrorRecord(log, index)).join('\n---\n');
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
  },
  {
    persist: true,
  },
);
