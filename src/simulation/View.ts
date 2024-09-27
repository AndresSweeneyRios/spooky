import type { Simulation } from "."

export abstract class View {
  constructor(public Symbol: symbol = window.Symbol()) {
  }

  public Depth = 0

  public abstract Draw(simulation: Simulation, lerpFactor: number): void

  public abstract Update(simulation: Simulation): void

  public abstract Cleanup(simulation: Simulation): void

  public abstract CameraUpdate(simulation: Simulation): void
}
