import * as THREE from "three";
import { renderer } from "../components/Viewport";

function createNoiseShaderMaterial() {
  // Define the custom shader material
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0.0 },
      resolution: { value: new THREE.Vector2(0, 0) },
    },
    vertexShader: /*glsl*/ `
      varying vec2 vUv;
      
      void main() {
        vUv = uv; // Pass UV coordinates to the fragment shader
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /*glsl*/ `
      precision mediump float;
      varying vec2 vUv;
      uniform float time;
      uniform vec2 resolution;

      // Random noise function
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233) + time)) * 43758.5453123);
      }

      void main() {
        // Get screen space coordinates normalized to [0,1]
        vec2 screenCoords = gl_FragCoord.xy / resolution;

        // Generate noise based on screen coordinates and time
        float noise = random(screenCoords);

        // Cutout effect based on noise value
        if (noise < 0.4) {
          discard; // Discard fragment if noise is below threshold
        }

        gl_FragColor = vec4(noise, noise, noise, 1.0); // Output noise as grayscale color
      }
    `,
    transparent: true, // Allow the material to have transparent cutout sections
  });

  let previousWidth = 0;
  let previousHeight = 0;

  const render = (time: number) => {
    requestAnimationFrame(render);

    material.uniforms.time.value = time;

    if (renderer === null) {
      return;
    }

    const width = renderer.domElement.clientWidth;
    const height = renderer.domElement.clientHeight;

    if (width === previousWidth && height === previousHeight) {
      return;
    }

    previousWidth = width;
    previousHeight = height;

    material.uniforms.resolution.value.set(width, height);
  };

  render(0);

  return material;
}

export const NoiseMaterial = createNoiseShaderMaterial();
