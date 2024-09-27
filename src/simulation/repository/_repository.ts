import { EntId } from "../EntityRegistry"

export class SimulationComponent {
}

export abstract class SimulationRepository <TComponent extends SimulationComponent> {
  private __componentConstructor: (new () => TComponent)

  public entities = new Map<EntId, TComponent>()

  public CreateComponent(entId: EntId) {
    this.entities.set(entId, new this.__componentConstructor())
  }

  public RemoveComponent(entId: EntId) {
    this.entities.delete(entId)
  }

  public abstract GetId(): string

  constructor(component: SimulationComponent) {
    this.__componentConstructor = component.constructor as (new () => TComponent)
  }
}
