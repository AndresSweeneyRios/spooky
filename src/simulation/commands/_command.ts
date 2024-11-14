import type { vec3 } from "gl-matrix";
import type { Simulation } from ".."
import type { EntId } from "../EntityRegistry";

export abstract class SimulationCommand {
  public EntId: EntId | null = null
  public Position: vec3 | null = null
  public Rotation: vec3 | null = null

  public abstract Execute(simulation: Simulation): void
}

export abstract class SimulationCommandWithTarget extends SimulationCommand {
  public TargetEntId: EntId | null = null
}
