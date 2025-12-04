import type { Command, ExtensionMeta } from 'orgnote-api';
import { DefaultCommands } from 'orgnote-api';
import { api } from 'src/boot/api';
import { searchFilter } from 'src/utils/search-filter';

const getThemeExtensions = (): ExtensionMeta[] => {
  const extensions = api.core.useExtensions();
  return extensions.extensions.filter((ext) => ext.manifest.category === 'theme');
};

const createSelectThemeCommand = (): Command => ({
  command: DefaultCommands.SELECT_THEME,
  group: 'settings',
  icon: 'sym_o_palette',
  description: 'use one of the downloaded themes',
  handler: () => {
    const completion = api.core.useCompletion();
    const themeStore = api.ui.useTheme();

    completion.open<ExtensionMeta>({
      placeholder: 'search themes',
      itemsGetter: (filter: string) => {
        const themes = getThemeExtensions();
        const filteredThemes = themes.filter((t) =>
          searchFilter(filter, t.manifest.name, t.manifest.description, t.manifest.category),
        );

        return {
          total: filteredThemes.length,
          result: filteredThemes.map((t) => ({
            icon: 'sym_o_palette',
            title: t.manifest.name,
            description: t.manifest.description,
            data: t,
            commandHandler: () => themeStore.setTheme(t.manifest.name),
          })),
        };
      },
    });
  },
});

const createResetThemeCommand = (): Command => ({
  command: DefaultCommands.RESET_THEME,
  group: 'settings',
  icon: 'sym_o_palette',
  handler: () => {
    const themeStore = api.ui.useTheme();
    themeStore.resetTheme();
  },
});

const createToggleDarkModeCommand = (): Command => ({
  command: DefaultCommands.TOGGLE_DARK_MODE,
  group: 'settings',
  icon: 'sym_o_dark_mode',
  title: () => {
    const themeStore = api.ui.useTheme();
    return themeStore.isDark ? 'switch to light mode' : 'switch to dark mode';
  },
  handler: () => {
    const themeStore = api.ui.useTheme();
    themeStore.toggleMode();
  },
});

export function getThemeCommands(): Command[] {
  return [createSelectThemeCommand(), createResetThemeCommand(), createToggleDarkModeCommand()];
}
