import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/Addons.js';
import * as THREE from "three";
import { genericMaterial } from "../graphics/shaders";

const gltfLoader = new GLTFLoader();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://threejs.org/examples/jsm/libs/draco/');
gltfLoader.setDRACOLoader(dracoLoader);

export const loadGltf = async (path: string) => {
  const gltf = await gltfLoader.loadAsync(path)

  const material = genericMaterial()

  // recursively set the material of all children to the shader material
  gltf.scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const texture = child.material.map as THREE.Texture | null

      child.material = material.clone()

      if (!texture) return

      child.material.uniforms.uTexture.value = texture 
      texture.colorSpace = THREE.LinearDisplayP3ColorSpace
    }
  })

  return gltf
}