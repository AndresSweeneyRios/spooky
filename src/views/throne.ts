import { Simulation } from "../simulation";
import * as THREE from "three";
import { loadGltf } from "../graphics/loaders";
import * as shaders from "../graphics/shaders";
import { traverse } from "../utils/traverse";
import { processAttributes } from "../utils/processAttributes";
import { EntId } from "../simulation/EntityRegistry";
import { EntityView } from "../simulation/EntityView";
import { vec3 } from "gl-matrix";

const gltfPromise = loadGltf("./3d/throne.glb")

export class ThroneView extends EntityView {
  throne: THREE.Object3D | null = null
  scene: THREE.Scene
  circles: THREE.Mesh[] | null = null
  eye: THREE.Mesh | null = null
  throneYPosition = 0

  async init(simulation: Simulation, entId: EntId, startPosition: vec3) {
    const gltf = await gltfPromise

    this.throne = gltf.scene.clone()

    shaders.applyInjectedMaterials(this.throne)

    for (const child of traverse(this.throne)) {
      if (!this.throne) {
        continue
      }

      if (child.name === "eye") {
        const eye = child as THREE.Mesh

        this.eye = eye

        shaders.waitForShader(eye).then((shader) => {
          shader.uniforms.throneEye = { value: true }

          shaders.recursivelyManipulateMaterial(eye, (material) => {
            material.needsUpdate = true
          })
        })
      }

      if (child.name === "circles") {
        this.circles = child.children as THREE.Mesh[]

        for (let i = 0; i < 4; i++) {
          this.circles[i].rotation.x = Math.PI / 2

          this.circles[i].position.set(0, 0, 0)
        }
      }
    }

    this.throne.position.set(startPosition[0], startPosition[1] + 30, startPosition[2])

    processAttributes(this.throne, simulation, entId, true)

    this.scene.add(this.throne);
  }

  constructor(simulation: Simulation, entId: EntId, startPosition: vec3) {
    super(entId)
    this.scene = simulation.ThreeScene
    this.init(simulation, entId, startPosition).catch(console.error)
  }

  // Rotate it slowly
  public Draw(simulation: Simulation, lerpFactor: number): void {
    if (!this.circles) return
    if (!this.eye) return

    for (let i = 0; i < this.circles.length; i++) {
      const circle = this.circles[i]

      // use i to generate a unique rotation for each circle
      // this is a biblically accurate Throne, with 4 circles spinning in opposite directions
      circle.rotation.y += (0.002 * (i + 1)) * (i % 2 === 0 ? 1 : -1)
    }

    this.throneYPosition += simulation.SimulationState.DeltaTime * 2

    this.circles[0].rotation.x += 0.007
    this.circles[1].rotation.z -= 0.001
    this.circles[2].rotation.x -= 0.003
    this.circles[3].rotation.z += 0.002

    this.eye.rotation.y += 0.01
    this.eye.position.y = Math.sin(this.throneYPosition) * 2
  }

  public Cleanup(simulation: Simulation): void {
    if (this.throne) {
      this.scene.remove(this.throne)
    }
  }
}
