import type { Simulation } from ".";

export abstract class View {
  constructor(public Symbol: symbol = window.Symbol()) {}

  public Depth = 0;

  public Draw?(simulation: Simulation, lerpFactor: number): void;

  public Update?(simulation: Simulation): void;

  public Cleanup?(simulation: Simulation): void;

  public CameraUpdate?(simulation: Simulation): void;
}
