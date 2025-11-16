import { mount } from '@vue/test-utils';
import { vi, test, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import ErrorPage from './ErrorPage.vue';
import type { LogRecord } from 'orgnote-api';
import type { VueWrapper } from '@vue/test-utils';

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const createMockLogRecord = (overrides?: Partial<LogRecord>): LogRecord => ({
  ts: new Date('2024-01-15T10:30:00Z'),
  level: 'error',
  message: 'Test error message',
  context: { stack: 'Error: Test\n  at test.ts:10', custom: 'data' },
  ...overrides,
});

const createMockErrorBuffer = (text: string, count: number) => ({
  exportAsText: () => text,
  getAll: () => Array(count).fill({}),
});

const mockLogRepositoryQuery = vi.fn();
const mockLocationAssign = vi.fn();
const wrappers: VueWrapper[] = [];

beforeEach(() => {
  setActivePinia(createPinia());
  delete (window as Window & { __errorBuffer?: unknown }).__errorBuffer;
  vi.clearAllMocks();
  vi.clearAllTimers();
  
  wrappers.forEach((w) => w.unmount());
  wrappers.length = 0;
  
  Object.defineProperty(window, 'location', {
    value: { assign: mockLocationAssign },
    writable: true,
    configurable: true,
  });
});

vi.mock('src/boot/repositories', () => ({
  repositories: {
    logRepository: {
      query: (...args: unknown[]) => mockLogRepositoryQuery(...args),
    },
  },
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    name: 'Error',
  }),
}));

const mountErrorPage = (options = {}) => {
  const wrapper = mount(ErrorPage, {
    global: {
      stubs: {
        PageWrapper: false,
        ContainerLayout: false,
        InfoCard: true,
        AppCard: false,
        ActionButton: true,
        ActionButtons: false,
        AppButton: false,
      },
      mocks: {
        $t: (key: string) => key,
      },
      ...options,
    },
  });
  wrappers.push(wrapper);
  return wrapper;
};

test('ErrorPage loads and displays only fallback errors when no app errors exist', async () => {
  (window as Window & { __errorBuffer?: unknown }).__errorBuffer = createMockErrorBuffer(
    'Fallback error text',
    1,
  );
  mockLogRepositoryQuery.mockResolvedValue([]);

  const wrapper = mountErrorPage();

  await wrapper.vm.$nextTick();
  await flushPromises();

  const pre = wrapper.find('pre');
  expect(pre.text()).toBe('Fallback error text');
  expect(mockLogRepositoryQuery).toHaveBeenCalledWith({
    level: 'error',
    limit: 50,
    offset: 0,
  });
});

test('ErrorPage loads and displays only app errors when fallback buffer is empty', async () => {
  const mockError = createMockLogRecord();
  mockLogRepositoryQuery.mockResolvedValue([mockError]);

  const wrapper = mountErrorPage();
  await flushPromises();

  const pre = wrapper.find('pre');
  expect(pre.text()).toContain('Test error message');
  expect(pre.text()).toContain('Error: Test');
});

test('ErrorPage loads and displays combined errors when both sources have errors', async () => {
  (window as Window & { __errorBuffer?: unknown }).__errorBuffer = createMockErrorBuffer(
    'Boot error',
    1,
  );
  mockLogRepositoryQuery.mockResolvedValue([createMockLogRecord()]);

  const wrapper = mountErrorPage();
  await flushPromises();

  const pre = wrapper.find('pre');
  expect(pre.text()).toContain('error.boot_errors');
  expect(pre.text()).toContain('Boot error');
  expect(pre.text()).toContain('error.app_errors');
  expect(pre.text()).toContain('Test error message');
});

test('ErrorPage displays no errors message when both sources are empty', async () => {
  mockLogRepositoryQuery.mockResolvedValue([]);

  const wrapper = mountErrorPage();
  await flushPromises();

  const pre = wrapper.find('pre');
  expect(pre.exists()).toBe(true);
  expect(pre.text()).toBe('error.no_errors');
});

test('ErrorPage handles missing fallback buffer gracefully', async () => {
  delete (window as Window & { __errorBuffer?: unknown }).__errorBuffer;
  mockLogRepositoryQuery.mockResolvedValue([]);

  const wrapper = mountErrorPage();
  await flushPromises();

  expect(wrapper.vm).toBeDefined();
  const pre = wrapper.find('pre');
  expect(pre.exists()).toBe(true);
  expect(pre.text()).toBe('error.no_errors');
});

test('ErrorPage handles logRepository query failure gracefully', async () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  mockLogRepositoryQuery.mockRejectedValue(new Error('DB connection failed'));

  const wrapper = mountErrorPage();
  await flushPromises();

  expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load error logs:', expect.any(Error));
  expect(wrapper.vm).toBeDefined();

  consoleErrorSpy.mockRestore();
});

test('ErrorPage reload button calls window.location.assign with root path', async () => {
  mockLogRepositoryQuery.mockResolvedValue([]);
  const wrapper = mountErrorPage();
  await flushPromises();

  const reloadButton = wrapper.findComponent({ name: 'AppButton' });
  await reloadButton.trigger('click');

  expect(mockLocationAssign).toHaveBeenCalledWith('/');
  expect(mockLocationAssign).toHaveBeenCalledTimes(1);
});

test('ErrorPage formats app errors with timestamp message stack and context', async () => {
  const mockError = createMockLogRecord({
    ts: new Date('2024-01-15T10:30:00Z'),
    message: 'Critical error occurred',
    context: {
      stack: 'Error: Critical\n  at handler.ts:42',
      userId: 'user-123',
      action: 'save_file',
    },
  });
  mockLogRepositoryQuery.mockResolvedValue([mockError]);

  const wrapper = mountErrorPage();
  await flushPromises();

  const pre = wrapper.find('pre');
  const text = pre.text();

  expect(text).toContain('[1] 2024-01-15T10:30:00.000Z');
  expect(text).toContain('Critical error occurred');
  expect(text).toContain('Error: Critical\n  at handler.ts:42');
  expect(text).toContain('"userId": "user-123"');
  expect(text).toContain('"action": "save_file"');
});

test('ErrorPage formats app errors without stack trace', async () => {
  const mockError = createMockLogRecord({
    context: { custom: 'data' },
  });
  mockLogRepositoryQuery.mockResolvedValue([mockError]);

  const wrapper = mountErrorPage();
  await flushPromises();

  const text = wrapper.find('pre').text();
  expect(text).toContain('Test error message');
  expect(text).toContain('"custom": "data"');
  expect(text).not.toContain('Error: Test');
});

test('ErrorPage formats app errors without context', async () => {
  const mockError = createMockLogRecord({
    context: undefined,
  });
  mockLogRepositoryQuery.mockResolvedValue([mockError]);

  const wrapper = mountErrorPage();
  await flushPromises();

  const text = wrapper.find('pre').text();
  expect(text).toContain('2024-01-15T10:30:00.000Z');
  expect(text).toContain('Test error message');
  expect(text).not.toContain('Context:');
});

test('ErrorPage formats app errors with empty context object', async () => {
  const mockError = createMockLogRecord({
    context: { stack: 'Error stack' },
  });
  mockLogRepositoryQuery.mockResolvedValue([mockError]);

  const wrapper = mountErrorPage();
  await flushPromises();

  const text = wrapper.find('pre').text();
  expect(text).toContain('Error stack');
  expect(text).not.toContain('Context:');
});

test('ErrorPage formats multiple errors with correct numbering and separators', async () => {
  const errors = [
    createMockLogRecord({ message: 'First error' }),
    createMockLogRecord({ message: 'Second error' }),
    createMockLogRecord({ message: 'Third error' }),
  ];
  mockLogRepositoryQuery.mockResolvedValue(errors);

  const wrapper = mountErrorPage();
  await flushPromises();

  const text = wrapper.find('pre').text();
  expect(text).toContain('[3]');
  expect(text).toContain('First error');
  expect(text).toContain('---');
  expect(text).toContain('[2]');
  expect(text).toContain('Second error');
  expect(text).toContain('[1]');
  expect(text).toContain('Third error');
});

test('ErrorPage passes errorLog to ActionButton copy-text prop', async () => {
  const mockError = createMockLogRecord({ message: 'Error to copy' });
  mockLogRepositoryQuery.mockResolvedValue([mockError]);

  const wrapper = mount(ErrorPage, {
    global: {
      stubs: {
        PageWrapper: false,
        ContainerLayout: false,
        InfoCard: true,
        AppCard: false,
        ActionButtons: false,
        AppButton: false,
      },
      mocks: {
        $t: (key: string) => key,
      },
    },
  });
  await flushPromises();

  const actionButton = wrapper.findComponent({ name: 'ActionButton' });
  expect(actionButton.props('copyText')).toContain('Error to copy');
});

test('ErrorPage displays correct i18n keys in InfoCard and buttons', async () => {
  mockLogRepositoryQuery.mockResolvedValue([]);

  const wrapper = mount(ErrorPage, {
    global: {
      stubs: {
        PageWrapper: false,
        ContainerLayout: false,
        AppCard: false,
        ActionButton: true,
        ActionButtons: false,
      },
      mocks: {
        $t: (key: string) => key,
      },
    },
  });
  await flushPromises();

  const infoCard = wrapper.findComponent({ name: 'InfoCard' });
  expect(infoCard.props('title')).toBe('error.critical_error');
  expect(infoCard.props('description')).toBe('error.description');

  const reloadButton = wrapper.findComponent({ name: 'AppButton' });
  expect(reloadButton.text()).toBe('error.reload');
});
