import * as THREE from 'three';
import { renderer } from '../../components/Viewport';
import { Simulation } from '../../simulation';
import { View } from '../../simulation/View';
import { loadAudio, loadGltf } from '../../graphics/loaders';
import { processAttributes } from '../../utils/processAttributes';
import * as player from '../../entities/player';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { OutlinePass, PositionalAudioHelper, ShaderPass } from 'three/examples/jsm/Addons.js';
import { ToneMappingShader } from '../../graphics/toneMappingShader';
import { traverse } from "../../utils/traverse";
import * as state from "./state";
import { disableAllAnomalies, pickRandomAnomaly } from "./anomaly";
import { createFridge } from "../../entities/crazeoh/fridge";
import { createStove } from "../../entities/crazeoh/stove";
import { createMicrowave } from "../../entities/crazeoh/microwave";
import * as shaders from '../../graphics/shaders';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { getAngle, getMeshCenter } from "../../utils/math";
import { createDoor } from "../../entities/crazeoh/door";
import { PlayerView } from "../../views/player";
import { ExecutionMode } from "../../simulation/repository/SensorCommandRepository";
import { SimulationCommand } from "../../simulation/commands/_command";
import { CollidersDebugger } from "../../views/collidersDebugger";
import { JustPressedEvent, playerInput } from "../../input/player";
import "./scripts";
import { updateGameLogic } from "../../simulation/loop";
import { EntId } from "../../simulation/EntityRegistry";
import { executeWinScript } from "./scripts";

const SHADOW_BIAS = -0.0009;

// Cache frequently accessed DOM elements
const loadingEl = document.getElementById("caseoh-loading");
const splashEl = document.getElementById("splash");
const polaroidEl = document.querySelector(".caseoh-polaroid-overlay.ingame .background") as HTMLImageElement;
const polaroid2El = document.querySelector("#caseoh-decision .caseoh-polaroid-overlay .background") as HTMLImageElement;
const cameraHintEl = document.querySelector(".caseoh-camera-hint") as HTMLElement;

// Reuse vectors and other objects to avoid garbage collection
const tempVec3 = new THREE.Vector3();
const tempEuler = new THREE.Euler();

// Pre-load audio files
const cameraAudioPromise = loadAudio("/audio/sfx/camera.ogg", {
  volume: 0.1,
});

export const ceilingFanAudioPromise = loadAudio("/audio/sfx/ceiling_fan.ogg", {
  loop: true,
  positional: true,
  volume: 0.6,
  autoplay: true,
});

const eatChipAudioPromise = loadAudio("/audio/sfx/eat_chip.ogg", {
  detune: -600,
  randomPitch: true,
  pitchRange: 400,
  volume: 0.1,
});

const burgerkingAudioPromise = loadAudio("/audio/sfx/burgerking.ogg", {
  loop: false,
  positional: true,
});

const heartbeatAudioPromise = loadAudio("/audio/sfx/heartbeat.ogg", {
  loop: true,
});

export const garageScreamAudioPromise = loadAudio("/audio/sfx/garage_scream.ogg", {
  loop: true,
  positional: true,
  detune: -400,
  autoplay: true,
  volume: 0.1,
});

export const carIdling = loadAudio("/audio/sfx/car_idling.ogg", {
  loop: true,
  positional: true,
  autoplay: true,
  volume: 0.4,
});

export const windAudioPromise = loadAudio("/audio/sfx/wind.ogg", {
  loop: true,
  volume: 0.02,
  autoplay: true,
})

// Audio helper setup functions with proper cleanup
const setupHeartbeat = (simulation: Simulation, playerEntId: EntId) => {
  heartbeatAudioPromise.then(audio => {
    audio.setVolume(0);
    audio.play();
    const readyTime = Date.now() + 120000;

    simulation.ViewSync.AddAuxiliaryView(new class extends View {
      private isCleanedUp = false;

      public Draw(): void {
        if (this.isCleanedUp) return;
        if (!state.anomaly || Date.now() < readyTime) {
          audio.setVolume(0);
          return;
        }
        const playerPos = simulation.SimulationState.PhysicsRepository.GetPosition(playerEntId);
        tempVec3.set(
          playerPos[0] - state.anomalyPosition.x,
          playerPos[1] - state.anomalyPosition.y,
          playerPos[2] - state.anomalyPosition.z
        );
        const volume = Math.min(1, Math.max(0, 1 - tempVec3.length() / 6)) * 0.2;
        audio.setVolume(volume);
      }

      public Cleanup(): void {
        this.isCleanedUp = true;
        audio.stop();
      }
    });
  });
};

const setupGarageScream = (simulation: Simulation, playerEntId: EntId) => {
  garageScreamAudioPromise.then(audio => {
    const posAudio = audio.getPositionalAudio();
    posAudio.setRolloffFactor(3);
    const mesh = simulation.ThreeScene.getObjectByName("Plane001_01_-_Default_0001") as THREE.Mesh;
    const centerPoint = getMeshCenter(mesh);
    posAudio.position.copy(centerPoint);
    simulation.ThreeScene.add(posAudio);

    simulation.ViewSync.AddAuxiliaryView(new class extends View {
      private isCleanedUp = false;

      public Draw(): void {
        if (this.isCleanedUp) return;
        audio.setVolume(!state.gameStarted || !state.playing || state.picking || state.inDialogue ? 0 : 0.05);
      }

      public Cleanup(): void {
        this.isCleanedUp = true;
        audio.stop();
        posAudio.removeFromParent();
      }
    });
  });
};

const setupFan = (simulation: Simulation, scene: THREE.Scene) => {
  const fanBlades = scene.getObjectByName("Cylinder008_Wings_0") as THREE.Mesh;
  if (!fanBlades) return;

  ceilingFanAudioPromise.then(audio => {
    const posAudio = audio.getPositionalAudio();
    fanBlades.add(posAudio);
    audio.play();
  });

  simulation.ViewSync.AddAuxiliaryView(new class extends View {
    private isCleanedUp = false;

    public Draw(): void {
      if (this.isCleanedUp) return;
      fanBlades.rotateZ(0.06);
    }

    public Cleanup(): void {
      this.isCleanedUp = true;
    }
  });
};

const eat = (food: string, simulation: Simulation, scene: THREE.Scene) => {
  const foodObject = scene.getObjectByName(food) as THREE.Mesh;
  if (!foodObject) return;
  const endId = simulation.EntityRegistry.Create();
  simulation.SimulationState.PhysicsRepository.CreateComponent(endId);
  foodObject.getWorldPosition(tempVec3);
  simulation.SimulationState.PhysicsRepository.AddBoxCollider(endId, [2, 2, 2], [tempVec3.x, tempVec3.y, tempVec3.z], undefined, true);
  simulation.SimulationState.SensorCommandRepository.CreateComponent(endId);
  simulation.SimulationState.SensorCommandRepository.AddSensorCommand({
    entId: endId,
    executionMode: ExecutionMode.Interaction,
    once: true,
    command: new class extends SimulationCommand {
      public Execute(sim: Simulation): void {
        foodObject.visible = false;
        eatChipAudioPromise.then(audio => audio.play());
      }
    },
    owner: foodObject,
  });
};

const setupEat = (simulation: Simulation, scene: THREE.Scene) => {
  const foods = [
    "pizza", "muffin", "strawberyshake",
    "cereal", "23b099929e614d9a927b4ec8f3d72063fbx",
  ];

  foods.forEach(food => eat(food, simulation, scene));
};

const setupBurgerKing = (simulation: Simulation, scene: THREE.Scene) => {
  const mesh = scene.getObjectByName("Sketchfab_model001")!.getObjectByProperty("type", "Mesh") as THREE.Mesh;

  burgerkingAudioPromise.then(audio => {
    const centerPoint = getMeshCenter(mesh);
    const posAudio = audio.getPositionalAudio();
    posAudio.position.copy(centerPoint);
    simulation.ThreeScene.add(posAudio);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    audio.setVolume(0.5);
  });

  mesh.getWorldPosition(tempVec3);
  const entId = simulation.EntityRegistry.Create();
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId);
  simulation.SimulationState.PhysicsRepository.AddBoxCollider(entId, [2, 2, 2], [tempVec3.x, tempVec3.y, tempVec3.z], undefined, true);
  simulation.SimulationState.SensorCommandRepository.CreateComponent(entId);
  simulation.SimulationState.SensorCommandRepository.AddSensorCommand({
    entId,
    executionMode: ExecutionMode.Interaction,
    command: new class extends SimulationCommand {
      public Execute(sim: Simulation): void {
        burgerkingAudioPromise.then(audio => audio.play());
      }
    },
    owner: mesh,
  });
};

const setupCarIdling = (simulation: Simulation, scene: THREE.Scene) => {
  const car = scene.getObjectByName("WinP_steclo_0") as THREE.Mesh;
  if (!car) return;

  carIdling.then(audio => {
    const posAudio = audio.getPositionalAudio();
    car.add(posAudio);
  });
}

export const disableLoading = (): void => {
  loadingEl?.setAttribute("is-hidden", "true");
  splashEl?.setAttribute("is-hidden", "true");
};

export const enableLoading = (): void => {
  loadingEl?.setAttribute("is-hidden", "false");
};

const mapLoader = loadGltf("/3d/scenes/island/crazeoh_OPTIMIZED.glb").then(gltf => gltf.scene);

export let currentCrtPass: ShaderPass | null = null;
export let currentOutlinePass: OutlinePass | null = null;

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
  )
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
      if (!state.playing && !state.outro) camera.rotateY(-0.0005);
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
            if (mat.lightMap) mat.lightMap.dispose();
            if (mat.bumpMap) mat.bumpMap.dispose();
            if (mat.normalMap) mat.normalMap.dispose();
            if (mat.specularMap) mat.specularMap.dispose();
            if (mat.envMap) mat.envMap.dispose();
            mat.dispose();
          });
        } else {
          if (obj.material.map) obj.material.map.dispose();
          if (obj.material.lightMap) obj.material.lightMap.dispose();
          if (obj.material.bumpMap) obj.material.bumpMap.dispose();
          if (obj.material.normalMap) obj.material.normalMap.dispose();
          if (obj.material.specularMap) obj.material.specularMap.dispose();
          if (obj.material.envMap) obj.material.envMap.dispose();
          obj.material.dispose();
        }
      }
    });
    scene.clear();
    effectComposer.dispose();
    simulation.ViewSync.Cleanup(simulation);
    simulation.Stop();
  };

  return { scene, camera, simulation, effectComposer, crtPass, cleanup, sceneEntId };
};

export let currentPlayerView: PlayerView | null = null;

export const init = async () => {
  enableLoading();

  state.setAnomalyPosition(new THREE.Vector3(0, 0, 0));
  state.setAnomaly(false);
  state.setFoundAnomaly(false);
  state.setTookPicture(false);
  state.setPlaying(false);
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

  disableAllAnomalies(simulation);
  createFridge(simulation);
  createStove(simulation);
  createMicrowave(simulation);
  createDoor(simulation);

  setupFan(simulation, scene);
  setupEat(simulation, scene);
  setupBurgerKing(simulation, scene);
  setupGarageScream(simulation, playerView.EntId);
  setupCarIdling(simulation, scene);

  const spotLight = new THREE.SpotLight(0xffffff);
  spotLight.position.set(2, 3, -6);
  spotLight.castShadow = false;
  spotLight.shadow.mapSize.set(4096, 4096);
  spotLight.shadow.camera.near = 0.1;
  spotLight.shadow.camera.far = 30;
  spotLight.shadow.camera.fov = 30;
  spotLight.intensity = 8;
  spotLight.decay = 0.999;
  spotLight.angle = Math.PI * 0.35;
  spotLight.penumbra = 1;
  spotLight.shadow.bias = SHADOW_BIAS;
  scene.add(spotLight);
  const target = new THREE.Object3D();
  scene.add(target);
  spotLight.target = target;

  let prevPlay = false, prevDialogue = false, prevPicking = false, prevGameStarted = false;
  let teleportedPlayer = false, pickedAnomaly = false, startedDialogue = false;

  const teleportPlayer = () => {
    teleportedPlayer = true;
    const playerSpawnPosition = new THREE.Vector3(2, 0, -1.2);
    const playerObject = scene.getObjectByName("PLAYER") as THREE.Mesh;
    if (playerObject) {
      playerObject.visible = false;
    }
    simulation.SimulationState.PhysicsRepository.SetPosition(playerView.EntId, [playerSpawnPosition.x, 0.5, playerSpawnPosition.z]);
    camera.position.set(playerSpawnPosition.x, 0.5, playerSpawnPosition.z);
    const lookTarget = scene.getObjectByName("Cube__0") as THREE.Mesh;
    lookTarget.getWorldPosition(tempVec3);
    const yaw = Math.atan2(playerSpawnPosition.x - tempVec3.x, playerSpawnPosition.z - tempVec3.z);
    const pitch = Math.atan2(tempVec3.y - playerSpawnPosition.y, Math.hypot(playerSpawnPosition.x - tempVec3.x, playerSpawnPosition.z - tempVec3.z));
    camera.quaternion.setFromEuler(tempEuler.set(pitch, yaw, 0, "YXZ"));
    try {
      updateGameLogic(simulation, 0);
      simulation.ViewSync.Draw(simulation, 1.0);
    } catch (e) {
      console.error(e);
    }
  };

  const detectPlayStateChange = async () => {
    requestAnimationFrame(() => {
      if (state.inDialogue || !state.gameStarted) {
        disableLoading()
      }
    })

    if (state.playing === prevPlay && state.picking === prevPicking &&
      state.inDialogue === prevDialogue && state.gameStarted === prevGameStarted) return;
    prevPlay = state.playing;
    prevPicking = state.picking;
    prevDialogue = state.inDialogue;
    prevGameStarted = state.gameStarted;

    state.gameStarted && !state.picking && !state.inDialogue
      ? playerView.enableControls()
      : playerView.disableControls();

    if (state.gameStarted && !state.picking && !state.inDialogue && !startedDialogue) {
      executeWinScript(simulation).then(detectPlayStateChange).catch(console.error);
      startedDialogue = true;
    }

    state.setPlaying(state.gameStarted && !state.picking && !state.inDialogue);

    if (state.playing) {
      if (!teleportedPlayer) {
        teleportPlayer();
      }

      if (!pickedAnomaly) {
        pickRandomAnomaly(simulation);
        pickedAnomaly = true;
      }
    }
  };

  const handlePointerLock = () => {
    if (document.pointerLockElement !== renderer.domElement) {
      playerView.disableControls();
    } else if (state.gameStarted && !state.picking && !state.inDialogue) {
      playerView.enableControls();
    }
  };
  document.addEventListener("pointerlockchange", handlePointerLock);

  let shutterOn = false;
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
    if (shutterOn || document.pointerLockElement !== renderer.domElement) return;
    payload.consume();
    shutterOn = true;
    cameraAudioPromise.then(audio => audio.play());

    const dataUrl = renderer.domElement.toDataURL();
    polaroidEl.src = dataUrl;
    polaroid2El.src = dataUrl;
    polaroidEl.parentElement!.setAttribute("is-hidden", "false");
    polaroidEl.parentElement!.setAttribute("shutter", "true");

    if (state.anomaly) {
      const pPos = simulation.SimulationState.PhysicsRepository.GetPosition(playerView.EntId);
      if (pPos) {
        tempVec3.set(
          pPos[0] - state.anomalyPosition.x,
          pPos[1] - state.anomalyPosition.y,
          pPos[2] - state.anomalyPosition.z
        );
        const distance = tempVec3.length();
        const angle = getAngle(state.anomalyPosition, new THREE.Vector3(pPos[0], pPos[1], pPos[2]), camera);
        state.setFoundAnomaly(angle < 63 && distance < 10);
      }
    }
    state.setTookPicture(true);
    setTimeout(() => {
      polaroidEl.parentElement!.setAttribute("shutter", "false");
      shutterOn = false;
    }, 2000);
  };

  setTimeout(() => {
    disableLoading();
  }, 2000);

  playerInput.emitter.on("justpressed", justPressed);

  for (let i = 0; i < 10; i++) {
    const name = `chip${i + 1}`;
    const object = scene.getObjectByName(name) as THREE.Mesh;
    if (object) object.visible = false;
    // if (state.wins <= i) {
    //   const object = scene.getObjectByName(name) as THREE.Mesh;
    //   if (object) {
    //     object.visible = false;
    //   }
    // }
  }

  {
    const object = scene.getObjectByName("Cube003__0001") as THREE.Mesh;
    if (object) object.visible = false;
  }

  simulation.Start();

  requestAnimationFrame(() => {
    detectPlayStateChange();

    simulation.ViewSync.AddAuxiliaryView(new class extends View {
      private isCleanedUp = false;

      public Draw(): void {
        if (this.isCleanedUp) return;
        detectPlayStateChange();
        camera.getWorldPosition(tempVec3);
        spotLight.position.copy(tempVec3);
        camera.getWorldDirection(tempVec3);
        spotLight.target.position.copy(tempVec3.add(camera.position));
        spotLight.target.updateMatrixWorld();
        playerInput.update();

        if (state.isTutorial) {
          const playerPos = simulation.SimulationState.PhysicsRepository.GetPosition(playerView.EntId);
          tempVec3.set(
            playerPos[0] - state.anomalyPosition.x,
            playerPos[1] - state.anomalyPosition.y,
            playerPos[2] - state.anomalyPosition.z
          );
          const distance = tempVec3.length();
          const angle = getAngle(state.anomalyPosition, new THREE.Vector3(playerPos[0], playerPos[1], playerPos[2]), camera);
          cameraHintEl.setAttribute("is-hidden", "false");
          cameraHintEl.setAttribute("is-hinting", (angle < 63 && distance < 3) ? "true" : "false");
        } else {
          cameraHintEl.setAttribute("is-hidden", "true");
        }
      }

      public Cleanup(): void {
        this.isCleanedUp = true;
      }
    });
  });

  detectPlayStateChange();

  const menuItems: string[] = [
    "MENU_MOUSE_L",
    "MENU_MOUSE_R",
    "MENU_VOLUME_L",
    "MENU_VOLUME_R",
    "MENU"
  ];

  menuItems.forEach(item => {
    const obj = scene.getObjectByName(item) as THREE.Mesh;
    if (obj) obj.visible = false;
  })

  return () => {
    enableLoading();
    cleanup();
    playerInput.emitter.off("justpressed", justPressed);
    document.removeEventListener("pointerlockchange", handlePointerLock);
  };
};
