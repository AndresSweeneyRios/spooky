import type { Simulation } from "../../simulation";

export const createDrac = async (simulation: Simulation) => {
  const entId = simulation.EntityRegistry.Create();
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId);
  simulation.SimulationState.SensorCommandRepository.CreateComponent(entId);
  simulation.SimulationState.MovementRepository.CreateComponent(entId);
  simulation.SimulationState.StatRepository.CreateComponent(entId);

  const { DracView } = await import("../../views/lordOfHosts/drac");
  const view = new DracView(entId, simulation);
  simulation.ViewSync.AddEntityView(view);

  return view;
};
