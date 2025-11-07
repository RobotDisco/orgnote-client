import type { OrgNoteApi } from 'orgnote-api';
import { isPresent } from './nullable-guards';

type LogLevel = 'error' | 'warn' | 'info';
type Logger = OrgNoteApi['utils']['logger'];
type ErrorReporterNotifications = Pick<
  ReturnType<OrgNoteApi['core']['useNotifications']>,
  'notify'
>;
type StoreDef = ReturnType<OrgNoteApi['core']['useNotifications']>;
type NotificationConfig = Parameters<StoreDef['notify']>[0];
type ReportOptions = { level?: LogLevel; notification?: NotificationConfig };

const LOG_LEVEL_TO_VARIANT: Record<LogLevel, 'danger' | 'warning' | 'info'> = {
  error: 'danger',
  warn: 'warning',
  info: 'info',
};

const toStyleVariant = (level: LogLevel) => LOG_LEVEL_TO_VARIANT[level];

interface ResultWithError<E> {
  error: E;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && isPresent(v);
const isError = (v: unknown): v is Error => v instanceof Error;
const pickMessage = (v: unknown, fallback: string): string => {
  if (isError(v)) return v.message;
  if (typeof v === 'string') return v;
  if (isRecord(v) && typeof (v as { message?: unknown }).message === 'string')
    return (v as { message: string }).message;
  return fallback;
};
const toLogContext = (v: unknown): Record<string, unknown> => {
  if (isError(v)) return { cause: v.cause, stack: v.stack };
  return { cause: v };
};

const createReportFunction =
  (logger: Logger, notifications: ErrorReporterNotifications, level: LogLevel) =>
  (error: unknown, options?: ReportOptions): void => {
    const message = pickMessage(error, 'Unknown error');
    const context = toLogContext(error);
    const lvl = options?.level ?? level;
    logger[lvl](message, context);
    const base: NotificationConfig = { message, level: toStyleVariant(lvl) } as NotificationConfig;
    const provided = options?.notification;
    const finalConfig: NotificationConfig = provided
      ? ({
          ...provided,
          message: provided.message ?? base.message,
          level: (provided.level as NotificationConfig['level']) ?? base.level,
        } as NotificationConfig)
      : base;
    notifications.notify(finalConfig);
  };

const createReportResultFunction =
  (logger: Logger, notifications: ErrorReporterNotifications, level: LogLevel) =>
  <E>(result: ResultWithError<E>, message: string, options?: ReportOptions): void => {
    const error = new Error(message, { cause: result.error });
    const lvl = options?.level ?? level;
    logger[lvl](error.message, {
      cause: error.cause,
      stack: error.stack,
    });
    const base: NotificationConfig = {
      message: error.message,
      level: toStyleVariant(lvl),
    } as NotificationConfig;
    const provided = options?.notification;
    const finalConfig: NotificationConfig = provided
      ? ({
          ...provided,
          message: provided.message ?? base.message,
          level: (provided.level as NotificationConfig['level']) ?? base.level,
        } as NotificationConfig)
      : base;
    notifications.notify(finalConfig);
  };

const createErrorReporter = (logger: Logger, notifications: ErrorReporterNotifications) => ({
  report: (error: unknown, options?: ReportOptions): void => {
    const reportFn = createReportFunction(logger, notifications, 'error');
    reportFn(error, options);
  },

  reportResult: <E>(result: ResultWithError<E>, message: string, options?: ReportOptions): void => {
    const reportResultFn = createReportResultFunction(logger, notifications, 'error');
    reportResultFn(result, message, options);
  },

  reportError: (error: unknown, notification?: NotificationConfig): void => {
    const reportFn = createReportFunction(logger, notifications, 'error');
    reportFn(error, { notification });
  },

  reportWarning: (error: unknown, notification?: NotificationConfig): void => {
    const reportFn = createReportFunction(logger, notifications, 'warn');
    reportFn(error, { notification });
  },

  reportInfo: (error: unknown, notification?: NotificationConfig): void => {
    const reportFn = createReportFunction(logger, notifications, 'info');
    reportFn(error, { notification });
  },
});

type ErrorReporter = ReturnType<typeof createErrorReporter>;

export type { ErrorReporterNotifications, ErrorReporter };
export { createErrorReporter };
