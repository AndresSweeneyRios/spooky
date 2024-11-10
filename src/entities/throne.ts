import type * as THREE from "three";
import { Simulation } from "../simulation";
import { ThroneView } from "../views/throne";

export const createThrone = (simulation: Simulation) => {
  const entId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId)

  const view = new ThroneView(simulation, entId)

  simulation.ViewSync.AddEntityView(view)
}