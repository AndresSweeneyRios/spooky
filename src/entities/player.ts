import type { Simulation } from "../simulation"
import type { vec3 } from "gl-matrix"

const SPEED = 5

export const createPlayer = (simulation: Simulation, position: vec3, rotation: vec3) => {
  const size = 1.0
  const offset = 0
  const positionAtFeet: vec3 = [position[0], position[1] + size, position[2]]
  
  const entId = simulation.EntityRegistry.Create()
  simulation.SimulationState.SensorTargetRepository.CreateComponent(entId)
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId)
  simulation.SimulationState.PhysicsRepository.CreateCharacterControllerWithSphere(entId, positionAtFeet, size - offset, offset)
  simulation.SimulationState.PhysicsRepository.SetAffectedByGravity(entId, true)
  simulation.SimulationState.MovementRepository.CreateComponent(entId)
  simulation.SimulationState.MovementRepository.SetSpeed(entId, SPEED)

  // shift to set speed to 8, and then release to set back to 4
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') {
      simulation.SimulationState.MovementRepository.SetSpeed(entId, SPEED * 2)
    }
  })

  window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') {
      simulation.SimulationState.MovementRepository.SetSpeed(entId, SPEED)
    }
  })

  import("../views/player").then(({ PlayerView }) => {
    const view = new PlayerView(entId, simulation, rotation)

    simulation.ViewSync.AddEntityView(view)
  })
}
