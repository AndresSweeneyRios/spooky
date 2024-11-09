import { Simulation } from "../simulation";
import { EntId } from "../simulation/EntityRegistry";
import { EntityView } from "../simulation/EntityView";
import * as THREE from "three";
import * as math from "../utils/math";
import { mat4, quat, vec3 } from "gl-matrix";

const MOUSE_SENSITIVITY = 1000;

const KEYS = Object.freeze([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "Space",
  "ShiftLeft",
] as const)

type Key = typeof KEYS[number]

// Utility function to convert yaw and pitch angles to a rotation matrix
function createRotationMatrix(yaw: number, pitch: number): mat4 {
  const rotationMatrix = mat4.create();
  mat4.fromYRotation(rotationMatrix, yaw);
  mat4.rotateX(rotationMatrix, rotationMatrix, pitch);
  return rotationMatrix;
}

export class PlayerView extends EntityView {
  private yaw: number = 0;
  private pitch: number = 0;
  public canvas: HTMLCanvasElement;
  public keysDown = new Set<Key>();

  private cleanupEvents: () => void;
  private minPitch: number = -Math.PI / 2; // Minimum pitch angle (in radians)
  private maxPitch: number = Math.PI / 2; // Maximum pitch angle (in radians)

  public Click(): void {
    this.canvas.requestPointerLock();
  }

  public Mousemove(event: MouseEvent): void {
    if (document.pointerLockElement !== this.canvas) {
      return;
    }

    const { movementX, movementY } = event;

    const x = movementX / MOUSE_SENSITIVITY;
    const y = movementY / MOUSE_SENSITIVITY;

    const yawChange = -x;
    const pitchChange = -y;

    this.yaw += yawChange;
    this.pitch += pitchChange;

    // Clamp pitch angle within the specified range
    this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
  }

  public Keydown(event: KeyboardEvent): void {
    if (KEYS.includes(event.code as Key)) {
      this.keysDown.add(event.code as Key);
    }
  }

  public Keyup(event: KeyboardEvent): void {
    if (KEYS.includes(event.code as Key)) {
      this.keysDown.delete(event.code as Key);
    }
  }

  constructor(entId: EntId, public Camera: THREE.Camera, initialRotation: vec3) {
    super(entId);

    // convert initial rotation to yaw and pitch
    this.yaw = initialRotation[0];
    this.pitch = initialRotation[1];

    this.canvas = document.querySelector('canvas#viewport')!;

    const clickHandler = this.Click.bind(this);
    const mousemoveHandler = this.Mousemove.bind(this);
    const keydownHandler = this.Keydown.bind(this);
    const keyupHandler = this.Keyup.bind(this);

    this.canvas.addEventListener('click', clickHandler);
    window.addEventListener('mousemove', mousemoveHandler);
    document.addEventListener('keydown', keydownHandler);
    document.addEventListener('keyup', keyupHandler);

    this.cleanupEvents = () => {
      this.canvas.removeEventListener('click', clickHandler);
      window.removeEventListener('mousemove', mousemoveHandler);
      document.removeEventListener('keydown', keydownHandler);
      document.removeEventListener('keyup', keyupHandler);
    };
  }

  public Draw(simulation: Simulation, lerpFactor: number): void {
    const state = simulation.SimulationState;

    const position = state.PhysicsRepository.GetPosition(this.EntId);
    const previousPosition = state.PhysicsRepository.GetPreviousPosition(this.EntId);
    const lerpedPosition = math.lerpVec3(previousPosition, position, lerpFactor);

    this.Camera.position.set(lerpedPosition[0], lerpedPosition[1] + 2, lerpedPosition[2]);

    this.updateCameraRotation();
  }

  public Update(simulation: Simulation): void {
    this.updateCameraRotation();

    const state = simulation.SimulationState;

    // Extract the forward direction vector from the rotation matrix
    const direction = vec3.transformMat4(vec3.create(), vec3.fromValues(
      (this.keysDown.has("KeyD") ? 1 : 0) - (this.keysDown.has("KeyA") ? 1 : 0),
      0,
      (this.keysDown.has("KeyS") ? 1 : 0) - (this.keysDown.has("KeyW") ? 1 : 0),
    ), this.getRotationMatrix());

    // Prevent vertical movement
    direction[1] = 0;

    state.MovementRepository.SetDirection(this.EntId, direction);
  }

  private updateCameraRotation(): void {
    // Convert yaw and pitch angles (in radians) to a rotation matrix
    const rotationMatrix = this.getRotationMatrix();

    // Convert the rotation matrix to THREE's Quaternion
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().fromArray(rotationMatrix));
    this.Camera.quaternion.copy(quaternion);
  }

  private getRotationMatrix(): mat4 {
    return createRotationMatrix(this.yaw, this.pitch);
  }

  public Cleanup(): void {
    this.cleanupEvents();
  }
}