export type EntId = symbol & { __entId: true }

export class EntityRegistry {
  id = 0

  Create() {
    return Symbol(this.id++) as EntId
  }
}
