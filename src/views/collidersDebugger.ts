import { Simulation } from "../simulation";
import { View } from "../simulation/View";
import * as THREE from "three";
import { RAPIER } from "../simulation/repository/PhysicsRepository";
import type { Capsule, TriMesh, Ball, Cuboid } from "@dimforge/rapier3d-compat"

export class CollidersDebugger extends View {
  meshMap: Map<symbol, THREE.Mesh> = new Map()
  previousTranslation: Map<symbol, THREE.Vector3> = new Map()

  constructor() {
    super()
  }

  public Draw(simulation: Simulation, lerpFactor: number): void {
    const physics = simulation.SimulationState.PhysicsRepository

    const confirmedColliders: symbol[] = []

    for (const { symbol, collider, entId } of physics.GetAllColliders()) {
      confirmedColliders.push(symbol)

      if (!this.meshMap.has(symbol)) {
        const shape = collider.shape
        let geometry: THREE.BufferGeometry

        switch (shape.type) {
          case RAPIER.ShapeType.Cuboid: {
            const halfExtents = (shape as Cuboid).halfExtents; // Example for a cuboid
            geometry = new THREE.BoxGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2);
            
            break;
          }

          case RAPIER.ShapeType.Ball: {
            const radius = (shape as Ball).radius; // Example for a sphere
            geometry = new THREE.SphereGeometry(radius, 16, 16);

            break;
          }

          case RAPIER.ShapeType.Capsule: {
            const radius = (shape as Capsule).radius;
            const halfHeight = (shape as Capsule).halfHeight;
            geometry = new THREE.CapsuleGeometry(radius, halfHeight * 2, 16, 8);

            break;
          }

          case RAPIER.ShapeType.TriMesh: {
            const trimesh = shape as TriMesh;

            const vertices = trimesh.vertices;
            const indices = trimesh.indices;

            geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.setIndex(new THREE.BufferAttribute(indices, 1));

            break;
          }

          default: continue;
        }

        const isSensor = collider.isSensor()
        const color = isSensor ? 0xff0000 : 0xffff00

        const material = new THREE.MeshBasicMaterial({ color, wireframe: true })
        const newMesh = new THREE.Mesh(geometry, material)
        this.meshMap.set(symbol, newMesh)
        simulation.ThreeScene.add(newMesh)
      }

      const colliderTranslation = collider.translation()

      const position = new THREE.Vector3(
        colliderTranslation.x,
        colliderTranslation.y,
        colliderTranslation.z
      )

      if (!this.previousTranslation.has(symbol)) {
        this.previousTranslation.set(symbol, position)
      }

      const previousPosition = this.previousTranslation.get(symbol)!

      const mesh = this.meshMap.get(symbol)!

      // lerp between previous position and current position
      const lerpedPosition = new THREE.Vector3()
      lerpedPosition.lerpVectors(previousPosition, position, lerpFactor)

      mesh.position.set(lerpedPosition.x, lerpedPosition.y, lerpedPosition.z)

      this.previousTranslation.set(symbol, position)
    }

    for (const [symbol, mesh] of this.meshMap) {
      if (!confirmedColliders.includes(symbol)) {
        simulation.ThreeScene.remove(mesh)
        this.meshMap.delete(symbol)
        this.previousTranslation.delete(symbol)
      }
    }
  }

  public Cleanup(simulation: Simulation): void {
    for (const mesh of this.meshMap.values()) {
      simulation.ThreeScene.remove(mesh)
    }

    this.meshMap.clear()
  }
}
