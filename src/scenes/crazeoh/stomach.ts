import * as THREE from 'three'
import { renderer } from '../../components/Viewport'
import { Simulation } from '../../simulation'
import { View } from '../../simulation/View'
import { loadGltf, loadAudio } from '../../graphics/loaders'
import * as player from '../../entities/player'
import { updateGameLogic } from "../../simulation/loop"
import { JustPressedEvent, playerInput } from "../../input/player"
import * as state from "./state"
import { SimulationCommand } from "../../simulation/commands/_command"
import { ExecutionMode } from "../../simulation/repository/SensorCommandRepository"
import { loadScene, scenes } from ".."
import { initScene } from "./initScene"
import { requestFullscreen } from "../../utils/requestFullscreen"

import stomachGlb from '../../assets/3d/scenes/island/stomach_OPTIMIZED.glb'
import synthkickOgg from '../../assets/audio/music/synthkick.ogg'
import eatChipOgg from '../../assets/audio/sfx/eat_chip.ogg'
import acid3Webp from '../../assets/3d/textures/acid3.webp'
import ballsackWebp from '../../assets/3d/textures/ballsack.webp'
import { hideMainMenu } from "../../pages/Caseoh"

// Cache frequently accessed DOM elements
const loadingEl = document.getElementById("caseoh-loading")
const splashEl = document.getElementById("splash")

export const disableLoading = (): void => {
  loadingEl?.setAttribute("is-hidden", "true")
  splashEl?.setAttribute("is-hidden", "true")
}

export const enableLoading = (): void => {
  loadingEl?.setAttribute("is-hidden", "false")
}

const mapLoader = loadGltf(stomachGlb).then(gltf => gltf.scene)

// Change to positional audio attached to boombox_0
const music = loadAudio(synthkickOgg, {
  loop: true,
  positional: true,
  volume: 0.3,
})

const tempVec3 = new THREE.Vector3()

const eat = (food: string, simulation: Simulation, scene: THREE.Scene) => {
  const foodObject = scene.getObjectByName(food) as THREE.Mesh
  if (!foodObject) {
    console.warn(`Food object "${food}" not found in scene`)
    return
  }

  const entId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId)
  foodObject.getWorldPosition(tempVec3)
  simulation.SimulationState.PhysicsRepository.AddBoxCollider(entId, [2, 2, 2], [tempVec3.x, tempVec3.y, tempVec3.z], undefined, true)
  simulation.SimulationState.SensorCommandRepository.CreateComponent(entId)

  // Create the command with explicit Owner property
  const command = new class extends SimulationCommand {
    // Explicitly add the Owner property
    public Owner: THREE.Object3D = foodObject

    public Execute(sim: Simulation): void {
      foodObject.visible = false
      loadAudio(eatChipOgg, {
        detune: -600,
        randomPitch: true,
        pitchRange: 400,
        volume: 0.1,
      }).then(audio => audio.play())

      enableLoading()

      state.incrementWins()

      music.then(audio => audio.stop())

      setTimeout(() => {
        loadScene(scenes.crazeoh)
      }, 1000)
    }
  }

  simulation.SimulationState.SensorCommandRepository.AddSensorCommand({
    entId: entId,
    executionMode: ExecutionMode.Interaction,
    once: true,
    command: command,
    owner: foodObject,  // Make sure this is set
  })
}

const setupPizzaEating = (simulation: Simulation, scene: THREE.Scene) => {
  eat("pizza", simulation, scene)
}

export const init = async () => {
  enableLoading()

  player.setThirdPerson(false)
  player.setCameraHeight(2)

  const { scene, camera, simulation, cleanup, createFlashlight } = await initScene(mapLoader)

  const [playerView] = await Promise.all([
    player.createPlayer(simulation, [2, 0, -6], [0, 0, 0])
  ])

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.5)
  scene.add(ambientLight)

  // Apply triplanar shader to stomach object
  const stomach = scene.getObjectByName("stomach")
  if (stomach instanceof THREE.Mesh) {
    const textureLoader = new THREE.TextureLoader()
    textureLoader.load(
      ballsackWebp,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping

        // Maintain aspect ratio while repeating
        const repeatFactor = 8.0
        texture.repeat.set(repeatFactor, repeatFactor)

        // Create a custom shader material for triplanar mapping
        const customMaterial = new THREE.ShaderMaterial({
          uniforms: {
            tDiffuse: { value: texture },
            aspectRatio: { value: texture.image.width / texture.image.height },
            scale: { value: 1.0 },
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
              
              // Pass positions to fragment shader for triplanar mapping
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
              // Calculate normals from position derivatives for triplanar blending
              vec3 normal = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
              vec3 normalAbs = abs(normal);
              
              // Get texture scale
              float texScale = scale * 0.1;
              
              // Animate UVs for all three planar projections
              vec2 uvX = vPosition.zy * texScale + vec2(sin(time * 0.1) * 0.1, cos(time * 0.2) * 0.1);
              vec2 uvY = vPosition.xz * texScale + vec2(cos(time * 0.15) * 0.1, sin(time * 0.25) * 0.1);
              vec2 uvZ = vPosition.xy * texScale + vec2(sin(time * 0.2) * 0.1, cos(time * 0.1) * 0.1);
              
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

        // Assign the material to the stomach object
        if (stomach.material instanceof THREE.Material) {
          stomach.material = customMaterial
        } else if (Array.isArray(stomach.material)) {
          stomach.material = Array(stomach.material.length).fill(customMaterial)
        }
      },
      undefined,
      (error) => {
        console.error('Error loading ballsack texture:', error)
      }
    )
  }

  // Apply triplanar shader to acid object
  const acid = scene.getObjectByName("acid")
  const cokeInside = scene.getObjectByName("cokeinside")
  const bepisInside = scene.getObjectByName("bepisinside")

  const textureLoader = new THREE.TextureLoader()
  textureLoader.load(
    acid3Webp,
    (texture) => {
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping

      // Maintain aspect ratio while repeating
      const repeatFactor = 5.0
      texture.repeat.set(repeatFactor, repeatFactor)

      // Create a custom shader material for triplanar mapping
      const customMaterial = new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: texture },
          aspectRatio: { value: texture.image.width / texture.image.height },
          scale: { value: 3 },
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
            
            // Pass positions to fragment shader for triplanar mapping
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
            // Calculate normals from position derivatives for triplanar blending
            vec3 normal = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
            vec3 normalAbs = abs(normal);
            
            // Get texture scale
            float texScale = scale * 0.1;
            
            // Downward-only flow animation for acid effect
            float flowSpeed = 0.1;
            float downwardFlow = mod(time * flowSpeed, 1.0); // Only flow downward
            
            // Animate UVs for all three planar projections with downward-only flow
            // For each plane, apply downward flow to the vertical component only
            vec2 uvX = vec2(vPosition.z * texScale, (vPosition.y * texScale) + downwardFlow);
            vec2 uvY = vec2(vPosition.x * texScale, (vPosition.z * texScale) + downwardFlow);
            vec2 uvZ = vec2(vPosition.x * texScale, (vPosition.y * texScale) + downwardFlow);
            
            // Sample texture from three directions
            vec4 colorX = texture2D(tDiffuse, uvX);
            vec4 colorY = texture2D(tDiffuse, uvY);
            vec4 colorZ = texture2D(tDiffuse, uvZ);
            
            // Blend based on normal
            float blendWeight = 0.8; // Adjust for sharper or smoother transitions
            vec3 weights = normalAbs / (normalAbs.x + normalAbs.y + normalAbs.z + blendWeight);
            vec4 color = colorX * weights.x + colorY * weights.y + colorZ * weights.z;

            // colorize green
            color.r *= 0.5;
            color.g *= 0.8;
            color.b *= 0.1;
            color.a = (color.r + color.g + color.b) / 3.0 * 0.2 + 0.7;
            
            // Apply gamma correction
            color.rgb = pow(color.rgb, vec3(1.0 * 2.2));
            
            gl_FragColor = color;
          }
        `,
        transparent: true,
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

      // Apply the material to each mesh, handling both single materials and material arrays
      const applyAcidMaterial = (object: THREE.Object3D | null) => {
        if (!(object instanceof THREE.Mesh)) return

        if (Array.isArray(object.material)) {
          // Handle material arrays
          object.material = Array(object.material.length).fill(customMaterial)
        } else {
          // Handle single material
          object.material = customMaterial
        }
      }

      // Apply to all acid-related objects
      [acid, cokeInside, bepisInside].forEach(value => applyAcidMaterial(value!))
    },
    undefined,
    (error) => {
      console.error('Error loading acid3 texture:', error)
    }
  )

  // Play music on the boombox object
  const boombox = scene.getObjectByName("boombox_0")
  if (boombox) {
    music.then(audio => {
      audio.play()
      boombox.add(audio.getPositionalAudio())
    })
  } else {
    console.warn("boombox_0 not found in scene")
  }

  setupPizzaEating(simulation, scene)

  createFlashlight()

  simulation.Start()

  state.setGameStarted(true)
  hideMainMenu()

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
    music.then(audio => audio.stop())
    document.removeEventListener("pointerlockchange", handlePointerLock)
    cleanup()
  }
}
