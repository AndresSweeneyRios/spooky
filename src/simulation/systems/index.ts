import type { SimulationState } from "../SimulationState"
import { movementSystem } from "./movementSystem"
import { previousPositionSystem } from "./previousPositionSystem"

export const Tick = (state: SimulationState) => {
  previousPositionSystem(state)
  movementSystem(state)
}
