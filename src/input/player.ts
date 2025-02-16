// InputManager.ts

// A simple 2D vector type.
interface Vector2 {
  x: number;
  y: number;
}

// The state for analog (continuous) actions and button (discrete) actions.
export interface InputState {
  // Walk direction: x = left/right, y = forward/back.
  walk: Vector2;
  // Look delta: x = horizontal look, y = vertical look.
  look: Vector2;
  // Button actions.
  interact: boolean;
  mainAction1: boolean;
  mainAction2: boolean;
  settings: boolean;
}

// These are the button actions for which we emit “just pressed” events.
export type InputAction = "interact" | "mainAction1" | "mainAction2" | "settings";

export interface JustPressedEvent {
  action: InputAction;
}

// A simple event emitter.
class EventEmitter {
  private listeners: { [event: string]: ((payload: JustPressedEvent) => void)[] } = {};

  public on(event: string, listener: (payload: JustPressedEvent) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  public off(event: string, listener: (payload: JustPressedEvent) => void) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((l) => l !== listener);
  }

  public emit(event: string, payload: JustPressedEvent) {
    if (!this.listeners[event]) return;
    for (const listener of this.listeners[event]) {
      listener(payload);
    }
  }
}

// Main InputManager class.
export class InputManager {
  // Internal state for keyboard, mouse, and accumulated mouse movement.
  private keyboardPressed: Set<string> = new Set();
  private mouseButtonsPressed: Set<number> = new Set();

  // Instead of a single lookDelta accumulator, we separate the raw and smoothed values.
  private rawLookDelta: Vector2 = { x: 0, y: 0 };
  private smoothedLookDelta: Vector2 = { x: 0, y: 0 };

  // Current input state (updated each frame via update()).
  private currentState: InputState = {
    walk: { x: 0, y: 0 },
    look: { x: 0, y: 0 },
    interact: false,
    mainAction1: false,
    mainAction2: false,
    settings: false,
  };

  // Previous frame’s state for button actions so we can detect “just pressed”.
  private prevButtonStates: { [key in InputAction]: boolean } = {
    interact: false,
    mainAction1: false,
    mainAction2: false,
    settings: false,
  };

  // An emitter for "just pressed" events.
  public emitter: EventEmitter = new EventEmitter();

  // Define gamepad button indices (using Standard Gamepad mapping).
  private gamepadMapping = {
    interact: 2,    // left face button
    mainAction1: 6, // left trigger (analog)
    mainAction2: 7, // right trigger (analog)
    settings: 9,    // start button
  };

  // For analog triggers, consider values above this threshold as “pressed.”
  private triggerThreshold: number = 0.5;

  // Smoothing factor (0 = no new input; 1 = no smoothing). Adjust as needed.
  private smoothingFactor: number = 0.2;

  constructor() {
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.onKeyUp(e));

    window.addEventListener("mousedown", (e) => this.onMouseDown(e));
    window.addEventListener("mouseup", (e) => this.onMouseUp(e));
    window.addEventListener("mousemove", (e) => this.onMouseMove(e));

    // Prevent context menu from interfering with right-click.
    window.addEventListener("contextmenu", (e) => e.preventDefault());

    // Clear inputs when pointer lock/fullscreen is lost.
    document.addEventListener("pointerlockchange", () => {
      if (document.pointerLockElement === null) {
        this.resetInputs();
      }
    });
    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement) {
        this.resetInputs();
      }
    });
  }

  private onKeyDown(e: KeyboardEvent) {
    this.keyboardPressed.add(e.key.toLowerCase());
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keyboardPressed.delete(e.key.toLowerCase());
  }

  private onMouseDown(e: MouseEvent) {
    this.mouseButtonsPressed.add(e.button);
  }

  private onMouseUp(e: MouseEvent) {
    this.mouseButtonsPressed.delete(e.button);
  }

  private onMouseMove(e: MouseEvent) {
    // Clamp the delta to avoid huge spikes (adjust maxDelta as needed).
    const maxDelta = 50;
    const deltaX = Math.max(-maxDelta, Math.min(e.movementX, maxDelta));
    const deltaY = Math.max(-maxDelta, Math.min(e.movementY, maxDelta));
    this.rawLookDelta.x += deltaX;
    this.rawLookDelta.y += deltaY;
  }

  private resetInputs() {
    this.keyboardPressed.clear();
    this.mouseButtonsPressed.clear();
    this.rawLookDelta = { x: 0, y: 0 };
    this.smoothedLookDelta = { x: 0, y: 0 };
    this.currentState = {
      walk: { x: 0, y: 0 },
      look: { x: 0, y: 0 },
      interact: false,
      mainAction1: false,
      mainAction2: false,
      settings: false,
    };
    this.prevButtonStates = {
      interact: false,
      mainAction1: false,
      mainAction2: false,
      settings: false,
    };
  }

  public update() {
    // Process Walk Input (Analog)
    let walk: Vector2 = { x: 0, y: 0 };
    if (this.keyboardPressed.has("w")) walk.y -= 1;
    if (this.keyboardPressed.has("s")) walk.y += 1;
    if (this.keyboardPressed.has("a")) walk.x -= 1;
    if (this.keyboardPressed.has("d")) walk.x += 1;

    // Apply a deadzone to gamepad axes.
    const DEADZONE = 0.15;
    const applyDeadzone = (value: number): number => {
      const absVal = Math.abs(value);
      if (absVal < DEADZONE) return 0;
      return (value - Math.sign(value) * DEADZONE) / (1 - DEADZONE);
    };

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = Array.from(gamepads).find(p => p) as Gamepad | undefined;
    if (gp) {
      const gpX = applyDeadzone(gp.axes[0] || 0);
      const gpY = applyDeadzone(gp.axes[1] || 0);
      walk.x += gpX;
      walk.y += gpY;
    }
    const mag = Math.hypot(walk.x, walk.y);
    if (mag > 1) {
      walk.x /= mag;
      walk.y /= mag;
    }

    // --- Process Look Input with Smoothing ---
    // Smooth the raw mouse input into our smoothedLookDelta.
    this.smoothedLookDelta.x = this.smoothedLookDelta.x * (1 - this.smoothingFactor) +
      this.rawLookDelta.x * this.smoothingFactor;
    this.smoothedLookDelta.y = this.smoothedLookDelta.y * (1 - this.smoothingFactor) +
      this.rawLookDelta.y * this.smoothingFactor;
    // Use the smoothed value as the look delta.
    const look: Vector2 = { x: this.smoothedLookDelta.x, y: this.smoothedLookDelta.y };
    // Clear the raw look delta for the next frame.
    this.rawLookDelta = { x: 0, y: 0 };

    // Process gamepad right stick (axes 2 and 3)
    for (const gp of gamepads) {
      if (!gp) continue;
      const gpX = applyDeadzone(gp.axes[2] || 0);
      const gpY = applyDeadzone(gp.axes[3] || 0);
      look.x += gpX * 20.0;
      look.y += gpY * 20.0;
    }

    // Process Button Actions (Digital)
    const interact =
      this.keyboardPressed.has("e") ||
      this.getGamepadButtonPressed(this.gamepadMapping.interact);
    const mainAction1 =
      this.mouseButtonsPressed.has(0) ||
      this.getGamepadButtonPressed(this.gamepadMapping.mainAction1, true);
    const mainAction2 =
      this.mouseButtonsPressed.has(2) ||
      this.getGamepadButtonPressed(this.gamepadMapping.mainAction2, true);
    const settings =
      this.keyboardPressed.has("escape") ||
      this.getGamepadButtonPressed(this.gamepadMapping.settings);

    const newState: InputState = {
      walk,
      look,
      interact,
      mainAction1,
      mainAction2,
      settings,
    };

    this.checkJustPressed("interact", newState.interact);
    this.checkJustPressed("mainAction1", newState.mainAction1);
    this.checkJustPressed("mainAction2", newState.mainAction2);
    this.checkJustPressed("settings", newState.settings);

    this.currentState = newState;
    this.prevButtonStates.interact = newState.interact;
    this.prevButtonStates.mainAction1 = newState.mainAction1;
    this.prevButtonStates.mainAction2 = newState.mainAction2;
    this.prevButtonStates.settings = newState.settings;
  }

  private checkJustPressed(action: InputAction, newState: boolean) {
    if (newState && !this.prevButtonStates[action]) {
      this.emitter.emit("justpressed", { action });
    }
  }

  private getGamepadButtonPressed(buttonIndex: number, analog: boolean = false): boolean {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gamepads) {
      if (!gp) continue;
      const btn = gp.buttons[buttonIndex];
      if (!btn) continue;
      if (analog) {
        if (btn.value > this.triggerThreshold) return true;
      } else {
        if (btn.pressed) return true;
      }
    }
    return false;
  }

  public getState(): InputState {
    return this.currentState;
  }
}

// Setup a global instance and update loop.
const inputManager = new InputManager();
(window as any).inputManager = inputManager;
function updateLoop() {
  inputManager.update();
  requestAnimationFrame(updateLoop);
}
requestAnimationFrame(updateLoop);
export const playerInput = inputManager;
