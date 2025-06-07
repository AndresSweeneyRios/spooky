import { Simulation } from "../simulation";
import { GLTF } from "three/addons/loaders/GLTFLoader.js";
import * as THREE from "three";
import { View } from "../simulation/View";
import { loadGltf } from "../graphics/loaders";
import reliquaryGlb from "../assets/3d/reliquary/reliquary.glb";

export class ReliquaryView extends View {
  reliquary: GLTF | null = null;
  scene: THREE.Scene;

  async init() {
    this.reliquary = await loadGltf(reliquaryGlb);

    this.reliquary.scene.position.set(0, -1, 0);

    this.scene.add(this.reliquary.scene);
  }

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    super();
    this.scene = scene;
    this.init().catch(console.error);
  }

  public Draw(simulation: Simulation, lerpFactor: number): void {
    if (!this.reliquary) return;

    this.reliquary.scene.rotation.y += 0.01;
  }

  public Cleanup(simulation: Simulation): void {
    if (this.reliquary) {
      this.scene.remove(this.reliquary.scene);
    }
  }
}
