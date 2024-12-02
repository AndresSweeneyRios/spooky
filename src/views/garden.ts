import { vec3 } from "gl-matrix";
import { loadGltf } from "../graphics/loaders";
import { Simulation } from "../simulation";
import { EntId } from "../simulation/EntityRegistry";
import { EntityView } from "../simulation/EntityView";
import * as THREE from 'three';

const houseGltfPromise = loadGltf("/3d/houses/mushy.glb")

export class GardenView extends EntityView {
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
    const house = houseGltf.scene.clone();
    house.position.copy(new THREE.Vector3(...this.initalPosition));
    this.simulation.ThreeScene.add(house);
  }
}