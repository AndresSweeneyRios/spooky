import type { Simulation } from "../../simulation"
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

const anomalies = [
  FrenchFries,
  SeveredHand,
]

export const disableAllAnomalies = (simulation: Simulation) => {
  for (const anomaly of anomalies) {
    anomaly.Disable(simulation)
  }
}

export const pickRandomAnomaly = (simulation: Simulation) => {
  disableAllAnomalies(simulation)

  const randomIndex = Math.random() * anomalies.length

  const isNoAnomaly = Math.random() < 0.2

  state.setAnomaly(!isNoAnomaly)
  state.setFoundAnomaly(false)

  if (isNoAnomaly) {
    return
  }

  const anomaly = anomalies[Math.floor(randomIndex)]

  const position = anomaly.Enable(simulation)

  state.setAnomalyPosition(position)
}
