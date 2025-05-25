import { vec3 } from "gl-matrix";
import type { Simulation } from "../../simulation";
import type { EntId } from "../../simulation/EntityRegistry";
import { loadGltf } from "../../graphics/loaders";
import * as THREE from "three";
import * as shaders from "../../graphics/shaders";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { processAttributes } from "../../utils/processAttributes";
import { animationsPromise, getAnimation, playAnimation } from "../../animation";
import { AnimationKey } from "../../assets/3d/animations";
import { EntityView } from "../../simulation/EntityView";
import dracGlb from '../../assets/3d/entities/drac.glb';

const gltfPromise = loadGltf(dracGlb, true)

const IDLE_ANIMATION: AnimationKey = 'humanoid/Idle (4).glb - mixamo.com'
const IDLE_TIMESCALE = 1

export class DracView extends EntityView {
  public mesh: THREE.Object3D | null = null;
  rootBone: THREE.Bone | null = null;
  armature: THREE.Object3D | null = null;
  meshOffset: vec3 = vec3.fromValues(0, -0.25, 0);
  skinnedMeshes: THREE.SkinnedMesh[] = [];
  isRunning: boolean = false;
  public meshPromise = this.init().catch(console.error) as Promise<THREE.Object3D>;

  async init() {
    await animationsPromise

    const gltf = await gltfPromise;

    this.mesh = SkeletonUtils.clone(gltf.scene);

    this.mesh.scale.set(1.5, 1.5, 1.5)

    const bones: THREE.Bone[] = [];

    this.mesh.traverse((child) => {
      if (child instanceof THREE.Bone && child.name === "root") {
        this.rootBone = child;

        bones.push(child);
      }

      if (child.name === "ARMATURE") {
        this.armature = child;
      }

      if (child instanceof THREE.SkinnedMesh) {
        child.frustumCulled = false;
        const clip = getAnimation(IDLE_ANIMATION)
        playAnimation(child, clip, IDLE_TIMESCALE)
        this.skinnedMeshes.push(child);
      }
    })

    processAttributes(this.mesh, this.simulation, this.entId, false);

    shaders.applyInjectedMaterials(this.mesh);

    this.simulation.ThreeScene.add(this.mesh);

    return this.mesh;
  }

  constructor(public entId: EntId, public simulation: Simulation) {
    super(entId);
  }

  public Draw(simulation: Simulation, lerpFactor: number): void {
  }

  public Cleanup(): void {
    if (this.mesh) {
      this.simulation.ThreeScene.remove(this.mesh);
    }
  }
}
