import * as THREE from 'three';
import { renderer } from '../../components/Viewport';
import { Simulation } from '../../simulation';
import { View } from '../../simulation/View';
import { loadGltf } from '../../graphics/loaders';
import { processAttributes } from '../../utils/processAttributes';
import * as player from '../../entities/player';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { OutlinePass, ShaderPass } from 'three/examples/jsm/Addons.js';
import { ToneMappingShader } from '../../graphics/toneMappingShader';
import * as shaders from '../../graphics/shaders';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { PlayerView } from "../../views/player";
import { updateGameLogic } from "../../simulation/loop";
import { JustPressedEvent, playerInput } from "../../input/player";
import * as state from "./state";
import { setGravity } from "../../simulation/repository/PhysicsRepository";

// Cache frequently accessed DOM elements
const loadingEl = document.getElementById("caseoh-loading");
const splashEl = document.getElementById("splash");

export let currentCrtPass: ShaderPass | null = null;
export let currentOutlinePass: OutlinePass | null = null;
export let currentPlayerView: PlayerView | null = null;

export const disableLoading = (): void => {
  loadingEl?.setAttribute("is-hidden", "true");
  splashEl?.setAttribute("is-hidden", "true");
};

export const enableLoading = (): void => {
  loadingEl?.setAttribute("is-hidden", "false");
};

const mapLoader = loadGltf("/3d/scenes/island/dropper_OPTIMIZED.glb").then(gltf => gltf.scene);

const initScene = () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
  const simulation = new Simulation(camera, scene);
  camera.add(new THREE.AudioListener());

  const effectComposer = new EffectComposer(renderer);
  effectComposer.addPass(new RenderPass(scene, camera));

  ToneMappingShader.uniforms.contrast = { value: 1.3 };
  ToneMappingShader.uniforms.contrastMidpoint = { value: 0.1 };
  ToneMappingShader.uniforms.saturation = { value: 0.6 };
  ToneMappingShader.uniforms.toneMappingExposure = { value: 0.9 };
  const toneMappingPass = new ShaderPass(ToneMappingShader);
  effectComposer.addPass(toneMappingPass);

  currentOutlinePass = new OutlinePass(
    new THREE.Vector2(renderer.domElement.width, renderer.domElement.height),
    scene,
    camera,
  );
  // tweak outline pass
  currentOutlinePass.edgeStrength = 10;
  currentOutlinePass.edgeGlow = 0.0;
  currentOutlinePass.edgeThickness = 0.1;
  currentOutlinePass.visibleEdgeColor.set(0xffffff);
  currentOutlinePass.hiddenEdgeColor.set(0x00000000);
  effectComposer.addPass(currentOutlinePass);

  const crtPass = new ShaderPass(shaders.CRTShader);
  crtPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  effectComposer.addPass(crtPass);
  currentCrtPass = crtPass;

  effectComposer.addPass(new OutputPass());

  simulation.ViewSync.AddAuxiliaryView(new class extends View {
    private isCleanedUp = false;

    public Draw(): void {
      if (this.isCleanedUp) return;
      crtPass.uniforms.time.value = (Date.now() / 1000) % 1.0;
      crtPass.uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height);
      effectComposer.render();
    }

    public Cleanup(): void {
      this.isCleanedUp = true;
      renderer.dispose();
    }
  });

  const resize = (): void => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    crtPass.uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height);
    effectComposer.setSize(renderer.domElement.width, renderer.domElement.height);
  };
  resize();
  window.addEventListener('resize', resize, false);

  const sceneEntId = simulation.EntityRegistry.Create();
  simulation.SimulationState.PhysicsRepository.CreateComponent(sceneEntId);

  const cleanup = () => {
    window.removeEventListener('resize', resize);
    scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(mat => {
            if (mat.map) mat.map.dispose();
            mat.dispose();
          });
        } else {
          if (obj.material.map) obj.material.map.dispose();
          obj.material.dispose();
        }
      }
    });
    scene.clear();
    effectComposer.dispose();
    simulation.ViewSync.Cleanup(simulation);
    simulation.Stop();
  };

  return { scene, camera, simulation, effectComposer, cleanup, sceneEntId };
};

export const init = async () => {
  enableLoading();

  setGravity(-0.2)

  player.setThirdPerson(false);
  player.setCameraHeight(2);

  const { scene, camera, simulation, cleanup, sceneEntId } = initScene();

  const [sceneGltfOriginal, playerView] = await Promise.all([
    mapLoader,
    player.createPlayer(simulation, [2, 0, -6], [0, 0, 0])
  ]);
  currentPlayerView = playerView;

  playerView.interactionEmitter.on("interactionsChanged", interactions => {
    let closestInteraction = null;

    for (const interaction of interactions) {
      if (!closestInteraction || interaction.angle < closestInteraction.angle) {
        closestInteraction = interaction;
      }
    }

    const selectedObjects = closestInteraction?.command.Owner ? [closestInteraction.command.Owner] : [];

    currentOutlinePass?.selectedObjects.splice(0, currentOutlinePass.selectedObjects.length);
    currentOutlinePass?.selectedObjects.push(...selectedObjects);
  });

  const sceneGltf = SkeletonUtils.clone(sceneGltfOriginal);
  processAttributes(sceneGltf, simulation, sceneEntId, false);
  shaders.applyInjectedMaterials(sceneGltf);

  sceneGltf.traverse(child => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = false;
      child.receiveShadow = false;
      (child.material as THREE.Material).side = THREE.DoubleSide;
    }
  });
  scene.add(sceneGltf);

  const cylinder = scene.getObjectByName("Cylinder");

  if (cylinder instanceof THREE.Mesh) {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      '/3d/textures/meatwireeyes.webp',
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        // Maintain aspect ratio while repeating
        const repeatFactor = 10.0;
        texture.repeat.set(repeatFactor, repeatFactor);

        // Create a custom shader material to map in screen space
        const customMaterial = new THREE.ShaderMaterial({
          uniforms: {
            tDiffuse: { value: texture },
            aspectRatio: { value: texture.image.width / texture.image.height },
            scale: { value: 2.0 }, // Adjust scale as needed
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
              // Convert to normalized device coordinates
              vec2 screenUV = (vScreenPosition.xy / vScreenPosition.w) * 0.5 + 0.5;
              
              // Factor in screen resolution aspect ratio
              float screenAspect = resolution.x / resolution.y;
              screenUV.x *= screenAspect;
              
              // Apply scale while maintaining aspect ratio
              screenUV *= scale;
              
              // Adjust for texture aspect ratio
              if (aspectRatio > 1.0) {
                screenUV.y *= aspectRatio;
              } else {
                screenUV.x /= aspectRatio;
              }
              
              // Add subtle animation if desired
              screenUV.x += time * 0.1;
              screenUV.y += time * 0.3;
              
              gl_FragColor = texture2D(tDiffuse, screenUV);
              
              // Optional: add slight edge darkening for horror effect
              float vignetteStrength = 0.8;
              float distFromCenter = length(vec2(0.5, 0.5) - vec2(vUv.x, vUv.y));
              float vignette = 1.0 - distFromCenter * vignetteStrength;
              gl_FragColor.rgb *= vignette;
            }
          `,
          side: THREE.DoubleSide
        });

        // Update time and resolution uniforms in the render loop
        const updateUniforms = function () {
          if (customMaterial.uniforms) {
            customMaterial.uniforms.time.value = performance.now() * 0.001;
            customMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
          }
          requestAnimationFrame(updateUniforms);
        };
        requestAnimationFrame(updateUniforms);

        // Add a resize listener to update resolution when window size changes
        const handleResize = () => {
          if (customMaterial.uniforms) {
            customMaterial.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
          }
        };
        window.addEventListener('resize', handleResize);

        // Assign the material to the cylinder
        if (cylinder.material instanceof THREE.Material) {
          cylinder.material = customMaterial;
        } else if (Array.isArray(cylinder.material)) {
          cylinder.material = Array(cylinder.material.length).fill(customMaterial);
        }
      },
      undefined,
      (error) => {
        console.error('Error loading meatwireeyes texture:', error);
      }
    );
  }

  const spotLight = new THREE.SpotLight(0xff0000);
  spotLight.position.set(2, 3, -6);
  spotLight.castShadow = false;
  spotLight.intensity = 8;
  spotLight.decay = 0.5;
  spotLight.angle = Math.PI * 0.35;
  spotLight.penumbra = 1;
  scene.add(spotLight);
  const target = new THREE.Object3D();
  scene.add(target);
  spotLight.target = target;

  simulation.Start();

  simulation.ViewSync.AddAuxiliaryView(new class extends View {
    private isCleanedUp = false;
    private tempVec3 = new THREE.Vector3();

    public Draw(): void {
      if (this.isCleanedUp) return;
      camera.getWorldPosition(this.tempVec3);
      spotLight.position.copy(this.tempVec3);
      camera.getWorldDirection(this.tempVec3);
      spotLight.target.position.copy(this.tempVec3.add(camera.position));
      spotLight.target.updateMatrixWorld();
      playerInput.update();

      try {
        updateGameLogic(simulation, 0);
      } catch (e) {
        console.error(e);
      }
    }

    public Cleanup(): void {
      this.isCleanedUp = true;
    }
  });

  const handlePointerLock = () => {
    if (document.pointerLockElement !== renderer.domElement) {
      playerView.disableControls();
    } else if (state.gameStarted && !state.picking && !state.inDialogue) {
      playerView.enableControls();
    }
  };
  document.addEventListener("pointerlockchange", handlePointerLock);

  const justPressed = (payload: JustPressedEvent) => {
    if (state.inSettings) return;
    if (state.gameStarted && !state.picking && document.pointerLockElement !== renderer.domElement) {
      payload.consume();
      try { renderer.domElement.requestPointerLock(); } catch { }
    }
    try {
      if (document.fullscreenElement !== document.body) {
        payload.consume();
        document.body.requestFullscreen();
      }
    } catch { }
    if (payload.action !== "mainAction1") return;
    if (!(state.gameStarted && !state.picking && !state.inDialogue)) return;
    playerView.enableControls();
  };

  playerInput.emitter.on("justpressed", justPressed);

  setTimeout(() => {
    disableLoading();
  }, 2000);

  return cleanup;
};
