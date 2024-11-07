import * as THREE from "three"
import { Simulation } from "../simulation"
import { PlayerView } from "../views/player"
import { vec3 } from "gl-matrix"

export const createPlayer = (simulation: Simulation, camera: THREE.Camera, position: vec3) => {
  const size = 1.0
  const offset = 0
  const positionAtFeet = vec3.fromValues(position[0], position[1] + size, position[2])
  
  const entId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId)
  simulation.SimulationState.PhysicsRepository.CreateCharacterController(entId, positionAtFeet, size - offset, offset)
  simulation.SimulationState.PhysicsRepository.SetAffectedByGravity(entId, true)
  simulation.SimulationState.MovementRepository.CreateComponent(entId)
  simulation.SimulationState.MovementRepository.SetSpeed(entId, 10)

  const view = new PlayerView(entId, camera)

  simulation.ViewSync.AddEntityView(view)
}
