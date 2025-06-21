import type { Simulation } from "../../simulation";

export const createCaseoh = async (simulation: Simulation) => {
  const entId = simulation.EntityRegistry.Create()

  const { CaseohView } = await import("../../views/caseoh");
  const view = new CaseohView(entId, simulation);
  simulation.ViewSync.AddEntityView(view);

  return view
}
