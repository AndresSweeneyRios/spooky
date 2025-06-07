import { Simulation } from "../../simulation";
import * as THREE from "three";
import { View } from "../../simulation/View";
import { loadAudio } from "../../graphics/loaders";
import doorOpenOgg from "../../assets/audio/sfx/door_open.ogg";
import doorCloseOgg from "../../assets/audio/sfx/door_close.ogg";

const MICROWAVE_OPEN_SPEED = 500;
const MICROWAVE_OPEN_ANGLE = -Math.PI * 0.35;
const MICROWAVE_CLOSED_ANGLE = 0;

const openDoorAudioPromise = loadAudio(doorOpenOgg, {
  // randomPitch: true,
  detune: +500,
});

const closeDoorAudioPromise = loadAudio(doorCloseOgg, {
  // randomPitch: true,
  detune: +500,
});

openDoorAudioPromise.then((audio) => {
  audio.setVolume(0.5);
});

closeDoorAudioPromise.then((audio) => {
  audio.setVolume(0.5);
});

export class MicrowaveView extends View {
  private isOpen = false;

  public get IsOpen(): boolean {
    return this.isOpen;
  }

  private lastInteractionTimestamp = 0;

  private doorBone;

  constructor(
    microwaveObject: THREE.Object3D,
    private simulation: Simulation
  ) {
    super();

    this.doorBone = microwaveObject.getObjectByName("_bind_door_Microwave")!;
  }

  public Draw(simulation: Simulation, lerpFactor: number): void {
    const targetAngle = this.isOpen
      ? MICROWAVE_OPEN_ANGLE
      : MICROWAVE_CLOSED_ANGLE;

    // use last interaction timestamp to determine if the microwave should animate
    if (
      simulation.ViewSync.TimeMS - this.lastInteractionTimestamp >
      MICROWAVE_OPEN_SPEED
    ) {
      this.doorBone.rotation.y = targetAngle;

      return;
    }

    // ease in out
    const T = (x: number) =>
      x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

    const percentage = T(
      (simulation.ViewSync.TimeMS - this.lastInteractionTimestamp) /
        MICROWAVE_OPEN_SPEED
    );

    if (!this.isOpen) {
      this.doorBone.rotation.y =
        MICROWAVE_OPEN_ANGLE +
        (MICROWAVE_CLOSED_ANGLE - MICROWAVE_OPEN_ANGLE) * percentage;
    } else {
      this.doorBone.rotation.y =
        MICROWAVE_CLOSED_ANGLE +
        (targetAngle - MICROWAVE_CLOSED_ANGLE) * percentage;
    }
  }

  public Cleanup(simulation: Simulation): void {}

  public Open() {
    if (this.isOpen) {
      return;
    }

    this.isOpen = true;

    this.lastInteractionTimestamp = this.simulation.ViewSync.TimeMS;
  }

  public Close() {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;

    this.lastInteractionTimestamp = this.simulation.ViewSync.TimeMS;
  }

  public Toggle() {
    if (this.isOpen) {
      this.Close();
      closeDoorAudioPromise.then((audio) => audio.play());
    } else {
      this.Open();
      openDoorAudioPromise.then((audio) => audio.play());
    }
  }
}
