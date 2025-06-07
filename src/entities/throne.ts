import type { Simulation } from "../simulation";
import type { vec3 } from "gl-matrix";

export const createThrone = (
  throne: Promise<typeof import("../views/throne")>,
  simulation: Simulation,
  position: vec3
) => {
  const entId = simulation.EntityRegistry.Create();
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId);
  simulation.SimulationState.SensorCommandRepository.CreateComponent(entId);
  simulation.SimulationState.PhysicsRepository.SetPosition(entId, position);

  throne.then(({ ThroneView }) => {
    const view = new ThroneView(simulation, entId, position);
    simulation.ViewSync.AddEntityView(view);
  });

  return entId;
};
