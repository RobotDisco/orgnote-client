import type { IpcRendererEvent } from 'electron';
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  setHeaderColor: (color: string) => ipcRenderer.invoke('setHeaderColor', color),
  auth: (url: string): Promise<{ redirectUrl: string; error?: string }> => {
    return ipcRenderer.invoke('oauth-login', url);
  },
  onNavigate: (callback: (route: string) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, route: string) => callback(route);
    ipcRenderer.on('navigate', handler);
    return () => ipcRenderer.removeListener('navigate', handler);
  },
});
