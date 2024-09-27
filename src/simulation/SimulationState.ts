import { SimulationCommand } from "./commands/_command";
import { TransformRepository } from "./repository/TransformRepository";
import { SimulationEvent } from "./events/_event";
import { SimulationComponent, SimulationRepository } from "./repository/_repository";

export class SimulationState {
  public Repositories = new Map<string, SimulationRepository<SimulationComponent>>([
    [TransformRepository.Id, TransformRepository.Factory()]
  ])

  public Commands: SimulationCommand[] = []
  public Events: SimulationEvent[] = []
}
