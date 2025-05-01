// @ts-nocheck

import ffi from 'ffi-napi';
import ref from 'ref-napi';
import StructType from 'ref-struct-napi';

// Steam API & HTML Surface FFI bindings
const steam = ffi.Library('steam_api', {
  SteamAPI_Init: ['bool', []],
  SteamAPI_RunCallbacks: ['void', []],
  SteamAPI_Shutdown: ['void', []],
  SteamAPI_ISteamHTMLSurface_Init: ['bool', ['pointer']],
  SteamAPI_ISteamHTMLSurface_Shutdown: ['void', ['pointer']],
  SteamAPI_ISteamHTMLSurface_CreateBrowser: ['uint32', ['pointer', 'string', 'string']],
  SteamAPI_ISteamHTMLSurface_ExecuteJavascript: ['void', ['pointer', 'uint32', 'string']],
  
  // Added SteamAPI_RestartAppIfNecessary for proper app launch handling
  SteamAPI_RestartAppIfNecessary: ['bool', ['uint32']],
});

// Steam Input FFI with expanded function support
const SteamInputActionData = StructType({
  bActive: 'bool',
  eMode: 'int',
  eModeGroup: 'int',
  x: 'float', y: 'float', z: 'float',
});

// Add more detailed Steam Input types and functions
Object.assign(steam, ffi.Library('steam_api', {
  SteamInput_Init: ['bool', ['bool']],  // Fixed parameter type
  SteamInput_Shutdown: ['void', []],
  SteamInput_GetConnectedControllers: ['uint32', ['pointer']],
  SteamInput_GetDigitalActionData: ['void', ['uint64', 'uint64', 'pointer']],  // Fixed parameter count
  SteamInput_GetActionSetHandle: ['uint64', ['string']],  // Added to get action set handles
  SteamInput_GetDigitalActionHandle: ['uint64', ['string']],  // Added to get action handles
}));

// AppID should be read from steam_appid.txt or passed as environment variable
const APPID = parseInt(process.env.STEAM_APPID || '0', 10);

// Check if app needs to be restarted through Steam
if (APPID > 0 && steam.SteamAPI_RestartAppIfNecessary(APPID)) {
  console.log('Game needs to be started through Steam, exiting...');
  process.exit(0);
}

// 1. Initialize Steam Core
if (!steam.SteamAPI_Init()) throw new Error('SteamAPI_Init failed');

// 2. Initialize Steam HTML Surface
const htmlSurfacePtr = ref.alloc('pointer', ref.NULL);
if (!steam.SteamAPI_ISteamHTMLSurface_Init(htmlSurfacePtr)) throw new Error('Steam HTMLSurface init failed');
const htmlSurface = htmlSurfacePtr.deref();

// 3. Create browser for CEF overlay, passing session token via query
const sessionToken = process.env.STEAM_SESSION_TOKEN || '';
const fileURL = `file:///${__dirname.replace(/\\/g, '/')}/dist/index.html?sessionToken=${sessionToken}`;
const browserHandle = steam.SteamAPI_ISteamHTMLSurface_CreateBrowser(htmlSurface, fileURL, '');
if (!browserHandle) {
  console.error('Failed to create Steam HTML browser');
}

// 4. Initialize Steam Input - Fixed parameter to match API (explicitlyCallRunFrame)
if (!steam.SteamInput_Init(false)) throw new Error('Steam Input init failed');

// Get the action set and digital action handles (these should match your Steam Input configuration)
let defaultActionSetHandle = 0;
let jumpActionHandle = 0;
let fireActionHandle = 0;

try {
  defaultActionSetHandle = steam.SteamInput_GetActionSetHandle('DefaultActionSet');
  jumpActionHandle = steam.SteamInput_GetDigitalActionHandle('Jump');
  fireActionHandle = steam.SteamInput_GetDigitalActionHandle('Fire');
} catch (err) {
  console.warn('Failed to get some Steam Input action handles:', err.message);
}

// 5. Function to send input state into JS via ExecuteJavascript - improved with proper action handling
function updateInputStates() {
  try {
    const handlesBuf = Buffer.alloc(8 * 16);
    const count = steam.SteamInput_GetConnectedControllers(handlesBuf);
    
    for (let i = 0; i < count; i++) {
      const handle = handlesBuf.readBigUInt64LE(8 * i);
      
      // Process each configured action
      if (jumpActionHandle) {
        const actionData = new SteamInputActionData();
        steam.SteamInput_GetDigitalActionData(handle, jumpActionHandle, actionData.ref());
        const js = `window.onInput(${handle}, "jump", ${actionData.bActive}, ${actionData.x}, ${actionData.y});`;
        steam.SteamAPI_ISteamHTMLSurface_ExecuteJavascript(htmlSurface, browserHandle, js);
      }
      
      if (fireActionHandle) {
        const actionData = new SteamInputActionData();
        steam.SteamInput_GetDigitalActionData(handle, fireActionHandle, actionData.ref());
        const js = `window.onInput(${handle}, "fire", ${actionData.bActive}, ${actionData.x}, ${actionData.y});`;
        steam.SteamAPI_ISteamHTMLSurface_ExecuteJavascript(htmlSurface, browserHandle, js);
      }
    }
  } catch (err) {
    console.error('Error updating input states:', err.message);
  }
}

// 6. Pump callbacks and lock to display refresh rate
const providedRate = parseFloat(process.env.STEAM_SURFACE_REFRESH_RATE || '0');
const displayRefresh = providedRate > 0 ? providedRate : 60; // default fallback
const FRAME_INTERVAL_MS = 1000 / displayRefresh;

// Store interval handle for proper cleanup
const frameInterval = setInterval(() => {
  try {
    steam.SteamAPI_RunCallbacks();
    updateInputStates();
  } catch (err) {
    console.error('Error in frame update:', err.message);
  }
}, FRAME_INTERVAL_MS);

// 7. Cleanup on exit - more robust cleanup with interval handling
process.on('exit', () => {
  clearInterval(frameInterval);
  
  try {
    steam.SteamInput_Shutdown();
    steam.SteamAPI_ISteamHTMLSurface_Shutdown(htmlSurface);
    steam.SteamAPI_Shutdown();
    console.log('Steam resources successfully cleaned up');
  } catch (err) {
    console.error('Error during Steam shutdown:', err.message);
  }
});

// Handle uncaught exceptions and rejections to ensure proper cleanup
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});
