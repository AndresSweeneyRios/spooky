// Throttled fullscreen and pointer-lock utilities
let lastFs = 0;
let lastPl = 0;
/**
 * Request fullscreen (electron or browser) with a 500ms throttle
 */
export function requestFullscreen() {
  const now = Date.now();
  if (now - lastFs < 500) return;
  lastFs = now;
  if ((window as any).electronRequestFullscreen) {
    void (window as any).electronRequestFullscreen();
  } else {
    document.body.requestFullscreen().catch(console.error);
  }
}

/**
 * Request pointer lock on the given element with a 500ms throttle
 */
export function requestPointerLock(element: HTMLElement) {
  const now = Date.now();
  if (now - lastPl < 500) return;
  lastPl = now;
  try {
    element.requestPointerLock();
  } catch (err) {
    console.error('PointerLock request failed', err);
  }
}
