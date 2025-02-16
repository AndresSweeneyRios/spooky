import "./Caseoh.css";

import React, { Fragment } from 'react';
import { Viewport, renderer } from '../components/Viewport';
import { DialogueBox } from '../components/DialogueBox';
import { loadScene, scenes } from "../scenes";
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

const startGame = () => {
  if (state.gameStarted) {
    return
  }

  state.setGameStarted(true)
  
  renderer.domElement.requestPointerLock()
  document.querySelector("#caseoh")!.setAttribute("is-hidden", "true")
  state.setPlaying(true)

  const canvas = document.querySelector("body")!
  canvas.requestFullscreen()
}

const handleYesDecision = () => {
  if (!state.gameStarted || state.playing || !state.tookPicture) {
    return
  }

  if (state.anomaly && state.foundAnomaly) {
    state.incrementWins()
    removeCurrentAnomaly()
  } else {
    state.resetWins()
  }

  document.querySelector("#caseoh-decision")!.setAttribute("is-hidden", "true")
  renderer.domElement.requestPointerLock()

  loadScene(scenes.crazeoh).then(() => {
    state.setPlaying(true)
  })

  const canvas = document.querySelector("body")!
  canvas.requestFullscreen()
}

const handleNoDecision = () => {
  if (!state.gameStarted || state.playing) {
    return
  }

  if (state.anomaly) {
    state.resetWins()
  } else {
    state.incrementWins()
  }

  document.querySelector("#caseoh-decision")!.setAttribute("is-hidden", "true")
  renderer.domElement.requestPointerLock()

  loadScene(scenes.crazeoh).then(() => {
    state.setPlaying(true)
  })

  const canvas = document.querySelector("body")!
  canvas.requestFullscreen()
}

playerInput.emitter.on("justpressed", ({ action, inputSource, consume }) => {
  if (inputSource !== "gamepad") {
    return;
  }

  switch (action) {
    case "mainAction1": startGame(); consume(); break;
    case "interact": handleYesDecision(); consume(); break;
    case "cancel": handleNoDecision(); consume(); break;
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
          <SVG src={DpadSoloIconSvg} />
          <button onClick={handleYesDecision}>YES</button>
        </div>
        <div>
          <button onClick={handleNoDecision}>NO</button>
          <SVG style={{ transform: 'rotate(180deg)' }} src={DpadSoloIconSvg} />
        </div>
      </div>
    </div>
  </div>

  <div id="caseoh-loading" is-hidden="false">
    <img src={TvWebp} />
    <h1>Loading</h1>
  </div>
</>, [])
