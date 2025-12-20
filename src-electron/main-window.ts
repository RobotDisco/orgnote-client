import type { BrowserWindow } from 'electron';
import { BrowserWindow as ElectronBrowserWindow } from 'electron';
import path from 'path';

const TRAFFIC_LIGHT_POSITION = { x: 10, y: 10 };

interface CreateMainWindowOptions {
  currentDir: string;
  protocolScheme: string;
  onClosed: () => void;
}

const buildProductionUrl = (protocolScheme: string): string => `${protocolScheme}://./index.html`;

const loadInitialUrl = async (window: BrowserWindow, protocolScheme: string): Promise<void> => {
  if (process.env.DEV) {
    await window.loadURL(process.env.APP_URL);
    return;
  }
  await window.loadURL(buildProductionUrl(protocolScheme));
};

const configureDevTools = (window: BrowserWindow): void => {
  if (process.env.DEBUGGING) {
    window.webContents.openDevTools();
    return;
  }
  window.webContents.on('devtools-opened', () => {
    window.webContents.closeDevTools();
  });
};

export async function createMainWindow(options: CreateMainWindowOptions): Promise<BrowserWindow> {
  const window = new ElectronBrowserWindow({
    icon: path.resolve(options.currentDir, 'icons/icon.png'),
    width: 1000,
    height: 600,
    useContentSize: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: TRAFFIC_LIGHT_POSITION,
    webPreferences: {
      contextIsolation: true,
      preload: path.resolve(
        options.currentDir,
        path.join(
          process.env.QUASAR_ELECTRON_PRELOAD_FOLDER,
          'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION,
        ),
      ),
    },
  });

  configureDevTools(window);
  window.on('closed', options.onClosed);
  await loadInitialUrl(window, options.protocolScheme);
  return window;
}

