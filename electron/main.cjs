/**
 * Electron main process for the Windows / macOS / Linux desktop builds.
 * Loads the Vite production build from dist/ and exposes a tiny, sandboxed
 * API (quit, fullscreen) to the game through preload.cjs.
 */
const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('node:path');

const isDev = !app.isPackaged && process.env.LUMEN_DEV_URL;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 450,
    backgroundColor: '#1b1f3b',
    title: 'Lumen Leap',
    icon: path.join(__dirname, '..', 'build-resources', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  // Open external links in the user's browser, never inside the game window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());

  if (isDev) win.loadURL(process.env.LUMEN_DEV_URL);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  // F11 toggles fullscreen on every platform.
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen());
  });
  return win;
}

ipcMain.on('lumen:quit', () => app.quit());
ipcMain.on('lumen:toggle-fullscreen', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win) win.setFullScreen(!win.isFullScreen());
});

app.whenReady().then(() => {
  if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
