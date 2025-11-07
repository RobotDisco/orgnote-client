import { defineStore, storeToRefs } from 'pinia';
import { I18N, type NotificationConfig, type NotificationsStore } from 'orgnote-api';
import { ref } from 'vue';
import { Notify } from 'quasar';
import { i18n } from 'src/boot/i18n';
import { useConfigStore } from './config';
import { useScreenDetection } from 'src/composables/use-screen-detection';

export const useNotificationsStore = defineStore<'notifications', NotificationsStore>(
  'notifications',
  (): NotificationsStore => {
    const notifications = ref<
      {
        read?: boolean;
        config: NotificationConfig;
      }[]
    >([]);

    const { config } = storeToRefs(useConfigStore());

    const screenDetection = useScreenDetection();
    const position = screenDetection.tabletBelow.value ? 'bottom' : 'bottom-right';

    const notify = (notificationConfig: NotificationConfig): void => {
      Notify.create({
        message: notificationConfig.message,
        caption: notificationConfig.caption,
        timeout: notificationConfig.timeout ?? config.value.ui.notificationTimeout ?? 5000,
        type: notificationConfig.level || 'info',
        group: notificationConfig.group ?? notificationConfig.message,
        classes: 'notification',
        closeBtn: notificationConfig.closable && i18n.global.t(I18N.CLOSE),
        position,
      });

      notifications.value.push({
        read: false,
        config: notificationConfig,
      });
    };

    const clear = (): void => {
      notifications.value = [];
    };

    const deleteNotification = (notificationId: string): void => {
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

    return {
      notify,
      clear,
      delete: deleteNotification,
      markAsRead,
      notifications,
    };
  },
  {
    persist: true,
  },
);
