import { NoiseMaterial } from "../../graphics/noise"
import type { Simulation } from "../../simulation"
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

const Buffet: Anomaly = {
  Id: Symbol('Buffet'),

  Enable(simulation: Simulation) {
    const buffet = simulation.ThreeScene.getObjectByName('buffet') as THREE.Mesh

    buffet.visible = true

    return buffet.getObjectByName("Food_Warmer_Lid_4_13")!.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const buffet = simulation.ThreeScene.getObjectByName('buffet') as THREE.Mesh

    buffet.visible = false
  }
}

const CoatHanger: Anomaly = {
  Id: Symbol('CoatHanger'),

  Enable(simulation: Simulation) {
    const coatHanger = simulation.ThreeScene.getObjectByName('coathanger') as THREE.Mesh

    coatHanger.visible = true

    return coatHanger.getWorldPosition(new THREE.Vector3())
  },

  Disable(simulation: Simulation) {
    const coatHanger = simulation.ThreeScene.getObjectByName('coathanger') as THREE.Mesh

    coatHanger.visible = false
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
  // Buffet,
  // CoatHanger,
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

  const isNoAnomaly = Math.random() < 0.2

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
