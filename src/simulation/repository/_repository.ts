import { EntId } from "../EntityRegistry"

export class SimulationComponent {
}

export abstract class SimulationRepository<TComponent extends SimulationComponent> {
  private __componentConstructor: (new () => TComponent)

  protected entities = new Map<EntId, TComponent>()

  public get Entities() {
    return this.entities.keys()
  }

  public CreateComponent(entId: EntId) {
    this.entities.set(entId, new this.__componentConstructor())
  }

  public RemoveComponent(entId: EntId) {
    this.entities.delete(entId)
  }

  public HasComponent(entId: EntId): boolean {
    return this.entities.has(entId)
  }

  constructor(component: SimulationComponent) {
    this.__componentConstructor = component.constructor as (new () => TComponent)
  }
}
