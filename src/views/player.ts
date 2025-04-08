import { loadAudio } from "../graphics/loaders";
import { JustPressedEvent, playerInput } from "../input/player";
import type { Simulation } from "../simulation";
import type { EntId } from "../simulation/EntityRegistry";
import { EntityView } from "../simulation/EntityView";
import { SensorCommand } from "../simulation/repository/SensorCommandRepository";
import * as math from "../utils/math";
import { vec3 } from "gl-matrix";
import * as THREE from "three";
import { EventEmitter } from "events";
import { TypedEmitter } from "../utils/emitter";

const MIN_SENSITIVITY = 200;
const MAX_SENSITIVITY = 300000;

if (!localStorage.sensitivity) {
  localStorage.sensitivity = "0.5";
}

const footstepAudio = loadAudio("/audio/sfx/footsteps_concrete.ogg", {
  randomPitch: true,
  // detune: -4000,
  pitchRange: 800,
});
footstepAudio.then(audio => audio.setVolume(0.25));

// Store the audio instance once loaded
let footstepAudioInstance: Awaited<typeof footstepAudio> | null = null;
footstepAudio.then(audio => {
  audio.setVolume(0.25);
  footstepAudioInstance = audio;
});

// Define a strongly typed emitter.
type InteractionChangedPayload = {
  command: SensorCommand;
  entId: EntId;
  symbol: symbol;
  angle: number;
}[];

export class PlayerView extends EntityView {
  public canvas: HTMLCanvasElement;
  private controlsEnabled = false;
  protected cleanupEvents: () => void = () => { };
  protected minPitch = -1.5;
  protected maxPitch = 1.5;
  protected cameraOffset: vec3 = vec3.fromValues(0, 2, 0);
  protected cameraPositionOffset: vec3 = vec3.fromValues(0, 0, 0);
  protected runSpeedModifier = 2;
  public runEnabled = false;
  public debugElement = document.createElement("div");
  protected lastFootstepTime: number | undefined = undefined;

  public interactionEmitter = new TypedEmitter<{
    interactionsChanged: (interactions: InteractionChangedPayload) => void;
  }>();

  constructor(entId: EntId, protected simulation: Simulation, initialRotation: vec3) {
    super(entId);
    const [yaw, pitch] = initialRotation;
    this.canvas = document.querySelector('canvas#viewport')!;
    const euler = new THREE.Euler(pitch, yaw, 0, "YXZ");
    this.simulation.Camera.quaternion.setFromEuler(euler);

    document.querySelector("#debug")?.appendChild(this.debugElement);
  }

  protected updateCamera(dx: number, dy: number): void {
    const mouseSensitivityPercentageFloat = 1.0 - parseFloat(localStorage.sensitivity)

    const mouseSensitivity = MIN_SENSITIVITY + (MAX_SENSITIVITY - MIN_SENSITIVITY) * (mouseSensitivityPercentageFloat / 100);

    const sensitivity = mouseSensitivity;
    const yawAngle = -dx / sensitivity;
    const pitchAngle = -dy / sensitivity;

    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawAngle);
    const currentQuat = this.simulation.Camera.quaternion.clone();
    let updatedQuat = yawQuat.multiply(currentQuat);

    const rightAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(updatedQuat).normalize();
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(rightAxis, pitchAngle);
    updatedQuat = pitchQuat.multiply(updatedQuat).normalize();

    const euler = new THREE.Euler().setFromQuaternion(updatedQuat, "YXZ");
    euler.z = 0;
    euler.x = Math.max(this.minPitch, Math.min(this.maxPitch, euler.x));
    updatedQuat.setFromEuler(euler);

    this.simulation.Camera.quaternion.copy(updatedQuat);
  }

  protected getAvailableInteractionsWithinAngle(maxAngle: number): { command: SensorCommand, entId: EntId, symbol: symbol, angle: number }[] {
    const commands = this.simulation.SimulationState.SensorCommandRepository.GetAvailableInteractions(this.EntId);
    const interactions = commands.map(({ command, entId, symbol }) => {
      const position = this.simulation.SimulationState.PhysicsRepository.GetPosition(entId);
      const playerPosition = this.simulation.SimulationState.PhysicsRepository.GetPosition(this.EntId);
      const angle = math.getAngle(
        new THREE.Vector3(position[0], 0, position[2]),
        new THREE.Vector3(playerPosition[0], 0, playerPosition[2]),
        this.simulation.Camera,
      );
      return { command, entId, symbol, angle };
    }).filter(interaction => interaction.angle <= maxAngle);

    this.interactionEmitter.emit('interactionsChanged', interactions);
    return interactions;
  }

  protected handleJustPressed(payload: JustPressedEvent): void {
    if (payload.action !== "interact") return;

    const availableInteractions = this.getAvailableInteractionsWithinAngle(20);
    if (availableInteractions.length === 0) return;

    let closestInteraction = availableInteractions.reduce((closest, interaction) => {
      return interaction.angle < closest.angle ? interaction : closest;
    }, { angle: Infinity } as { command: SensorCommand, entId: EntId, symbol: symbol, angle: number });

    if (closestInteraction.angle === Infinity) return;

    this.simulation.SimulationState.Commands.push(closestInteraction.command.Command);
    payload.consume();
    if (closestInteraction.command.Once) {
      this.simulation.SimulationState.SensorCommandRepository.DeleteSensorCommand(closestInteraction.entId, closestInteraction.symbol);
    }
  }

  public enableControls(): void {
    if (this.controlsEnabled) return;
    if (!this.controlsEnabled) {
      this.updateCamera(0, 0);
    }
    this.controlsEnabled = true;
    this.cleanupEvents();
    this.cleanupEvents = () => playerInput.emitter.off("justpressed", justPressedHandler);
    const justPressedHandler = this.handleJustPressed.bind(this);
    playerInput.emitter.on("justpressed", justPressedHandler);
  }

  public disableControls(): void {
    if (!this.controlsEnabled) return;
    this.cleanupEvents();
    this.cleanupEvents = () => { };
    this.simulation.SimulationState.MovementRepository.SetDirection(this.EntId, [0, 0, 0]);
    this.controlsEnabled = false;
  }

  public getControlsEnabled(): boolean {
    return this.controlsEnabled;
  }

  public Draw(simulation: Simulation, lerpFactor: number): void {
    const state = simulation.SimulationState;
    const position = state.PhysicsRepository.GetPosition(this.EntId);
    const previousPosition = state.PhysicsRepository.GetPreviousPosition(this.EntId);
    const lerpedPosition = math.lerpVec3(previousPosition, position, lerpFactor);

    const basePosition = new THREE.Vector3(lerpedPosition[0], lerpedPosition[1], lerpedPosition[2]).add(new THREE.Vector3(...this.cameraPositionOffset));
    const offset = new THREE.Vector3(...this.cameraOffset).applyQuaternion(this.simulation.Camera.quaternion);
    basePosition.add(offset);
    this.simulation.Camera.position.set(basePosition.x, basePosition.y, basePosition.z);

    // this.debugElement.innerText = `${JSON.stringify(this.simulation.Camera.getWorldPosition(new THREE.Vector3()))}\n${JSON.stringify(this.simulation.Camera.getWorldDirection(new THREE.Vector3()))}`;

    if (!this.controlsEnabled) return;

    const input = playerInput.getState();
    this.updateCamera(input.look.x, input.look.y);
  }

  public Update(simulation: Simulation): void {
    document.querySelector(".caseoh-interactable")?.setAttribute("is-hidden", "true");

    if (!this.controlsEnabled) return;

    const state = simulation.SimulationState;
    const input = playerInput.getState();
    const localDirection = new THREE.Vector3(input.walk.x, 0, input.walk.y);

    // Footstep audio based on timestamps
    const now = Date.now();
    const footstepInterval = 600; // Time between footsteps in ms

    if (localDirection.length() > 0) {
      // If we're moving and it's time for a new footstep sound
      if (!this.lastFootstepTime || now - this.lastFootstepTime >= footstepInterval) {
        footstepAudioInstance?.play();
        this.lastFootstepTime = now;
      }
    } else {
      // Reset when not moving
      this.lastFootstepTime = undefined;
    }

    localDirection.applyQuaternion(this.simulation.Camera.quaternion).setY(0);
    state.MovementRepository.SetDirection(this.EntId, [localDirection.x, localDirection.y, localDirection.z]);

    const isInteractable = this.getAvailableInteractionsWithinAngle(20).length > 0;
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

    this.debugElement.remove();
  }
}
