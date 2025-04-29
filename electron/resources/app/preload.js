// @ts-ignore
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron', {
    ipcRenderer: {
      send: (channel, ...args) => {
        // Whitelist channels for send
        const validChannels = ['load-file', 'save-file', 'app-close'];
        if (validChannels.includes(channel)) {
          ipcRenderer.send(channel, ...args);
        }
      },
      on: (channel, func) => {
        // Whitelist channels for receive
        const validChannels = ['file-loaded', 'file-saved', 'error', 'file-selected', 'file-changed'];
        if (validChannels.includes(channel)) {
          // Deliberately strip event as it includes `sender` 
          ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
      },
      invoke: async (channel, ...args) => {
        // Whitelist channels for invoke
        const validChannels = [
          'open-file-dialog', 
          'fs-exists', 
          'fs-readfile',
          'start-file-watch'
        ];
        if (validChannels.includes(channel)) {
          return await ipcRenderer.invoke(channel, ...args);
        }
        throw new Error(`Unauthorized IPC invoke access: ${channel}`);
      },
      sendSync: (channel, ...args) => {
        // Whitelist channels for synchronous messages
        const validChannels = ['path-basename', 'path-dirname', 'path-join'];
        if (validChannels.includes(channel)) {
          return ipcRenderer.sendSync(channel, ...args);
        }
        throw new Error(`Unauthorized IPC sendSync access: ${channel}`);
      }
    }
  }
);