import type { EntId } from "./EntityRegistry";
import { View } from "./View";

export abstract class EntityView extends View {
  public EntId: EntId;

  constructor(entId: EntId) {
    super();

    this.EntId = entId;
  }
}
