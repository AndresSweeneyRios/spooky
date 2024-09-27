import * as THREE from 'three'
import { renderer } from '../components/Viewport';
import { Simulation } from '../simulation';
import { View } from '../simulation/View';
import { startGameLoop } from '../simulation/loop';
import { getRGBBits } from '../graphics/quantize';
import { RENDERER } from '../../constants';

const simulation = new Simulation()

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}, false);

const textureLoader = new THREE.TextureLoader()

simulation.ViewSync.AddAuxiliaryView(new class CubeView extends View {
  cube: THREE.Mesh = null!

  constructor() {
    super()

    const geometry = new THREE.BoxGeometry(1, 1, 1);

    const texture = textureLoader.load('https://upload.wikimedia.org/wikipedia/commons/3/31/Rainbow-gradient-fully-saturated.svg');
    // const texture = textureLoader.load('https://upload.wikimedia.org/wikipedia/commons/8/8d/President_Barack_Obama.jpg');


    const bits = getRGBBits(RENDERER.colorBits)

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texture }, // Pass the loaded texture to the shader
        uColor: { value: new THREE.Color(0xff6600) }, // Base color
        vertexBits: { value: 16 }, // Number of bits for vertex quantization
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

    this.cube = new THREE.Mesh(geometry, material);
    scene.add(this.cube);
  }

  public Draw(simulation: Simulation, lerpFactor: number): void {
    this.cube.rotation.x += 0.01
    this.cube.rotation.y += 0.01
  }
})

simulation.ViewSync.AddAuxiliaryView(new class ThreeJSRenderer extends View {
  public Draw(simulation: Simulation, lerpFactor: number): void {
    renderer.render(scene, camera)
  }
  public Cleanup(simulation: Simulation): void {
    renderer.dispose()
  }
})

startGameLoop(simulation)
