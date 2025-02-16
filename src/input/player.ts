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
  private lookDelta: Vector2 = { x: 0, y: 0 };

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

  // Define gamepad button indices.
  // (These may vary by controller but generally follow the Standard Gamepad mapping.)
  private gamepadMapping = {
    interact: 2,    // left face button
    mainAction1: 6, // left trigger (analog)
    mainAction2: 7, // right trigger (analog)
    settings: 9,    // start button
  };

  // For analog triggers, consider values above this threshold as “pressed.”
  private triggerThreshold: number = 0.5;

  constructor() {
    // Register keyboard listeners.
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.onKeyUp(e));

    // Register mouse listeners.
    window.addEventListener("mousedown", (e) => this.onMouseDown(e));
    window.addEventListener("mouseup", (e) => this.onMouseUp(e));
    window.addEventListener("mousemove", (e) => this.onMouseMove(e));

    // Prevent context menu from interfering with right-click.
    window.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  private onKeyDown(e: KeyboardEvent) {
    // Use lower-case for uniformity.
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
    // Use movementX/Y for relative motion.
    this.lookDelta.x += e.movementX;
    this.lookDelta.y += e.movementY;
  }

  /**
   * Call this each frame (or on a fixed interval) to update the input state.
   */
  public update() {
    // ----- Process Walk Input (Analog) -----
    // Start with keyboard WASD input.
    let walk: Vector2 = { x: 0, y: 0 };
    if (this.keyboardPressed.has("w")) walk.y -= 1;
    if (this.keyboardPressed.has("s")) walk.y += 1;
    if (this.keyboardPressed.has("a")) walk.x -= 1;
    if (this.keyboardPressed.has("d")) walk.x += 1;

    // Define a deadzone threshold.
    // Note: Increase this value if your gamepad drifts more.
    const DEADZONE = 0.15;
    const applyDeadzone = (value: number): number => {
      const absVal = Math.abs(value);
      if (absVal < DEADZONE) return 0;
      // Remap so that the output reaches 1 at the maximum.
      return (value - Math.sign(value) * DEADZONE) / (1 - DEADZONE);
    };

    // Use only the first connected gamepad.
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = Array.from(gamepads).find(p => p) as Gamepad | undefined;
    if (gp) {
      const gpX = applyDeadzone(gp.axes[0] || 0);
      const gpY = applyDeadzone(gp.axes[1] || 0);
      walk.x += gpX;
      walk.y += gpY;
    }

    // Clamp walk vector length to 1.
    const mag = Math.hypot(walk.x, walk.y);
    if (mag > 1) {
      walk.x /= mag;
      walk.y /= mag;
    }

    // ----- Process Look Input (Analog) -----
    // Mouse look (accumulated delta)
    let look: Vector2 = { x: this.lookDelta.x, y: this.lookDelta.y };
    // Reset mouse look delta for the next frame.
    this.lookDelta = { x: 0, y: 0 };

    // Gamepad right analog stick (axes 2 and 3) from all connected gamepads.
    for (const gp of gamepads) {
      if (!gp) continue;
      const gpX = applyDeadzone(gp.axes[2] || 0);
      const gpY = applyDeadzone(gp.axes[3] || 0);
      // Scale the right stick input for sensitivity.
      look.x += (gpX || 0) * 20.0;
      look.y += (gpY || 0) * 20.0;
    }

    // ----- Process Button Actions (Digital) -----
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

    // ----- Emit "Just Pressed" Events -----
    this.checkJustPressed("interact", newState.interact);
    this.checkJustPressed("mainAction1", newState.mainAction1);
    this.checkJustPressed("mainAction2", newState.mainAction2);
    this.checkJustPressed("settings", newState.settings);

    // Update our current state and store button states for next frame.
    this.currentState = newState;
    this.prevButtonStates.interact = newState.interact;
    this.prevButtonStates.mainAction1 = newState.mainAction1;
    this.prevButtonStates.mainAction2 = newState.mainAction2;
    this.prevButtonStates.settings = newState.settings;
  }

  /**
   * Checks if a button action has transitioned from "not pressed" to "pressed."
   * If so, emits a "justpressed" event.
   */
  private checkJustPressed(action: InputAction, newState: boolean) {
    if (newState && !this.prevButtonStates[action]) {
      this.emitter.emit("justpressed", { action });
    }
  }

  /**
   * Helper to check if a gamepad button is pressed.
   * If "analog" is true, uses a threshold on the button's value.
   */
  private getGamepadButtonPressed(
    buttonIndex: number,
    analog: boolean = false
  ): boolean {
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

  /**
   * Returns the current input state.
   */
  public getState(): InputState {
    return this.currentState;
  }
}

// --------------------------
// Setup a global instance and update loop.
// --------------------------

const inputManager = new InputManager();

// (Optional) Expose the instance on the window for debugging.
(window as any).inputManager = inputManager;

// Update loop.
function updateLoop() {
  inputManager.update();
  requestAnimationFrame(updateLoop);
}
requestAnimationFrame(updateLoop);

// --------------------------
// Example: Subscribe to "just pressed" events.
// --------------------------
// Uncomment the following lines to log events.
// inputManager.emitter.on("justpressed", (event) => {
//   console.log("Just pressed:", event.action);
// });

// Export the inputManager instance.
export const playerInput = inputManager;
