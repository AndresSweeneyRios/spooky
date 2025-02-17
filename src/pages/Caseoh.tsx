import "./Caseoh.css";

import React, { Fragment } from 'react';
import { Viewport, renderer } from '../components/Viewport';
import { DialogueBox } from '../components/DialogueBox';
import { loadScene, scenes, unloadScene } from "../scenes";
import TvWebp from "../assets/caseoh/tv.webp"
import PolaroidPng from "../assets/caseoh/polaroid.png"
import * as state from "../scenes/crazeoh/state"
import { removeCurrentAnomaly } from "../scenes/crazeoh/anomaly";
import _SVG from 'react-inlinesvg';
const SVG = _SVG as any;
import InteractableIconSvg from "../assets/icons/interactable.svg"
import CameraHintSvg from "../assets/icons/camera_hint.svg"
import DpadSoloIconSvg from "../assets/icons/dpad_solo.svg"
import { playerInput } from "../input/player";
import { executeWinScript } from "../scenes/crazeoh/scripts";
import { type loadAudio } from "../graphics/loaders";

const loaderPromise = import("../graphics/loaders")

let stopMusic: () => void = () => {}

loaderPromise.then(async ({ loadAudio, firstClick }) => {
  firstClick.then(() => {
    document.querySelector("#caseoh-anybutton")!.setAttribute("is-hidden", "true")
  })
  
  const audio = await loadAudio('/audio/music/caseoh.ogg', {
    loop: true,
  })

  audio.setVolume(0.1)
  audio.play()

  stopMusic = () => {
    audio.stop()
  }

  return audio
}).catch(console.error) as Promise<Awaited<ReturnType<typeof loadAudio>>>

const startGame = async () => {
  try {
    if (state.gameStarted || document.querySelector("#caseoh-anybutton")!.getAttribute("is-hidden") === "false") {
      return
    }

    stopMusic()

    state.setGameStarted(true)

    document.querySelector("#caseoh")!.setAttribute("is-hidden", "true")

    try {
      document.body.requestFullscreen()
    } catch {}

    try {
      renderer.domElement.requestPointerLock()
    } catch {}
    
    await executeWinScript()

    state.setPlaying(true)
  } catch (error) {
    console.error("Error starting game:", error)
  }
}

const handleYesDecision = async () => {
  try {
    if (!state.gameStarted || state.playing || !state.tookPicture) {
      return
    }
    
    unloadScene()

    if (state.isTutorial) {
      if (state.anomaly && state.foundAnomaly) {
        state.incrementWins()
        removeCurrentAnomaly()
      } else {
        state.resetWins()
      }
    }

    state.setIsTutorial(false)

    document.querySelector("#caseoh-decision")!.setAttribute("is-hidden", "true")

    try {
      document.body.requestFullscreen()
    } catch {}

    try {
      renderer.domElement.requestPointerLock()
    } catch {}

    await loadScene(scenes.crazeoh)

    await executeWinScript()

    state.setPlaying(true)
    state.setPicking(false)
  } catch (error) {
    console.error("Error handling yes decision:", error)
  }
}

const handleNoDecision = async () => {
  try {
    if (!state.gameStarted || state.playing) {
      return
    }
    
    unloadScene()

    if (!state.isTutorial) {
      if (state.anomaly) {
        state.resetWins()
      } else {
        state.incrementWins()
      }
    }

    state.setIsTutorial(false)

    document.querySelector("#caseoh-decision")!.setAttribute("is-hidden", "true")

    try {
      document.body.requestFullscreen()
    } catch {}

    try {
      renderer.domElement.requestPointerLock()
    } catch {}

    await loadScene(scenes.crazeoh)

    await executeWinScript()

    state.setPlaying(true)
    state.setPicking(false)
  } catch (error) {
    console.error("Error handling no decision:", error)
  }
}

const cancelDecision = async () => {
  try {
    document.querySelector("#caseoh-decision")!.setAttribute("is-hidden", "true")
    state.setPlaying(true)
    state.setPicking(false)

    try {
      document.body.requestFullscreen()
    } catch {}

    try {
      renderer.domElement.requestPointerLock()
    } catch {}
    
    import("../scenes/crazeoh").then(({ currentPlayerView }) => {
      currentPlayerView?.enableControls()
    })
  } catch (error) {
    console.error("Error canceling decision:", error)
  }
}

playerInput.emitter.on("justpressed", ({ action, inputSource, consume }) => {
  if (inputSource !== "gamepad") {
    return;
  }

  switch (action) {
    case "mainAction1": startGame(); handleNoDecision(); consume(); break;
    case "interact": handleYesDecision(); consume(); break;
    case "cancel": cancelDecision(); consume(); break;
  }
}, {
  order: 99999,
})

export const CrazeOh = () => React.useMemo(() => <>
  <Viewport scene={scenes.crazeoh} />
  <DialogueBox />

  <div id="caseoh" is-hidden="false">
    <div className="main">
      <img src={TvWebp} />
      <h1>CrazeOh</h1>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <button onClick={() => {
          startGame()
        }}>
          Play
        </button>
        <SVG src={DpadSoloIconSvg} style={{ width: '4em', transform: 'rotate(-90deg)', position: 'absolute', left: '-6em' }} />
      </div>
    </div>

    <div className="credits">
      <p>made by</p>
      <h2>Kemal Albayrak</h2>
      <h2>Andres Sweeney-Rios</h2>
    </div>
  </div>

  <div className="caseoh-polaroid-overlay ingame" is-hidden="true">
    <img className="background" src={"#"} crossOrigin="anonymous" referrerPolicy="no-referrer" />
    <img className="polaroid" src={PolaroidPng} />
  </div>

  <div className="caseoh-camera-hint" is-hidden="true">
    <SVG src={CameraHintSvg} />
  </div>    

  <div className="caseoh-interactable" is-hidden="true">
    <SVG src={InteractableIconSvg} />
  </div>

  <div id="caseoh-decision" is-hidden="true">
    <div className="main">
      <div className="caseoh-polaroid-overlay">
        <img className="background" src={"#"} crossOrigin="anonymous" referrerPolicy="no-referrer" />
        <img className="polaroid" src={PolaroidPng} />
      </div>
      <h1>ANOMALY?</h1>
      <div className="split">
        <div className="yes">
          <button onClick={handleYesDecision}>YES</button>
          <SVG src={DpadSoloIconSvg} />
        </div>
        <div>
          <button onClick={handleNoDecision}>NO</button>
          <SVG style={{ transform: 'rotate(-90deg)' }} src={DpadSoloIconSvg} />
        </div>
        <div>
          <button onClick={cancelDecision}>CANCEL</button>
          <SVG style={{ transform: 'rotate(180deg)' }} src={DpadSoloIconSvg} />
        </div>
      </div>
    </div>
  </div>

  <div id="caseoh-anybutton" is-hidden="false">
    <h1>Press Any Button</h1>
  </div>

  <div id="caseoh-loading" is-hidden="false">
    <img src={TvWebp} />
    <h1>Loading</h1>
  </div>
</>, [])

export default CrazeOh;
