// @ts-ignore
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Store the main window reference
let mainWindow;

// Create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true, // Hide the menu bar
    fullscreen: true, // Start in fullscreen mode immediately
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
      enableRemoteModule: true,
      webSecurity: false,
    },
    show: false, // Don't show until ready
  });

  // Load the main HTML file
  mainWindow.loadFile(path.join(__dirname, './dist/index.html'));

  // Open DevTools in development mode
  // mainWindow.webContents.openDevTools();

  // Show window when ready to avoid flashing
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closing
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  ipcMain.on('enable-fullscreen', () => {
    mainWindow.setFullScreen(true);
  });
}

// Initialize the app when Electron is ready
app.whenReady().then(() => {
  createWindow();

  // Re-create window on macOS when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit the app when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Prevent cache
app.commandLine.appendSwitch("disable-http-cache");
