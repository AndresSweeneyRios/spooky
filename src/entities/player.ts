import * as THREE from "three"
import { Simulation } from "../simulation"
import { PlayerView } from "../views/player"

export const createPlayer = (simulation: Simulation, camera: THREE.Camera) => {
  const entId = simulation.EntityRegistry.Create()
  simulation.SimulationState.TransformRepository.CreateComponent(entId)
  simulation.SimulationState.MovementRepository.CreateComponent(entId)
  simulation.SimulationState.MovementRepository.SetSpeed(entId, 0.1)

  const view = new PlayerView(entId, camera)

  simulation.ViewSync.AddEntityView(view)
}
