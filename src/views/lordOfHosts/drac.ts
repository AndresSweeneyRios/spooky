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

const DEFAULT_ANIMATIONS = Object.freeze([
  "humanoid/Breakdance 1990.glb - mixamo.com",
  "humanoid/Breakdance Freeze Var 2.glb - mixamo.com",
  "humanoid/Dancing.glb - mixamo.com",
  "humanoid/Drunk Idle Variation.glb - mixamo.com",
  "humanoid/Drunk Walk.glb - mixamo.com",
  "humanoid/Female Dance Pose.glb - mixamo.com",
  "humanoid/Female Dynamic Pose.glb - mixamo.com",
  "humanoid/Female Locomotion Pose.glb - mixamo.com",
  "humanoid/Female Sitting Pose.glb - mixamo.com",
  "humanoid/Female Standing Pose.glb - mixamo.com",
  "humanoid/Flair.glb - mixamo.com",
  "humanoid/Head Spinning.glb - mixamo.com",
  "humanoid/Hip Hop Dancing.glb - mixamo.com",
  "humanoid/Male Crouch Pose.glb - mixamo.com",
  "humanoid/Male Laying Pose.glb - mixamo.com",
  "humanoid/Male Sitting Pose.glb - mixamo.com",
  "humanoid/Northern Soul Spin.glb - mixamo.com",
  "humanoid/Plank.glb - mixamo.com",
  "humanoid/Silly Dancing.glb - mixamo.com",
  "humanoid/Standing Idle Looking Ver. 2.glb - mixamo.com",
  "humanoid/T-Pose.glb - mixamo.com",
  "humanoid/Tut Hip Hop Dance.glb - mixamo.com",
  "humanoid/Walk Backward.glb - mixamo.com"
] as AnimationKey[])


export class DracView extends EntityView {
  public mesh: THREE.Object3D | null = null;
  rootBone: THREE.Bone | null = null;
  armature: THREE.Object3D | null = null;
  meshOffset: vec3 = vec3.fromValues(0, -0.25, 0);
  skinnedMeshes: THREE.SkinnedMesh[] = [];
  isRunning: boolean = false;
  public meshPromise = this.init().catch(console.error) as Promise<THREE.Object3D>;

  private animationQueue: AnimationKey[] = [];
  private lastAnimation: AnimationKey | null = null;

  private shuffleAnimations(): AnimationKey[] {
    // Fisher-Yates shuffle
    const array = [...DEFAULT_ANIMATIONS];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    // If lastAnimation is set and would repeat at boundary, swap first
    if (this.lastAnimation && array[0] === this.lastAnimation && array.length > 1) {
      // Swap with a random other element (not 0)
      const swapIdx = 1 + Math.floor(Math.random() * (array.length - 1));
      [array[0], array[swapIdx]] = [array[swapIdx], array[0]];
    }
    return array;
  }

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
        this.skinnedMeshes.push(child);
      }
    })

    processAttributes(this.mesh, this.simulation, this.entId, false);

    shaders.applyInjectedMaterials(this.mesh);

    this.simulation.ThreeScene.add(this.mesh);


    // Fill the animation queue initially
    this.animationQueue = this.shuffleAnimations();
    this.StrikePose();

    return this.mesh;
  }

  constructor(public entId: EntId, public simulation: Simulation) {
    super(entId);
  }

  public Draw(simulation: Simulation, lerpFactor: number): void {
    // Levitating bob and slow rotation
    if (this.mesh) {
      // Bob up and down on a sine wave
      const t = performance.now() / 1000;
      const bobHeight = 0.25 * Math.sin(t * 1.2); // amplitude and speed
      this.mesh.position.y = bobHeight;
    }
  }

  public Cleanup(): void {
    if (this.mesh) {
      this.simulation.ThreeScene.remove(this.mesh);
    }
  }

  public StrikePose() {
    if (this.animationQueue.length === 0) {
      this.animationQueue = this.shuffleAnimations();
    }
    const animationName = this.animationQueue.shift()!;
    this.lastAnimation = animationName;
    const clip = getAnimation(animationName);
    // Optionally: console.log(animationName, clip);
    if (clip) {
      for (const skinnedMesh of this.skinnedMeshes) {
        playAnimation(skinnedMesh, clip, 1.0, 0);
      }
    } else {
      console.warn(`Animation ${animationName} not found`);
    }
  }
}
