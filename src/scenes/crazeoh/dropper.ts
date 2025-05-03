import * as THREE from 'three'
import { renderer } from '../../components/Viewport'
import { Simulation } from '../../simulation'
import { View } from '../../simulation/View'
import { loadGltf, loadAudio } from '../../graphics/loaders'
import * as player from '../../entities/player'
import * as shaders from '../../graphics/shaders'
import { PlayerView } from "../../views/player"
import { updateGameLogic } from "../../simulation/loop"
import { JustPressedEvent, playerInput } from "../../input/player"
import * as state from "./state"
import { setGravity } from "../../simulation/repository/PhysicsRepository"
import { loadScene, scenes } from ".."
import { initScene } from "./initScene"
import dropperGlb from '../../assets/3d/scenes/island/dropper_OPTIMIZED.glb'
import meatwireeyesWebp from '../../assets/3d/textures/meatwireeyes.webp'
import eatChipOgg from '../../assets/audio/sfx/eat_chip.ogg'
import worblyOgg from '../../assets/audio/music/worbly.ogg'
import { requestFullscreen } from "../../utils/requestFullscreen"
import { hideMainMenu } from "../../pages/Caseoh"

// Cache frequently accessed DOM elements
const loadingEl = document.getElementById("caseoh-loading")
const splashEl = document.getElementById("splash")

export let currentPlayerView: PlayerView | null = null

export const disableLoading = (): void => {
  loadingEl?.setAttribute("is-hidden", "true")
  splashEl?.setAttribute("is-hidden", "true")
}

export const enableLoading = (): void => {
  loadingEl?.setAttribute("is-hidden", "false")
}

const mapLoader = loadGltf(dropperGlb).then(gltf => gltf.scene)

let musicAudio: Awaited<ReturnType<typeof loadAudio>> | null = null
let eatChipAudioPromise: Promise<Awaited<ReturnType<typeof loadAudio>>> | null = null

export const init = async () => {
  enableLoading()

  // Preload eat_chip.ogg for end-level event
  eatChipAudioPromise = loadAudio(eatChipOgg, { volume: 0.5 })

  // Start background music
  musicAudio = await loadAudio(worblyOgg, {
    loop: true,
    volume: 0.01,
  })

  setTimeout(() => {
    musicAudio!.play()
  }, 1000)

  setGravity(-0.2)

  player.setThirdPerson(false)
  player.setCameraHeight(2)

  const { scene, camera, simulation, cleanup, createFlashlight } = await initScene(mapLoader)
  const spotLight = createFlashlight()
  spotLight.position.set(2, 3, -6)
  spotLight.castShadow = false
  spotLight.intensity = 8
  spotLight.decay = 0.5
  spotLight.angle = Math.PI * 0.35
  spotLight.penumbra = 1
  scene.add(spotLight)
  const target = new THREE.Object3D()
  scene.add(target)
  spotLight.target = target

  const [playerView] = await Promise.all([
    player.createPlayer(simulation, [2, 0, -6], [0, 0, 0])
  ])
  currentPlayerView = playerView

  const cylinder = scene.getObjectByName("Cylinder")

  if (cylinder instanceof THREE.Mesh) {
    const textureLoader = new THREE.TextureLoader()
    textureLoader.load(
      meatwireeyesWebp,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping

        // Maintain aspect ratio while repeating
        const repeatFactor = 10.0
        texture.repeat.set(repeatFactor, repeatFactor)

        // Create a custom shader material to map in screen space
        const customMaterial = new THREE.ShaderMaterial({
          uniforms: {
            tDiffuse: { value: texture },
            aspectRatio: { value: texture.image.width / texture.image.height },
            scale: { value: 1.2 }, // Adjust scale as needed
            time: { value: 0 },
            resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
          },
          vertexShader: /*glsl*/ `
            varying vec2 vUv;
            varying vec3 vPosition;
            varying vec4 vScreenPosition;
            
            void main() {
              vUv = uv;
              vPosition = position;
              vec4 worldPosition = modelMatrix * vec4(position, 1.0);
              vec4 viewPosition = viewMatrix * worldPosition;
              vScreenPosition = projectionMatrix * viewPosition;
              gl_Position = vScreenPosition;
              
              // Pass normals to fragment shader for triplanar mapping
              vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            }
          `,
          fragmentShader: /*glsl*/ `
            uniform sampler2D tDiffuse;
            uniform float aspectRatio;
            uniform float scale;
            uniform float time;
            uniform vec2 resolution;
            
            varying vec2 vUv;
            varying vec3 vPosition;
            varying vec4 vScreenPosition;
            
            void main() {
              // Calculate normals from position derivatives for better triplanar blending
              vec3 normal = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
              vec3 normalAbs = abs(normal);
              
              // Get texture scale
              float texScale = scale * 0.1;
              
              // Compute UVs for all three planar projections with animation
              vec2 uvX = vPosition.zy * texScale + vec2(time * 0.1, time * 0.3);
              vec2 uvY = vPosition.xz * texScale + vec2(time * 0.12, time * 0.28);
              vec2 uvZ = vPosition.xy * texScale + vec2(time * 0.08, time * 0.32);
              
              // Sample texture from three directions
              vec4 colorX = texture2D(tDiffuse, uvX);
              vec4 colorY = texture2D(tDiffuse, uvY);
              vec4 colorZ = texture2D(tDiffuse, uvZ);
              
              // Blend based on normal
              float blendWeight = 0.8; // Adjust for sharper or smoother transitions
              vec3 weights = normalAbs / (normalAbs.x + normalAbs.y + normalAbs.z + blendWeight);
              vec4 color = colorX * weights.x + colorY * weights.y + colorZ * weights.z;
              
              // Apply gamma correction
              color.rgb = pow(color.rgb, vec3(1.0 * 2.2));
              
              gl_FragColor = color;
            }
          `,
          side: THREE.DoubleSide
        })

        // Update time and resolution uniforms in the render loop
        const updateUniforms = function () {
          if (customMaterial.uniforms) {
            customMaterial.uniforms.time.value = performance.now() * 0.001
            customMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight)
          }
          requestAnimationFrame(updateUniforms)
        }
        requestAnimationFrame(updateUniforms)

        // Add a resize listener to update resolution when window size changes
        const handleResize = () => {
          if (customMaterial.uniforms) {
            customMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight)
          }
        }
        window.addEventListener('resize', handleResize)

        // Assign the material to the cylinder
        if (cylinder.material instanceof THREE.Material) {
          cylinder.material = customMaterial
        } else if (Array.isArray(cylinder.material)) {
          // cylinder.material = Array(cylinder.material.length).fill(customMaterial)
        }
      },
      undefined,
      (error) => {
        console.error('Error loading meatwireeyes texture:', error)
      }
    )
  }

  simulation.Start()

  state.setGameStarted(true)
  hideMainMenu()

  simulation.ViewSync.AddAuxiliaryView(new class extends View {
    private hasEnded = false

    public Draw(): void {
      // log player y position
      const playerY = camera.position.y

      if (!this.hasEnded && playerY <= -372) {
        this.hasEnded = true
        if (eatChipAudioPromise) {
          eatChipAudioPromise.then(audio => {
            audio.setVolume(0.03)
            audio.play()
          })
        }
        enableLoading()
        musicAudio?.stop()
        state.incrementWins()

        setTimeout(() => {
          loadScene(scenes.crazeoh)
        }, 1000)

        return
      }

      // Gradually increase music volume as player descends
      if (musicAudio && playerY > -1000 && playerY < 0) {
        // Linear interpolation from 0.01 to 0.5 as player descends from 0 to -1000
        const volumeFactor = Math.abs(playerY) / 1000
        const targetVolume = 0.01 + (0.1 - 0.01) * volumeFactor

        // Apply the calculated volume with a slight smoothing effect
        const currentVolume = musicAudio.volume
        const newVolume = currentVolume + (targetVolume - currentVolume) * 0.1

        musicAudio.volume = newVolume
      }

      try {
        updateGameLogic(simulation, 0)
      } catch (e) {
        console.error(e)
      }
    }
  })

  const handlePointerLock = () => {
    if (document.pointerLockElement !== renderer.domElement) {
      playerView.disableControls()
    } else if (state.gameStarted && !state.picking && !state.inDialogue) {
      playerView.enableControls()
    }
  }
  document.addEventListener("pointerlockchange", handlePointerLock)

  disableLoading()

  return () => {
    if (musicAudio) musicAudio.stop()
    document.removeEventListener("pointerlockchange", handlePointerLock)
    cleanup()
  }
}
