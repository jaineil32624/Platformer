/** Exposes a minimal, safe desktop API to the game (window.lumenDesktop). */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lumenDesktop', {
  quit: () => ipcRenderer.send('lumen:quit'),
  toggleFullscreen: () => ipcRenderer.send('lumen:toggle-fullscreen'),
  platform: process.platform,
});
