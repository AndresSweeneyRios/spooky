import { Simulation } from "../simulation";
import { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/Addons.js';
import * as THREE from "three";
import { View } from "../simulation/View";
import { getRGBBits } from "../graphics/quantize";
import { RENDERER } from "../../constants";

const gltfLoader = new GLTFLoader();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( 'https://threejs.org/examples/jsm/libs/draco/' );
gltfLoader.setDRACOLoader( dracoLoader );

export class ThroneView extends View {
  throne: GLTF | null = null
  scene: THREE.Scene

  async init () {
    const throne = await gltfLoader.loadAsync("./3d/throne.glb")

    const bits = getRGBBits(RENDERER.colorBits)

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null! }, // Pass the loaded texture to the shader
        uColor: { value: new THREE.Color(0xff6600) }, // Base color
        vertexBits: { value: RENDERER.vertexBits }, // Number of bits for vertex quantization
      },

      vertexShader: /* glsl */ `
        uniform vec3 uColor; // Base color
        uniform float vertexBits; // Number of bits to quantize vertex positions
        varying vec3 vColor; // Varying variable to pass the color to fragment shader
        varying vec2 vUv;

        void main() {
          vUv = uv;

          // Calculate the quantization factor based on the number of bits
          float quantizationFactor = pow(2.0, vertexBits);

          // Convert position to world coordinates
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);

          // Quantize world position to simulate lower precision
          worldPosition.xyz = floor(worldPosition.xyz * quantizationFactor) / quantizationFactor;

          // Transform back to view space
          vec4 viewPosition = viewMatrix * worldPosition;

          vColor = uColor; // Pass the uniform color to the fragment shader
          gl_Position = projectionMatrix * viewPosition; // Project the position
        }
      `,

      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying vec2 vUv;
        uniform sampler2D uTexture; // The texture uniform

        // Function to quantize a color channel to n bits
        float quantize(float value, float bits) {
          return floor(value * (pow(2.0, bits) - 1.0)) / (pow(2.0, bits) - 1.0);
        }

        void main() {
          vec4 texColor = texture2D(uTexture, vUv); // Sample the texture color
          // Quantize each color channel separately
          float r = quantize(texColor.r, ${bits.r}.0); // 5 bits for red
          float g = quantize(texColor.g, ${bits.g}.0); // 6 bits for green
          float b = quantize(texColor.b, ${bits.b}.0); // 5 bits for blue
          
          gl_FragColor = vec4(r, g, b, texColor.a); // Output quantized texture color
        }
      `,
    });

    this.throne = throne

    const circles = this.throne.scene.children[0].children.slice(0, 4)

    for (let i = 0; i < 4; i++) {
      circles[i].rotation.x = Math.PI / 2
    }

    // recursively set the material of all children to the shader material
    this.throne.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const texture = child.material.map
        child.material = material.clone()
        child.material.uniforms.uTexture.value = texture

        // set vertex bits for each child
        child.material.uniforms.vertexBits.value = RENDERER.vertexBits - (Math.random() * 3 - 1)
      }
    })

    this.scene.add(throne.scene);
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
