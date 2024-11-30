import { quat, vec3 } from "gl-matrix";
import { PlayerView } from "./player";
import type { Simulation } from "../simulation";
import type { EntId } from "../simulation/EntityRegistry";
import { loadGltf } from "../graphics/loaders";
import * as THREE from "three";
import * as math from "../utils/math";

// import skeletonutils 
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

const gltfPromise = loadGltf("./3d/entities/fungi.glb")

export class ThirdPersonPlayerView extends PlayerView {
  mesh: THREE.Object3D | null = null;
  rootBone: THREE.Bone | null = null;
  armature: THREE.Object3D | null = null;
  meshOffset: vec3 = vec3.fromValues(0, -1.0, 0);

  async init() {
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

        console.log("Found armature", this.armature); 
      }

      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    })

    this.simulation.ThreeScene.add(this.mesh);
  }

  constructor(entId: EntId, private simulation: Simulation, initialRotation: vec3) {
    super(entId, simulation, initialRotation);

    this.cameraOffset = vec3.fromValues(0, 0, 5);

    this.init().catch(console.error);
  }

  public Draw(simulation: Simulation, lerpFactor: number): void {
    super.Draw(simulation, lerpFactor);

    const state = simulation.SimulationState

    const position = state.PhysicsRepository.GetPosition(this.EntId);
    const previousPosition = state.PhysicsRepository.GetPreviousPosition(this.EntId);
    const lerpedPosition = math.lerpVec3(previousPosition, position, lerpFactor);

    lerpedPosition[0] += this.meshOffset[0];
    lerpedPosition[1] += this.meshOffset[1];
    lerpedPosition[2] += this.meshOffset[2];

    // calculate movement direction
    const direction = simulation.SimulationState.MovementRepository.GetDirection(this.EntId);
    const previousDirection = simulation.SimulationState.MovementRepository.GetPreviousDirection(this.EntId);
    const lerpedDirection = math.lerpVec3(previousDirection, direction, lerpFactor);

    if (this.mesh) {
      this.mesh.position.set(lerpedPosition[0], lerpedPosition[1], lerpedPosition[2]);

      // set rotation from movement direction if moving
      if (vec3.length(lerpedDirection) > 0) {
        const angle = Math.atan2(lerpedDirection[0], lerpedDirection[2]) + Math.PI;

        this.mesh.rotation.y = angle
      }
    }
  }
}
