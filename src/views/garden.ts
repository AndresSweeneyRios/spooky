import { vec3 } from "gl-matrix";
import { loadGltf } from "../graphics/loaders";
import { Simulation } from "../simulation";
import { EntId } from "../simulation/EntityRegistry";
import { EntityView } from "../simulation/EntityView";
import * as THREE from 'three';

const houseGltfPromise = loadGltf("./3d/houses/mushy.glb")

export class GardenView extends EntityView {
  private house: THREE.Object3D | null = null;

  constructor(
    entId: EntId,
    public simulation: Simulation,
    public initalPosition: vec3,
  ) {
    super(entId);

    this.init().catch();
  }

  async init() {
    const houseGltf = await houseGltfPromise;
    this.house = houseGltf.scene.clone();
    this.house.position.copy(new THREE.Vector3(...this.initalPosition));
    this.simulation.ThreeScene.add(this.house);
  }

  public Cleanup(simulation: Simulation): void {
    if (this.house) {
      simulation.ThreeScene.remove(this.house);
      this.house = null;
    }
  }
}