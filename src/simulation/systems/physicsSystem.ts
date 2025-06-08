import { SimulationState } from "../SimulationState";

export const physicsSystem = (state: SimulationState) => {
  for (const entId of state.PhysicsRepository.Entities) {
    const position = state.PhysicsRepository.GetPosition(entId)
    state.PhysicsRepository.SetPreviousPosition(entId, position)
  }

  state.PhysicsRepository.TickWorld()

  state.PhysicsRepository.ApplyAllGravity(state.DeltaTime)

  state.PhysicsRepository.TickWorld()
}
