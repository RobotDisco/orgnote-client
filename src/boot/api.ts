import { defineBoot } from '@quasar/app-vite/wrappers';
import type { OrgNoteApi } from 'orgnote-api';
import { ORGNOTE_API_PROVIDER_TOKEN } from 'src/constants/app-providers';
import { repositories } from './repositories';
import { useCommandsGroupStore } from 'src/stores/command-group';
import { useCommandsStore } from 'src/stores/command';
import { useExtensionsStore } from 'src/stores/extension';
import { useFileSystemStore } from 'src/stores/file-system';
import {
  mobileOnly,
  clientOnly,
  androidOnly,
  serverOnly,
  desktopOnly,
} from 'src/utils/platform-specific';
import { useEncryptionStore } from 'src/stores/encryption';
import { useSplashScreen } from 'src/composables/use-splash-screen';
import { getCssVar, useQuasar } from 'quasar';
import {
  getCssTheme,
  getNumericCssVar,
  getCssProperty,
  getCssNumericProperty,
  applyCSSVariables,
  resetCSSVariables,
} from 'src/utils/css-utils';
import { useBackgroundSettings } from 'src/composables/background';
import { useSidebarStore } from 'src/stores/sidebar';
import { useToolbarStore } from 'src/stores/toolbar';
import { useModalStore } from 'src/stores/modal';
import { useSettingsStore } from 'src/stores/settings';
import { useSettingsUiStore } from 'src/stores/settings-ui';
import type { App } from 'vue';
import { copyToClipboard } from 'src/utils/clipboard';
import { uploadFile, uploadFiles } from 'src/utils/file-upload';
import { useConfirmationModal } from 'src/composables/use-confirmation-modal';
import { useCompletionStore } from 'src/stores/completion';
import { usePaneStore } from 'src/stores/pane';
import { useFileSystemManagerStore } from 'src/stores/file-system-manager';
import { useFileManagerStore } from 'src/stores/file-manager';
import { useScreenDetection } from 'src/composables/use-screen-detection';
import { useConfigStore } from 'src/stores/config';
import { useNotificationsStore } from 'src/stores/notifications';
import { useFileReaderStore } from 'src/stores/file-reader';
import { useBufferStore } from 'src/stores/buffer';
import type { Router } from 'vue-router';
import { logger } from './logger';

let api: OrgNoteApi;
async function initApi(app: App, router: Router): Promise<void> {
  api = {
    infrastructure: {
      ...repositories,
    },
    core: {
      useCommands: useCommandsStore,
      useCommandsGroup: useCommandsGroupStore,
      useExtensions: useExtensionsStore,
      useFileSystem: useFileSystemStore,
      useEncryption: useEncryptionStore,
      useSettings: useSettingsStore,
      useCompletion: useCompletionStore,
      useQuasar: useQuasar,
      usePane: usePaneStore,
      useFileSystemManager: useFileSystemManagerStore,
      useFileManager: useFileManagerStore,
      useConfig: useConfigStore,
      useNotifications: useNotificationsStore,
      useFileReader: useFileReaderStore,
      useBuffers: useBufferStore,
      app,
    },
    utils: {
      mobileOnly,
      clientOnly,
      androidOnly,
      serverOnly,
      desktopOnly,

      getCssVar,
      getCssTheme,
      getNumericCssVar,
      getCssProperty,
      getCssNumericProperty,
      applyCSSVariables,
      resetCSSVariables,

      copyToClipboard,

      uploadFile,
      uploadFiles,

      logger,
    },
    ui: {
      useSplashScreen,
      useBackgroundSettings,
      useSidebar: useSidebarStore,
      useToolbar: useToolbarStore,
      useModal: useModalStore,
      useSettingsUi: useSettingsUiStore,
      useConfirmationModal,
      useScreenDetection,
    },
    vue: {
      router,
    },
  };
}

const syncConfigurations = async (api: OrgNoteApi) => {
  await api.core.useConfig().sync();
};

export default defineBoot(async ({ app, store, router }) => {
  logger.info('Booting application and initializing API...');
  const splashScreen = useSplashScreen();
  splashScreen.show();
  logger.info('Start initializing API');
  await initApi(app, router);
  logger.info('API initialized');
  store.use(() => ({ api: api as OrgNoteApi }));
  app.provide(ORGNOTE_API_PROVIDER_TOKEN, api);
  logger.info('Start synchronizing configurations');
  await syncConfigurations(api);
  logger.info('Configurations synchronized');

  splashScreen.hide();
  logger.info('Application boot process finished');
});

export { api };
