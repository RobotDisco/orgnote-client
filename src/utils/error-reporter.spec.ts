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

let errorReporter: ReturnType<typeof createErrorReporter>;

beforeEach(() => {
  vi.clearAllMocks();
  errorReporter = createErrorReporter(mockLogger, mockNotifications);
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
  });
});

test('report handles different log levels', () => {
  const error = new Error('Test warning');
  
  errorReporter.report(error, 'warn');
  
  expect(mockLogger.warn).toHaveBeenCalledWith('Test warning', {
    cause: error.cause,
    stack: error.stack,
  });
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message: 'Test warning',
    level: 'warning',
  });
});

test('report handles error with cause', () => {
  const originalError = new Error('Original error');
  const error = new Error('User friendly message', { cause: originalError });
  
  errorReporter.report(error);
  
  expect(mockLogger.error).toHaveBeenCalledWith('User friendly message', {
    cause: originalError,
    stack: error.stack,
  });
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message: 'User friendly message',
    level: 'danger',
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
  });
});

test('reportResult handles different log levels', () => {
  const resultError = { error: 'Warning condition' };
  const message = 'Warning';
  
  errorReporter.reportResult(resultError, message, 'warn');
  
  expect(mockLogger.warn).toHaveBeenCalledWith(message, {
    cause: 'Warning condition',
    stack: expect.any(String),
  });
  expect(mockNotifications.notify).toHaveBeenCalledWith({
    message,
    level: 'warning',
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
  });
});
