import type { Simulation } from "."
import type { EntId } from "./EntityRegistry"
import type { EntityView } from "./EntityView"
import { View } from "./View"

export class ViewSync {
  private entityViews = new Map<EntId, EntityView>()
  private auxiliaryViews = new Map<symbol, View>()

  private shouldSortViews = false

  private startTime = Date.now()

  public TimeMS = 0

  public AddEntityView(view: EntityView) {
    this.entityViews.set(view.EntId, view)

    this.shouldSortViews = true
  }

  public AddAuxiliaryView(view: View) {
    this.auxiliaryViews.set(view.Symbol, view)

    this.shouldSortViews = true
  }

  public TriggerSort() {
    this.shouldSortViews = true
  }

  public Draw(simulation: Simulation, lerpFactor: number) {
    this.TimeMS = Date.now() - this.startTime

    for (const view of this.entityViews.values()) {
      view.Draw?.(simulation, lerpFactor)
    }

    for (const view of this.auxiliaryViews.values()) {
      view.Draw?.(simulation, lerpFactor)
    }
  }

  public Update(simulation: Simulation) {
    for (const view of this.entityViews.values()) {
      view.Update?.(simulation)
    }

    for (const view of this.auxiliaryViews.values()) {
      view.Update?.(simulation)
    }
  }

  public Cleanup(simulation: Simulation) {
    for (const view of this.entityViews.values()) {
      view.Cleanup?.(simulation)
    }

    for (const view of this.auxiliaryViews.values()) {
      view.Cleanup?.(simulation)
    }
  }

  public CameraUpdate(simulation: Simulation) {
    for (const view of this.entityViews.values()) {
      view.CameraUpdate?.(simulation)
    }

    for (const view of this.auxiliaryViews.values()) {
      view.CameraUpdate?.(simulation)
    }
  }

  public DestroyEntityView(simulation: Simulation, entId: EntId) {
    const view = this.entityViews.get(entId)

    if (view) {
      view.Cleanup?.(simulation)
      this.entityViews.delete(entId)
    }
  }

  public DestroyAuxiliaryView(simulation: Simulation, symbol: symbol) {
    const view = this.auxiliaryViews.get(symbol)

    if (view) {
      view.Cleanup?.(simulation)
      this.auxiliaryViews.delete(symbol)
    }
  }

  constructor(simulation: Simulation) {
    this.CameraUpdate(simulation)

    window.addEventListener('resize', () => this.CameraUpdate(simulation))
  }
}
