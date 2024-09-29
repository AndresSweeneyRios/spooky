import { Simulation } from "../simulation";
import { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from "three";
import { View } from "../simulation/View";
import { particleMaterial } from "../graphics/shaders";
import { loadGltf } from "../graphics/loaders";

export class HeadView extends View {
  head: GLTF | null = null
  scene: THREE.Scene

  async init () {
    this.head = await loadGltf("./3d/head.glb")

    this.head.scene.rotateY(Math.PI / -2)

    this.scene.add(this.head.scene);
  }

  particles: THREE.InstancedMesh
  particlePositions: THREE.Vector3[];
  particleRotations: THREE.Quaternion[];

  constructor(scene: THREE.Scene) {
    super()
    this.scene = scene
    this.init().catch(console.error)

    const textureLoader = new THREE.TextureLoader()
    const texture = textureLoader.load("./3d/textures/smoke1.png")

    {
      const geometry = new THREE.PlaneGeometry(1, 1)
      const material = particleMaterial(texture)
      const plane = new THREE.InstancedMesh(geometry, material, 7)

      plane.scale.set(0.12, 0.12, 0.12)

      this.particles = plane

      scene.add(plane)

      this.particlePositions = [];
      this.particleRotations = [];

      for (let i = 0; i < this.particles.count; i++) {
        this.particlePositions.push(new THREE.Vector3(0, -0.3 * i, 0));
      }
    }
  }

  public Draw(simulation: Simulation, lerpFactor: number): void { 
    if (!this.head) {
      return
    }

    this.head.scene.rotateY(0.005)

    const instanceAlpha = new Float32Array(this.particles.count);

    // Update particle positions incrementally over time
    for (let i = 0; i < this.particles.count; i++) {
      // Increment the Y position for each particle
      this.particlePositions[i].y -= 0.016; // Move down over time
    
      // Reset the particle's position when it goes below -2
      if (this.particlePositions[i].y < -2) {
        this.particlePositions[i].y = 0; // Reset to top
      }
    
      // Apply translation matrix (move to particle's position)
      const translation = new THREE.Matrix4().makeTranslation(
        this.particlePositions[i].x,
        this.particlePositions[i].y,
        this.particlePositions[i].z
      );
    
      // Apply rotation matrix (rotate around X-axis)
      const rotation = new THREE.Matrix4().makeRotationZ(Math.random() * Math.PI); // Apply random rotation once, not every frame
    
      // Combine the translation and rotation matrices
      const matrix = new THREE.Matrix4().multiply(translation).multiply(rotation);
    
      // Calculate the opacity based on the Y position
      instanceAlpha[i] = (1.0 - (-this.particlePositions[i].y / 2)) * 0.9;
      
      // Clamp alpha to ensure it's non-negative
      if (instanceAlpha[i] < 0) {
        instanceAlpha[i] = 0;
      }
    
      // Set the updated matrix for the particle
      this.particles.setMatrixAt(i, matrix);
    }

    // Assign the alpha buffer as an attribute to the geometry
    this.particles.instanceMatrix.needsUpdate = true;
    this.particles.geometry.setAttribute('instanceAlpha', new THREE.InstancedBufferAttribute(instanceAlpha, 1));
  }

  public Cleanup(simulation: Simulation): void {
    if (this.head) {
      this.scene.remove(this.head.scene)
    }
  }
}
