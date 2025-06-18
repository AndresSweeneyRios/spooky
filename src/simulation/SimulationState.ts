import { SimulationCommand } from "./commands/_command";
import { EntId } from "./EntityRegistry";
import { SimulationEvent } from "./events/_event";
import { HintRepository } from "./repository/HintRepository";
import { MovementRepository } from "./repository/MovementRepository";
import { PhysicsRepository } from "./repository/PhysicsRepository";
import { SensorCommandRepository } from "./repository/SensorCommandRepository";
import { SensorTargetRepository } from "./repository/SensorTargetRepository";
import { StatRepository } from "./repository/StatRepository";

export class SimulationState {
  public DeltaTime: number = 0

  PhysicsRepository = PhysicsRepository.Factory()
  MovementRepository = MovementRepository.Factory()
  SensorTargetRepository = SensorTargetRepository.Factory()
  SensorCommandRepository = SensorCommandRepository.Factory()
  StatRepository = StatRepository.Factory()
  HintRepository = HintRepository.Factory()

  public Commands: SimulationCommand[] = []
  public Events: SimulationEvent[] = []

  Destroy(entId: EntId): void {
    this.PhysicsRepository.RemoveComponent(entId);
    this.MovementRepository.RemoveComponent(entId);
    this.SensorTargetRepository.RemoveComponent(entId);
    this.SensorCommandRepository.RemoveComponent(entId);
    this.StatRepository.RemoveComponent(entId);
    this.HintRepository.RemoveComponent(entId);
  }
}
