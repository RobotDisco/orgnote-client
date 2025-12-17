import { nativeMobileOnly } from 'src/utils/platform-specific';
import { getCssVar } from 'src/utils/css-utils';
import type { BackgroundSettings } from 'orgnote-api';
import { useConfigStore } from 'src/stores/config';

export const useBackgroundSettings = () => {
  const { config } = useConfigStore();

  const setStatusBarBackground = async (bgColor?: string) => {
    const backgroundColor = getCssVar(bgColor ?? 'bg');
    if (!backgroundColor) {
      return;
    }
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const style = config.ui.theme === 'dark' ? Style.Dark : Style.Light;
    await StatusBar.setBackgroundColor({ color: backgroundColor });
    StatusBar.setStyle({ style });
  };

  const setBottomBarBackground = async (bgColor?: string) => {
    const backgroundColor = getCssVar(bgColor ?? 'bg');
    if (!backgroundColor) {
      return;
    }
    const { NavigationBar } = await import('@hugotomazi/capacitor-navigation-bar');
    await NavigationBar.setColor({
      color: backgroundColor,
    });
  };

  const setBackground = async (bgColor?: string) => {
    setThemeColor(bgColor);
    await Promise.all([setStatusBarBackground(bgColor), setBottomBarBackground(bgColor)]);
  };

  function setThemeColor(bgColor?: string): void {
    const backgroundColor = getCssVar(bgColor ?? 'bg');
    if (!backgroundColor) {
      return;
    }

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', backgroundColor);
      return;
    }

    const newMeta = document.createElement('meta');
    newMeta.name = 'theme-color';
    newMeta.content = backgroundColor;
    document.head.appendChild(newMeta);
  }

  const bgSettings: BackgroundSettings = {
    setBottomBarBackground: nativeMobileOnly(setBottomBarBackground),
    setStatusBarBackground: nativeMobileOnly(setStatusBarBackground),
    setBackground: nativeMobileOnly(setBackground),
  };

  return bgSettings;
};
