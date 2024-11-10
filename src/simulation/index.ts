import * as THREE from "three"
import { EntityRegistry } from "./EntityRegistry"
import { ViewSync } from "./ViewSync"
import { SimulationState } from "./SimulationState"
import { startGameLoop, stopGameLoop } from "./loop"

export class Simulation {
  public EntityRegistry = new EntityRegistry()
  public SimulationState = new SimulationState()

  public ViewSync: ViewSync

  constructor(
    public Camera: THREE.Camera, 
    public ThreeScene: THREE.Scene,
  ) {
    this.ViewSync = new ViewSync(this)

    console.log('SIMULATION', this)
  }

  public Start () {
    startGameLoop(this)
  }

  public Stop () {
    stopGameLoop()
  }
}
