import * as THREE from 'three';
import { renderer } from '../../components/Viewport';
import { Simulation } from '../../simulation';
import { View } from '../../simulation/View';
import { loadAudio, loadGltf } from '../../graphics/loaders';
import * as player from '../../entities/player';
import * as state from "./state";
import { clockAudioPromise, disableAllAnomalies, pickRandomAnomaly } from "./anomaly";
import { createFridge, fridgeAudioPromise } from "../../entities/crazeoh/fridge";
import { createStove } from "../../entities/crazeoh/stove";
import { createMicrowave } from "../../entities/crazeoh/microwave";
import { getAngle, getMeshCenter } from "../../utils/math";
import { createDoor } from "../../entities/crazeoh/door";
import { currentPlayerView } from "../../views/player";
import { ExecutionMode } from "../../simulation/repository/SensorCommandRepository";
import { SimulationCommand } from "../../simulation/commands/_command";
import { JustPressedEvent, playerInput, waitForAction } from "../../input/player";
import "./scripts";
import { updateGameLogic } from "../../simulation/loop";
import { executeWinScript } from "./scripts";
import { loadScene, scenes } from "..";
import crazeohGlb from '../../assets/3d/scenes/island/crazeoh_OPTIMIZED.glb';
import cameraOgg from '../../assets/audio/sfx/camera.ogg';
import ceilingFanOgg from '../../assets/audio/sfx/ceiling_fan.ogg';
import eatChipOgg from '../../assets/audio/sfx/eat_chip.ogg';
import burgerkingOgg from '../../assets/audio/sfx/burgerking.ogg';
import garageScreamOgg from '../../assets/audio/sfx/garage_scream.ogg';
import carIdlingOgg from '../../assets/audio/sfx/car_idling.ogg';
import windOgg from '../../assets/audio/sfx/wind.ogg';
import ventOgg from '../../assets/audio/sfx/vent.ogg';
import caseohOgg from '../../assets/audio/music/caseoh.ogg';
import { initScene } from "./initScene";
import { hideMainMenu } from "../../pages/Caseoh";

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
const cameraAudioPromise = loadAudio(cameraOgg, {
  volume: 0.1,
});

export const ceilingFanAudioPromise = loadAudio(ceilingFanOgg, {
  loop: true,
  positional: true,
  volume: 0.6,
});

const eatChipAudioPromise = loadAudio(eatChipOgg, {
  detune: -600,
  randomPitch: true,
  pitchRange: 400,
  volume: 0.1,
});

const burgerkingAudioPromise = loadAudio(burgerkingOgg, {
  loop: false,
  positional: true,
});

export const garageScreamAudioPromise = loadAudio(garageScreamOgg, {
  loop: true,
  positional: true,
  detune: -400,
  volume: 0.1,
});

export const carIdling = loadAudio(carIdlingOgg, {
  loop: true,
  positional: true,
  volume: 0.4,
});

export const windAudioPromise = loadAudio(windOgg, {
  loop: true,
  volume: 0.005,
})

export const ventAudioPromise = loadAudio(ventOgg, {
  loop: true,
  volume: 0.05,
  detune: -400,
  positional: true,
})

const caseohAudioPromise = loadAudio(caseohOgg, {
  loop: true,
  volume: 0.1,
});

const allLoopingAudio = [
  ceilingFanAudioPromise,
  garageScreamAudioPromise,
  carIdling,
  windAudioPromise,
];

/**
 * Plays all sounds with autoplay functionality
 * Centralizes audio playback instead of using the autoplay property
 */
export const playAllAutoplaySounds = () => {
  allLoopingAudio.forEach(audioPromise => {
    audioPromise.then(audio => audio.play());
  });
};

export const stopAllSounds = () => {
  allLoopingAudio.forEach(audioPromise => {
    audioPromise.then(audio => audio.stop());
  });

  cameraAudioPromise.then(audio => audio.stop());
  caseohAudioPromise.then(audio => audio.stop());
  clockAudioPromise.then(audio => audio.stop());
  fridgeAudioPromise.then(audio => audio.stop());
  eatChipAudioPromise.then(audio => audio.stop());
  burgerkingAudioPromise.then(audio => audio.stop());
}

const winIndexScenes = {
  5: scenes.interloper,
  10: scenes.dropper,
  15: scenes.stomach,
}

export const setupVent = (scene: THREE.Scene) => {
  const vent = scene.getObjectByName("vent") as THREE.Mesh;
  if (!vent) return;

  ventAudioPromise.then(audio => {
    const posAudio = audio.getPositionalAudio();
    vent.add(posAudio);
  });
}

const setupGarageScream = (simulation: Simulation) => {
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
        audio.setVolume((!state.gameStarted || state.picking || state.inDialogue) ? 0 : 0.05);
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
    "donuts",
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

export const loadWinIndexSceneIfExists = async (index: number): Promise<boolean> => {
  const scene = winIndexScenes[index as keyof typeof winIndexScenes];

  if (scene) {
    await loadScene(scene);

    return true
  }

  return false
}

const mapLoader = loadGltf(crazeohGlb).then(gltf => gltf.scene);

export const init = async () => {
  enableLoading();

  if (await loadWinIndexSceneIfExists(state.winAnomalyIndex)) {
    return () => { };
  }

  state.resetRound();

  player.setThirdPerson(false);
  player.setCameraHeight(2);

  const { scene, camera, simulation, cleanup, createFlashlight } = await initScene(mapLoader);

  await player.createPlayer(simulation, [2, 0, -6], [0, 0, 0])

  currentPlayerView!.disableControls()

  camera.position.set(2, 0, 0);

  createFlashlight();
  disableAllAnomalies(simulation);
  createFridge(simulation);
  createStove(simulation);
  createMicrowave(simulation);
  createDoor(simulation);
  setupFan(simulation, scene);
  setupEat(simulation, scene);
  setupBurgerKing(simulation, scene);
  setupGarageScream(simulation);
  setupCarIdling(simulation, scene);
  setupVent(scene);
  playAllAutoplaySounds();

  const teleportPlayer = () => {
    const playerSpawnPosition = new THREE.Vector3(2, 0, 0);
    const playerObject = scene.getObjectByName("PLAYER") as THREE.Mesh;
    if (playerObject) {
      playerObject.visible = false;
    }
    simulation.SimulationState.PhysicsRepository.SetPosition(currentPlayerView!.EntId, [playerSpawnPosition.x, 0.5, playerSpawnPosition.z]);
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

  const handlePointerLock = () => {
    if (document.pointerLockElement !== renderer.domElement) {
      currentPlayerView!.disableControls()
    } else if (state.gameStarted && !state.picking && !state.inDialogue) {
      currentPlayerView!.enableControls()
    }
  }

  document.addEventListener("pointerlockchange", handlePointerLock);

  {
    const object = scene.getObjectByName("Cube003__0001") as THREE.Mesh;
    if (object) object.visible = false;
  }

  simulation.ViewSync.AddAuxiliaryView(new class extends View {
    public Draw(): void {
      playerInput.update();

      if (state.isTutorial) {
        const playerPos = simulation.SimulationState.PhysicsRepository.GetPosition(currentPlayerView!.EntId);
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
  });

  disableLoading()

  simulation.Start();

  if (!state.gameStarted) {
    await caseohAudioPromise.then(audio => {
      audio.play(0)
    })

    await waitForAction("mainAction1");
  }

  hideMainMenu()

  state.setGameStarted(true)

  renderer.domElement.requestPointerLock()

  caseohAudioPromise.then(audio => audio.stop())

  playAllAutoplaySounds()

  await executeWinScript(simulation)

  pickRandomAnomaly(simulation);

  currentPlayerView!.enableControls()

  teleportPlayer();

  let shutterOn = false;

  const justPressed = (payload: JustPressedEvent) => {
    if (payload.action !== "mainAction1" || state.picking || state.inSettings) return;

    currentPlayerView!.enableControls();

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
      const pPos = simulation.SimulationState.PhysicsRepository.GetPosition(currentPlayerView!.EntId);
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

  playerInput.emitter.on("justpressed", justPressed);

  return () => {
    enableLoading()
    cleanup()
    playerInput.emitter.off("justpressed", justPressed)
    document.removeEventListener("pointerlockchange", handlePointerLock)
    stopAllSounds()
  };
};
