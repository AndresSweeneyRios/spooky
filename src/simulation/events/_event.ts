import type { Simulation } from "..";

export abstract class SimulationEvent {
  public abstract Execute(simulation: Simulation): void;

  public abstract Undo(simulation: Simulation): void;
}
