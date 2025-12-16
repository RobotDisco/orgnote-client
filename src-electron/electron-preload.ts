import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  setHeaderColor: (color: string) => ipcRenderer.invoke('setHeaderColor', color),
});
