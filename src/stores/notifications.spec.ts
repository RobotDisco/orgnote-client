import { setActivePinia, createPinia } from 'pinia';
import { useNotificationsStore } from './notifications';
import { Notify } from 'quasar';
import { test, expect, vi, beforeEach } from 'vitest';

vi.mock('quasar', () => ({
  Notify: {
    create: vi.fn(() => vi.fn()),
  },
}));

vi.mock('src/boot/i18n', () => ({
  i18n: {
    global: {
      t: vi.fn((key: string) => key),
    },
  },
}));

vi.mock('./config', () => {
  const { ref } = require('vue');
  return {
    useConfigStore: vi.fn(() => ({
      config: ref({ ui: { notificationTimeout: 3000 } }),
    })),
  };
});

vi.mock('src/composables/use-screen-detection', () => ({
  useScreenDetection: vi.fn(() => ({
    tabletBelow: { value: false },
  })),
}));

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

test('NotificationsStore should create and store notification with correct config', () => {
  const store = useNotificationsStore();

  store.notify({
    message: 'Test message',
    level: 'info',
  });

  expect(Notify.create).toHaveBeenCalledWith(
    expect.objectContaining({
      message: 'Test message',
      type: 'info',
      timeout: 3000,
      position: 'bottom-right',
    }),
  );
  expect(store.notifications).toHaveLength(1);
  expect(store.notifications[0]?.config.message).toBe('Test message');
  expect(store.notifications[0]?.read).toBe(false);
});

test('NotificationsStore should use message as group by default', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test' });

  expect(Notify.create).toHaveBeenCalledWith(
    expect.objectContaining({
      group: 'Test',
    }),
  );
});

test('NotificationsStore should disable grouping when group prop is false', () => {
  const store = useNotificationsStore();

  store.notify({
    message: 'Test',
    group: false,
  });

  expect(Notify.create).toHaveBeenCalledWith(
    expect.objectContaining({
      group: false,
    }),
  );
});

test('NotificationsStore should support custom timeout and closable', () => {
  const store = useNotificationsStore();

  store.notify({
    message: 'Custom',
    timeout: 5000,
    closable: true,
  });

  expect(Notify.create).toHaveBeenCalledWith(
    expect.objectContaining({
      timeout: 5000,
      closeBtn: expect.any(String),
    }),
  );
});

test('NotificationsStore should remove all notifications and call dismiss on clear', () => {
  const mockDismiss1 = vi.fn();
  const mockDismiss2 = vi.fn();
  (Notify.create as ReturnType<typeof vi.fn>)
    .mockReturnValueOnce(mockDismiss1)
    .mockReturnValueOnce(mockDismiss2);

  const store = useNotificationsStore();

  store.notify({ message: 'Message 1' });
  store.notify({ message: 'Message 2' });

  expect(store.notifications).toHaveLength(2);

  store.clear();

  expect(mockDismiss1).toHaveBeenCalled();
  expect(mockDismiss2).toHaveBeenCalled();
  expect(store.notifications).toHaveLength(0);
});

test('NotificationsStore should remove specific notification by id on delete', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Message 1', id: 'id-1' });
  store.notify({ message: 'Message 2', id: 'id-2' });

  expect(store.notifications).toHaveLength(2);

  store.delete('id-1');

  expect(store.notifications).toHaveLength(1);
  expect(store.notifications[0]?.config.id).toBe('id-2');
});

test('NotificationsStore should mark notification as read by id', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id' });

  expect(store.notifications[0]?.read).toBe(false);

  store.markAsRead('test-id');

  expect(store.notifications[0]?.read).toBe(true);
});

test('NotificationsStore should not change read state when id not found on markAsRead', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id' });

  expect(store.notifications[0]?.read).toBe(false);

  store.markAsRead('non-existent-id');

  expect(store.notifications[0]?.read).toBe(false);
});

test('NotificationsStore should support different notification levels', () => {
  const store = useNotificationsStore();
  const levels = ['info', 'warning', 'danger'] as const;

  levels.forEach((level) => {
    vi.clearAllMocks();
    store.notify({ message: `${level} message`, level });

    expect(Notify.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: level }),
    );
  });
});

test('NotificationsStore should handle notifications without id', () => {
  const store = useNotificationsStore();

  store.notify({ message: 'No ID' });

  expect(store.notifications).toHaveLength(1);
  expect(store.notifications[0]?.config.id).toBeUndefined();

  store.delete('any-id');

  expect(store.notifications).toHaveLength(1);
});

test('NotificationsStore should call dismiss when deleting notification by id', () => {
  const mockDismiss = vi.fn();
  (Notify.create as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockDismiss);

  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id' });

  expect(store.notifications).toHaveLength(1);

  store.delete('test-id');

  expect(store.notifications).toHaveLength(0);
  expect(mockDismiss).toHaveBeenCalled();
});

test('NotificationsStore should not call dismiss when notification id not found on delete', () => {
  const mockDismiss = vi.fn();
  (Notify.create as ReturnType<typeof vi.fn>).mockReturnValueOnce(mockDismiss);

  const store = useNotificationsStore();

  store.notify({ message: 'Test', id: 'test-id' });

  store.delete('non-existent-id');

  expect(mockDismiss).not.toHaveBeenCalled();
  expect(store.notifications).toHaveLength(1);
});

test('NotificationsStore should call dismiss for each deleted notification when multiple exist', () => {
  const mockDismiss1 = vi.fn();
  const mockDismiss2 = vi.fn();
  const mockDismiss3 = vi.fn();
  (Notify.create as ReturnType<typeof vi.fn>)
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

test('NotificationsStore should store dismiss function for each notification', () => {
  const mockDismiss1 = vi.fn();
  const mockDismiss2 = vi.fn();
  (Notify.create as ReturnType<typeof vi.fn>)
    .mockReturnValueOnce(mockDismiss1)
    .mockReturnValueOnce(mockDismiss2);

  const store = useNotificationsStore();

  store.notify({ message: 'Message 1' });
  store.notify({ message: 'Message 2' });

  expect(store.notifications[0]?.dismiss).toBe(mockDismiss1);
  expect(store.notifications[1]?.dismiss).toBe(mockDismiss2);
});
