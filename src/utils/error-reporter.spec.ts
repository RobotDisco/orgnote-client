import { test, expect, vi, beforeEach } from 'vitest';
import { createErrorReporter } from './error-reporter';
import type { ErrorReporterNotifications } from './error-reporter';
import type { OrgNoteApi } from 'orgnote-api';

type StoreDef = ReturnType<OrgNoteApi['core']['useNotifications']>;
type NotificationConfig = Parameters<StoreDef['notify']>[0];

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  child: vi.fn(),
};

const mockNotifications: ErrorReporterNotifications = {
  notify: vi.fn<(config: NotificationConfig) => void>(),
};

const mockExecuteCommand = vi.fn();

let errorReporter: ReturnType<typeof createErrorReporter>;

beforeEach(() => {
  vi.clearAllMocks();
  errorReporter = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);
});

test('createErrorReporter returns proper interface', () => {
  expect(errorReporter).toBeDefined();
  expect(typeof errorReporter.report).toBe('function');
  expect(typeof errorReporter.reportResult).toBe('function');
  expect(typeof errorReporter.reportError).toBe('function');
  expect(typeof errorReporter.reportWarning).toBe('function');
  expect(typeof errorReporter.reportInfo).toBe('function');
});

test('report logs error and shows notification', () => {
  const error = new Error('Test error message');

  errorReporter.report(error);

  expect(mockLogger.error).toHaveBeenCalledWith('Test error message', {
    cause: error.cause,
    stack: error.stack,
  });
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message: 'Test error message',
    level: 'danger',
    onClick: expect.any(Function),
  });
});

test('report handles options.level', () => {
  const error = new Error('Test warning');

  errorReporter.report(error, { level: 'warn' });

  expect(mockLogger.warn).toHaveBeenCalledWith('Test warning', {
    cause: error.cause,
    stack: error.stack,
  });
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message: 'Test warning',
    level: 'warning',
    onClick: expect.any(Function),
  });
});

test('report handles error with cause', () => {
  const originalError = new Error('Original error');
  const error = new Error('User friendly message', { cause: originalError });

  errorReporter.report(error);

  expect(mockLogger.error).toHaveBeenCalledWith('User friendly message', {
    cause: {
      message: originalError.message,
      stack: originalError.stack,
      cause: undefined,
    },
    stack: error.stack,
  });
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message: 'User friendly message',
    level: 'danger',
    onClick: expect.any(Function),
  });
});

test('reportResult works with neverthrow-like Result', () => {
  const resultError = { error: 'File not found' };
  const message = 'Failed to read file';

  errorReporter.reportResult(resultError, message);

  expect(mockLogger.error).toHaveBeenCalledWith(message, {
    cause: 'File not found',
    stack: expect.any(String),
  });
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message,
    level: 'danger',
    onClick: expect.any(Function),
  });
});

test('reportResult handles options.level', () => {
  const resultError = { error: 'Warning condition' };
  const message = 'Warning';

  errorReporter.reportResult(resultError, message, { level: 'warn' });

  expect(mockLogger.warn).toHaveBeenCalledWith(message, {
    cause: 'Warning condition',
    stack: expect.any(String),
  });
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message,
    level: 'warning',
    onClick: expect.any(Function),
  });
});

test('reportError is shortcut for error level', () => {
  const error = new Error('Error message');

  errorReporter.reportError(error);

  expect(mockLogger.error).toHaveBeenCalledWith('Error message', {
    cause: error.cause,
    stack: error.stack,
  });
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message: 'Error message',
    level: 'danger',
    onClick: expect.any(Function),
  });
});

test('reportWarning is shortcut for warn level', () => {
  const error = new Error('Warning message');

  errorReporter.reportWarning(error);

  expect(mockLogger.warn).toHaveBeenCalledWith('Warning message', {
    cause: error.cause,
    stack: error.stack,
  });
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message: 'Warning message',
    level: 'warning',
    onClick: expect.any(Function),
  });
});

test('reportInfo is shortcut for info level', () => {
  const error = new Error('Info message');

  errorReporter.reportInfo(error);

  expect(mockLogger.info).toHaveBeenCalledWith('Info message', {
    cause: error.cause,
    stack: error.stack,
  });
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message: 'Info message',
    level: 'info',
    onClick: expect.any(Function),
  });
});

test('report accepts unknown: string', () => {
  errorReporter.report('String error');
  expect(mockLogger.error).toHaveBeenCalledWith('String error', { cause: 'String error' });
  expect(mockNotifications.notify).toHaveBeenCalledWith({ message: 'String error', level: 'danger', onClick: expect.any(Function) });
});

test('report accepts unknown: object with message', () => {
  const obj = { message: 'Boom', code: 123 } as const;
  errorReporter.report(obj);
  expect(mockLogger.error).toHaveBeenCalledWith('Boom', { cause: obj });
  expect(mockNotifications.notify).toHaveBeenCalledWith({ message: 'Boom', level: 'danger', onClick: expect.any(Function) });
});

test('report accepts unknown: primitive without message', () => {
  errorReporter.report(404);
  expect(mockLogger.error).toHaveBeenCalledWith('Unknown error', { cause: 404 });
  expect(mockNotifications.notify).toHaveBeenCalledWith({ message: 'Unknown error', level: 'danger', onClick: expect.any(Function) });
});

test('reportWarning works with unknown', () => {
  errorReporter.reportWarning('Warn str');
  expect(mockLogger.warn).toHaveBeenCalledWith('Warn str', { cause: 'Warn str' });
  expect(mockNotifications.notify).toHaveBeenCalledWith({ message: 'Warn str', level: 'warning', onClick: expect.any(Function) });
});

test('reportInfo works with unknown', () => {
  errorReporter.reportInfo('Info str');
  expect(mockLogger.info).toHaveBeenCalledWith('Info str', { cause: 'Info str' });
  expect(mockNotifications.notify).toHaveBeenCalledWith({ message: 'Info str', level: 'info', onClick: expect.any(Function) });
});

test('report uses provided notification message and level', () => {
  const err = new Error('Original');
  errorReporter.report(err, { notification: { message: 'Custom', level: 'info' } as NotificationConfig });
  expect(mockLogger.error).toHaveBeenCalledWith('Original', { cause: err.cause, stack: err.stack });
  expect(mockNotifications.notify).toHaveBeenCalledWith({ message: 'Custom', level: 'info', onClick: expect.any(Function) });
});

test('report fills missing notification fields and respects options.level', () => {
  const err = new Error('Warn original');
  errorReporter.report(err, { level: 'warn', notification: { description: 'Desc' } as NotificationConfig });
  expect(mockLogger.warn).toHaveBeenCalledWith('Warn original', { cause: err.cause, stack: err.stack });
  expect(mockNotifications.notify).toHaveBeenCalledWith({ message: 'Warn original', level: 'warning', description: 'Desc', onClick: expect.any(Function) });
});

test('reportError accepts NotificationConfig sugar', () => {
  const err = new Error('Sugar');
  errorReporter.reportError(err, { message: 'Shown', level: 'danger' } as NotificationConfig);
  expect(mockLogger.error).toHaveBeenCalledWith('Sugar', { cause: err.cause, stack: err.stack });
  expect(mockNotifications.notify).toHaveBeenCalledWith({ message: 'Shown', level: 'danger', onClick: expect.any(Function) });
});

test('reportResult accepts notification override', () => {
  const resultError = { error: 'reason' };
  const message = 'Failed';
  errorReporter.reportResult(resultError, message, { notification: { message: 'Shown', level: 'info' } as NotificationConfig });
  expect(mockLogger.error).toHaveBeenCalledWith('Failed', { cause: 'reason', stack: expect.any(String) });
  expect(mockNotifications.notify).toHaveBeenCalledWith({ message: 'Shown', level: 'info', onClick: expect.any(Function) });
});

test('report includes onClick when executeCommand is provided', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);
  const error = new Error('Click test');

  reporterWithCommand.report(error);

  expect(mockNotifications.notify).toHaveBeenCalledWith(
    expect.objectContaining({
      message: 'Click test',
      level: 'danger',
      onClick: expect.any(Function),
    }),
  );
});

test('report onClick executes SHOW_LOGS command', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);
  const error = new Error('Click test');

  reporterWithCommand.report(error);

  const notifyCall = vi.mocked(mockNotifications.notify).mock.calls[0]?.[0];
  notifyCall?.onClick?.();

  expect(mockExecuteCommand).toHaveBeenCalledWith('show logs');
});

test('reportResult includes onClick when executeCommand is provided', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportResult({ error: 'test error' }, 'Result error');

  expect(mockNotifications.notify).toHaveBeenCalledWith(
    expect.objectContaining({
      message: 'Result error',
      level: 'danger',
      onClick: expect.any(Function),
    }),
  );
});

test('reportResult onClick executes SHOW_LOGS command', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportResult({ error: 'test error' }, 'Result error');

  const notifyCall = vi.mocked(mockNotifications.notify).mock.calls[0]?.[0];
  notifyCall?.onClick?.();

  expect(mockExecuteCommand).toHaveBeenCalledWith('show logs');
});

test('reportError includes onClick when executeCommand is provided', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportError(new Error('Error test'));

  expect(mockNotifications.notify).toHaveBeenCalledWith(
    expect.objectContaining({
      message: 'Error test',
      level: 'danger',
      onClick: expect.any(Function),
    }),
  );
});

test('reportError onClick executes SHOW_LOGS command', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportError(new Error('Error test'));

  const notifyCall = vi.mocked(mockNotifications.notify).mock.calls[0]?.[0];
  notifyCall?.onClick?.();

  expect(mockExecuteCommand).toHaveBeenCalledWith('show logs');
});

test('reportWarning includes onClick when executeCommand is provided', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportWarning(new Error('Warning test'));

  expect(mockNotifications.notify).toHaveBeenCalledWith(
    expect.objectContaining({
      message: 'Warning test',
      level: 'warning',
      onClick: expect.any(Function),
    }),
  );
});

test('reportWarning onClick executes SHOW_LOGS command', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportWarning(new Error('Warning test'));

  const notifyCall = vi.mocked(mockNotifications.notify).mock.calls[0]?.[0];
  notifyCall?.onClick?.();

  expect(mockExecuteCommand).toHaveBeenCalledWith('show logs');
});

test('reportInfo includes onClick when executeCommand is provided', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportInfo(new Error('Info test'));

  expect(mockNotifications.notify).toHaveBeenCalledWith(
    expect.objectContaining({
      message: 'Info test',
      level: 'info',
      onClick: expect.any(Function),
    }),
  );
});

test('reportInfo onClick executes SHOW_LOGS command', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportInfo(new Error('Info test'));

  const notifyCall = vi.mocked(mockNotifications.notify).mock.calls[0]?.[0];
  notifyCall?.onClick?.();

  expect(mockExecuteCommand).toHaveBeenCalledWith('show logs');
});

test('reportCritical includes onClick when executeCommand is provided', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportCritical(new Error('Critical test'));

  expect(mockNotifications.notify).toHaveBeenCalledWith(
    expect.objectContaining({
      message: 'Critical error: Critical test',
      level: 'danger',
      timeout: 0,
      onClick: expect.any(Function),
    }),
  );
});

test('reportCritical onClick executes SHOW_LOGS command', () => {
  const mockExecuteCommand = vi.fn();
  const reporterWithCommand = createErrorReporter(mockLogger, mockNotifications, mockExecuteCommand);

  reporterWithCommand.reportCritical(new Error('Critical test'));

  const notifyCall = vi.mocked(mockNotifications.notify).mock.calls[0]?.[0];
  notifyCall?.onClick?.();

  expect(mockExecuteCommand).toHaveBeenCalledWith('show logs');
});
