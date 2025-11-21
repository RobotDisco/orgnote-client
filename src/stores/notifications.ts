import { defineStore, storeToRefs } from 'pinia';
import {
  I18N,
  type Notification,
  type NotificationConfig,
  type NotificationsStore,
} from 'orgnote-api';
import { ref } from 'vue';
import { Notify } from 'quasar';
import { i18n } from 'src/boot/i18n';
import { useConfigStore } from './config';
import { useScreenDetection } from 'src/composables/use-screen-detection';

export const useNotificationsStore = defineStore<'notifications', NotificationsStore>(
  'notifications',
  (): NotificationsStore => {
    const notifications = ref<Notification[]>([]);

    const { config } = storeToRefs(useConfigStore());

    const screenDetection = useScreenDetection();
    const position = screenDetection.tabletBelow.value ? 'top' : 'bottom-right';

    const notify = (notificationConfig: NotificationConfig): void => {
      const dismiss = Notify.create({
        message: notificationConfig.message,
        caption: notificationConfig.caption,
        timeout: notificationConfig.timeout ?? config.value.ui.notificationTimeout ?? 5000,
        type: notificationConfig.level || 'info',
        group: notificationConfig.group !== false ? notificationConfig.message : false,
        classes: 'notification',
        closeBtn: notificationConfig.closable && i18n.global.t(I18N.CLOSE),
        position,
      });

      notifications.value.push({
        read: false,
        dismiss,
        config: notificationConfig,
      });
    };

    const clear = (): void => {
      notifications.value.forEach((notification) => {
        notification.dismiss?.();
      });
      notifications.value = [];
    };

    const deleteNotification = (notificationId: string): void => {
      const notification = notifications.value.find(
        (notification) => notification.config.id === notificationId,
      );
      notification?.dismiss?.();
      notifications.value = notifications.value.filter(
        (notification) => notification.config.id !== notificationId,
      );
    };

    const markAsRead = (notificationId: string): void => {
      const notification = notifications.value.find(
        (notification) => notification.config.id === notificationId,
      );
      if (notification) {
        notification.read = true;
      }
    };

    const hideAll = (): void => {
      notifications.value.forEach((n) => {
        n.dismiss?.();
        n.dismiss = undefined;
      });
    };

    return {
      notify,
      clear,
      hideAll,
      delete: deleteNotification,
      markAsRead,
      notifications,
    };
  },
  {
    persist: true,
  },
);
