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

export enum VERTEX_MARKER {
  UNIFORM = "@@@UNIFORM@@@",
  CONSTANT = "@@@CONSTANT@@@",
  PRE_QUANTIZATION = "@@@PRE_QUANTIZATION@@@",
  POST_QUANTIZATION = "@@@POST_QUANTIZATION@@@",
}

export enum FRAGMENT_MARKER {
  UNIFORM = "@@@UNIFORM@@@",
  CONSTANT = "@@@CONSTANT@@@",
  PRE_QUANTIZATION = "@@@PRE_QUANTIZATION@@@",
  POST_QUANTIZATION = "@@@POST_QUANTIZATION@@@",
}

export interface Injection {
  uuidFilter?: string[]

  vertex?: {
    raw?: (shader: THREE.WebGLProgramParametersWithUniforms) => void
    marker?: VERTEX_MARKER
    value?: string
  }[]

  fragment?: {
    raw?: (shader: THREE.WebGLProgramParametersWithUniforms) => void
    marker?: FRAGMENT_MARKER
    value?: string
  }[]

  uniforms?: {
    [key: string]: THREE.IUniform
  }
}

export const getShader = (mesh: THREE.Mesh) => (mesh as any).shader as THREE.WebGLProgramParametersWithUniforms

export const waitForShader = (mesh: THREE.Mesh) => new Promise<THREE.WebGLProgramParametersWithUniforms>((resolve) => {
  const check = () => {
    const shader = getShader(mesh)

    if (shader) {
      resolve(shader)
    } else {
      requestAnimationFrame(check)
    }
  }

  check()
})

export const recursivelyManipulateMaterial = (mesh: THREE.Mesh, callback: (material: THREE.Material) => THREE.Material | void) => {
  if (!mesh.material) {
    return
  }

  let materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]

  for (let i = 0; i < materials.length; i++) {
    const material = callback(materials[i])

    if (!material) {
      continue
    }

    materials[i] = material
  }
}

const onBeforeCompile = (
  mesh: THREE.Mesh
) => (shader: THREE.WebGLProgramParametersWithUniforms) => {
  const uuid = mesh.uuid

    ; (mesh as any).shader = shader

  shader.uniforms.vertexBits = { value: RENDERER.vertexBits }

  const bits = getRGBBits(RENDERER.colorBits)

  shader.uniforms.colorBitsR = { value: bits.r }
  shader.uniforms.colorBitsG = { value: bits.g }
  shader.uniforms.colorBitsB = { value: bits.b }
  shader.uniforms.cutoutTexture = { value: false }
  shader.uniforms.disableShadows = { value: false }

  const resize = () => {
    if (!shader?.uniforms) {
      return
    }

    shader.uniforms.resolution = { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  }

  resize()

  window.addEventListener('resize', resize)

  let newVertexShader = String(shader.vertexShader).replace(
    /*glsl*/`void main`,
    /*glsl*/`
uniform float vertexBits;
${VERTEX_MARKER.UNIFORM}

${VERTEX_MARKER.CONSTANT}

void main`)

  newVertexShader = newVertexShader.replace(
  /*glsl*/`#include <project_vertex>`,
  /*glsl*/`#include <project_vertex>
${VERTEX_MARKER.PRE_QUANTIZATION}
float quantizationFactor = pow(2.0, vertexBits);

mvPosition.xyz = round(mvPosition.xyz * quantizationFactor) / quantizationFactor;

gl_Position = projectionMatrix * mvPosition;
${VERTEX_MARKER.POST_QUANTIZATION}
`)

  let newFragmentShader = String(shader.fragmentShader).replace(
    /*glsl*/`void main`,
    /*glsl*/`
uniform float colorBitsR;
uniform float colorBitsG;
uniform float colorBitsB;

uniform vec2 resolution;

uniform bool cutoutTexture;
uniform bool disableShadows;

${FRAGMENT_MARKER.UNIFORM}

float quantize(float value, float bits) {
return floor(value * (pow(2.0, bits) - 1.0)) / (pow(2.0, bits) - 1.0);
}

${FRAGMENT_MARKER.CONSTANT}

void main`)

  newFragmentShader = newFragmentShader.replace(
    /*glsl*/`#include <opaque_fragment>`,
    /*glsl*/`
if (disableShadows) {
outgoingLight = diffuseColor.rgb;
}

#include <opaque_fragment>
`)

  newFragmentShader = newFragmentShader.replace(
    /*glsl*/`#include <map_fragment>`,
    /*glsl*/`#include <map_fragment>
#ifdef USE_MAP
if (cutoutTexture) {
  vec2 screenSpaceCoords = gl_FragCoord.xy / resolution.xy;

	sampledDiffuseColor = texture2D( map, screenSpaceCoords );

	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );

	#endif

	diffuseColor = sampledDiffuseColor;
}
#endif
`)

  newFragmentShader = newFragmentShader.replace(
    /}\s*$/,
    /*glsl*/`
${FRAGMENT_MARKER.PRE_QUANTIZATION}
float r = quantize(gl_FragColor.r, colorBitsR);
float g = quantize(gl_FragColor.g, colorBitsG);
float b = quantize(gl_FragColor.b, colorBitsB);

gl_FragColor = vec4(r, g, b, gl_FragColor.a); 

${FRAGMENT_MARKER.POST_QUANTIZATION}
` + `}`)

  for (const injection of injections) {
    if (injection.uuidFilter && !injection.uuidFilter.includes(uuid)) {
      continue
    }

    if (injection.uniforms) {
      for (const [key, value] of Object.entries(injection.uniforms)) {
        shader.uniforms[key] = value
      }
    }

    if (injection.vertex) {
      for (const step of injection.vertex) {
        if (step.raw) {
          step.raw(shader)
        }

        if (step.marker && step.value) {
          newVertexShader = newVertexShader.replace(step.marker, step.value.toString() + '\n' + step.marker)
        }
      }
    }

    if (injection.fragment) {
      for (const step of injection.fragment) {
        if (step.raw) {
          step.raw(shader)
        }

        if (step.marker && step.value) {
          newFragmentShader = newFragmentShader.replace(step.marker, step.value.toString() + '\n' + step.marker)
        }
      }
    }
  }

  for (const marker of Object.values(VERTEX_MARKER)) {
    newVertexShader = newVertexShader.replace(marker, "")
  }

  for (const marker of Object.values(FRAGMENT_MARKER)) {
    newFragmentShader = newFragmentShader.replace(marker, "")
  }

  shader.vertexShader = newVertexShader
  shader.fragmentShader = newFragmentShader
}

const injections: Injection[] = []

export const inject = (injection: Injection) => {
  injections.push(injection)
}

export const applyInjectedMaterials = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return
    }

    const mesh = child as THREE.Mesh
    mesh.castShadow = true
    mesh.receiveShadow = true

    if (!mesh.material) {
      return
    }

    let materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]

    materials.forEach((material) => {
      material.onBeforeCompile = onBeforeCompile(mesh)

      material.shadowSide = THREE.DoubleSide
      material.depthWrite = true

      return material
    })
  })
}

export const CRTShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    time: { value: 0.0 },
    scanlineIntensity: { value: 0.3 },
    vignetteIntensity: { value: 0.0 },
    curvature: { value: 0.5 },
    noiseIntensity: { value: 0.3 },
    rgbOffset: { value: new THREE.Vector2(0.0012, 0.0012) },
    // New uniform to optionally scale the UV coordinates after distortion.
    edgeScale: { value: 0.8 } // 1.0 = no scaling, >1.0 scales up to hide edge stretching
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float time;
    uniform float scanlineIntensity;
    uniform float vignetteIntensity;
    uniform float curvature;
    uniform float noiseIntensity;
    uniform vec2 rgbOffset;
    uniform float edgeScale;
    
    varying vec2 vUv;
    
    // Barrel distortion to simulate CRT screen curvature.
    vec2 barrelDistortion(vec2 coord, float amt) {
      vec2 cc = coord - 0.5;
      float dist = length(cc);
      return coord + cc * amt * dist * dist;
    }
    
    // Random noise function
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233) + time)) * 43758.5453123);
    }

    void main() {
      // Apply barrel distortion to the original UVs.
      vec2 uv = barrelDistortion(vUv, curvature);
      
      // Optionally scale the UVs to push the distorted edges inward.
      uv = (uv - 0.5) * edgeScale + 0.5;
      
      // Create a scanline pattern based on the screen's vertical resolution.
      float scanline = sin((vUv.y) * resolution.y * 3.1459) * 0.5 + 0.5;
      scanline = mix(1.0, scanline, scanlineIntensity);
      
      // Apply vignette by darkening toward the edges.
      float dist = distance(uv, vec2(0.5, 0.5));
      // float vignette = smoothstep(0.8, 0.5, dist);
      // vignette = mix(1.0, vignette, vignetteIntensity);
      
      // Assume resolution holds the actual render resolution in pixels (width, height)
      // We want the noise grid to be 640 pixels wide, and the height accordingly.
      // vec2 noiseGridRes = vec2(640.0, 640.0 * (resolution.y / resolution.x));

      // Convert normalized uv (0-1) into pixel coordinates for the noise grid,
      // then use floor() to quantize to discrete noise cells.
      vec2 noiseUV = floor(uv * resolution);

      // Now, to animate the noise, add time as an offset (you can tweak which axis to add time)
      float noise = random(noiseUV);

      // Mix with zero based on noiseIntensity.
      noise = mix(0.0, noise, noiseIntensity);
      
      // Sample the scene texture with a slight offset for chromatic aberration.
      vec4 color;
      color.r = texture2D(tDiffuse, uv + rgbOffset).r;
      color.g = texture2D(tDiffuse, uv).g;
      color.b = texture2D(tDiffuse, uv - rgbOffset).b;
      color.a = 1.0;
      
      // Combine the effects.
      color.rgb *= scanline;
      // color.rgb *= vignette;
      color.r += noise * 0.12;
      color.g += noise * 0.09;
      color.b += noise * 0.1;
      
      gl_FragColor = color;
    }
  `
};
