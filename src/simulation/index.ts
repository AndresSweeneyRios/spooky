import * as THREE from "three";
import { EntityRegistry } from "./EntityRegistry";
import { ViewSync } from "./ViewSync";
import { SimulationState } from "./SimulationState";
import { startGameLoop, stopGameLoop } from "./loop";

let simulationIndex = 0;

export class Simulation {
  public readonly SimulationIndex = ++simulationIndex;

  public EntityRegistry = new EntityRegistry();
  public SimulationState = new SimulationState();

  public ViewSync: ViewSync;
  public IsRunning = false;
  public LastFrameTime = 0;
  public AccumulatedTime = 0;

  constructor(
    public Camera: THREE.Camera,
    public ThreeScene: THREE.Scene
  ) {
    this.ViewSync = new ViewSync(this);
  }

  public Start() {
    startGameLoop(this);
  }

  public Stop() {
    stopGameLoop(this);
  }
}
