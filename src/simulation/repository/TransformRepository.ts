import {
  SimulationRepository,
  SimulationComponent,
} from "./_repository"

import {
  EntId,
} from "../EntityRegistry"

import {
  vec3,
} from "gl-matrix"

class TransformComponent extends SimulationComponent {
  public previousPosition = vec3.create()
  public position = vec3.create()
}

export class TransformRepository extends SimulationRepository<TransformComponent> {
  public SetPosition(entId: EntId, position: vec3) {
    this.entities.get(entId)!.position = position
  }

  public GetPosition(entId: EntId) {
    return vec3.clone(this.entities.get(entId)!.position)
  }

  public SetPreviousPosition(entId: EntId, position: vec3) {
    this.entities.get(entId)!.previousPosition = position
  }

  public GetPreviousPosition(entId: EntId) {
    return vec3.clone(this.entities.get(entId)!.previousPosition)
  }

  public static Factory() {
    return new TransformRepository(new TransformComponent())
  }
}
