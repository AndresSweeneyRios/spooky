import type { Simulation } from "../..";
import { SimulationCommand } from "../_command";
import * as state from "../../../scenes/crazeoh/state";

let caseohModule: typeof import("../../../pages/Caseoh") | undefined = undefined

export class Exit extends SimulationCommand {
  public async Execute(simulation: Simulation): Promise<void> {
    try {
      if (!caseohModule) {
        await import("../../../pages/Caseoh").then((module) => {
          caseohModule = module
          module.setPickerVisibility(true)
        }).catch(error => {
          console.error("Failed to import Caseoh module:", error)
        })
      } else {
        caseohModule.setPickerVisibility(true)
      }

      try {
        document.exitPointerLock()
      } catch (error) {
        console.error("Failed to exit pointer lock:", error)
      }

      try {
        const polaroid = document.querySelector("#caseoh-decision .caseoh-polaroid-overlay") as HTMLImageElement
        const yes = document.querySelector("#caseoh-decision .yes") as HTMLElement

        if (state.tookPicture) {
          // show yes, show polaroid
          polaroid.setAttribute("is-hidden", "false")
          yes.setAttribute("is-hidden", "false")
        } else {
          // hide yes, hide polaroid
          polaroid.setAttribute("is-hidden", "true")
          yes.setAttribute("is-hidden", "true")
        }
      } catch (error) {
        console.error("Failed to update UI elements:", error)
      }
    } catch (error) {
      console.error("Error in Exit command execution:", error)
    }
  }
}
