import { Simulation } from "../../simulation";
import * as THREE from "three";
import { View } from "../../simulation/View";
import { loadAudio, loadGltf } from "../../graphics/loaders";
import { processAttributes } from "../../utils/processAttributes";
import { EntId } from "../../simulation/EntityRegistry";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";
import { AnimationKey } from "../../assets/3d/animations";
import {
  animationsPromise,
  getAnimation,
  playAnimation,
} from "../../animation";
import * as shaders from "../../graphics/shaders";
import barricadeGlb from "../../assets/3d/scenes/island/barricade_OPTIMIZED.glb";
import noiseOgg from "../../assets/audio/sfx/noise.ogg";

const noiseAudio = loadAudio(noiseOgg, {
  volume: 1.6,
  loop: true,
  positional: true,
});

export class BarricadeView extends View {
  public barricade: THREE.Object3D | null = null;
  public initPromise: Promise<void>;
  skinnedMeshes: THREE.SkinnedMesh[] = [];

  async init() {
    await animationsPromise;

    const barricade = await loadGltf(barricadeGlb);

    this.barricade = SkeletonUtils.clone(barricade.scene);

    this.barricade.position.set(
      this.position[0],
      this.position[1],
      this.position[2]
    );
    this.barricade.rotation.set(
      this.rotation[0],
      this.rotation[1],
      this.rotation[2]
    );
    this.barricade.scale.set(this.scale[0], this.scale[1], this.scale[2]);

    noiseAudio.then((audio) => audio.play());

    this.barricade.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh) {
        child.frustumCulled = false;
        // const clip = getAnimation(IDLE_ANIMATION)
        // playAnimation(child, clip, IDLE_TIMESCALE)
        this.skinnedMeshes.push(child);
      }
    });

    processAttributes(this.barricade, this.simulation, this.entId, true);

    shaders.applyInjectedMaterials(this.barricade);

    this.simulation.ThreeScene.add(this.barricade);

    noiseAudio.then((audio) => {
      const positional = audio.getPositionalAudio();
      this.barricade?.add(positional);

      audio.play();

      // falloff within 10 meters
      positional.setDistanceModel("linear");
      positional.setMaxDistance(20);
    });
  }

  constructor(
    public simulation: Simulation,
    public entId: EntId,
    public position: [number, number, number] = [0, 0, 0],
    public rotation: [number, number, number] = [0, 0, 0],
    public scale: [number, number, number] = [1, 1, 1]
  ) {
    super();
    this.initPromise = this.init().catch(console.error);
  }

  public Cleanup(simulation: Simulation): void {
    if (this.barricade) {
      simulation.ThreeScene.remove(this.barricade);
    }

    noiseAudio.then((audio) => audio.stop());
  }
}
