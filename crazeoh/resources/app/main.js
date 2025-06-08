// main.js
// @ts-ignore
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const { globalShortcut } = require('electron');
const path = require('path');

/* ──────────────────────────
 * Chromium / GPU switches
 * ────────────────────────── */
app.commandLine.appendSwitch('disable-gpu-vsync');                 // uncap vsync
app.commandLine.appendSwitch('disable-frame-rate-limit');          // uncap FPS
app.commandLine.appendSwitch('disable-direct-composition');        // fix stutter on non‑primary screens
app.commandLine.appendSwitch('force_high_performance_gpu');        // pick discrete GPU if present
app.commandLine.appendSwitch('use-angle', 'd3d11');                // best backend for WebGL2 on Windows
app.commandLine.appendSwitch('enable-zero-copy');                  // faster texture uploads
app.commandLine.appendSwitch('disable-renderer-backgrounding');    // keep renderer at full priority
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-http-cache');                // always pull fresh assets

/* ──────────────────────────
 * Globals
 * ────────────────────────── */
let mainWindow;

/* ──────────────────────────
 * Helpers
 * ────────────────────────── */
/**
 * Move an existing window to the requested display and
 * bounce out‑then‑in of fullscreen to get true exclusive
 * mode on that monitor.
 * @param {number} displayIndex – index from screen.getAllDisplays()
 */
function moveToDisplayAndFullscreen(displayIndex = 0) {
  const displays = screen.getAllDisplays();
  if (!displays[displayIndex]) return;
  const { bounds } = displays[displayIndex];

  mainWindow.setFullScreen(false);              // leave fullscreen
  mainWindow.setBounds(bounds, false);          // jump without resize flicker
  mainWindow.setFullScreen(true);               // re‑enter exclusive FS
}

/* ──────────────────────────
 * Window bootstrap
 * ────────────────────────── */
function createWindow() {
  mainWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    fullscreen: true,              // start in FS
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
      enableRemoteModule: true,
      webSecurity: false,
      backgroundThrottling: false, // prevent idle throttling
    },
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, './dist/index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => (mainWindow = null));

  /* IPC hook so the renderer can request the hop
   * `ipcRenderer.invoke('move-to-display', 1)`    */
  ipcMain.handle('move-to-display', (_, idx) => moveToDisplayAndFullscreen(idx));
}

app.whenReady().then(() => {
  createWindow();

  // Register Alt+Enter to toggle fullscreen
  globalShortcut.register('Alt+Enter', () => {
    if (!mainWindow) return;
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Unregister shortcuts on quit
  app.on('will-quit', () => {
    globalShortcut.unregister('Alt+Enter');
    globalShortcut.unregisterAll();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
