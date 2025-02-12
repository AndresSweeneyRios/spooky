import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  Key,
  Action,
  Pressed,
  JustPressed,
  WasRecentlyPressed,
  IsPressed
} from './spookyBattle'; // adjust the path as necessary

// Helper to reset input state objects between tests.
function resetInputStates() {
  for (const key in Pressed) {
    delete Pressed[key as Key];
  }
  for (const key in JustPressed) {
    delete JustPressed[key as Key];
  }
}

describe('Input System', () => {
  beforeEach(() => {
    resetInputStates();
    // Use fake timers to control time in our tests.
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should register a key as pressed', () => {
    // Simulate pressing W.
    Pressed[Key.W] = true;
    expect(IsPressed(Action.Up)).toBe(true);
    // Since we haven't set a "just pressed" timestamp, WasRecentlyPressed should return false.
    expect(WasRecentlyPressed(Action.Up, 200)).toBe(false);
  });

  it('should register a recently pressed key for WasRecentlyPressed', () => {
    // Simulate a key press with a timestamp.
    const now = Date.now();
    JustPressed[Key.W] = now;
    expect(WasRecentlyPressed(Action.Up, 200)).toBe(true);
  });

  it('should not register a key as recently pressed if it was pressed too long ago', () => {
    // Simulate a key press 300ms ago.
    JustPressed[Key.W] = Date.now() - 300;
    expect(WasRecentlyPressed(Action.Up, 200)).toBe(false);
  });

  it('should detect multiple keys mapping to the same action', () => {
    // Press W and ArrowUp for the Up action.
    JustPressed[Key.W] = Date.now();
    JustPressed[Key.ArrowUp] = Date.now();
    expect(WasRecentlyPressed(Action.Up, 200)).toBe(true);
  });

  it('should return false if no key was recently pressed for an action', () => {
    expect(WasRecentlyPressed(Action.Down, 200)).toBe(false);
  });

  it('should properly report IsPressed based on Pressed state', () => {
    Pressed[Key.A] = true;
    expect(IsPressed(Action.Left)).toBe(true);
    // For a key not pressed, should return false.
    expect(IsPressed(Action.Right)).toBe(false);
  });
});
