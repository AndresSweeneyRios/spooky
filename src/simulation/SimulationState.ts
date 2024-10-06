import { SimulationCommand } from "./commands/_command";
import { TransformRepository } from "./repository/TransformRepository";
import { SimulationEvent } from "./events/_event";
import { MovementRepository } from "./repository/MovementRepository";

export class SimulationState {
  TransformRepository = TransformRepository.Factory()
  MovementRepository = MovementRepository.Factory()

  public Commands: SimulationCommand[] = []
  public Events: SimulationEvent[] = []
}
