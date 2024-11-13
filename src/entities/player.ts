import { Simulation } from "../simulation"
import { vec3 } from "gl-matrix"

export const createPlayer = (simulation: Simulation, position: vec3, rotation: vec3) => {
  const size = 1.0
  const offset = 0
  const positionAtFeet = vec3.fromValues(position[0], position[1] + size, position[2])
  
  const entId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId)
  simulation.SimulationState.PhysicsRepository.CreateCharacterControllerWithSphere(entId, positionAtFeet, size - offset, offset)
  simulation.SimulationState.PhysicsRepository.SetAffectedByGravity(entId, true)
  simulation.SimulationState.MovementRepository.CreateComponent(entId)
  simulation.SimulationState.MovementRepository.SetSpeed(entId, 10)

  import("../views/player").then(({ PlayerView }) => {
    const view = new PlayerView(entId, simulation, rotation)

    simulation.ViewSync.AddEntityView(view)
  })
}
