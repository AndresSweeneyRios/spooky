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
import { PositionalAudioHelper, ShaderPass } from 'three/examples/jsm/Addons.js';
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

// ─── AUDIO SETUP ─────────────────────────────────────────────────────────────

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

// export const sniffAudioPromise = loadAudio("/audio/sfx/sniff.ogg", {
//   randomPitch: true,
//   pitchRange: 400,
//   volume: 0.15
// });

export const windAudioPromise = loadAudio("/audio/sfx/wind.ogg", {
  loop: true,
  volume: 0.05,
  autoplay: true,
})

// ─── AUDIO HELPER SETUP FUNCTIONS ─────────────────────────────────────────────

const setupHeartbeat = (simulation: Simulation, playerEntId: EntId) => {
  heartbeatAudioPromise.then(audio => {
    audio.setVolume(0);
    audio.play();
    const readyTime = Date.now() + 120000; // 2 minutes

    simulation.ViewSync.AddAuxiliaryView(new class extends View {
      public Draw(): void {
        if (!state.anomaly || Date.now() < readyTime) {
          audio.setVolume(0);
          return;
        }
        const playerPos = simulation.SimulationState.PhysicsRepository.GetPosition(playerEntId);
        const distance = new THREE.Vector3(
          playerPos[0] - state.anomalyPosition.x,
          playerPos[1] - state.anomalyPosition.y,
          playerPos[2] - state.anomalyPosition.z,
        ).length();
        const volume = Math.min(1, Math.max(0, 1 - distance / 6)) * 0.2;
        audio.setVolume(volume);
      }
      public Cleanup(): void {
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
      public Draw(): void {
        if (!state.gameStarted || !state.playing || state.picking || state.inDialogue) {
          audio.setVolume(0);
          return;
        }
        audio.setVolume(0.05);
      }
      public Cleanup(): void {
        audio.stop();
      }
    });
  });
};

const setupFan = (simulation: Simulation, scene: THREE.Scene) => {
  const fanBlades = scene.getObjectByName("Cylinder008_Wings_0") as THREE.Mesh;
  ceilingFanAudioPromise.then(audio => {
    fanBlades?.add(audio.getPositionalAudio());
    audio.play();
  });
  simulation.ViewSync.AddAuxiliaryView(new class extends View {
    public Draw(): void {
      fanBlades?.rotateZ(0.06);
    }
  });
};

const eat = (food: string, simulation: Simulation, scene: THREE.Scene) => {
  const foodObject = scene.getObjectByName(food) as THREE.Mesh;
  if (!foodObject) return;
  const endId = simulation.EntityRegistry.Create();
  simulation.SimulationState.PhysicsRepository.CreateComponent(endId);
  const pos = foodObject.getWorldPosition(new THREE.Vector3());
  simulation.SimulationState.PhysicsRepository.AddBoxCollider(endId, [2, 2, 2], [pos.x, pos.y, pos.z], undefined, true);
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
    }
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
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff })
    material.side = THREE.DoubleSide
    audio.setVolume(0.5);
  });
  const globalPos = mesh.getWorldPosition(new THREE.Vector3());
  if (!globalPos) return;
  const entId = simulation.EntityRegistry.Create();
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId);
  simulation.SimulationState.PhysicsRepository.AddBoxCollider(entId, [2, 2, 2], [globalPos.x, globalPos.y, globalPos.z], undefined, true);
  simulation.SimulationState.SensorCommandRepository.CreateComponent(entId);
  simulation.SimulationState.SensorCommandRepository.AddSensorCommand({
    entId,
    executionMode: ExecutionMode.Interaction,
    command: new class extends SimulationCommand {
      public Execute(sim: Simulation): void {
        burgerkingAudioPromise.then(audio => audio.play());
      }
    }
  });
};

const setupCarIdling = (simulation: Simulation, scene: THREE.Scene) => {
  // WinP_steclo_0
  const car = scene.getObjectByName("WinP_steclo_0") as THREE.Mesh;

  carIdling.then(audio => {
    const posAudio = audio.getPositionalAudio();
    car.add(posAudio);
  });
}

// ─── LOADING UI ───────────────────────────────────────────────────────────────

export const disableLoading = (): void => {
  document.getElementById("caseoh-loading")?.setAttribute("is-hidden", "true");
  document.getElementById("splash")?.setAttribute("is-hidden", "true");
};

export const enableLoading = (): void => {
  document.getElementById("caseoh-loading")?.setAttribute("is-hidden", "false");
};

// ─── SCENE INITIALIZATION ───────────────────────────────────────────────────────

const mapLoader = loadGltf("/3d/scenes/island/crazeoh_OPTIMIZED.glb").then(gltf => gltf.scene);

export let currentCrtPass: ShaderPass | null = null;

const initScene = () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
  const simulation = new Simulation(camera, scene);
  camera.add(new THREE.AudioListener());

  const effectComposer = new EffectComposer(renderer);
  effectComposer.addPass(new RenderPass(scene, camera));

  ToneMappingShader.uniforms.contrast = { value: 1.07 };
  ToneMappingShader.uniforms.saturation = { value: 0.95 };
  ToneMappingShader.uniforms.toneMappingExposure = { value: 0.9 };
  const toneMappingPass = new ShaderPass(ToneMappingShader);
  effectComposer.addPass(toneMappingPass);

  const crtPass = new ShaderPass(shaders.CRTShader);
  crtPass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  effectComposer.addPass(crtPass);
  currentCrtPass = crtPass;

  effectComposer.addPass(new OutputPass());

  simulation.ViewSync.AddAuxiliaryView(new class extends View {
    public Draw(): void {
      crtPass.uniforms.time.value = (Date.now() / 1000) % 1.0;
      crtPass.uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height);
      if (!state.playing && !state.outro) camera.rotateY(-0.0005);
      effectComposer.render();
    }
    public Cleanup(): void {
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
    scene.clear();
    effectComposer.dispose();
    simulation.ViewSync.Cleanup(simulation);
    simulation.Stop()
  };

  return { scene, camera, simulation, effectComposer, crtPass, cleanup, sceneEntId };
};

// ─── MAIN INIT FUNCTION ─────────────────────────────────────────────────────────

export let currentPlayerView: PlayerView | null = null;

export const init = async () => {
  enableLoading();

  // Initialize state.
  state.setAnomalyPosition(new THREE.Vector3(0, 0, 0));
  state.setAnomaly(false);
  state.setFoundAnomaly(false);
  state.setTookPicture(false);
  state.setPlaying(false);
  player.setThirdPerson(false);
  player.setCameraHeight(2);

  // Set up scene, camera, simulation and post-processing.
  const { scene, camera, simulation, cleanup, sceneEntId } = initScene();

  // Load GLTF scene and player concurrently.
  const [sceneGltfOriginal, playerView] = await Promise.all([
    mapLoader,
    player.createPlayer(simulation, [2, 0, -6], [0, 0, 0])
  ]);
  currentPlayerView = playerView;

  // Clone and process GLTF scene.
  const sceneGltf = SkeletonUtils.clone(sceneGltfOriginal);
  processAttributes(sceneGltf, simulation, sceneEntId, false);
  shaders.applyInjectedMaterials(sceneGltf);
  for (const child of traverse(sceneGltf)) {
    if (child instanceof THREE.Mesh) {
      child.castShadow = false;
      child.receiveShadow = false;
      (child.material as THREE.Material).side = THREE.DoubleSide;
    }
  }
  scene.add(sceneGltf);

  disableAllAnomalies(simulation);
  createFridge(simulation);
  createStove(simulation);
  createMicrowave(simulation);
  createDoor(simulation);

  // Set up additional audio and interactive elements.
  setupFan(simulation, scene);
  setupEat(simulation, scene);
  setupBurgerKing(simulation, scene);
  setupGarageScream(simulation, playerView.EntId);
  // setupHeartbeat(simulation, playerView.EntId);
  setupCarIdling(simulation, scene);

  // Set up spotlight.
  const spotLight = new THREE.SpotLight(0xffffff);
  spotLight.position.set(2, 3, -6);
  spotLight.castShadow = false;
  spotLight.shadow.mapSize.set(4096, 4096);
  spotLight.shadow.camera.near = 0.1;
  spotLight.shadow.camera.far = 30;
  spotLight.shadow.camera.fov = 30;
  spotLight.intensity = 10;
  spotLight.decay = 0.999;
  spotLight.angle = Math.PI * 0.35;
  spotLight.penumbra = 1;
  spotLight.shadow.bias = SHADOW_BIAS;
  scene.add(spotLight);
  const target = new THREE.Object3D();
  scene.add(target);
  spotLight.target = target;

  // Setup play state detection.
  let prevPlay = false, prevDialogue = false, prevPicking = false, prevGameStarted = false;
  let teleportedPlayer = false, pickedAnomaly = false, startedDialogue = false;

  const teleportPlayer = () => {
    teleportedPlayer = true;
    const playerSpawnObject = scene.getObjectByName("PLAYER") as THREE.Mesh;
    const playerSpawnPosition = playerSpawnObject.getWorldPosition(new THREE.Vector3());
    simulation.SimulationState.PhysicsRepository.SetPosition(playerView.EntId, [playerSpawnPosition.x, 0.5, playerSpawnPosition.z]);
    camera.position.set(playerSpawnPosition.x, 0.5, playerSpawnPosition.z);
    const lookTarget = scene.getObjectByName("base_BaseColorCuzov_0") as THREE.Mesh;
    const lookPos = lookTarget.getWorldPosition(new THREE.Vector3());
    const yaw = Math.atan2(playerSpawnPosition.x - lookPos.x, playerSpawnPosition.z - lookPos.z);
    const pitch = Math.atan2(lookPos.y - playerSpawnPosition.y, Math.hypot(playerSpawnPosition.x - lookPos.x, playerSpawnPosition.z - lookPos.z));
    playerSpawnObject.visible = false;
    camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
    try {
      updateGameLogic(simulation, 0);
      simulation.ViewSync.Draw(simulation, 1.0);
    } catch (e) {
      console.error(e);
    }
  };

  const detectPlayStateChange = async () => {
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

  // Pointer lock handling.
  const handlePointerLock = () => {
    if (document.pointerLockElement !== renderer.domElement) {
      playerView.disableControls();
    } else if (state.gameStarted && !state.picking && !state.inDialogue) {
      playerView.enableControls();
    }
  };
  document.addEventListener("pointerlockchange", handlePointerLock);

  // Shutter handling for taking a picture.
  let shutterOn = false;
  const justPressed = (payload: JustPressedEvent) => {
    // Use requestAnimationFrame to batch pointer lock/fullscreen requests.
    if (state.gameStarted && !state.picking && document.pointerLockElement !== renderer.domElement) {
      payload.consume()
      try { renderer.domElement.requestPointerLock(); } catch { }
    }
    try {
      if (document.fullscreenElement !== document.body) {
        payload.consume()
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
    const polaroid = document.querySelector(".caseoh-polaroid-overlay.ingame .background") as HTMLImageElement;
    const polaroid2 = document.querySelector("#caseoh-decision .caseoh-polaroid-overlay .background") as HTMLImageElement;
    const dataUrl = renderer.domElement.toDataURL();
    polaroid.src = dataUrl;
    polaroid2.src = dataUrl;
    polaroid.parentElement!.setAttribute("is-hidden", "false");
    polaroid.parentElement!.setAttribute("shutter", "true");
    const pPos = simulation.SimulationState.PhysicsRepository.GetPosition(playerView.EntId);
    if (state.anomaly && pPos) {
      const angle = getAngle(state.anomalyPosition, new THREE.Vector3(pPos[0], pPos[1], pPos[2]), camera);
      // get distance
      const distance = new THREE.Vector3(
        pPos[0] - state.anomalyPosition.x,
        pPos[1] - state.anomalyPosition.y,
        pPos[2] - state.anomalyPosition.z,
      ).length();
      state.setFoundAnomaly(angle < 63 && distance < 10);
    }
    state.setTookPicture(true);
    setTimeout(() => {
      polaroid.parentElement!.setAttribute("shutter", "false");
      shutterOn = false;
    }, 2000);
  };

  playerInput.emitter.on("justpressed", justPressed);

  for (let i = 0; i < 10; i++) {
    const name = `chip${i + 1}`

    if (state.wins <= i) {
      const object = scene.getObjectByName(name) as THREE.Mesh;
      object.material = new THREE.MeshBasicMaterial({ color: 0x773333, wireframe: true });
      object.material.side = THREE.DoubleSide;
    }
  }

  disableLoading();

  simulation.Start();

  // simulation.ViewSync.AddAuxiliaryView(new CollidersDebugger());

  requestAnimationFrame(() => {
    detectPlayStateChange();

    simulation.ViewSync.AddAuxiliaryView(new class extends View {
      public Draw(): void {
        detectPlayStateChange();
        const camPos = camera.getWorldPosition(new THREE.Vector3());
        spotLight.position.copy(camPos);
        const camDir = camera.getWorldDirection(new THREE.Vector3());
        spotLight.target.position.copy(camPos).add(camDir);
        spotLight.target.updateMatrixWorld();
        playerInput.update();

        if (state.isTutorial) {
          const playerPos = simulation.SimulationState.PhysicsRepository.GetPosition(playerView.EntId);
          const distance = new THREE.Vector3(
            playerPos[0] - state.anomalyPosition.x,
            playerPos[1] - state.anomalyPosition.y,
            playerPos[2] - state.anomalyPosition.z,
          ).length();

          const angle = getAngle(state.anomalyPosition, new THREE.Vector3(playerPos[0], playerPos[1], playerPos[2]), camera);

          const cameraHint = document.querySelector(".caseoh-camera-hint") as HTMLElement;
          cameraHint.setAttribute("is-hidden", "false");
          cameraHint.setAttribute("is-hinting", (angle < 63 && distance < 3) ? "true" : "false");
        } else {
          const cameraHint = document.querySelector(".caseoh-camera-hint") as HTMLElement;
          cameraHint.setAttribute("is-hidden", "true");
        }
      }
      public Cleanup(): void {
        renderer.dispose();
      }
    });
  })

  detectPlayStateChange();

  // sceneGltf.visible = false

  // Return cleanup function.
  return () => {
    cleanup();
    playerInput.emitter.off("justpressed", justPressed);
    document.removeEventListener("pointerlockchange", handlePointerLock);
  };
};
