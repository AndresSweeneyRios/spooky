import { vec3 } from "gl-matrix";
import { PlayerView } from "./player";
import type { Simulation } from "../simulation";
import type { EntId } from "../simulation/EntityRegistry";
import { loadGltf } from "../graphics/loaders";
import * as THREE from "three";
import * as math from "../utils/math";
import * as shaders from "../graphics/shaders";

// import skeletonutils 
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { processAttributes } from "../utils/processAttributes";
import { animationsPromise, getAnimation, playAnimation } from "../animation";
import { AnimationKey } from "../assets/animations";

const gltfPromise = loadGltf("./3d/entities/fungi.glb")

const rotationSpeed = 3; // Adjust this value to control speed

const IDLE_ANIMATION: AnimationKey = 'humanoid/Idle (4).glb - mixamo.com'
const WALK_ANIMATION: AnimationKey = 'humanoid/Slow Run.glb - mixamo.com'
const IDLE_TIMESCALE = 1
const WALK_TIMESCALE = 1.3

export class ThirdPersonPlayerView extends PlayerView {
  mesh: THREE.Object3D | null = null;
  rootBone: THREE.Bone | null = null;
  armature: THREE.Object3D | null = null;
  meshOffset: vec3 = vec3.fromValues(0, -0.8, 0);
  skinnedMeshes: THREE.SkinnedMesh[] = [];

  async init() {
    await animationsPromise

    const gltf = await gltfPromise;

    this.mesh = SkeletonUtils.clone(gltf.scene);

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

    processAttributes(this.mesh, this.simulation, this.EntId, false);

    shaders.applyInjectedMaterials(this.mesh);

    this.simulation.ThreeScene.add(this.mesh);
  }

  constructor(entId: EntId, simulation: Simulation, initialRotation: vec3) {
    super(entId, simulation, initialRotation);

    this.cameraOffset = vec3.fromValues(0, 0, 2);

    this.maxPitch = 0;

    this.init().catch(console.error);
  }

  public Draw(simulation: Simulation, lerpFactor: number): void {
    super.Draw(simulation, lerpFactor);
  
    const state = simulation.SimulationState;
  
    const position = state.PhysicsRepository.GetPosition(this.EntId);
    const previousPosition = state.PhysicsRepository.GetPreviousPosition(this.EntId);
    const lerpedPosition = math.lerpVec3(previousPosition, position, lerpFactor);
  
    lerpedPosition[0] += this.meshOffset[0];
    lerpedPosition[1] += this.meshOffset[1];
    lerpedPosition[2] += this.meshOffset[2];
  
    // Calculate movement direction
    const direction = simulation.SimulationState.MovementRepository.GetDirection(this.EntId);
    const previousDirection = simulation.SimulationState.MovementRepository.GetPreviousDirection(this.EntId);
  
    if (this.mesh) {
      this.mesh.position.set(lerpedPosition[0], lerpedPosition[1], lerpedPosition[2]);

      if (vec3.length(direction) > 0 && vec3.length(previousDirection) === 0) {
        const clip = getAnimation(WALK_ANIMATION)

        for (const skinnedMesh of this.skinnedMeshes) {
          playAnimation(skinnedMesh, clip, WALK_TIMESCALE)
        }
      } else if (vec3.length(direction) === 0 && vec3.length(previousDirection) > 0) {
        const clip = getAnimation(IDLE_ANIMATION)

        for (const skinnedMesh of this.skinnedMeshes) {
          playAnimation(skinnedMesh, clip, IDLE_TIMESCALE)
        }
      }

      // reverse direction
      direction[0] *= -1;
      direction[1] *= -1;
      direction[2] *= -1;
  
      const desiredAngle = Math.atan2(direction[0], direction[2]) + Math.PI;

      if (vec3.length(direction) > 0) {
        let currentAngle = this.mesh.rotation.y;
        let angleDifference = desiredAngle - currentAngle;

        // Normalize angle difference to be between -PI and PI
        const newAngle = Math.atan2(Math.sin(angleDifference), Math.cos(angleDifference));

        // Rotate player in direction by rotationSpeed
        this.mesh.rotation.y += newAngle * rotationSpeed * this.simulation.SimulationState.DeltaTime;
      }
    }
  }
}
