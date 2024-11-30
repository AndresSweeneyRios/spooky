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

const gltfPromise = loadGltf("./3d/entities/fungi.glb")

const rotationSpeed = 3; // Adjust this value to control speed

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
    })

    processAttributes(this.mesh, this.simulation, this.EntId, false);

    shaders.applyInjectedMaterials(this.mesh);

    this.simulation.ThreeScene.add(this.mesh);
  }

  constructor(entId: EntId, simulation: Simulation, initialRotation: vec3) {
    super(entId, simulation, initialRotation);

    this.cameraOffset = vec3.fromValues(0, 0, 5);

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
  
    if (this.mesh) {
      this.mesh.position.set(lerpedPosition[0], lerpedPosition[1], lerpedPosition[2]);
  
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
