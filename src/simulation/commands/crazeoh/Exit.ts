import type { Simulation } from "../..";
import { SimulationCommand } from "../_command";
import * as state from "../../../scenes/crazeoh/state";
import { currentPlayerView } from "../../../scenes/crazeoh";
import { loadScene, scenes } from "../../../scenes";

export class Exit extends SimulationCommand {
  public Execute(simulation: Simulation): void {
    currentPlayerView?.disableControls()

    state.setPlaying(false)

    // if (state.isTutorial) {
    //   loadScene(scenes.crazeoh)

    //   return
    // }

    document.querySelector("#caseoh-decision")!.setAttribute("is-hidden", "false")

    try {
      document.exitPointerLock()
    } catch (error) {
      console.error("Failed to exit pointer lock:", error)
    }

    const polaroid = document.querySelector("#caseoh-decision .caseoh-polaroid-overlay") as HTMLImageElement
    const yes = document.querySelector("#caseoh-decision .yes") as HTMLElement

    state.setPicking(true)

    if (state.tookPicture) {
      // show yes, show polaroid
      polaroid.setAttribute("is-hidden", "false")
      yes.setAttribute("is-hidden", "false")
    } else {
      // hide yes, hide polaroid
      polaroid.setAttribute("is-hidden", "true")
      yes.setAttribute("is-hidden", "true")
    }
  }
}
