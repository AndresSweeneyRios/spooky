import { vec3 } from "gl-matrix";
import { PlayerView } from "./player";
import type { Simulation } from "../simulation";
import type { EntId } from "../simulation/EntityRegistry";
import { loadGltf } from "../graphics/loaders";
import * as THREE from "three";
import * as math from "../utils/math";
import * as shaders from "../graphics/shaders";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { processAttributes } from "../utils/processAttributes";
import { animationsPromise, getAnimation, playAnimation } from "../animation";
import { AnimationKey } from "../assets/animations";
import { EntityView } from "../simulation/EntityView";

const gltfPromise = loadGltf("./3d/entities/caseoh.glb", true)

const ROTATION_SPEED = 3; // Adjust this value to control speed

const IDLE_ANIMATION: AnimationKey = 'humanoid/Idle (4).glb - mixamo.com'
const WALK_ANIMATION: AnimationKey = 'humanoid/Walking.glb - mixamo.com'
const RUN_ANIMATION: AnimationKey = 'humanoid/Slow Run.glb - mixamo.com'
const IDLE_TIMESCALE = 1
const WALK_TIMESCALE = 1.7
const RUN_TIMESCALE = 1.3

export class CaseohView extends EntityView {
  mesh: THREE.Object3D | null = null;
  rootBone: THREE.Bone | null = null;
  armature: THREE.Object3D | null = null;
  meshOffset: vec3 = vec3.fromValues(0, -0.25, 0);
  skinnedMeshes: THREE.SkinnedMesh[] = [];
  isRunning: boolean = false;

  async init() {
    await animationsPromise

    const gltf = await gltfPromise;

    this.mesh = SkeletonUtils.clone(gltf.scene);

    this.mesh.scale.set(2, 2, 2)
    // rotate 45 degrees
    this.mesh.rotation.y = (Math.PI / 4) * 3;

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
  }

  constructor(public entId: EntId, public simulation: Simulation) {
    super(entId);

    this.init().catch(console.error);
  }

  public Draw(simulation: Simulation, lerpFactor: number): void {
    // inch camera towards target zoom
    const state = simulation.SimulationState;

    const position = state.PhysicsRepository.GetPosition(this.entId);
    const previousPosition = state.PhysicsRepository.GetPreviousPosition(this.entId);
    const lerpedPosition = math.lerpVec3(previousPosition, position, lerpFactor);

    lerpedPosition[0] += this.meshOffset[0];
    lerpedPosition[1] += this.meshOffset[1];
    lerpedPosition[2] += this.meshOffset[2];

    // Calculate movement direction
    const direction = simulation.SimulationState.MovementRepository.GetDirection(this.entId);
    const previousDirection = simulation.SimulationState.MovementRepository.GetPreviousDirection(this.entId);

    if (this.mesh) {
      this.mesh.position.set(lerpedPosition[0], lerpedPosition[1], lerpedPosition[2]);

      if (vec3.length(direction) > 0 && vec3.length(previousDirection) === 0) {
        if (this.isRunning) {
          const clip = getAnimation(RUN_ANIMATION)

          for (const skinnedMesh of this.skinnedMeshes) {
            playAnimation(skinnedMesh, clip, RUN_TIMESCALE)
          }
        } else {
          const clip = getAnimation(WALK_ANIMATION)

          for (const skinnedMesh of this.skinnedMeshes) {
            playAnimation(skinnedMesh, clip, WALK_TIMESCALE)
          }
        }
      } else if (vec3.length(direction) === 0 && vec3.length(previousDirection) > 0) {
        const clip = getAnimation(IDLE_ANIMATION)

        for (const skinnedMesh of this.skinnedMeshes) {
          playAnimation(skinnedMesh, clip, IDLE_TIMESCALE)
        }
      } else if (vec3.length(direction) > 0) {
        // if (this.isRunning) {
        //   const clip = getAnimation(RUN_ANIMATION)

        //   for (const skinnedMesh of this.skinnedMeshes) {
        //     playAnimation(skinnedMesh, clip, RUN_TIMESCALE)
        //   }
        // } else if (!this.isRunning) {
        //   const clip = getAnimation(WALK_ANIMATION)

        //   for (const skinnedMesh of this.skinnedMeshes) {
        //     playAnimation(skinnedMesh, clip, WALK_TIMESCALE)
        //   }
        // }
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
        this.mesh.rotation.y += newAngle * ROTATION_SPEED * this.simulation.SimulationState.DeltaTime;
      }
    }
  }

  public Cleanup(): void {
    if (this.mesh) {
      this.simulation.ThreeScene.remove(this.mesh);
    }
  }
}
