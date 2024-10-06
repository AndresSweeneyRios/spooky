import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader, RGBELoader } from 'three/examples/jsm/Addons.js';
import * as THREE from "three";
import { renderer } from '../components/Viewport';
import { RENDERER } from '../../constants';
import { getRGBBits } from './quantize';

const gltfLoader = new GLTFLoader();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://threejs.org/examples/jsm/libs/draco/');
gltfLoader.setDRACOLoader(dracoLoader);

export const loadGltf = async (path: string) => {
  const gltf = await gltfLoader.loadAsync(path)

  gltf.scene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return
    }

    const mesh = child as THREE.Mesh

    const material = mesh.material

    if (!material) {
      return
    }

    const onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms) => {
      // prepend vertexBits uniform
      shader.uniforms.vertexBits = { value: RENDERER.vertexBits }

      shader.vertexShader = shader.vertexShader.replace(
        /*glsl*/`void main`, 
        /*glsl*/`
uniform float vertexBits;

void main`)

      shader.vertexShader = shader.vertexShader.replace(
        /*glsl*/`#include <project_vertex>`,
        /*glsl*/`#include <project_vertex>
float quantizationFactor = pow(2.0, vertexBits);

mvPosition.xyz = round(mvPosition.xyz * quantizationFactor) / quantizationFactor;

gl_Position = projectionMatrix * mvPosition;
`)
      const bits = getRGBBits(RENDERER.colorBits)

      shader.uniforms.colorBitsR = { value: bits.r }
      shader.uniforms.colorBitsG = { value: bits.g }
      shader.uniforms.colorBitsB = { value: bits.b }

      shader.fragmentShader = shader.fragmentShader.replace(
        /*glsl*/`void main`,
        /*glsl*/`
uniform float colorBitsR;
uniform float colorBitsG;
uniform float colorBitsB;

float quantize(float value, float bits) {
  return floor(value * (pow(2.0, bits) - 1.0)) / (pow(2.0, bits) - 1.0);
}

void main`)

      shader.fragmentShader = shader.fragmentShader.replace(
        /}\s*$/,
        /*glsl*/`
float r = quantize(gl_FragColor.r, colorBitsR);
float g = quantize(gl_FragColor.g, colorBitsG);
float b = quantize(gl_FragColor.b, colorBitsB);

gl_FragColor = vec4(r, g, b, gl_FragColor.a);
` + `}`)
    }

    if (Array.isArray(material)) {
      material.forEach((m) => {
        m.onBeforeCompile = onBeforeCompile
      })
    } else {
      material.onBeforeCompile = onBeforeCompile
    }
  })

  return gltf
}

const pmremGenerator = new THREE.PMREMGenerator(renderer);

const hdriLoader = new RGBELoader();

export const loadPMREM = async (path: string) => {
  const hdr = await hdriLoader.loadAsync(path)

  const hdrCubeRenderTarget = pmremGenerator.fromEquirectangular(hdr);
  hdr.dispose();

  return hdrCubeRenderTarget.texture
}
