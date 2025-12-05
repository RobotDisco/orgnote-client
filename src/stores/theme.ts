import { defineStore, storeToRefs } from 'pinia';
import type { ThemeStore, ThemeMode, ThemeColors } from 'orgnote-api';
import { THEME_VARIABLES } from 'orgnote-api';
import { computed, watch } from 'vue';
import { useConfigStore } from './config';
import { useExtensionsStore } from './extension';
import { Dark } from 'quasar';
import { getCssTheme, resetCSSVariables } from 'src/utils/css-utils';
import { useBackgroundSettings } from 'src/composables/background';
import { to } from 'src/utils/to-error';

export const useThemeStore = defineStore<'theme', ThemeStore>('theme', () => {
  const { config } = storeToRefs(useConfigStore());
  const extensionsStore = useExtensionsStore();

  let initialThemeColors: ThemeColors | null = null;

  const getInitialThemeColors = (): ThemeColors => {
    if (!initialThemeColors) {
      initialThemeColors = getCssTheme([...THEME_VARIABLES]);
    }
    return initialThemeColors;
  };

  const isDark = computed(() => Dark.isActive);

  const effectiveMode = computed<'light' | 'dark'>(() => (isDark.value ? 'dark' : 'light'));

  const activeThemeName = computed<string | null>(() => {
    return isDark.value ? config.value.ui.darkThemeName : config.value.ui.lightThemeName;
  });

  const syncQuasarDarkMode = (): void => {
    const mode = config.value.ui.theme;
    Dark.set(mode === 'auto' ? 'auto' : mode === 'dark');
  };

  const syncBackgroundSettings = async (): Promise<void> => {
    const backgroundSettings = useBackgroundSettings();
    await backgroundSettings.setBackground();
  };

  const activateThemeExtension = async (themeName: string | null): Promise<void> => {
    if (!themeName) {
      return;
    }

    const isThemeExtensionExist = extensionsStore.isExtensionExist(themeName);
    if (!isThemeExtensionExist) {
      return;
    }

    await extensionsStore.enableExtension(themeName);
  };

  const switchThemeExtension = async (
    previousThemeName: string | null,
    newThemeName: string | null,
  ): Promise<void> => {
    if (previousThemeName === newThemeName) {
      return;
    }
    if (previousThemeName) {
      await extensionsStore.disableExtension(previousThemeName);
    }
    await activateThemeExtension(newThemeName);
  };

  const setMode = async (mode: ThemeMode): Promise<void> => {
    config.value.ui.theme = mode;
  };

  const toggleMode = async (): Promise<void> => {
    const newMode = isDark.value ? 'light' : 'dark';
    await setMode(newMode);
  };

  const setThemeNameForCurrentMode = (themeName: string | null): void => {
    if (isDark.value) {
      config.value.ui.darkThemeName = themeName;
      return;
    }
    config.value.ui.lightThemeName = themeName;
  };

  const setTheme = async (themeName: string | null): Promise<void> => {
    resetCSSVariables(getInitialThemeColors());
    setThemeNameForCurrentMode(themeName);
  };

  const resetTheme = async (): Promise<void> => {
    await setTheme(null);
  };

  const sync = async (): Promise<void> => {
    getInitialThemeColors();
    syncQuasarDarkMode();
    await activateThemeExtension(activeThemeName.value);
    await syncBackgroundSettings();
  };

  watch(
    () => config.value.ui.theme,
    () => syncQuasarDarkMode(),
  );

  const safeHandleThemeChange = to(
    async (newTheme: string | null, oldTheme: string | null) => {
      await switchThemeExtension(oldTheme, newTheme);
      await syncBackgroundSettings();
    },
    'Failed to switch theme',
  );

  watch(activeThemeName, (newTheme, oldTheme) => {
    safeHandleThemeChange(newTheme, oldTheme);
  });

  const store: ThemeStore = {
    isDark,
    effectiveMode,
    activeThemeName,

    sync,
    setMode,
    toggleMode,
    setTheme,
    resetTheme,

    getInitialThemeColors,
  };

  return store;
});
