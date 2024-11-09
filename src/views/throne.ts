import { Simulation } from "../simulation";
import { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from "three";
import { View } from "../simulation/View";
import { loadGltf } from "../graphics/loaders";
import * as shaders from "../graphics/shaders";

shaders.inject({
  uniforms: {
    throneEye: { value: false }
  },
  
  fragment: [
    {
      marker: shaders.FRAGMENT_MARKER.UNIFORM,
      value: /* glsl */`
uniform bool throneEye;
`
    },
    {
      marker: shaders.FRAGMENT_MARKER.PRE_QUANTIZATION,
      value: /* glsl */`
if (throneEye) {
vec4 color = gl_FragColor;
// increase exposure
color.b *= 1.4;
color.r *= 1.4;
color.g *= 1.4;
gl_FragColor = color;
}
      `
    },
  ]
})

export class ThroneView extends View {
  throne: GLTF | null = null
  scene: THREE.Scene

  async init () {
    this.throne = await loadGltf("./3d/throne.glb")

    const eye = this.throne.scene.children[0].children[4].children[0] as THREE.Mesh

    requestAnimationFrame(() => {
      shaders.getShader(eye).uniforms.throneEye = { value: true }
      // shaders.getShader(eye).uniforms.vertexBits = { value: 0 }
    })

    const circles = this.throne.scene.children[0].children.slice(0, 4)

    for (let i = 0; i < 4; i++) {
      circles[i].rotation.x = Math.PI / 2
    }

    this.scene.add(this.throne.scene);

    this.throne.scene.scale.set(4, 4, 4)
    this.throne.scene.position.set(-8, 12, 0)
  }

  constructor(scene: THREE.Scene) {
    super()
    this.scene = scene
    this.init().catch(console.error)
  }

  // Rotate it slowly
  public Draw(simulation: Simulation, lerpFactor: number): void {
    if (!this.throne) return

    const circles = this.throne.scene.children[0].children.slice(0, 4)

    for (let i = 0; i < 4; i++) {
      // use i to generate a unique rotation for each circle
      // this is a biblically accurate Throne, with 4 circles spinning in opposite directions
      circles[i].rotation.y += (0.002 * (i+1)) * (i % 2 === 0 ? 1 : -1)
    }

    circles[0].rotation.x += 0.007
    circles[1].rotation.z -= 0.001
    circles[2].rotation.x -= 0.003
    circles[3].rotation.z += 0.002

    this.throne.scene.children[0].children[4].rotation.y += 0.01
  }

  public Cleanup(simulation: Simulation): void {
    if (this.throne) {
      this.scene.remove(this.throne.scene)
    }
  }
}
