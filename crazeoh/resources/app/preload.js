// preload.js
// @ts-ignore
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronRequestFullscreen', () => {
  ipcRenderer.send('enable-fullscreen');
});
