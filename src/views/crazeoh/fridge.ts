import { Simulation } from "../../simulation";
import * as THREE from "three";
import { View } from "../../simulation/View";
import { loadAudio } from "../../graphics/loaders";
import doorOpenOgg from "../../assets/audio/sfx/door_open.ogg";
import doorCloseOgg from "../../assets/audio/sfx/door_close.ogg";

const FRIDGE_OPEN_SPEED = 500;
const FRIDGE_OPEN_ANGLE = (Math.PI / 3) * 2;
const FRIDGE_CLOSED_ANGLE = 0;

const openDoorAudioPromise = loadAudio(doorOpenOgg, {
  // randomPitch: true,
});

const closeDoorAudioPromise = loadAudio(doorCloseOgg, {
  // randomPitch: true,
});

openDoorAudioPromise.then((audio) => {
  audio.setVolume(0.5);
});

closeDoorAudioPromise.then((audio) => {
  audio.setVolume(0.5);
});

export class FridgeView extends View {
  private isOpen = false;

  public get IsOpen(): boolean {
    return this.isOpen;
  }

  private lastInteractionTimestamp = 0;

  private doorBone;

  constructor(
    fridgeObject: THREE.Object3D,
    private simulation: Simulation
  ) {
    super();

    this.doorBone = fridgeObject.getObjectByName("_bind_doorR_Fridge")!;
  }

  public Draw(simulation: Simulation, lerpFactor: number): void {
    const targetAngle = this.isOpen ? FRIDGE_OPEN_ANGLE : FRIDGE_CLOSED_ANGLE;

    // use last interaction timestamp to determine if the fridge should animate
    if (
      simulation.ViewSync.TimeMS - this.lastInteractionTimestamp >
      FRIDGE_OPEN_SPEED
    ) {
      this.doorBone.rotation.y = targetAngle;

      return;
    }

    // ease in out
    const T = (x: number) =>
      x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;

    const percentage = T(
      (simulation.ViewSync.TimeMS - this.lastInteractionTimestamp) /
        FRIDGE_OPEN_SPEED
    );

    if (!this.isOpen) {
      this.doorBone.rotation.y =
        FRIDGE_OPEN_ANGLE +
        (FRIDGE_CLOSED_ANGLE - FRIDGE_OPEN_ANGLE) * percentage;
    } else {
      this.doorBone.rotation.y =
        FRIDGE_CLOSED_ANGLE + (targetAngle - FRIDGE_CLOSED_ANGLE) * percentage;
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
