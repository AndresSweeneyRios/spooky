import { SimulationState } from "../SimulationState";

export const previousPositionSystem = (state: SimulationState) => {
  for (const entId of state.TransformRepository.Entities) {
    const position = state.TransformRepository.GetPosition(entId)
    state.TransformRepository.SetPreviousPosition(entId, position)
  }
}
