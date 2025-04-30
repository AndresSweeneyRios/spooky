import { Simulation } from "../simulation";
import { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from "three";
import { View } from "../simulation/View";
import { particleMaterial } from "../graphics/shaders";
import { loadGltf } from "../graphics/loaders";
import headGlb from '../assets/3d/head.glb';
import smoke1Png from '../assets/3d/textures/smoke1.png';
import { traverse } from "../utils/traverse";

export class HeadView extends View {
  head: GLTF | null = null
  scene: THREE.Scene

  async init() {
    this.head = await loadGltf(headGlb)

    {
      const textureLoader = new THREE.TextureLoader()
      const texture = textureLoader.load(smoke1Png)

      const geometry = new THREE.PlaneGeometry(1, 1)
      const material = particleMaterial(texture)
      const plane = new THREE.InstancedMesh(geometry, material, 7)
      // Disable automatic frustum culling so all instances render
      plane.frustumCulled = false;

      plane.scale.set(0.12, 0.12, 0.12)

      this.particles = plane

      this.scene.add(plane)

      this.particlePositions = [];
      this.particleRotations = [];

      for (let i = 0; i < this.particles.count; i++) {
        this.particlePositions.push(new THREE.Vector3(0, -0.3 * i, 0));
        this.particleRotations.push(new THREE.Quaternion());
      }

      // Initialize alpha attribute with full opacity
      const initialAlpha = new Float32Array(this.particles.count).fill(1.0);
      this.particles.geometry.setAttribute(
        'instanceAlpha',
        new THREE.InstancedBufferAttribute(initialAlpha, 1)
      );
    }

    for (const child of traverse(this.head.scene)) {
      if (!(child instanceof THREE.Mesh)) {
        continue
      }

      const materials = Array.isArray(child.material) ? child.material : [child.material]

      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial) {
          material.metalness = 0
          material.roughness = 1
          material.emissiveIntensity = 0
          material.emissive.set(0x000000)
        }
      }
    }

    this.scene.add(this.head.scene);
  }

  particles: THREE.InstancedMesh = null!
  particlePositions: THREE.Vector3[] = null!
  particleRotations: THREE.Quaternion[] = null!

  position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  rotation: THREE.Quaternion = new THREE.Quaternion(0, 0, 0, 1)

  camera: THREE.Camera

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    super()
    this.scene = scene
    this.camera = camera
    this.init().catch(console.error)
  }

  public Draw(simulation: Simulation, lerpFactor: number): void {
    if (!this.head || !this.particles) {
      return
    }

    this.head.scene.position.set(this.position.x, this.position.y, this.position.z)
    this.head.scene.position.y += ((Math.sin(simulation.ViewSync.TimeMS / 150) + 1) / 2) * 0.03
    this.head.scene.scale.set(2.0, 2.0, 2.0)

    // implement rotation
    this.head.scene.setRotationFromQuaternion(this.rotation)

    // Precompute camera-facing rotation matrix for billboarding
    const billboardMatrix = new THREE.Matrix4().makeRotationFromQuaternion(
      this.camera.quaternion
    );

    const instanceAlpha = new Float32Array(this.particles.count);
    const currentHeadPosition = new THREE.Vector3().copy(this.head.scene.position);

    for (let i = 0; i < this.particles.count; i++) {
      // Increment the Y position for each particle
      this.particlePositions[i].y -= 0.016; // Move down over time

      // Reset the particle's position when it goes below -2
      if (this.particlePositions[i].y < -2) {
        this.particlePositions[i].y = 0; // Reset to top
      }

      // Create a position that combines the head position with the relative particle position
      const particleWorldPos = new THREE.Vector3()
        .copy(currentHeadPosition)
        .add(this.particlePositions[i]);

      // Compute translation to particle world position
      const translation = new THREE.Matrix4().makeTranslation(
        particleWorldPos.x,
        particleWorldPos.y,
        particleWorldPos.z
      );
      // Random rotation around quad's normal for variation
      const randomAngle = Math.random() * Math.PI;
      const randomRotation = new THREE.Matrix4().makeRotationZ(randomAngle);
      // Compose: translation * billboard (face camera) * randomRotation
      const matrix = new THREE.Matrix4()
        .multiplyMatrices(translation, billboardMatrix)
        .multiply(randomRotation);

      // Calculate the opacity and set matrix
      instanceAlpha[i] = Math.max(0, (1.0 - (-this.particlePositions[i].y / 2)) * 0.9);
      this.particles.setMatrixAt(i, matrix);
    }

    // Make sure particles are visible
    this.particles.visible = true;

    // Update the instance matrix
    this.particles.instanceMatrix.needsUpdate = true;

    // Update the instanceAlpha buffer in place
    const alphaAttr = this.particles.geometry.getAttribute('instanceAlpha') as THREE.InstancedBufferAttribute;
    alphaAttr.array.set(instanceAlpha);
    alphaAttr.needsUpdate = true;
  }

  public Cleanup(simulation: Simulation): void {
    if (this.head) {
      this.scene.remove(this.head.scene)
    }
  }
}
