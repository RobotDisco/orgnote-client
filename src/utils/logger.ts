import pino from 'pino';
import type { OrgNoteApi, LogRecord, LogLevel, LoggerRepository } from 'orgnote-api';
import { createBufferedSink } from './log-sink';
import type { LogSink } from './log-sink';

type Logger = OrgNoteApi['utils']['logger'];

const LEVEL_MAP: Record<string, LogLevel> = {
  error: 'error',
  warn: 'warn',
  info: 'info',
  debug: 'debug',
  trace: 'trace',
  fatal: 'error',
};

const getBrowserConfig = () => ({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  browser: {
    asObject: true,
    transmit: {
      level: 'trace',
      send: (lvl: string, logEvent: pino.LogEvent) => {
        const mapped = LEVEL_MAP[lvl] ?? 'info';
        const ts = new Date(logEvent.ts);
        const first = logEvent.messages?.[0];
        const msg = typeof first === 'string' ? first : String(first);
        const b0 = Array.isArray(logEvent.bindings) && logEvent.bindings.length > 0 ? logEvent.bindings[0] : {};
        const ctx = typeof first === 'object' && first !== null ? (first as Record<string, unknown>) : undefined;
        const record: LogRecord = { ts, level: mapped, message: msg, bindings: b0, context: ctx };
        sink.write(record);
      },
    },
  },
});

const getServerConfig = () => ({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  hooks: {
    logMethod(inputArgs: unknown[], method: (...args: unknown[]) => void, level: number) {
      const keys = Object.keys(LEVEL_MAP);
      const key = keys[level] ?? 'info';
      const mapped = LEVEL_MAP[key] ?? 'info';
      const a0 = inputArgs[0];
      const a1 = inputArgs[1];
      const msg0 = typeof a0 === 'string' ? a0 : '';
      const msg1 = typeof a1 === 'string' ? a1 : '';
      const msg = msg0 || msg1;
      const ctx = typeof a0 === 'object' && a0 !== null ? (a0 as Record<string, unknown>) : undefined;
      const record: LogRecord = { ts: new Date(), level: mapped, message: msg, bindings: {}, context: ctx };
      sink.write(record);
      method.apply(this, inputArgs);
    },
  },
});

const sink: LogSink = createBufferedSink({
  batchSize: 25,
  flushIntervalMs: 2000,
  maxQueue: 5000,
  retentionDays: 14,
  maxRecords: 50000,
});

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const createLogMethod = (pinoLogger: pino.Logger, method: keyof pino.Logger) =>
  (msg: string, ...args: unknown[]) => {
    const first = args[0];
    const hasObjectArg = isRecord(first);
    if (hasObjectArg) {
      (pinoLogger[method] as (obj: Record<string, unknown>, msg: string) => void)(first, msg);
      return;
    }
    (pinoLogger[method] as (msg: string) => void)(msg);
  };

const createLoggerAdapter = (pinoLogger: pino.Logger): Logger => ({
  info: createLogMethod(pinoLogger, 'info'),
  error: createLogMethod(pinoLogger, 'error'),
  warn: createLogMethod(pinoLogger, 'warn'),
  debug: createLogMethod(pinoLogger, 'debug'),
  trace: createLogMethod(pinoLogger, 'trace'),
  child: (bindings: Record<string, unknown>) => {
    const childPino = pinoLogger.child(bindings);
    return createLoggerAdapter(childPino);
  },
});

const createPinoLogger = (): Logger => {
  const isClient = !!process.env.CLIENT;
  const config = isClient ? getBrowserConfig() : getServerConfig();
  const pinoInstance = pino(config);

  return createLoggerAdapter(pinoInstance);
};

const attachLogRepository = (repo: LoggerRepository): void => {
  sink.attachRepository(repo);
};

export { createPinoLogger, attachLogRepository };
