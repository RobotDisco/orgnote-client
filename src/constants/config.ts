import type { OrgNoteConfig } from 'orgnote-api';

export const DEFAULT_PANE_PERSISTENCE_SAVE_DELAY = 500;

export const DEFAULT_CONFIG: OrgNoteConfig = {
  editor: {
    showSpecialSymbols: false,
    showPropertyDrawer: true,
  },
  developer: {
    developerMode: false,
    maximumLogsCount: 1000,
  },
  system: {
    language: 'en-US',
  },
  completion: {
    showGroup: false,
    defaultCompletionLimit: 500,
    fuseThreshold: 0.4,
  },
  synchronization: {
    type: 'api',
  },
  ui: {
    showUserProfiles: true,
    theme: 'light',
    darkThemeName: null,
    lightThemeName: null,
    enableAnimations: true,
    notificationTimeout: 5000,
    persistantPanes: true,
    persistantPanesSaveDelay: DEFAULT_PANE_PERSISTENCE_SAVE_DELAY,
  },
  extensions: {
    sources: ['https://github.com/Artawower/orgnote-extensions'],
  },
  encryption: {
    type: 'disabled',
  },
};
