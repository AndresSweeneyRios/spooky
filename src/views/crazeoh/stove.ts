import { Simulation } from "../../simulation";
import * as THREE from "three";
import { View } from "../../simulation/View";
import { loadAudio } from "../../graphics/loaders";

const STOVE_OPEN_SPEED = 500
const STOVE_OPEN_ANGLE = Math.PI / 3 * 1
const STOVE_CLOSED_ANGLE = 0

const openDoorAudioPromise = loadAudio("./audio/sfx/door_open.ogg", {
  // randomPitch: true,
  detune: -1000,
})

const closeDoorAudioPromise = loadAudio("./audio/sfx/door_close.ogg", {
  // randomPitch: true,
  detune: -1000,
})

openDoorAudioPromise.then(audio => {
  audio.setVolume(0.5)
})

closeDoorAudioPromise.then(audio => {
  audio.setVolume(0.5)
})

export class StoveView extends View {
  private isOpen = false

  public get IsOpen(): boolean {
    return this.isOpen
  }

  private lastInteractionTimestamp = 0

  private doorBone

  constructor(stoveObject: THREE.Object3D, private simulation: Simulation) {
    super()

    this.doorBone = stoveObject.getObjectByName("_bind_ovenDoor_3_Stove001")!
  }

  public Draw(simulation: Simulation, lerpFactor: number): void {
    const targetAngle = this.isOpen ? STOVE_OPEN_ANGLE : STOVE_CLOSED_ANGLE

    // use last interaction timestamp to determine if the stove should animate
    if (simulation.ViewSync.TimeMS - this.lastInteractionTimestamp > STOVE_OPEN_SPEED) {
      this.doorBone.rotation.x = targetAngle

      return
    }

    // ease in out
    const T = (x: number) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2

    const percentage = T((simulation.ViewSync.TimeMS - this.lastInteractionTimestamp) / STOVE_OPEN_SPEED)

    if (!this.isOpen) {
      this.doorBone.rotation.x = STOVE_OPEN_ANGLE + (STOVE_CLOSED_ANGLE - STOVE_OPEN_ANGLE) * percentage
    } else {
      this.doorBone.rotation.x = STOVE_CLOSED_ANGLE + (targetAngle - STOVE_CLOSED_ANGLE) * percentage
    }
  }

  public Cleanup(simulation: Simulation): void {
  }

  public Open() {
    if (this.isOpen) {
      return
    }

    this.isOpen = true

    this.lastInteractionTimestamp = this.simulation.ViewSync.TimeMS
  }

  public Close() {
    if (!this.isOpen) {
      return
    }

    this.isOpen = false

    this.lastInteractionTimestamp = this.simulation.ViewSync.TimeMS
  }

  public Toggle() {
    if (this.isOpen) {
      this.Close()
      closeDoorAudioPromise.then(audio => audio.play())
    } else {
      this.Open()
      openDoorAudioPromise.then(audio => audio.play())
    }
  }
}
