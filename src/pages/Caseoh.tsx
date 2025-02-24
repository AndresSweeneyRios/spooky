import "./Caseoh.css";

import React from 'react';
import { Viewport, renderer } from '../components/Viewport';
import { DialogueBox } from '../components/DialogueBox';
import { loadScene, scenes, unloadScene } from "../scenes";
import TvWebp from "../assets/caseoh/tv.webp";
import PolaroidPng from "../assets/caseoh/polaroid.png";
import * as state from "../scenes/crazeoh/state";
import { currentAnomalyId, removeCurrentAnomaly } from "../scenes/crazeoh/anomaly";
import _SVG from 'react-inlinesvg';
const SVG = _SVG as any;
import InteractableIconSvg from "../assets/icons/interactable.svg";
import CameraHintSvg from "../assets/icons/camera_hint.svg";
import DpadSoloIconSvg from "../assets/icons/dpad_solo.svg";
import { playerInput } from "../input/player";
import { executeWinScript } from "../scenes/crazeoh/scripts";
import { ArgumentsType } from "vitest";
import { getMasterVolumePercentage, setMasterVolumeFromPercentage } from "../audio/volume";

// Lazy–load loaders so we don’t block startup.
const loaderPromise = import("../graphics/loaders");

// ─── AUDIO INITIALIZATION & HELPER FUNCTIONS ────────────────────────────────

let stopMusic: () => void = () => {};

/**
 * Loads an audio file with the given options and sets a default volume.
 */
const loadAudioFile = async (path: string, options: Parameters<Awaited<typeof loaderPromise>["loadAudio"]>[1]) => {
  const { loadAudio } = await loaderPromise;
  const audio = await loadAudio(path, options);
  return audio;
};

const initializeAudio = async () => {
  try {
    // Wait for the first click (if required) to unlock audio.
    const { firstClick } = await loaderPromise;
    firstClick.then(() => {
      document.querySelector("#caseoh-anybutton")!.setAttribute("is-hidden", "true");
    });

    // Load and play background music.
    const audio = await loadAudioFile('/audio/music/caseoh.ogg', { loop: true, volume: 0.05 });
    audio.play();
    stopMusic = () => audio.stop();
  } catch (error) {
    console.error(error);
  }
};

const errorAudio = loadAudioFile('/audio/sfx/error.ogg', { loop: false, volume: 0.05 });
const coinsAudio = loadAudioFile('/audio/sfx/coins.ogg', { loop: false, volume: 0.05 });

// ─── GAME START & DECISION HANDLERS ─────────────────────────────────────────────

/**
 * Begins the game by stopping music, setting state flags, hiding UI, and ensuring
 * fullscreen/pointer lock. Early returns prevent race conditions.
 */
const startGame = async () => {
  try {
    const anyButton = document.querySelector("#caseoh-anybutton");
    if (
      state.gameStarted || state.picking || state.outro || state.inDialogue ||
      (anyButton && anyButton.getAttribute("is-hidden") === "false")
    ) {
      return;
    }
    stopMusic();
    state.setGameStarted(true);
    document.querySelector("#caseoh")!.setAttribute("is-hidden", "true");

    if (!document.fullscreenElement) {
      try {
        document.body.requestFullscreen();
      } catch { /* ignore */ }
    }
    if (!document.pointerLockElement) {
      try {
        renderer.domElement.requestPointerLock();
      } catch { /* ignore */ }
    }
  } catch (error) {
    console.error("Error starting game:", error);
  }
};

/**
 * Handles a decision from the user (YES/NO) regarding the anomaly.
 */
const handleConfirm = async () => {
  try {
    if (!state.gameStarted || state.playing || state.inDialogue || !state.picking || !state.tookPicture) return;

    unloadScene();

    if (state.anomaly && state.foundAnomaly) {
      state.incrementWins();
      removeCurrentAnomaly();
      state.setIsTutorial(false);
      coinsAudio.then(audio => audio.play());
    } else {
      errorAudio.then(audio => audio.play());
    }

    document.querySelector("#caseoh-decision")!.setAttribute("is-hidden", "true");

    state.setPicking(false);

    if (!document.fullscreenElement) {
      try {
        document.body.requestFullscreen();
      } catch { }
    }
    if (!document.pointerLockElement) {
      try {
        renderer.domElement.requestPointerLock();
      } catch { }
    }

    await loadScene(scenes.crazeoh);
  } catch (error) {
    console.error(error);
  }
};

/**
 * Cancels the decision screen and resumes play.
 */
const cancelDecision = async () => {
  try {
    document.querySelector("#caseoh-decision")!.setAttribute("is-hidden", "true");
    state.setPlaying(true);
    state.setPicking(false);

    if (!document.fullscreenElement) {
      try {
        document.body.requestFullscreen();
      } catch { }
    }
    if (!document.pointerLockElement) {
      try {
        renderer.domElement.requestPointerLock();
      } catch { }
    }
  } catch (error) {
    console.error("Error canceling decision:", error);
  }
};

// ─── GLOBAL INPUT HANDLING (GAMEPAD) ──────────────────────────────────────────

// Use a high order so this handler is called last.
playerInput.emitter.on(
  "justpressed",
  ({ action, inputSource, consume }) => {
    if (inputSource !== "gamepad") return;

    switch (action) {
      case "mainAction1":
        startGame();
        handleConfirm();
        consume();
        break;
      case "cancel":
        cancelDecision();
        consume();
        break;
    }
  },
  { order: 99999 }
);

// Start audio initialization immediately.
initializeAudio();

// ─── REACT COMPONENT ───────────────────────────────────────────────────────────

export const CrazeOh = () => {
  const [volume, setVolume] = React.useState(getMasterVolumePercentage());

  React.useEffect(() => {
    const handler = () => {
      document.getElementById("caseoh-wins")!.innerText = `${state.wins} / 10 WINS`;
      document.getElementById("caseoh-anomaly-id")!.innerText = `A${currentAnomalyId}`;
      document.getElementById("caseoh-stats")!.setAttribute("is-hidden", (state.gameStarted && !state.picking && !state.inDialogue && !state.outro) ? "false" : "true");

      animationFrame = requestAnimationFrame(handler);
    }

    let animationFrame = requestAnimationFrame(handler)

    return () => cancelAnimationFrame(animationFrame);
  }, [])

  // useMemo to memoize the JSX since this layout is static.
  return React.useMemo(() => (
    <>
      <Viewport scene={scenes.crazeoh} />
      <DialogueBox />
      
      {/* Main start screen */}
      <div id="caseoh" is-hidden="false">
        <div className="main">
          <img src={TvWebp} alt="TV" />
          <h1>CrazeOh</h1>
          <div style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <button onClick={startGame}>Play</button>
            <SVG src={DpadSoloIconSvg} style={{
              width: '4em',
              transform: 'rotate(-90deg)',
              position: 'absolute',
              left: '-6em'
            }} />
          </div>
          <div id="caseoh-volume-slider">
            <label>VOLUME</label>
            <input type="range" min="0" max="100" step="1" defaultValue={volume} onChange={(e) => {
              setMasterVolumeFromPercentage(parseFloat(e.target.value));
            }} />
          </div>
        </div>
        <div className="credits">
          <p>made by</p>
          <h2>Kemal Albayrak</h2>
          <h2>Andres Sweeney-Rios</h2>
        </div>
      </div>

      <div id="caseoh-stats" is-hidden="true">
        <h1 id="caseoh-anomaly-id"></h1>
        <h2 id="caseoh-wins"></h2>
      </div>

      {/* Ingame Polaroid Overlay */}
      <div className="caseoh-polaroid-overlay ingame" is-hidden="true">
        <img className="background" src="#" crossOrigin="anonymous" referrerPolicy="no-referrer" alt="Polaroid Background" />
        <img className="polaroid" src={PolaroidPng} alt="Polaroid" />
      </div>

      {/* Camera hint overlay */}
      <div className="caseoh-camera-hint" is-hidden="true">
        <SVG src={CameraHintSvg} />
      </div>

      {/* Interactable icon overlay */}
      <div className="caseoh-interactable" is-hidden="true">
        <SVG src={InteractableIconSvg} />
      </div>

      {/* Decision screen */}
      <div id="caseoh-decision" is-hidden="true">
        <div className="caseoh-polaroid-overlay">
          <img className="background" src="#" crossOrigin="anonymous" referrerPolicy="no-referrer" alt="Decision Background" />
          <img className="polaroid" src={PolaroidPng} alt="Polaroid" />
        </div>
        <div className="main">
          <h1>IS THIS AN ANOMALY?</h1>
          <div className="split">
            <div className="yes">
              <button onClick={() => handleConfirm()}>
                YES
              </button>
              <SVG src={DpadSoloIconSvg} style={{ transform: 'rotate(-90deg)' }} />
            </div>
            {/* <div>
              <button onClick={() => handleConfirm(false)}>NO</button>
              <SVG src={DpadSoloIconSvg} style={{ transform: 'rotate(-90deg)' }} />
            </div> */}
            <div>
              <button onClick={cancelDecision}>
                Cancel
              </button>
              <SVG src={DpadSoloIconSvg} style={{ transform: 'rotate(180deg)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* "Press Any Button" overlay */}
      <div id="caseoh-anybutton" is-hidden="false">
        <h1>Press Any Button</h1>
      </div>

      {/* Loading overlay */}
      <div id="caseoh-loading" is-hidden="false">
        <img src={TvWebp} alt="TV Loading" />
        <h1>Loading</h1>
      </div>
    </>
  ), []);
};

export default CrazeOh;
