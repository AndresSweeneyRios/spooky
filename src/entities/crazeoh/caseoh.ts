import type { Simulation } from "../../simulation";

export const createCaseoh = (simulation: Simulation) => {
  const entId = simulation.EntityRegistry.Create()
  simulation.SimulationState.PhysicsRepository.CreateComponent(entId)
  simulation.SimulationState.SensorCommandRepository.CreateComponent(entId)
  simulation.SimulationState.MovementRepository.CreateComponent(entId)
  simulation.SimulationState.StatRepository.CreateComponent(entId)

  import("../../views/caseoh").then(({ CaseohView }) => {
    const view = new CaseohView(entId, simulation)
    simulation.ViewSync.AddEntityView(view)
  })

  return entId
}
