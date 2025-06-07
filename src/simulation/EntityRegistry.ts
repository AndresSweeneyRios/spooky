export type EntId = symbol & { __entId: true };

export class EntityRegistry {
  Create() {
    return Symbol() as EntId;
  }
}
