import { RENDERER } from "../../constants"
import { getRGBBits } from "./quantize"
import * as THREE from "three"

export const genericVert = /* glsl */ `
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
  worldPosition.xyz = round(worldPosition.xyz * quantizationFactor) / quantizationFactor;

  // Transform back to view space
  vec4 viewPosition = viewMatrix * worldPosition;

  gl_Position = projectionMatrix * viewPosition; // Project the position
}
`

const bits = getRGBBits(RENDERER.colorBits)

export const genericFrag = /* glsl */ `
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
`

export const genericMaterial = (
  texture?: THREE.Texture,
) => new THREE.ShaderMaterial({
  uniforms: {
    uTexture: { value: texture }, // Pass the loaded texture to the shader
    vertexBits: { value: RENDERER.vertexBits }, // Number of bits for vertex quantization
  },

  vertexShader: genericVert,
  fragmentShader: genericFrag,
});

export const particleVert = /* glsl */ `
attribute float instanceAlpha;
varying float vAlpha;
varying vec2 vUv;

void main() {
  vAlpha = instanceAlpha;
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`

export const particleFrag = /* glsl */ `
uniform sampler2D uTexture;
varying float vAlpha;
varying vec2 vUv;

void main() {
  vec4 texColor = texture2D(uTexture, vUv);
  gl_FragColor = vec4(texColor.rgb * vec3(0.95, 0.85, 0.8), texColor.a * vAlpha);
}
`

export const particleMaterial = (
  texture?: THREE.Texture,
) => new THREE.ShaderMaterial({
  uniforms: {
    uTexture: { value: texture },
  },
  vertexShader: particleVert,
  fragmentShader: particleFrag,
  transparent: true,
})
