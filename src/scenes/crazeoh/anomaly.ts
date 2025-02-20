import { NoiseMaterial } from "../../graphics/noise"
import type { Simulation } from "../../simulation"
import { EntId } from "../../simulation/EntityRegistry"
import { EntityView } from "../../simulation/EntityView"
import { View } from "../../simulation/View"
import { traverse } from "../../utils/traverse"
import * as state from "./state"
import * as THREE from 'three'
import type { loadAudio } from "../../graphics/loaders"
import { getAngle } from "../../utils/math"

const loaderPromise = import("../../graphics/loaders")

const monitorAudioPromise = loaderPromise.then(async ({ loadAudio }) => {
  return await loadAudio('/audio/sfx/weba.ogg', {
    loop: true,
    positional: true,
  })
}).catch(console.error) as Promise<Awaited<ReturnType<typeof loadAudio>>>

const keyboardAudioPromise = loaderPromise.then(async ({ loadAudio }) => {
  return await loadAudio('/audio/sfx/keyboard_typing.ogg', {
    loop: true,
    positional: true,
  })
}).catch(console.error) as Promise<Awaited<ReturnType<typeof loadAudio>>>

interface Anomaly {
  Id: symbol
  Enable(simulation: Simulation): THREE.Vector3
  Disable(simulation: Simulation): void
}

const FrenchFries: Anomaly = {
  Id: Symbol('FrenchFries'),

  Enable(simulation: Simulation) {
    const fries = simulation.ThreeScene.getObjectByName('fries')!.getObjectByProperty('type', 'Mesh') as THREE.Mesh
    fries.scale.set(0.5, 0.5, 0.5)

    return fries.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
  },
}

const SeveredHand: Anomaly = {
  Id: Symbol('SeveredHand'),

  Enable(simulation: Simulation) {
    const hand = simulation.ThreeScene.getObjectByName('hand')!

    hand.visible = true

    return hand.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const hand = simulation.ThreeScene.getObjectByName('hand')!

    hand.visible = false
  },
}

const FanFast: Anomaly = {
  Id: Symbol('FanFast'),

  Enable(simulation: Simulation) {
    const fanBlades = simulation.ThreeScene.getObjectByName("Cylinder008_Wings_0") as THREE.Mesh

    simulation.ViewSync.AddAuxiliaryView(new class Fan extends View {
      public Draw() {
        fanBlades.rotateZ(0.12)
      }
    })

    return fanBlades.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
  },
}

const ClockSix: Anomaly = {
  Id: Symbol('ClockSix'),

  Enable(simulation: Simulation) {
    const clock1 = simulation.ThreeScene.getObjectByName('6_0002') as THREE.Mesh
    const clock2 = simulation.ThreeScene.getObjectByName('6_0003') as THREE.Mesh
    const clock3 = simulation.ThreeScene.getObjectByName('6_0001') as THREE.Mesh

    clock1.visible = true
    clock2.visible = true
    clock3.visible = true

    return clock1.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const clock1 = simulation.ThreeScene.getObjectByName('6_0002') as THREE.Mesh
    const clock2 = simulation.ThreeScene.getObjectByName('6_0003') as THREE.Mesh
    const clock3 = simulation.ThreeScene.getObjectByName('6_0001') as THREE.Mesh

    clock1.visible = false
    clock2.visible = false
    clock3.visible = false
  },
}

const Demon: Anomaly = {
  Id: Symbol('Demon'),

  Enable(simulation: Simulation) {
    const demon = simulation.ThreeScene.getObjectByName('demon') as THREE.Mesh

    demon.visible = true

    return demon.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const demon = simulation.ThreeScene.getObjectByName('demon') as THREE.Mesh


    demon.visible = false
  },
}

// hour hand_0
// minute hand_0
// second hand_0

const ClockSpinFast: Anomaly = {
  Id: Symbol('ClockSpinFast'),

  Enable(simulation: Simulation) {
    const clock1 = simulation.ThreeScene.getObjectByName('hour_hand_0') as THREE.Mesh
    const clock2 = simulation.ThreeScene.getObjectByName('minute_hand_0') as THREE.Mesh
    const clock3 = simulation.ThreeScene.getObjectByName('second_hand_0') as THREE.Mesh

    simulation.ViewSync.AddAuxiliaryView(new class Clock extends View {
      public Draw() {
        clock1.rotateZ(0.035)
        clock2.rotateZ(0.035 * 2)
        clock3.rotateZ(0.035 * 3)
      }
    })

    return clock1.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
  },
}

const Monitors: Anomaly = {
  Id: Symbol('Monitors'),

  Enable(simulation: Simulation) {
    const small = simulation.ThreeScene.getObjectByName('smallmonitorscreen') as THREE.Mesh
    const big = simulation.ThreeScene.getObjectByName('bigmonitorscreen') as THREE.Mesh

    const texture = new THREE.TextureLoader().load('/3d/textures/caseohblue.png')
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1, 1)
    texture.rotation = -Math.PI / 2

    small.material = new THREE.MeshBasicMaterial({ map: texture })
    big.material = new THREE.MeshBasicMaterial({ map: texture })

    monitorAudioPromise.then((audio) => {
      big.add(audio.getPositionalAudio())
      audio.play()
      audio.setVolume(2.0)
    })

    return simulation.ThreeScene.getObjectByName('Bigmonitorstand')!.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const small = simulation.ThreeScene.getObjectByName('smallmonitorscreen') as THREE.Mesh
    const big = simulation.ThreeScene.getObjectByName('bigmonitorscreen') as THREE.Mesh

    monitorAudioPromise.then((audio) => {
      audio.stop()
    })

    small.material = NoiseMaterial
    big.material = NoiseMaterial
  },
}

const RedDemon: Anomaly = {
  Id: Symbol('RedDemon'),

  Enable(simulation: Simulation) {
    const demon = simulation.ThreeScene.getObjectByName('reddemon') as THREE.Mesh

    demon.visible = true

    simulation.ViewSync.AddAuxiliaryView(new class RedDemonView extends View {
      public Draw() {
        // always face player
        let playerEntId: EntId | null = null

        for (const entId of simulation.SimulationState.SensorTargetRepository.Entities) {
          playerEntId = entId
          break
        }

        if (!playerEntId) {
          return
        }

        // get position of player
        const player = simulation.SimulationState.PhysicsRepository.GetPosition(playerEntId)
        const playerPosition = new THREE.Vector3(player[0], player[1], player[2])

        // get position of demon
        const demonPosition = demon.getWorldPosition(new THREE.Vector3())

        // get rotation of demon to direction
        const rotationMatrix = new THREE.Matrix4().lookAt(demonPosition, playerPosition, new THREE.Vector3(0, 1, 0))
        demon.setRotationFromMatrix(rotationMatrix)

        demon.rotateX(-Math.PI / 2)
      }
    })


    return demon.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const demon = simulation.ThreeScene.getObjectByName('reddemon') as THREE.Mesh

    demon.visible = false
  }
}

const Head: Anomaly = {
  Id: Symbol('Head'),

  Enable(simulation: Simulation) {
    const head = simulation.ThreeScene.getObjectByName('head') as THREE.Mesh

    head.visible = true

    const microwave = simulation.ThreeScene.getObjectByName('Microwave001') as THREE.Mesh

    return microwave.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const head = simulation.ThreeScene.getObjectByName('head') as THREE.Mesh

    head.visible = false
  }
}

const KitchenKnife: Anomaly = {
  Id: Symbol('KitchenKnife'),

  Enable(simulation: Simulation) {
    const knife = simulation.ThreeScene.getObjectByName('Knife_Knife_0') as THREE.Mesh

    knife.visible = true

    return knife.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const knife = simulation.ThreeScene.getObjectByName('Knife_Knife_0') as THREE.Mesh

    knife.visible = false
  }
}

const Feet: Anomaly = {
  Id: Symbol('Feet'),

  Enable(simulation: Simulation) {
    const feet = simulation.ThreeScene.getObjectByName('feet') as THREE.Mesh

    feet.visible = true

    return feet.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const feet = simulation.ThreeScene.getObjectByName('feet') as THREE.Mesh

    feet.visible = false
  }
}

const CoatHanger: Anomaly = {
  Id: Symbol('CoatHanger'),

  Enable(simulation: Simulation) {
    const coatHanger = simulation.ThreeScene.getObjectByName('mask') as THREE.Mesh

    coatHanger.visible = true

    return coatHanger.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const coatHanger = simulation.ThreeScene.getObjectByName('mask') as THREE.Mesh

    coatHanger.visible = false
  }
}
const BurgerLevitate: Anomaly = {
  Id: Symbol('BurgerLevitate'),

  Enable(simulation: Simulation) {
    const burger = simulation.ThreeScene.getObjectByName('burger') as THREE.Mesh;
    const entId = simulation.EntityRegistry.Create();

    // Gather all child meshes of the burger.
    const meshes: THREE.Mesh[] = [];
    for (const child of traverse(burger)) {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    }

    // Sort meshes by world z position (largest z first).
    meshes.sort((a, b) => {
      const aPos = a.getWorldPosition(new THREE.Vector3());
      const bPos = b.getWorldPosition(new THREE.Vector3());
      return bPos.z - aPos.z;
    });

    // Save each mesh’s original global position.
    const originalPositionMap = new Map<number, THREE.Vector3>();
    for (const mesh of meshes) {
      originalPositionMap.set(mesh.id, mesh.getWorldPosition(new THREE.Vector3()));
    }

    // Pick a base position (using a known ingredient).
    const baseMesh = meshes.find(mesh => mesh.name === 'Patty2_PattyA_0');
    const basePosition = baseMesh
      ? baseMesh.getWorldPosition(new THREE.Vector3())
      : new THREE.Vector3();

    simulation.ViewSync.AddEntityView(
      new class BurgerView extends EntityView {
        constructor() {
          super(entId);
        }

        public Draw(simulation: Simulation, lerpFactor: number): void {
          // Get the player entity.
          let playerEntId: EntId | null = null;
          for (const id of simulation.SimulationState.SensorTargetRepository.Entities) {
            playerEntId = id;
            break;
          }
          if (!playerEntId) return;

          // Get the player's global position.
          const playerPosArray = simulation.SimulationState.PhysicsRepository.GetPosition(playerEntId);
          const playerPosition = new THREE.Vector3(playerPosArray[0], playerPosArray[1], playerPosArray[2]);

          const distance = playerPosition.distanceTo(basePosition);
          const enabled = distance < 2;

          // Define how much each ingredient should move upward.
          const verticalOffsetPerIngredient = 0.1; // adjust as needed

          for (let i = 0; i < meshes.length; i++) {
            const mesh = meshes[i];
            const originalPos = originalPositionMap.get(mesh.id);
            if (!originalPos) continue;

            // Start with the original global position.
            const desiredGlobalPos = originalPos.clone();

            // Only modify the y component to move straight up (or down).
            if (enabled) {
              desiredGlobalPos.y += i * verticalOffsetPerIngredient;
            }
            // Else: if not enabled, desiredGlobalPos stays at the original position.

            // Convert desired global position into the mesh's local space.
            const desiredLocalPos = desiredGlobalPos.clone();
            if (mesh.parent) {
              mesh.parent.worldToLocal(desiredLocalPos);
            }

            // Smoothly interpolate the mesh's local position toward the desired position.
            mesh.position.lerp(desiredLocalPos, 0.1);
          }
        }
      }()
    );

    return burger.getWorldPosition(new THREE.Vector3());
  },

  Disable(simulation: Simulation) {
  }
}

const Keyboard: Anomaly = {
  Id: Symbol('Keyboard'),

  Enable(simulation: Simulation) {
    const keyboard = simulation.ThreeScene.getObjectByName('keyboard') as THREE.Mesh

    const audioPromise = keyboardAudioPromise.then((audio) => {
      keyboard.add(audio.getPositionalAudio())
      audio.play()
      audio.setVolume(2.0)

      return audio
    })

    // add auxiliary view
    simulation.ViewSync.AddAuxiliaryView(new class KeyboardView extends View {
      public Draw() {
        let playerEntId: EntId | null = null

        for (const entId of simulation.SimulationState.SensorTargetRepository.Entities) {
          playerEntId = entId
          break
        }

        if (!playerEntId) {
          return
        }

        const playerPosition = simulation.SimulationState.PhysicsRepository.GetPosition(playerEntId)
        const keyboardPosition = keyboard.getWorldPosition(new THREE.Vector3())
        const camera = simulation.Camera

        const angle = getAngle(keyboardPosition, new THREE.Vector3(
          playerPosition[0],
          playerPosition[1],
          playerPosition[2]
        ), camera)

        audioPromise.then((audio) => {
          if (angle > 90) {
            audio.setVolume(2.0)
          } else {
            audio.setVolume(0.0)
          }
        })
      }
    })

    return keyboard.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    keyboardAudioPromise.then((audio) => {
      audio.stop()
      audio.setVolume(0.0)
    })
  }
}

const Pitchfork: Anomaly = {
  Id: Symbol('Pitchfork'),

  Enable(simulation: Simulation) {
    const pitchfork = simulation.ThreeScene.getObjectByName('pitchfork') as THREE.Mesh
    const leftfork = simulation.ThreeScene.getObjectByName('leftfork') as THREE.Mesh

    pitchfork.visible = true
    leftfork.visible = false


    return pitchfork.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const pitchfork = simulation.ThreeScene.getObjectByName('pitchfork') as THREE.Mesh
    const leftfork = simulation.ThreeScene.getObjectByName('leftfork') as THREE.Mesh

    pitchfork.visible = false
    leftfork.visible = true
  }
}

// pPlane1_Poster_01_Mat_0.001
const Poster = {
  Id: Symbol('Poster'),

  Enable(simulation: Simulation) {
    const poster = simulation.ThreeScene.getObjectByName('pPlane1_Poster_01_Mat_0001') as THREE.Mesh

    poster.visible = true

    return poster.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const poster = simulation.ThreeScene.getObjectByName('pPlane1_Poster_01_Mat_0001') as THREE.Mesh

    poster.visible = false
  }
}

//lburger on, burger off
const LettuceBurger: Anomaly = {
  Id: Symbol('LettuceBurger'),

  Enable(simulation: Simulation) {
    const lburger = simulation.ThreeScene.getObjectByName('lburger') as THREE.Mesh
    const burger = simulation.ThreeScene.getObjectByName('burger') as THREE.Mesh

    lburger.visible = true
    burger.visible = false

    return lburger.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const lburger = simulation.ThreeScene.getObjectByName('lburger') as THREE.Mesh
    const burger = simulation.ThreeScene.getObjectByName('burger') as THREE.Mesh

    lburger.visible = false
    burger.visible = true
  }
}

// reallabel off, fakelabel on
const RealLabel: Anomaly = {
  Id: Symbol('RealLabel'),

  Enable(simulation: Simulation) {
    const reallabel = simulation.ThreeScene.getObjectByName('fakelabel') as THREE.Mesh
    const fakelabel = simulation.ThreeScene.getObjectByName('reallabel') as THREE.Mesh

    reallabel.visible = false
    fakelabel.visible = true

    return fakelabel.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const reallabel = simulation.ThreeScene.getObjectByName('fakelabel') as THREE.Mesh
    const fakelabel = simulation.ThreeScene.getObjectByName('reallabel') as THREE.Mesh

    reallabel.visible = true
    fakelabel.visible = false
  }
}

// glock
const Glock: Anomaly = {
  Id: Symbol('Glock'),

  Enable(simulation: Simulation) {
    const glock = simulation.ThreeScene.getObjectByName('glock') as THREE.Mesh

    glock.visible = true

    return glock.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const glock = simulation.ThreeScene.getObjectByName('glock') as THREE.Mesh

    glock.visible = false
  }
}

// can_bepis_0.001
const CanBepis: Anomaly = {
  Id: Symbol('CanBepis'),

  Enable(simulation: Simulation) {
    const can = simulation.ThreeScene.getObjectByName('longbepis') as THREE.Mesh

    can.visible = true

    return can.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const can = simulation.ThreeScene.getObjectByName('longbepis') as THREE.Mesh

    can.visible = false
  }
}

// bloodshake on, milkshake off

const Bloodshake: Anomaly = {
  Id: Symbol('Bloodshake'),

  Enable(simulation: Simulation) {
    const bloodshake = simulation.ThreeScene.getObjectByName('bloodshake') as THREE.Mesh
    const milkshake = simulation.ThreeScene.getObjectByName('milkshake') as THREE.Mesh

    bloodshake.visible = true
    milkshake.visible = false

    return bloodshake.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const bloodshake = simulation.ThreeScene.getObjectByName('bloodshake') as THREE.Mesh
    const milkshake = simulation.ThreeScene.getObjectByName('milkshake') as THREE.Mesh

    bloodshake.visible = false
    milkshake.visible = true
  }
}

const FakeBuffet: Anomaly = {
  Id: Symbol('FakeBuffet'),

  Enable(simulation: Simulation) {
    const fakeb1 = simulation.ThreeScene.getObjectByName('fakeb1') as THREE.Mesh
    const fakeb2 = simulation.ThreeScene.getObjectByName('fakeb2') as THREE.Mesh
    const fakeb3 = simulation.ThreeScene.getObjectByName('fakeb3') as THREE.Mesh
    const fakeb4 = simulation.ThreeScene.getObjectByName('fakeb4') as THREE.Mesh
    const object = simulation.ThreeScene.getObjectByName('Object_53002') as THREE.Mesh

    fakeb1.visible = true
    fakeb2.visible = true
    fakeb3.visible = true
    fakeb4.visible = true
    object.visible = true

    return object.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const fakeb1 = simulation.ThreeScene.getObjectByName('fakeb1') as THREE.Mesh
    const fakeb2 = simulation.ThreeScene.getObjectByName('fakeb2') as THREE.Mesh
    const fakeb3 = simulation.ThreeScene.getObjectByName('fakeb3') as THREE.Mesh
    const fakeb4 = simulation.ThreeScene.getObjectByName('fakeb4') as THREE.Mesh
    const object = simulation.ThreeScene.getObjectByName('Object_53002') as THREE.Mesh

    fakeb1.visible = false
    fakeb2.visible = false
    fakeb3.visible = false
    fakeb4.visible = false
    object.visible = false
  }
}


export const DEFAULT_ANOMALIES = [
  FrenchFries,
  SeveredHand,
  FanFast,
  ClockSix,
  Demon,
  ClockSpinFast,
  Monitors,
  RedDemon,
  Head,
  KitchenKnife,
  Feet,
  CoatHanger,
  BurgerLevitate,
  Keyboard,
  Pitchfork,
  Poster,
  RealLabel,
  Glock,
  CanBepis,
  Bloodshake,
  LettuceBurger,
  FakeBuffet,
]

const anomalies: typeof DEFAULT_ANOMALIES = []

let currentAnomalyIndex = 0

export const disableAllAnomalies = (simulation: Simulation) => {
  for (const anomaly of DEFAULT_ANOMALIES) {
    anomaly?.Disable(simulation)
  }
}

export const pickRandomAnomaly = (simulation: Simulation): void => {
  disableAllAnomalies(simulation)

  if (state.isTutorial) {
    // Skip anomalies in tutorial
    state.setAnomaly(false)
    state.setFoundAnomaly(false)

    return
  }

  if (anomalies.length === 0) {
    anomalies.push(...DEFAULT_ANOMALIES)
  }

  const randomIndex = Math.floor(Math.random() * (state.wins === 0 ? anomalies.length : (anomalies.length + 3)))

  const anomaly = anomalies.splice(randomIndex, 1)[0]

  state.setAnomaly(Boolean(anomaly))
  state.setFoundAnomaly(false)

  if (anomaly) {
    const position = anomaly.Enable(simulation)

    state.setAnomalyPosition(position)
  }
}

export const removeCurrentAnomaly = () => {
  anomalies.splice(currentAnomalyIndex, 1)
}
