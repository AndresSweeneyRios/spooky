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
  cancel: boolean;
}

// These are the button actions for which we emit “just pressed” events.
export type InputAction = "interact" | "mainAction1" | "mainAction2" | "settings" | "cancel";

// Input source types.
export type InputSource = "keyboard" | "mouse" | "gamepad";

export interface JustPressedEvent {
  action: InputAction;
  inputSource: InputSource;
  consume(): void;
}

// A simple event emitter.
class EventEmitter {
  private listeners: { [event: string]: { listener: (payload: JustPressedEvent) => void, order: number }[] } = {};

  public on(event: string, listener: (payload: JustPressedEvent) => void, options?: { order: number }) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    const order = options?.order ?? 0;
    this.listeners[event].push({ listener, order });
    this.listeners[event].sort((a, b) => a.order - b.order);
  }

  public off(event: string, listener: (payload: JustPressedEvent) => void) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((l) => l.listener !== listener);
  }

  public *emit(event: string, payload: JustPressedEvent & { _consumed?: boolean }) {
    if (!this.listeners[event]) return;
    for (const { listener, order } of this.listeners[event]) {
      listener(payload);
      yield order;
      if (payload._consumed) {
        break;
      }
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
    cancel: false,
  };

  // Previous frame’s state for button actions so we can detect “just pressed”.
  private prevButtonStates: { [key in InputAction]: boolean } = {
    interact: false,
    mainAction1: false,
    mainAction2: false,
    settings: false,
    cancel: false,
  };

  // An emitter for "just pressed" events.
  public emitter: EventEmitter = new EventEmitter();

  // Define gamepad button indices (using Standard Gamepad mapping).
  private gamepadMapping = {
    leftFace: 2,
    bottomFace: 0,
    topFace: 3,
    rightFace: 1,
    start: 9,
  };

  // For analog triggers, consider values above this threshold as “pressed.”
  private triggerThreshold: number = 0.5;

  // Smoothing factor (0 = no new input; 1 = no smoothing). Adjust as needed.
  private smoothingFactor: number = 0.99;

  constructor() {
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.onKeyUp(e));

    window.addEventListener("mousedown", (e) => this.onMouseDown(e), {
      capture: false,
    });
    window.addEventListener("mouseup", (e) => this.onMouseUp(e), {
      capture: false,
    });
    window.addEventListener("mousemove", (e) => this.onMouseMove(e));

    // Prevent context menu from interfering with right-click.
    // window.addEventListener("contextmenu", (e) => e.preventDefault());

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
      cancel: false,
    };
    this.prevButtonStates = {
      interact: false,
      mainAction1: false,
      mainAction2: false,
      settings: false,
      cancel: false,
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

      // Add D-Pad support
      if (gp.buttons[12]?.pressed) walk.y -= 1; // D-Pad Up
      if (gp.buttons[13]?.pressed) walk.y += 1; // D-Pad Down
      if (gp.buttons[14]?.pressed) walk.x -= 1; // D-Pad Left
      if (gp.buttons[15]?.pressed) walk.x += 1; // D-Pad Right
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
    let look: Vector2 = { x: this.smoothedLookDelta.x, y: this.smoothedLookDelta.y };
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

    if (document.pointerLockElement === null) {
      // reset look and walk if not in pointer lock
      walk = { x: 0, y: 0 };
      look = { x: 0, y: 0 };
    }


    // Process Button Actions (Digital)
    const interactKeyboard = this.keyboardPressed.has("e");
    const interactMouse = false; // No mouse interaction for "interact"
    const interactGamepad = this.getGamepadButtonPressed(this.gamepadMapping.leftFace);
    const interact = interactKeyboard || interactMouse || interactGamepad;

    const mainAction1Keyboard = false; // No keyboard interaction for "mainAction1"
    const mainAction1Mouse = this.mouseButtonsPressed.has(0);
    const mainAction1Gamepad = this.getGamepadButtonPressed(this.gamepadMapping.bottomFace, true);
    const mainAction1 = mainAction1Keyboard || mainAction1Mouse || mainAction1Gamepad;

    const mainAction2Keyboard = false; // No keyboard interaction for "mainAction2"
    const mainAction2Mouse = this.mouseButtonsPressed.has(2);
    const mainAction2Gamepad = this.getGamepadButtonPressed(this.gamepadMapping.topFace, true);
    const mainAction2 = mainAction2Keyboard || mainAction2Mouse || mainAction2Gamepad;

    const cancelKeyboard = this.keyboardPressed.has("backspace");
    const cancelMouse = false; // No mouse interaction for "cancel"
    const cancelGamepad = this.getGamepadButtonPressed(this.gamepadMapping.rightFace);
    const cancel = cancelKeyboard || cancelMouse || cancelGamepad;

    const settingsKeyboard = this.keyboardPressed.has("escape");
    const settingsMouse = false; // No mouse interaction for "settings"
    const settingsGamepad = this.getGamepadButtonPressed(this.gamepadMapping.start);
    const settings = settingsKeyboard || settingsMouse || settingsGamepad;

    const newState: InputState = {
      walk,
      look,
      interact,
      mainAction1,
      mainAction2,
      settings,
      cancel,
    };

    this.checkJustPressed("interact", newState.interact, interactKeyboard ? "keyboard" : interactGamepad ? "gamepad" : "mouse");
    this.checkJustPressed("mainAction1", newState.mainAction1, mainAction1Mouse ? "mouse" : mainAction1Gamepad ? "gamepad" : "keyboard");
    this.checkJustPressed("mainAction2", newState.mainAction2, mainAction2Mouse ? "mouse" : mainAction2Gamepad ? "gamepad" : "keyboard");
    this.checkJustPressed("settings", newState.settings, settingsKeyboard ? "keyboard" : settingsGamepad ? "gamepad" : "mouse");
    this.checkJustPressed("cancel", newState.cancel, cancelKeyboard ? "keyboard" : cancelGamepad ? "gamepad" : "mouse");

    this.currentState = newState;
    this.prevButtonStates.interact = newState.interact;
    this.prevButtonStates.mainAction1 = newState.mainAction1;
    this.prevButtonStates.mainAction2 = newState.mainAction2;
    this.prevButtonStates.settings = newState.settings;
    this.prevButtonStates.cancel = newState.cancel;
  }

  private debounceTimers: { [key in InputAction]?: number } = {};

  private checkJustPressed(action: InputAction, newState: boolean, inputSource: InputSource) {
    if (newState && !this.prevButtonStates[action]) {
      // Mark this button as pressed for the next frame.
      this.prevButtonStates[action] = true;

      // Debounce the just pressed event.
      if (this.debounceTimers[action]) {
        return;
      }

      // Create a payload that carries a consumed flag.
      const payload: JustPressedEvent & { _consumed?: boolean } = {
        action,
        inputSource,
        consume: () => {
          payload._consumed = true;
        }
      };

      // Emit the event. The generator will yield the "order" of each listener.
      const generator = this.emitter.emit("justpressed", payload);
      for (const _ of generator) {
        if (payload._consumed) break;
      }

      this.debounceTimers[action] = window.setTimeout(() => {
        // Clear the debounce timer.
        delete this.debounceTimers[action];
      }, 200);
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
export const playerInput = inputManager;
