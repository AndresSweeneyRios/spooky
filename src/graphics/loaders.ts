import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from "three";
import { renderer } from '../components/Viewport';
import * as shaders from './shaders';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as Tiled from "./tiledJson"
import { vec2, vec3 } from "gl-matrix";
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { traverse } from "../utils/traverse";
import * as animation from "../animation"
import { playerInput } from "../input/player";

const fbxLoader = new FBXLoader();

export const loadFbx = async (path: string, mapBones = false) => {
  const fbx = await fbxLoader.loadAsync(path)

  if (mapBones) {
    for (const object of traverse(fbx)) {
      if (object instanceof THREE.SkinnedMesh) {
        const bones = object.skeleton.bones

        for (const bone of bones) {
          if (!bone.name) {
            continue
          }

          bone.name = animation.adapter.mapName(bone.name)
        }
      }
    }
  }

  shaders.applyInjectedMaterials(fbx)

  return fbx
}

const gltfLoader = new GLTFLoader();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://threejs.org/examples/jsm/libs/draco/');
gltfLoader.setDRACOLoader(dracoLoader);

export const loadGltf = async (path: string, mapBones = false) => {
  const gltf = await gltfLoader.loadAsync(path)

  if (mapBones) {
    for (const object of traverse(gltf.scene)) {
      if (object instanceof THREE.SkinnedMesh) {
        const bones = object.skeleton.bones

        for (const bone of bones) {
          if (!bone.name) {
            continue
          }

          bone.name = animation.adapter.mapName(bone.name)
        }
      }
    }
  }

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
  texture.colorSpace = THREE.SRGBColorSpace

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

export const loadTiledJSON = async (path: string) => {
  const response = await fetch(path)
  const json = await response.json() as Tiled.Map

  const map = new Map<string, Tiled.TileType>()
  const heightMap = new Map<string, number>()

  for (const layer of json.layers) {
    for (const chunk of layer.chunks) {
      for (let y = 0; y < chunk.height; y++) {
        for (let x = 0; x < chunk.width; x++) {
          const tile = chunk.data[y * chunk.width + x]
          if (tile > 1) {
            const key = `${chunk.x + x},0,${chunk.y + y}`

            if (layer.name === 'height') {
              heightMap.set(key, tile - 1)
            } else if (layer.name === 'terrain') {
              map.set(key, tile - 1)
            }
          }
        }
      }
    }
  }

  for (const [position, type] of heightMap.entries()) {
    let height: number = Tiled.getHeight(type);

    if (height === 0) {
      continue
    }

    const [x, y, z] = position.split(',').map(Number);

    const key = `${x},${y},${z}`;

    if (!map.has(key)) {
      continue
    }

    const terrainType = map.get(key)!;

    let newY = 0;

    while (newY < height) {
      newY++;

      const key = `${x},${newY},${z}`;
      if (map.has(key)) {
        break;
      }

      map.set(key, terrainType)
    }
  }

  const geometries: Map<Tiled.TileType, THREE.BufferGeometry[]> = new Map();

  const boxColliders: {
    halfExtents: vec3,
    position: vec3,
  }[] = []

  while (map.size > 0) {
    const [position, type] = map.entries().next().value as [string, Tiled.TileType];
    map.delete(position);

    const xGroup = new Set<string>()
    xGroup.add(position);
    const yGroup = new Set<string>()
    const zGroup = new Set<string>()

    const growX = (position: string, direction: number) => {
      const [x, y, z] = position.split(',').map(Number);
      const key = `${x + direction},${y},${z}`;

      if (!map.has(key) || map.get(key) !== type) {
        return false;
      }

      map.delete(key);
      xGroup.add(key);

      growX(key, direction);
    }

    growX(position, +1);
    growX(position, -1);

    const growZ = (delta: number, direction: number) => {
      let positions = [];

      for (const position of xGroup) {
        const [x, y, z] = position.split(',').map(Number);
        const key = `${x},${y},${z + delta}`;

        if (!map.has(key) || map.get(key) !== type) {
          return false;
        }

        positions.push(key);
      }

      for (const position of positions) {
        zGroup.add(position);
        map.delete(position);
      }

      growZ(delta + direction, direction);
    }

    growZ(+1, +1);
    growZ(-1, -1);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    const completeGroup = new Set([...xGroup, ...yGroup, ...zGroup]);

    for (const position of completeGroup) {
      const [x, y, z] = position.split(',').map(Number);

      if (x < minX) {
        minX = x;
      }

      if (x > maxX) {
        maxX = x;
      }

      if (y < minY) {
        minY = y;
      }

      if (y > maxY) {
        maxY = y;
      }

      if (z < minZ) {
        minZ = z;
      }

      if (z > maxZ) {
        maxZ = z;
      }
    }

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const depth = maxZ - minZ + 1;

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const matrix = new THREE.Matrix4().makeTranslation(minX + width / 2, minY + height / 2 - 1, minZ + depth / 2);
    geometry.applyMatrix4(matrix);

    boxColliders.push({
      halfExtents: vec3.fromValues(width / 2, height / 2, depth / 2),
      position: vec3.fromValues(minX + width / 2, minY + height / 2 - 1, minZ + depth / 2),
    })

    if (!geometries.has(type)) {
      geometries.set(type, []);
    }

    geometries.get(type)!.push(geometry);
  }

  const meshes: THREE.Mesh[] = [];

  for (const [tile, tileGeometries] of geometries) {
    const colors = {
      [Tiled.TileType.Grass]: 0x00ff00,
      [Tiled.TileType.Sand]: 0xffff00,
      [Tiled.TileType.Water]: 0x0000ff,
      [Tiled.TileType.Trail]: 0xff00ff,
    }

    if (!colors[tile as keyof typeof colors]) {
      continue;
    }

    const geometry = BufferGeometryUtils.mergeGeometries(tileGeometries);

    const material = new THREE.MeshStandardMaterial({
      color: colors[tile as keyof typeof colors],
      // wireframe: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    meshes.push(mesh);
  }

  const spawnPoints: vec3[] = [];
  const plots: vec3[] = [];

  for (const [position, type] of heightMap.entries()) {
    if (type === Tiled.TileType.Spawn) {
      const [x, y, z] = position.split(',').map(Number);
      spawnPoints.push(vec3.fromValues(x, y, z));
    }

    if (type === Tiled.TileType.Plot) {
      const [x, y, z] = position.split(',').map(Number);
      plots.push(vec3.fromValues(x, y, z));
    }
  }

  return {
    meshes,
    spawnPoints,
    plots,
    boxColliders,
  };
}

export const firstClick = new Promise<void>((resolve) => {
  const handler = () => {
    resolve();
    window.removeEventListener("click", handler);
    window.removeEventListener("keydown", handler);
    playerInput.emitter.off("justpressed", handler);
  };

  window.addEventListener("click", handler);
  window.addEventListener("keydown", handler);
  playerInput.emitter.on("justpressed", handler);
});

export const listener = new THREE.AudioListener();

listener.setMasterVolume(2.0);

export const loadAudio = async (path: string, {
  loop = false,
  randomPitch = false,
  detune = 0,
  positional = false,
  pitchRange = 1500, // New parameter to control the range of the random pitch
  autoplay = false,
  volume = 0.2,
}) => {
  const audio = positional ? new THREE.PositionalAudio(listener) : new THREE.Audio(listener);

  const audioLoader = new THREE.AudioLoader();

  const buffer = await audioLoader.loadAsync(path);
  audio.setBuffer(buffer);
  audio.setLoop(loop);
  audio.setVolume(volume);
  audio.detune = detune;

  const setVolume = (volume: number) => {
    audio.setVolume(volume);
  };

  const play = async () => {
    await firstClick;

    if (audio.isPlaying) {
      await stop();
    }

    if (randomPitch) {
      audio.detune = Math.random() * pitchRange * 2 - pitchRange + detune;
    }

    audio.play();
  };

  const stop = async () => {
    audio.stop(0.05);
  };

  const getPositionalAudio = () => {
    if (!positional) {
      throw new Error("Audio is not positional");
    }

    return audio as THREE.PositionalAudio;
  };

  if (autoplay) {
    play();
  }

  return {
    setVolume,
    play,
    stop,
    getPositionalAudio,
  };
}
