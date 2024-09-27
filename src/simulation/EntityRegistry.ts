export type EntId = number & { __entId: true }

export class EntityRegistry {
  private id = 0

  Create() {
    return this.id++ as EntId
  }
}
