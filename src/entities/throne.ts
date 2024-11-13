import { Simulation } from "../simulation";
import { ThroneView } from "../views/throne";
import { vec3 } from "gl-matrix";

export const createThrone = (simulation: Simulation, position: vec3) => {
  const entId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId)

  const view = new ThroneView(simulation, entId, position)

  simulation.ViewSync.AddEntityView(view)
}