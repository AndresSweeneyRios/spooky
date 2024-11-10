import type { SimulationState } from "../SimulationState"
import { movementSystem } from "./movementSystem"
import { physicsSystem } from "./physicsSystem"

export const Tick = (state: SimulationState) => {
  physicsSystem(state)
  movementSystem(state)
}
