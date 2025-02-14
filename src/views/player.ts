import { loadAudio } from "../graphics/loaders";
import type { Simulation } from "../simulation";
import { SimulationCommand } from "../simulation/commands/_command";
import type { EntId } from "../simulation/EntityRegistry";
import { EntityView } from "../simulation/EntityView";
import { SensorCommand } from "../simulation/repository/SensorCommandRepository";
import { ModifierType, StatType } from "../simulation/repository/StatRepository";
import * as math from "../utils/math";
import { vec3 } from "gl-matrix";
import * as THREE from "three";

const MOUSE_SENSITIVITY = 1000;

const KEYS = Object.freeze([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
  "ShiftLeft",
  "KeyE",
] as const);

type Key = typeof KEYS[number];

const footstepAudio = loadAudio("/audio/sfx/footsteps_concrete.ogg", {
  randomPitch: true,
  detune: - 1000,
})

export class PlayerView extends EntityView {
  protected yaw: number = 0;
  protected pitch: number = 0;
  public canvas: HTMLCanvasElement;
  public keysDown = new Set<Key>();

  protected cleanupEvents: () => void;
  protected minPitch: number = -1.5; // Minimum pitch (radians)
  protected maxPitch: number = 1.5;  // Maximum pitch (radians)
  // Stored as gl-matrix vec3; converted to THREE.Vector3 when needed.
  protected cameraOffset: vec3 = vec3.fromValues(0, 2, 0);
  protected cameraPositionOffset: vec3 = vec3.fromValues(0, 0, 0);
  protected runSpeedModifier: number = 2;

  public runEnabled: boolean = false;

  private runEffectId: symbol | null = null;

  private footstepAudioInterval: ReturnType<typeof setInterval> | null = null;

  public Click(): void {
    this.canvas.requestPointerLock();

    const canvas = document.querySelector("body")!
    canvas.requestFullscreen()
  }

  public Mousemove(event: MouseEvent): void {
    if (document.pointerLockElement !== this.canvas) {
      return;
    }

    // Clamp the mouse delta to avoid occasional huge jumps.
    const maxDelta = 50;
    const dx = Math.max(-maxDelta, Math.min(maxDelta, event.movementX));
    const dy = Math.max(-maxDelta, Math.min(maxDelta, event.movementY));

    this.updateCamera(dx, dy);
  }

  private updateCamera(dx: number, dy: number): void {
    // Update yaw and pitch (do not multiply by deltaTime here)
    this.yaw -= dx / MOUSE_SENSITIVITY;
    this.pitch -= dy / MOUSE_SENSITIVITY;
    this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));

    // Normalize yaw to stay within -π to π
    this.yaw = THREE.MathUtils.euclideanModulo(this.yaw + Math.PI, 2 * Math.PI) - Math.PI;

    // Update the camera's quaternion using a THREE.Euler in YXZ order.
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, "YXZ");
    this.simulation.Camera.quaternion.setFromEuler(euler);
  }

  public Keydown(key: Key): void {
    this.keysDown.add(key);
    if (key === "ShiftLeft" && this.runEnabled) {
      this.runEffectId = this.simulation.SimulationState.StatRepository.CreateStatusEffect(
        this.EntId,
        {
          type: ModifierType.MULTIPLY,
          stat: StatType.SPEED,
          value: this.runSpeedModifier,
        }
      );
    }

    if (key === "KeyE") {
      // we want to get all the sensor commands and invoke the closest one

      const commands = this.simulation.SimulationState.SensorCommandRepository.GetAvailableInteractions(this.EntId);

      let closestDistance = Infinity;
      let closestCommand: SensorCommand | null = null;
      let closestEntId: EntId | null = null;
      let closestCommandSymbol: symbol | null = null;

      for (const { command, entId, symbol } of commands) {
        const position = this.simulation.SimulationState.PhysicsRepository.GetPosition(entId);
        const playerPosition = this.simulation.SimulationState.PhysicsRepository.GetPosition(this.EntId);

        const distance = math.getAngle(
          new THREE.Vector3(position[0], 0, position[2]),
          new THREE.Vector3(playerPosition[0], 0, playerPosition[2]),
          this.simulation.Camera,
        )

        if (distance < closestDistance) {
          closestDistance = distance;
          closestCommand = command;
          closestEntId = entId;
          closestCommandSymbol = symbol
        }
      }

      if (closestCommand && closestEntId && closestCommandSymbol) {
        this.simulation.SimulationState.Commands.push(closestCommand.Command);

        if (closestCommand.Once) {
          this.simulation.SimulationState.SensorCommandRepository.DeleteSensorCommand(closestEntId, closestCommandSymbol);
        }
      }
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
      return;
    }
    this.Keydown(event.code as Key);
  }

  public KeyupHandler(event: KeyboardEvent): void {
    if (!KEYS.includes(event.code as Key) || !this.keysDown.has(event.code as Key)) {
      return;
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

    // Assume initialRotation is [yaw, pitch, ...]
    this.yaw = initialRotation[0];
    this.pitch = initialRotation[1];

    this.canvas = document.querySelector('canvas#viewport')!;

    // Initialize camera orientation
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, "YXZ");
    this.simulation.Camera.quaternion.setFromEuler(euler);

    this.cleanupEvents = () => { };
  }

  public enableControls(): void {
    const clickHandler = this.Click.bind(this);
    const mousemoveHandler = this.Mousemove.bind(this);
    const keydownHandler = this.KeydownHandler.bind(this);
    const keyupHandler = this.KeyupHandler.bind(this);
    const pointerLockChangeHandler = this.PointerLockChange.bind(this);

    this.canvas.addEventListener("click", clickHandler);
    window.addEventListener("mousemove", mousemoveHandler);
    document.addEventListener("keydown", keydownHandler);
    document.addEventListener("keyup", keyupHandler);
    document.addEventListener("pointerlockchange", pointerLockChangeHandler)

    this.updateCamera(0, 0)

    this.cleanupEvents = () => {
      this.canvas.removeEventListener("click", clickHandler);
      window.removeEventListener("mousemove", mousemoveHandler);
      document.removeEventListener("keydown", keydownHandler);
      document.removeEventListener("keyup", keyupHandler);
      document.removeEventListener("pointerlockchange", pointerLockChangeHandler);
    };
  }

  public disableControls(): void {
    this.cleanupEvents();
    this.cleanupEvents = () => { };

    if (this.footstepAudioInterval !== null) {
      clearInterval(this.footstepAudioInterval);
      this.footstepAudioInterval = null;
    }
  }

  public Draw(simulation: Simulation, lerpFactor: number): void {
    const state = simulation.SimulationState;

    const position = state.PhysicsRepository.GetPosition(this.EntId);
    const previousPosition = state.PhysicsRepository.GetPreviousPosition(this.EntId);
    const lerpedPosition = math.lerpVec3(previousPosition, position, lerpFactor);

    // Convert the interpolated position to a THREE.Vector3.
    const basePosition = new THREE.Vector3(lerpedPosition[0], lerpedPosition[1], lerpedPosition[2]);
    basePosition.add(new THREE.Vector3(...this.cameraPositionOffset));

    // Convert cameraOffset from gl-matrix to THREE.Vector3.
    const offset = new THREE.Vector3(...this.cameraOffset);
    // Rotate the offset by the camera's current quaternion.
    offset.applyQuaternion(this.simulation.Camera.quaternion);

    basePosition.add(offset);
    this.simulation.Camera.position.set(basePosition.x, basePosition.y, basePosition.z);
  }

  public Update(simulation: Simulation): void {
    const state = simulation.SimulationState;

    const localDirection = new THREE.Vector3(
      (this.keysDown.has("KeyD") ? 1 : 0) - (this.keysDown.has("KeyA") ? 1 : 0),
      0,
      (this.keysDown.has("KeyS") ? 1 : 0) - (this.keysDown.has("KeyW") ? 1 : 0)
    );

    if (localDirection.length() > 0) {
      if (this.footstepAudioInterval === null) {
        footstepAudio.then(audio => audio.play());

        this.footstepAudioInterval = setInterval(() => {
          footstepAudio.then(audio => audio.play());
        }, 700);
      }
    } else {
      if (this.footstepAudioInterval !== null) {
        clearInterval(this.footstepAudioInterval);
        this.footstepAudioInterval = null;
      }
    }

    // Rotate the movement vector by the camera's orientation.
    localDirection.applyQuaternion(this.simulation.Camera.quaternion);
    localDirection.y = 0; // prevent vertical movement

    state.MovementRepository.SetDirection(this.EntId, [localDirection.x, localDirection.y, localDirection.z]);
  }

  public SetCameraHeight(height: number): void {
    this.cameraPositionOffset[1] = height;
  }

  public SetCameraOffset(offset: vec3): void {
    this.cameraOffset = offset;
  }

  public Cleanup(): void {
    this.cleanupEvents();
  }
}
