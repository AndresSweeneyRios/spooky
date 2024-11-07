import { SimulationCommand } from "./commands/_command";
import { SimulationEvent } from "./events/_event";
import { MovementRepository } from "./repository/MovementRepository";
import { PhysicsRepository } from "./repository/PhysicsRepository";

export class SimulationState {
  public DeltaTime: number = 0

  PhysicsRepository = PhysicsRepository.Factory()
  MovementRepository = MovementRepository.Factory()

  public Commands: SimulationCommand[] = []
  public Events: SimulationEvent[] = []
}
