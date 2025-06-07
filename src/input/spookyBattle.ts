export enum Key {
  W = "W",
  A = "A",
  S = "S",
  D = "D",
  H = "H",
  J = "J",
  K = "K",
  L = "L",
  ArrowUp = "ArrowUp",
  ArrowDown = "ArrowDown",
  ArrowLeft = "ArrowLeft",
  ArrowRight = "ArrowRight",
  GamepadUp = "GamepadUp",
  GamepadDown = "GamepadDown",
  GamepadLeft = "GamepadLeft",
  GamepadRight = "GamepadRight",
  GamepadX = "GamepadX",
  GamepadA = "GamepadA",
  GamepadY = "GamepadY",
  GamepadB = "GamepadB",
}

// For keys currently held, we keep booleans.
export const Pressed: { [key in Key]?: boolean } = {};

// Instead of booleans, JustPressed now stores the timestamp (in ms) when the key was pressed.
export const JustPressed: { [key in Key]?: number } = {};

// Use lowercase for single-character keys, but for multi‑character keys we assume the caller provides a suitable value.
const keyMap: { [key: string]: Key } = {
  w: Key.W,
  a: Key.A,
  s: Key.S,
  d: Key.D,
  h: Key.H,
  j: Key.J,
  k: Key.K,
  l: Key.L,
  arrowup: Key.ArrowUp,
  arrowdown: Key.ArrowDown,
  arrowleft: Key.ArrowLeft,
  arrowright: Key.ArrowRight,
};

const gamepadMap: { [index: number]: Key } = {
  12: Key.GamepadUp,
  13: Key.GamepadDown,
  14: Key.GamepadLeft,
  15: Key.GamepadRight,
  2: Key.GamepadX,
  0: Key.GamepadA,
  3: Key.GamepadY,
  1: Key.GamepadB,
};

export const listenForEvents = () => {
  // Keyboard event listeners.
  window.addEventListener("keydown", (event) => {
    const normalizedKey = event.key.toLowerCase();
    const mapped = keyMap[normalizedKey];
    if (mapped) {
      // If not already pressed, record its timestamp.
      if (!Pressed[mapped]) {
        JustPressed[mapped] = Date.now();
      }
      Pressed[mapped] = true;
    }
  });

  window.addEventListener("keyup", (event) => {
    const normalizedKey = event.key.toLowerCase();
    const mapped = keyMap[normalizedKey];
    if (mapped) {
      Pressed[mapped] = false;
    }
  });

  updateInput();
};

// Update gamepad state.
function updateGamepadState() {
  const gamepads = navigator.getGamepads();
  for (const gamepad of gamepads) {
    if (gamepad) {
      gamepad.buttons.forEach((button, index) => {
        const mapped = gamepadMap[index];
        if (mapped) {
          if (button.pressed) {
            if (!Pressed[mapped]) {
              JustPressed[mapped] = Date.now();
            }
            Pressed[mapped] = true;
          } else {
            Pressed[mapped] = false;
          }
        }
      });
    }
  }
}

// Flush keys in JustPressed that are older than thresholdMs (default 200ms).
function flushJustPressed(thresholdMs: number = 200) {
  const now = Date.now();
  for (const key in JustPressed) {
    if (
      JustPressed[key as Key] &&
      now - JustPressed[key as Key]! > thresholdMs
    ) {
      delete JustPressed[key as Key];
    }
  }
}

function updateInput() {
  updateGamepadState();
  flushJustPressed(); // flush keys older than 200ms.
  setTimeout(updateInput, 0);
}

// Define possible actions.
export enum Action {
  Up = "Up",
  Down = "Down",
  Left = "Left",
  Right = "Right",
  MinorAttack = "MinorAttack",
  MinorBreaker = "MinorBreaker",
  MajorAttack = "MajorAttack",
  MajorBreaker = "MajorBreaker",
}

// Map keys to actions.
const actionMap: { [key in Key]?: Action } = {
  [Key.W]: Action.Up,
  [Key.ArrowUp]: Action.Up,
  [Key.GamepadUp]: Action.Up,
  [Key.S]: Action.Down,
  [Key.ArrowDown]: Action.Down,
  [Key.GamepadDown]: Action.Down,
  [Key.A]: Action.Left,
  [Key.ArrowLeft]: Action.Left,
  [Key.GamepadLeft]: Action.Left,
  [Key.D]: Action.Right,
  [Key.ArrowRight]: Action.Right,
  [Key.GamepadRight]: Action.Right,
  [Key.H]: Action.MinorAttack,
  [Key.GamepadX]: Action.MinorAttack,
  [Key.J]: Action.MinorBreaker,
  [Key.GamepadA]: Action.MinorBreaker,
  [Key.K]: Action.MajorAttack,
  [Key.GamepadY]: Action.MajorAttack,
  [Key.L]: Action.MajorBreaker,
  [Key.GamepadB]: Action.MajorBreaker,
};

// New function: WasRecentlyPressed.
// Returns true if any key mapping to the given action was pressed within thresholdMs (default 200ms).
export function WasRecentlyPressed(
  action: Action,
  thresholdMs: number = 200
): boolean {
  const now = Date.now();
  return Object.keys(JustPressed).some((key) => {
    const mapped = key as Key;
    return (
      actionMap[mapped] === action &&
      JustPressed[mapped] !== undefined &&
      now - JustPressed[mapped]! <= thresholdMs
    );
  });
}

// For compatibility.
export function IsPressed(action: Action): boolean {
  return Object.keys(Pressed).some(
    (key) => actionMap[key as Key] === action && Pressed[key as Key]
  );
}
