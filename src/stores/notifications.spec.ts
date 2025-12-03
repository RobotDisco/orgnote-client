import { setActivePinia, createPinia } from 'pinia';
import { useNotificationsStore } from './notifications';
import { notify as notiwindNotify } from 'notiwind';
import { test, expect, vi, beforeEach } from 'vitest';
import { NOTIFICATION_GROUP } from 'src/constants/notifications';

const DEFAULT_TIMEOUT = 3000;

vi.mock('notiwind', () => ({
  notify: vi.fn(() => vi.fn()),
}));

vi.mock('./config', async () => {
  const { ref } = await import('vue');
  return {
    useConfigStore: vi.fn(() => ({
      config: ref({ ui: { notificationTimeout: DEFAULT_TIMEOUT } }),
    })),
  };
});

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

test('NotificationsStore notify calls notiwind with correct params', () => {
  const store = useNotificationsStore();

  store.notify({
    message: 'Test message',
    level: 'info',
  });

  expect(notiwindNotify).toHaveBeenCalledWith(
    expect.objectContaining({
      group: NOTIFICATION_GROUP,
      title: 'Test message',
      type: 'info',
    }),
    DEFAULT_TIMEOUT,
  );
  expect(store.notifications).toHaveLength(1);
  expect(store.notifications[0]?.config.message).toBe('Test message');
  expect(store.notifications[0]?.read).toBe(false);
});

test('NotificationsStore notify uses custom timeout', () => {
  const store = useNotificationsStore();

  store.notify({
    message: 'Test',
    timeout: 5000,
  });

  expect(notiwindNotify).toHaveBeenCalledWith(expect.objectContaining({ title: 'Test' }), 5000);
});

test('NotificationsStore notify passes description as text', () => {
  const store = useNotificationsStore();

  store.notify({
    message: 'Title',
    description: 'Description text',
  });

  expect(notiwindNotify).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Title',
      text: 'Description text',
    }),
    DEFAULT_TIMEOUT,
  );
});

test('NotificationsStore notify generates id when not provided', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test' });

  expect(store.notifications[0]?.config.id).toMatch(/^notification-\d+$/);
});

test('NotificationsStore notify uses provided id', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'custom-id' });

  expect(store.notifications[0]?.config.id).toBe('custom-id');
});

test('NotificationsStore clear removes all notifications', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Message 1' });
  store.notify({ message: 'Message 2' });

  expect(store.notifications).toHaveLength(2);

  store.clear();

  expect(store.notifications).toHaveLength(0);
});

test('NotificationsStore delete removes specific notification by id', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Message 1', id: 'id-1' });
  store.notify({ message: 'Message 2', id: 'id-2' });

  expect(store.notifications).toHaveLength(2);

  store.delete('id-1');

  expect(store.notifications).toHaveLength(1);
  expect(store.notifications[0]?.config.id).toBe('id-2');
});

test('NotificationsStore delete does nothing when id not found', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id' });

  store.delete('non-existent-id');

  expect(store.notifications).toHaveLength(1);
});

test('NotificationsStore markAsRead marks notification as read', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id' });

  expect(store.notifications[0]?.read).toBe(false);

  store.markAsRead('test-id');

  expect(store.notifications[0]?.read).toBe(true);
});

test('NotificationsStore markAsRead does nothing when id not found', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id' });

  store.markAsRead('non-existent-id');

  expect(store.notifications[0]?.read).toBe(false);
});

test('NotificationsStore supports different notification levels', () => {
  const store = useNotificationsStore();
  const levels = ['info', 'warning', 'danger'] as const;

  levels.forEach((level) => {
    vi.clearAllMocks();
    store.notify({ message: `${level} message`, level });

    expect(notiwindNotify).toHaveBeenCalledWith(
      expect.objectContaining({ type: level }),
      DEFAULT_TIMEOUT,
    );
  });
});

test('NotificationsStore notify stores dismiss function', () => {
  const mockDismiss = vi.fn();
  vi.mocked(notiwindNotify).mockReturnValueOnce(mockDismiss);

  const store = useNotificationsStore();

  store.notify({ message: 'Test' });

  expect(store.notifications[0]?.dismiss).toBe(mockDismiss);
});

test('NotificationsStore clear calls dismiss for all notifications', () => {
  const mockDismiss1 = vi.fn();
  const mockDismiss2 = vi.fn();
  vi.mocked(notiwindNotify).mockReturnValueOnce(mockDismiss1).mockReturnValueOnce(mockDismiss2);

  const store = useNotificationsStore();

  store.notify({ message: 'Message 1' });
  store.notify({ message: 'Message 2' });

  expect(store.notifications).toHaveLength(2);

  store.clear();

  expect(mockDismiss1).toHaveBeenCalled();
  expect(mockDismiss2).toHaveBeenCalled();
  expect(store.notifications).toHaveLength(0);
});

test('NotificationsStore delete calls dismiss when deleting notification by id', () => {
  const mockDismiss = vi.fn();
  vi.mocked(notiwindNotify).mockReturnValueOnce(mockDismiss);

  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id' });

  expect(store.notifications).toHaveLength(1);

  store.delete('test-id');

  expect(mockDismiss).toHaveBeenCalled();
  expect(store.notifications).toHaveLength(0);
});

test('NotificationsStore delete does not call dismiss when notification id not found', () => {
  const mockDismiss = vi.fn();
  vi.mocked(notiwindNotify).mockReturnValueOnce(mockDismiss);

  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id' });

  store.delete('non-existent-id');

  expect(mockDismiss).not.toHaveBeenCalled();
  expect(store.notifications).toHaveLength(1);
});

test('NotificationsStore delete calls dismiss for correct notification when multiple exist', () => {
  const mockDismiss1 = vi.fn();
  const mockDismiss2 = vi.fn();
  const mockDismiss3 = vi.fn();
  vi.mocked(notiwindNotify)
    .mockReturnValueOnce(mockDismiss1)
    .mockReturnValueOnce(mockDismiss2)
    .mockReturnValueOnce(mockDismiss3);

  const store = useNotificationsStore();

  store.notify({ message: 'Message 1', id: 'id-1' });
  store.notify({ message: 'Message 2', id: 'id-2' });
  store.notify({ message: 'Message 3', id: 'id-3' });

  store.delete('id-2');

  expect(mockDismiss1).not.toHaveBeenCalled();
  expect(mockDismiss2).toHaveBeenCalled();
  expect(mockDismiss3).not.toHaveBeenCalled();
  expect(store.notifications).toHaveLength(2);
  expect(store.notifications.map((n) => n.config.id)).toEqual(['id-1', 'id-3']);
});

test('NotificationsStore hideAll calls dismiss and clears dismiss function', () => {
  const mockDismiss1 = vi.fn();
  const mockDismiss2 = vi.fn();
  vi.mocked(notiwindNotify).mockReturnValueOnce(mockDismiss1).mockReturnValueOnce(mockDismiss2);

  const store = useNotificationsStore();

  store.notify({ message: 'Message 1' });
  store.notify({ message: 'Message 2' });

  store.hideAll();

  expect(mockDismiss1).toHaveBeenCalled();
  expect(mockDismiss2).toHaveBeenCalled();
  expect(store.notifications[0]?.dismiss).toBeUndefined();
  expect(store.notifications[1]?.dismiss).toBeUndefined();
});
