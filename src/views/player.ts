import { loadAudio } from "../graphics/loaders";
import { JustPressedEvent, playerInput } from "../input/player";
import type { Simulation } from "../simulation";
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
  detune: - 2500,
  pitchRange: 200,
})

footstepAudio.then(audio => audio.setVolume(0.5));

export class PlayerView extends EntityView {
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
  private controlsEnabled: boolean = false;

  private footstepAudioInterval: ReturnType<typeof setInterval> | null = null;

  private losePointerLockBind = this.losePointerLock.bind(this);

  private losePointerLock(): void {
    if (document.pointerLockElement !== this.canvas) {
      this.disableControls();
    }
  }

  private updateCamera(dx: number, dy: number): void {
    // Adjust these values as needed for your desired sensitivity.
    const sensitivity = MOUSE_SENSITIVITY; // e.g. 1000
    // Calculate delta angles in radians.
    const yawAngle = -dx / sensitivity;
    const pitchAngle = -dy / sensitivity;

    // --- Yaw Rotation ---
    // Create a quaternion representing yaw rotation around the world up axis.
    const yawQuat = new THREE.Quaternion();
    yawQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawAngle);

    // Get the current camera orientation.
    const currentQuat = this.simulation.Camera.quaternion.clone();

    // Apply the yaw rotation: newQuat = yawQuat * currentQuat.
    let updatedQuat = yawQuat.multiply(currentQuat);

    // --- Pitch Rotation ---
    // Compute the camera's right axis from the updated orientation.
    const rightAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(updatedQuat).normalize();

    // Create a quaternion for pitch rotation about the camera's right axis.
    const pitchQuat = new THREE.Quaternion();
    pitchQuat.setFromAxisAngle(rightAxis, pitchAngle);

    // Apply the pitch rotation: finalQuat = pitchQuat * updatedQuat.
    updatedQuat = pitchQuat.multiply(updatedQuat);
    updatedQuat.normalize();

    // Lock the Y axis to 0
    const euler = new THREE.Euler().setFromQuaternion(updatedQuat, "YXZ");
    euler.z = 0;
    updatedQuat.setFromEuler(euler);

    // Update the camera's orientation.
    this.simulation.Camera.quaternion.copy(updatedQuat);
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
    const yaw = initialRotation[0];
    const pitch = initialRotation[1];

    this.canvas = document.querySelector('canvas#viewport')!;

    // Initialize camera orientation
    const euler = new THREE.Euler(pitch, yaw, 0, "YXZ");
    this.simulation.Camera.quaternion.setFromEuler(euler);

    this.cleanupEvents = () => { };
    document.addEventListener("pointerlockchange", this.losePointerLockBind);
  }

  private getAvailableInteractionsWithinAngle(maxAngle: number): { command: SensorCommand, entId: EntId, symbol: symbol }[] {
    const commands = this.simulation.SimulationState.SensorCommandRepository.GetAvailableInteractions(this.EntId);
    const availableInteractions: { command: SensorCommand, entId: EntId, symbol: symbol }[] = [];

    for (const { command, entId, symbol } of commands) {
      const position = this.simulation.SimulationState.PhysicsRepository.GetPosition(entId);
      const playerPosition = this.simulation.SimulationState.PhysicsRepository.GetPosition(this.EntId);

      const angle = math.getAngle(
        new THREE.Vector3(position[0], 0, position[2]),
        new THREE.Vector3(playerPosition[0], 0, playerPosition[2]),
        this.simulation.Camera,
      );

      if (angle <= maxAngle) {
        availableInteractions.push({ command, entId, symbol });
      }
    }

    return availableInteractions;
  }

  HandleJustPressed(payload: JustPressedEvent): void {
    if (payload.action === "interact") {
      const availableInteractions = this.getAvailableInteractionsWithinAngle(45);

      let closestDistance = Infinity;
      let closestCommand: SensorCommand | null = null;
      let closestEntId: EntId | null = null;
      let closestCommandSymbol: symbol | null = null;

      for (const { command, entId, symbol } of availableInteractions) {
        const position = this.simulation.SimulationState.PhysicsRepository.GetPosition(entId);
        const playerPosition = this.simulation.SimulationState.PhysicsRepository.GetPosition(this.EntId);

        const distance = math.getAngle(
          new THREE.Vector3(position[0], 0, position[2]),
          new THREE.Vector3(playerPosition[0], 0, playerPosition[2]),
          this.simulation.Camera,
        );

        if (distance < closestDistance) {
          closestDistance = distance;
          closestCommand = command;
          closestEntId = entId;
          closestCommandSymbol = symbol;
        }
      }

      if (closestCommand && closestEntId && closestCommandSymbol) {
        this.simulation.SimulationState.Commands.push(closestCommand.Command);

        payload.consume()

        if (closestCommand.Once) {
          this.simulation.SimulationState.SensorCommandRepository.DeleteSensorCommand(closestEntId, closestCommandSymbol);
        }
      }
    }
  }

  public enableControls(): void {
    if (!this.controlsEnabled) {
      this.updateCamera(0, 0)
    }

    this.controlsEnabled = true;

    this.cleanupEvents();

    const keydownHandler = this.KeydownHandler.bind(this);
    const keyupHandler = this.KeyupHandler.bind(this);
    const pointerLockChangeHandler = this.PointerLockChange.bind(this);
    const justPressedHandler = this.HandleJustPressed.bind(this);

    document.addEventListener("keydown", keydownHandler);
    document.addEventListener("keyup", keyupHandler);
    document.addEventListener("pointerlockchange", pointerLockChangeHandler)

    playerInput.emitter.on("justpressed", justPressedHandler);

    this.cleanupEvents = () => {
      document.removeEventListener("keydown", keydownHandler);
      document.removeEventListener("keyup", keyupHandler);
      document.removeEventListener("pointerlockchange", pointerLockChangeHandler);
      playerInput.emitter.off("justpressed", justPressedHandler)
    };
  }

  public disableControls(): void {
    this.cleanupEvents();
    this.cleanupEvents = () => { };

    // stop moving
    this.simulation.SimulationState.MovementRepository.SetDirection(this.EntId, [0, 0, 0]);

    this.controlsEnabled = false;

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

    if (!this.controlsEnabled) {
      return
    }

    const input = playerInput.getState()
    this.updateCamera(input.look.x, input.look.y);
  }

  public Update(simulation: Simulation): void {
    if (!this.controlsEnabled) {
      return
    }

    const state = simulation.SimulationState;

    const input = playerInput.getState()

    const localDirection = new THREE.Vector3(input.walk.x, 0, input.walk.y);

    if (localDirection.length() > 0) {
      if (this.footstepAudioInterval === null) {
        footstepAudio.then(audio => audio.play());

        this.footstepAudioInterval = setInterval(() => {
          footstepAudio.then(audio => audio.play());
        }, 600);
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

    const isInteractable = this.getAvailableInteractionsWithinAngle(45).length > 0;

    document.querySelector(".caseoh-interactable")?.setAttribute("is-hidden", isInteractable ? "false" : "true");
  }

  public SetCameraHeight(height: number): void {
    this.cameraPositionOffset[1] = height;
  }

  public SetCameraOffset(offset: vec3): void {
    this.cameraOffset = offset;
  }

  public Cleanup(): void {
    this.cleanupEvents();
    document.removeEventListener("pointerlockchange", this.losePointerLockBind);
  }
}
