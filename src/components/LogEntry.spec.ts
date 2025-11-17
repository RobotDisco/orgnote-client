import { mount } from '@vue/test-utils';
import { test, expect, vi } from 'vitest';
import LogEntry from './LogEntry.vue';
import type { LogRecord } from 'orgnote-api';
import * as clipboard from 'src/utils/clipboard';

vi.mock('src/boot/api', () => ({
  api: {
    core: {
      useNotifications: () => ({
        notify: vi.fn(),
      }),
    },
  },
}));

const createMockLog = (overrides?: Partial<LogRecord>): LogRecord => ({
  ts: new Date('2024-01-15T10:30:00.000Z'),
  level: 'error',
  message: 'Test error message',
  ...overrides,
});

test('LogEntry displays position number', () => {
  const log = createMockLog();
  const wrapper = mount(LogEntry, {
    props: { log, position: 5 },
  });

  expect(wrapper.find('.number').text()).toBe('[5]');
});

test('LogEntry displays formatted timestamp', () => {
  const log = createMockLog({ ts: new Date('2024-01-15T10:30:00.000Z') });
  const wrapper = mount(LogEntry, {
    props: { log, position: 1 },
  });

  expect(wrapper.find('.timestamp').text()).toBe('2024-01-15T10:30:00.000Z');
});

test('LogEntry displays log level in uppercase', () => {
  const log = createMockLog({ level: 'warn' });
  const wrapper = mount(LogEntry, {
    props: { log, position: 1 },
  });

  expect(wrapper.find('.level').text()).toBe('WARN');
});

test('LogEntry displays message', () => {
  const log = createMockLog({ message: 'Custom error message' });
  const wrapper = mount(LogEntry, {
    props: { log, position: 1 },
  });

  expect(wrapper.find('.message').text()).toBe('Custom error message');
});

test('LogEntry applies error class for error level', () => {
  const log = createMockLog({ level: 'error' });
  const wrapper = mount(LogEntry, {
    props: { log, position: 1 },
  });

  expect(wrapper.find('.error').exists()).toBe(true);
});

test('LogEntry applies warn class for warn level', () => {
  const log = createMockLog({ level: 'warn' });
  const wrapper = mount(LogEntry, {
    props: { log, position: 1 },
  });

  expect(wrapper.find('.warn').exists()).toBe(true);
});

test('LogEntry copies message to clipboard when no stack', async () => {
  const copyToClipboardSpy = vi.spyOn(clipboard, 'copyToClipboard').mockResolvedValue();
  const log = createMockLog({ message: 'Test error', context: undefined });
  const wrapper = mount(LogEntry, {
    props: { log, position: 1 },
  });

  await wrapper.find('.log-entry').trigger('click');

  expect(copyToClipboardSpy).toHaveBeenCalled();
  const copiedText = copyToClipboardSpy.mock.calls[0]?.[0] as string;
  expect(copiedText).toContain('[1]');
  expect(copiedText).toContain('Test error');
});

test('LogEntry copies stack to clipboard when present', async () => {
  const copyToClipboardSpy = vi.spyOn(clipboard, 'copyToClipboard').mockResolvedValue();
  const log = createMockLog({
    message: 'Test error',
    context: { stack: 'Error: Test error\n  at file.ts:42' },
  });
  const wrapper = mount(LogEntry, {
    props: { log, position: 1 },
  });

  await wrapper.find('.log-entry').trigger('click');

  expect(copyToClipboardSpy).toHaveBeenCalled();
  const copiedText = copyToClipboardSpy.mock.calls[0]?.[0] as string;
  expect(copiedText).toContain('[1]');
  expect(copiedText).toContain('Error: Test error\n  at file.ts:42');
});

test('LogEntry copies context as JSON', async () => {
  const copyToClipboardSpy = vi.spyOn(clipboard, 'copyToClipboard').mockResolvedValue();
  const log = createMockLog({
    message: 'Test error',
    context: { userId: '123', action: 'delete' },
  });
  const wrapper = mount(LogEntry, {
    props: { log, position: 1 },
  });

  await wrapper.find('.log-entry').trigger('click');

  const copiedText = copyToClipboardSpy.mock.calls[0]?.[0] as string;
  expect(copiedText).toContain('Context:');
  expect(copiedText).toContain('"userId"');
  expect(copiedText).toContain('"123"');
  expect(copiedText).toContain('"action"');
  expect(copiedText).toContain('"delete"');
});
