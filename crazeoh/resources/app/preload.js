// preload.js
// @ts-ignore
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronRequestFullscreen', () => {
  ipcRenderer.send('enable-fullscreen');
});

// Expose a function to open external links in the default browser
contextBridge.exposeInMainWorld('openExternalLink', (url) => {
  ipcRenderer.send('open-external-link', url);
});
