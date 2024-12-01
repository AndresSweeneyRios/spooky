import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from "three";
import { renderer } from '../components/Viewport';
import * as shaders from './shaders';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const fbxLoader = new FBXLoader();

export const loadFbx = async (path: string) => {
  const fbx = await fbxLoader.loadAsync(path)

  shaders.applyInjectedMaterials(fbx)

  return fbx
}

const gltfLoader = new GLTFLoader();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://threejs.org/examples/jsm/libs/draco/');
gltfLoader.setDRACOLoader(dracoLoader);

export const loadGltf = async (path: string) => {
  const gltf = await gltfLoader.loadAsync(path)

  shaders.applyInjectedMaterials(gltf.scene)

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

const textureLoader = new THREE.TextureLoader()

export const loadTexture = (path: string) => textureLoader.load(path)

export const loadVideoTexture = (path: string) => {
  const video = document.createElement('video')
  video.src = path
  video.loop = true
  video.muted = true
  video.play()

  const texture = new THREE.VideoTexture(video)
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.format = THREE.RGBFormat

  return texture
}

export const loadEquirectangularAsEnvMap = async (
  path: string, 
  minFilter: THREE.MinificationTextureFilter = THREE.NearestFilter, 
  magFilter: THREE.MagnificationTextureFilter = THREE.NearestFilter
) => {
  const env = await new Promise<THREE.CubeTexture>((resolve) => {
    textureLoader.load(path, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping
      texture.colorSpace = THREE.SRGBColorSpace
      texture.minFilter = minFilter
      texture.magFilter = magFilter

      const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(texture.image.height)
      cubeRenderTarget.fromEquirectangularTexture(renderer, texture)

      resolve(cubeRenderTarget.texture)
    })
  })

  return env
}