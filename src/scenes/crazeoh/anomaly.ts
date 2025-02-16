import { NoiseMaterial } from "../../graphics/noise"
import type { Simulation } from "../../simulation"
import { EntId } from "../../simulation/EntityRegistry"
import { EntityView } from "../../simulation/EntityView"
import { View } from "../../simulation/View"
import { traverse } from "../../utils/traverse"
import * as state from "./state"
import * as THREE from 'three'

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

    const texture = new THREE.TextureLoader().load('/public/3d/textures/caseohblue.png')
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1, 1)
    texture.rotation = -Math.PI / 2

    small.material = new THREE.MeshBasicMaterial({ map: texture })
    big.material = new THREE.MeshBasicMaterial({ map: texture })


    return simulation.ThreeScene.getObjectByName('Bigmonitorstand')!.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const small = simulation.ThreeScene.getObjectByName('smallmonitorscreen') as THREE.Mesh
    const big = simulation.ThreeScene.getObjectByName('bigmonitorscreen') as THREE.Mesh

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

const DEFAULT_ANOMALIES = [
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
]

const anomalies: typeof DEFAULT_ANOMALIES = []

let currentAnomalyIndex = 0

export const disableAllAnomalies = (simulation: Simulation) => {
  for (const anomaly of DEFAULT_ANOMALIES) {
    anomaly.Disable(simulation)
  }
}

export const pickRandomAnomaly = (simulation: Simulation) => {
  disableAllAnomalies(simulation)

  if (anomalies.length === 0) {
    anomalies.push(...DEFAULT_ANOMALIES)
  }

  const randomIndex = Math.random() * anomalies.length

  const isNoAnomaly = Math.random() < 0.33

  state.setAnomaly(!isNoAnomaly)
  state.setFoundAnomaly(false)

  if (isNoAnomaly) {
    return
  }

  currentAnomalyIndex = Math.floor(randomIndex)

  const anomaly = anomalies[currentAnomalyIndex]

  const position = anomaly.Enable(simulation)

  state.setAnomalyPosition(position)
}

export const removeCurrentAnomaly = () => {
  anomalies.splice(currentAnomalyIndex, 1)
}
