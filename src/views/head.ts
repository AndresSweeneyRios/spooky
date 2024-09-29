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

export class HeadView extends View {
  head: GLTF | null = null
  scene: THREE.Scene

  async init () {
    const head = await gltfLoader.loadAsync("./3d/head.glb")

    const bits = getRGBBits(RENDERER.colorBits)

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null! }, // Pass the loaded texture to the shader
        uColor: { value: new THREE.Color(0xffffff) }, // Base color
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

    this.head = head 

    // recursively set the material of all children to the shader material
    this.head.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const texture = child.material.map
        child.material = material.clone()
        child.material.uniforms.uTexture.value = texture 
      }
    })

    this.head.scene.rotateY(Math.PI / -2)

    this.scene.add(head.scene);
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
      const material =  new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: texture }
        },
        vertexShader: /* glsl */ `
          attribute float instanceAlpha;
          varying float vAlpha;
          varying vec2 vUv;
          
          void main() {
            vAlpha = instanceAlpha; // Pass the alpha value to the fragment shader
            vUv = uv; // Pass the UV coordinates to the fragment shader
            vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D uTexture;
          varying float vAlpha;
          varying vec2 vUv;
          
          void main() {
            vec4 texColor = texture2D(uTexture, vUv); // Sample the texture color
            gl_FragColor = vec4(texColor.rgb * vec3(0.95, 0.85, 0.8), texColor.a * vAlpha); // Combine texture alpha with instanceAlpha
          }
        `,
        transparent: true, // Enable transparency for the shader
      });
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

  // Rotate it slowly
  public Draw(simulation: Simulation, lerpFactor: number): void { 
    if (this.head) {
      this.head.scene.rotateY(0.005)
    }

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


    // Make sure to update the instance matrix to reflect the changes
    this.particles.instanceMatrix.needsUpdate = true;
  }

  public Cleanup(simulation: Simulation): void {
    if (this.head) {
      this.scene.remove(this.head.scene)
    }
  }
}
