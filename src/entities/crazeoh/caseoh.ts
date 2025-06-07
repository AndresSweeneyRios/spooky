import type { Simulation } from "../../simulation";

export const createCaseoh = async (simulation: Simulation) => {
  const entId = simulation.EntityRegistry.Create();
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId);
  simulation.SimulationState.SensorCommandRepository.CreateComponent(entId);
  simulation.SimulationState.MovementRepository.CreateComponent(entId);
  simulation.SimulationState.StatRepository.CreateComponent(entId);

  const { CaseohView } = await import("../../views/caseoh");
  const view = new CaseohView(entId, simulation);
  simulation.ViewSync.AddEntityView(view);

  return view;
};
