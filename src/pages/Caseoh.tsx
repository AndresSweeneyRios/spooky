import "./Caseoh.css";

import React, { Fragment } from 'react';
import { Viewport, renderer } from '../components/Viewport';
import { DialogueBox } from '../components/DialogueBox';
import { loadScene, scenes } from "../scenes";
import TvWebp from "../assets/caseoh/tv.webp"
import PolaroidPng from "../assets/caseoh/polaroid.png"
import * as state from "../scenes/crazeoh/state"

export const CrazeOh = () => React.useMemo(() => <>
  <Viewport scene={scenes.crazeoh} />
  <DialogueBox />

  <div id="caseoh" is-hidden="false">
    <div className="main">
      <img src={TvWebp} />
      <h1>CrazeOh</h1>
      <button onClick={() => {
        renderer.domElement.requestPointerLock()
        document.querySelector("#caseoh")!.setAttribute("is-hidden", "true")
        state.setPlaying(true)
      }}>Play</button>
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

  <div id="caseoh-decision" is-hidden="true">
    <div className="main">
      <div className="caseoh-polaroid-overlay">
        <img className="background" src={"#"} crossOrigin="anonymous" referrerPolicy="no-referrer" />
        <img className="polaroid" src={PolaroidPng} />
      </div>
      <h1>ANOMALY?</h1>
      <div className="split">
        <button className="yes" onClick={() => {
          if (state.anomaly && state.foundAnomaly) {
            state.incrementWins()
          } else {
            state.resetWins()
          }
          
          document.querySelector("#caseoh-decision")!.setAttribute("is-hidden", "true")
          renderer.domElement.requestPointerLock()

          loadScene(scenes.crazeoh).then(() => {
            state.setPlaying(true)
          })
        }}>YES</button>
        <button onClick={() => {
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
        }}>NO</button>
      </div>
    </div>
  </div>

  <div id="caseoh-loading" is-hidden="false">
    <img src={TvWebp} />
    <h1>Loading</h1>
  </div>
</>, [])
