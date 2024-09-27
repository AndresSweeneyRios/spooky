import type { Simulation } from ".."

export abstract class SimulationCommand {
  public abstract Execute(simulation: Simulation): void

  public abstract Undo(simulation: Simulation): void

  public abstract Validate(simulation: Simulation): void
}
