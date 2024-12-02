import type { Simulation } from "../simulation"
import type { vec3 } from "gl-matrix"
import { StatType } from "../simulation/repository/StatRepository"

const SPEED = 4

let thirdPerson = false
let size = 1.0

export const setThirdPerson = (value: boolean) => {
  thirdPerson = value
}

export const setSize = (value: number) => {
  size = value
}

export const createPlayer = (simulation: Simulation, position: vec3, rotation: vec3) => {
  const offset = 0
  const positionAtFeet: vec3 = [position[0], position[1] + size, position[2]]
  
  const entId = simulation.EntityRegistry.Create()
  simulation.SimulationState.SensorTargetRepository.CreateComponent(entId)
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId)
  simulation.SimulationState.PhysicsRepository.CreateCharacterControllerWithSphere(entId, positionAtFeet, size - offset, offset)
  simulation.SimulationState.PhysicsRepository.SetAffectedByGravity(entId, true)
  simulation.SimulationState.MovementRepository.CreateComponent(entId)
  simulation.SimulationState.StatRepository.CreateComponent(entId)
  simulation.SimulationState.StatRepository.SetStatBaseValue(entId, StatType.SPEED, SPEED)

  if (thirdPerson) {
    import("../views/thirdPersonPlayer").then(({ ThirdPersonPlayerView }) => {
      const view = new ThirdPersonPlayerView(entId, simulation, rotation)
  
      simulation.ViewSync.AddEntityView(view)
    })
  } else {
    import("../views/player").then(({ PlayerView }) => {
      const view = new PlayerView(entId, simulation, rotation)
  
      simulation.ViewSync.AddEntityView(view)
    })
  }
}
