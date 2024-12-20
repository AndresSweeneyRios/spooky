import type { Simulation } from "../simulation";
import type { EntId } from "../simulation/EntityRegistry";
import { EntityView } from "../simulation/EntityView";
import { ModifierType, StatType } from "../simulation/repository/StatRepository";
import * as math from "../utils/math";
import { ReadonlyQuat, mat4, vec3 } from "gl-matrix";

const MOUSE_SENSITIVITY = 10;

const KEYS = Object.freeze([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
  "ShiftLeft",
  "KeyE",
] as const)

type Key = typeof KEYS[number]

// let runEffectId: symbol | null = null

// // shift to set speed to 8, and then release to set back to 4
// window.addEventListener('keydown', (e) => {
//   if (e.key === 'Shift') {
//     runEffectId = simulation.SimulationState.StatRepository.CreateStatusEffect(entId, {
//       type: 0,
//       stat: StatType.SPEED,
//       value: SPEED * 2,
//     })
//   }
// })

// window.addEventListener('keyup', (e) => {
//   if (e.key === 'Shift') {
//     if (runEffectId) {
//       simulation.SimulationState.StatRepository.RemoveStatusEffect(entId, runEffectId)
//       runEffectId = null
//     }
//   }
// })

export class PlayerView extends EntityView {
  protected yaw: number = 0;
  protected pitch: number = 0;
  public canvas: HTMLCanvasElement;
  public keysDown = new Set<Key>();

  protected cleanupEvents: () => void;
  protected minPitch: number = -1.5; // Minimum pitch angle (in radians)
  protected maxPitch: number = 1.5; // Maximum pitch angle (in radians)
  protected cameraOffset: vec3 = vec3.fromValues(0, 2, 0);
  protected runSpeedModifier: number = 2;

  private runEffectId: symbol | null = null

  public Click(): void {
    this.canvas.requestPointerLock();
  }

  public Mousemove(event: MouseEvent): void {
    if (document.pointerLockElement !== this.canvas) {
      return;
    }
  
    this.yaw += -event.movementX / MOUSE_SENSITIVITY * this.simulation.SimulationState.DeltaTime;
    this.pitch += -event.movementY / MOUSE_SENSITIVITY * this.simulation.SimulationState.DeltaTime;
    this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));

    const euler = this.simulation.Camera.rotation;
    euler.order = "YXZ";
    euler.x = this.pitch;
    euler.y = this.yaw;
    euler.z = 0;
  }

  public Keydown(key: Key): void {
    this.keysDown.add(key);

    if (key === "ShiftLeft") {
      this.runEffectId = this.simulation.SimulationState.StatRepository.CreateStatusEffect(this.EntId, {
        type: ModifierType.MULTIPLY,
        stat: StatType.SPEED,
        value: this.runSpeedModifier,
      });
    }
  }

  public Keyup(key: Key): void {
    this.keysDown.delete(key);

    if (key === "ShiftLeft" && this.runEffectId) {
      this.simulation.SimulationState.StatRepository.RemoveStatusEffect(this.EntId, this.runEffectId);
      this.runEffectId = null;
    }
  }

  public KeydownHandler(event: KeyboardEvent): void {
    if (!KEYS.includes(event.code as Key) || this.keysDown.has(event.code as Key)) {
      return
    }

    this.Keydown(event.code as Key);
  }

  public KeyupHandler(event: KeyboardEvent): void {
    if (!KEYS.includes(event.code as Key) || !this.keysDown.has(event.code as Key)) {
      return
    }

    this.Keyup(event.code as Key);
  }

  public PointerLockChange(): void {
    if (document.pointerLockElement !== this.canvas) {
      for (const key of this.keysDown) {
        this.Keyup(key);
      }
    }
  }

  constructor(entId: EntId, protected simulation: Simulation, initialRotation: vec3) {
    super(entId);

    // convert initial rotation to yaw and pitch
    this.yaw = initialRotation[0];
    this.pitch = initialRotation[1];

    this.canvas = document.querySelector('canvas#viewport')!;

    const clickHandler = this.Click.bind(this);
    const mousemoveHandler = this.Mousemove.bind(this);
    const keydownHandler = this.KeydownHandler.bind(this);
    const keyupHandler = this.KeyupHandler.bind(this);
    const pointerLockChangeHandler = this.PointerLockChange.bind(this);

    this.canvas.addEventListener('click', clickHandler);
    window.addEventListener('mousemove', mousemoveHandler);
    document.addEventListener('keydown', keydownHandler);
    document.addEventListener('keyup', keyupHandler);
    document.addEventListener('pointerlockchange', pointerLockChangeHandler);

    this.cleanupEvents = () => {
      this.canvas.removeEventListener('click', clickHandler);
      window.removeEventListener('mousemove', mousemoveHandler);
      document.removeEventListener('keydown', keydownHandler);
      document.removeEventListener('keyup', keyupHandler);
      document.removeEventListener('pointerlockchange', pointerLockChangeHandler);
    };
  }

  public Draw(simulation: Simulation, lerpFactor: number): void {
    const state = simulation.SimulationState;

    const position = state.PhysicsRepository.GetPosition(this.EntId);
    const previousPosition = state.PhysicsRepository.GetPreviousPosition(this.EntId);
    const lerpedPosition = math.lerpVec3(previousPosition, position, lerpFactor);

    const rotatedOffset = vec3.transformMat4(vec3.create(), this.cameraOffset, this.GetRotationMatrix());

    simulation.Camera.position.set(
      lerpedPosition[0] + rotatedOffset[0],
      lerpedPosition[1] + rotatedOffset[1],
      lerpedPosition[2] + rotatedOffset[2],
    );
  }

  public Update(simulation: Simulation): void {
    const state = simulation.SimulationState;

    // Extract the forward direction vector from the rotation matrix
    const direction = vec3.transformMat4(vec3.create(), vec3.fromValues(
      (this.keysDown.has("KeyD") ? 1 : 0) - (this.keysDown.has("KeyA") ? 1 : 0),
      0,
      (this.keysDown.has("KeyS") ? 1 : 0) - (this.keysDown.has("KeyW") ? 1 : 0),
    ), this.GetRotationMatrix());

    // Prevent vertical movement
    direction[1] = 0;

    state.MovementRepository.SetDirection(this.EntId, direction);
  }

  protected GetRotationMatrix(): mat4 {
    const cameraQ = this.simulation.Camera.quaternion;
    const q = [cameraQ.x, cameraQ.y, cameraQ.z, cameraQ.w] as ReadonlyQuat;
    const glMatrixMat4 = mat4.create();
    mat4.fromQuat(glMatrixMat4, q);

    return glMatrixMat4
  }

  public Cleanup(): void {
    this.cleanupEvents();
  }
}