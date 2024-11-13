import { SimulationCommand } from "./commands/_command";
import { SimulationEvent } from "./events/_event";
import { MovementRepository } from "./repository/MovementRepository";
import { PhysicsRepository } from "./repository/PhysicsRepository";
import { SensorCommandRepository } from "./repository/SensorCommandRepository";
import { SensorTargetRepository } from "./repository/SensorTargetRepository";

export class SimulationState {
  public DeltaTime: number = 0

  PhysicsRepository = PhysicsRepository.Factory()
  MovementRepository = MovementRepository.Factory()
  SensorTargetRepository = SensorTargetRepository.Factory()
  SensorCommandRepository = SensorCommandRepository.Factory()

  public Commands: SimulationCommand[] = []
  public Events: SimulationEvent[] = []
}
