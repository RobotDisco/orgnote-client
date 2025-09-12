import type { OrgNoteApi } from 'orgnote-api';

type LogLevel = 'error' | 'warn' | 'info';
type Logger = OrgNoteApi['utils']['logger'];
type ErrorReporterNotifications = Pick<
  ReturnType<OrgNoteApi['core']['useNotifications']>,
  'notify'
>;

const LOG_LEVEL_TO_VARIANT: Record<LogLevel, 'danger' | 'warning' | 'info'> = {
  error: 'danger',
  warn: 'warning',
  info: 'info'
};

const toStyleVariant = (level: LogLevel) => LOG_LEVEL_TO_VARIANT[level];

interface ResultWithError<E> {
  error: E;
}

const createReportFunction = (
  logger: Logger,
  notifications: ErrorReporterNotifications,
  level: LogLevel
) => 
  (error: Error): void => {
    logger[level](error.message, {
      cause: error.cause,
      stack: error.stack
    });
    notifications.notify({ message: error.message, level: toStyleVariant(level) });
  };

const createReportResultFunction = (
  logger: Logger,
  notifications: ErrorReporterNotifications,
  level: LogLevel
) => 
  <E>(result: ResultWithError<E>, message: string): void => {
    const error = new Error(message, { cause: result.error });
    
    logger[level](error.message, {
      cause: error.cause,
      stack: error.stack
    });
    notifications.notify({ message: error.message, level: toStyleVariant(level) });
  };

const createErrorReporter = (logger: Logger, notifications: ErrorReporterNotifications) => ({
  report: (error: Error, level: LogLevel = 'error'): void => {
    const reportFn = createReportFunction(logger, notifications, level);
    reportFn(error);
  },

  reportResult: <E>(result: ResultWithError<E>, message: string, level: LogLevel = 'error'): void => {
    const reportResultFn = createReportResultFunction(logger, notifications, level);
    reportResultFn(result, message);
  },

  reportError: (error: Error): void => {
    const reportFn = createReportFunction(logger, notifications, 'error');
    reportFn(error);
  },

  reportWarning: (error: Error): void => {
    const reportFn = createReportFunction(logger, notifications, 'warn');
    reportFn(error);
  },

  reportInfo: (error: Error): void => {
    const reportFn = createReportFunction(logger, notifications, 'info');
    reportFn(error);
  }
});

type ErrorReporter = ReturnType<typeof createErrorReporter>;

export type { ErrorReporterNotifications, ErrorReporter };
export { createErrorReporter };
