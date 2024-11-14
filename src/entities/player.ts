import { Simulation } from "../simulation"
import { vec3 } from "gl-matrix"

export const createPlayer = (simulation: Simulation, position: vec3, rotation: vec3) => {
  const size = 1.0
  const offset = 0
  const positionAtFeet = vec3.fromValues(position[0], position[1] + size, position[2])
  
  const entId = simulation.EntityRegistry.Create()
  simulation.SimulationState.SensorTargetRepository.CreateComponent(entId)
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId)
  simulation.SimulationState.PhysicsRepository.CreateCharacterControllerWithSphere(entId, positionAtFeet, size - offset, offset)
  simulation.SimulationState.PhysicsRepository.SetAffectedByGravity(entId, true)
  simulation.SimulationState.MovementRepository.CreateComponent(entId)
  simulation.SimulationState.MovementRepository.SetSpeed(entId, 5)

  // shift to set speed to 8, and then release to set back to 4
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') {
      simulation.SimulationState.MovementRepository.SetSpeed(entId, 10)
    }
  })

  window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') {
      simulation.SimulationState.MovementRepository.SetSpeed(entId, 5)
    }
  })

  import("../views/player").then(({ PlayerView }) => {
    const view = new PlayerView(entId, simulation, rotation)

    simulation.ViewSync.AddEntityView(view)
  })
}
