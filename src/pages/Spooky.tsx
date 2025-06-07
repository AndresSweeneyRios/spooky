import "./Spooky.css";

import React, { Fragment } from "react";
import { Viewport } from "../components/Viewport";
import { DialogueBox } from "../components/DialogueBox";
import { scenes } from "../scenes";
import * as Input from "../input/spookyBattle";
import InteractableIconSvg from "../assets/icons/interactable.svg";

import _SVG from "react-inlinesvg";

const SVG = _SVG as any;

import DpadSvg from "../assets/spooky/dpad.svg";

Input.listenForEvents();

export default function Spooky() {
  return (
    <Fragment>
      <Viewport scene={scenes.gatesOfHeaven} />
      <div id="spooky">
        <div className="temp-activate" is-hidden="false">
          <p>Activate Mock Battle</p>
          <SVG src={InteractableIconSvg} />
        </div>
        <div className="temp-loading" is-hidden="true">
          <p>Loading...</p>
        </div>
        <div id="battle-track" is-hidden="true">
          <div id="dpad-container">
            <SVG id="dpad" src={DpadSvg} />
          </div>
        </div>
      </div>
      <DialogueBox />
    </Fragment>
  );
}
