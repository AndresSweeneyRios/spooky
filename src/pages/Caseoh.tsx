import "./Caseoh.css";

import React, { Fragment } from 'react';
import { Viewport } from '../components/Viewport';
import { DialogueBox } from '../components/DialogueBox';
import { scenes } from "../scenes";
import TvWebp from "../assets/caseoh/tv.webp"
import PolaroidPng from "../assets/caseoh/polaroid.png"

export default function Caseoh() {
  return (
    <Fragment>
      <Viewport scene={scenes.crazeoh} />
      <DialogueBox />

      <div id="caseoh" is-hidden="true">
        <div className="main">
          <img src={TvWebp} />
          <h1>CrazeOh</h1>
          <button>Play</button>
        </div>

        <div className="credits">
          <p>made by</p>
          <h2>Kemal Albayrak</h2>
          <h2>Andres Sweeney-Rios</h2>
        </div>
      </div>

      <div id="caseoh-polaroid-overlay" is-hidden="true">
        <img className="background" src={"#"} crossOrigin="anonymous" referrerPolicy="no-referrer" />
        <img className="polaroid" src={PolaroidPng} />
      </div>

      <div id="caseoh-loading" is-hidden="false">
        <img src={TvWebp} />
        <h1>Loading</h1>
      </div>
    </Fragment>
  )
}
