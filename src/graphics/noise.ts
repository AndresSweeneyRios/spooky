import * as THREE from 'three';

function createNoiseShaderMaterial() {
  // Create a clock to update the time uniform
  const clock = new THREE.Clock();

  // Define the custom shader material
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0.0 },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    vertexShader: /*glsl*/`
      varying vec2 vUv;
      
      void main() {
        vUv = uv; // Pass UV coordinates to the fragment shader
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /*glsl*/`
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
    transparent: true // Allow the material to have transparent cutout sections
  });

  // Update the `time` uniform on each frame
  material.onBeforeCompile = () => {
    material.uniforms.time.value = clock.getElapsedTime();
  };

  const updateTime = () => {
    material.uniforms.time.value = clock.getElapsedTime();
    requestAnimationFrame(updateTime);
  }

  updateTime();

  // Update resolution on window resize
  window.addEventListener('resize', () => {
    material.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  });

  return material;
}

export const NoiseMaterial = createNoiseShaderMaterial();
