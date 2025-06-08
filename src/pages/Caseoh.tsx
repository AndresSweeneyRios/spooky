import "./Caseoh.css";

import React from 'react';
import { Viewport, renderer } from '../components/Viewport';
import { DialogueBox } from '../components/DialogueBox';
import { loadScene, scenes, unloadScene } from "../scenes";
import TvWebp from "../assets/caseoh/tv.webp";
import PolaroidPng from "../assets/caseoh/polaroid.webp";
import * as state from "../scenes/crazeoh/state";
import { removeCurrentAnomaly } from "../scenes/crazeoh/anomaly";
import _SVG from 'react-inlinesvg';
const SVG = _SVG as any;
import InteractableIconSvg from "../assets/icons/interactable.svg";
import CameraHintSvg from "../assets/icons/camera_hint.svg";
import SplashWebp from "../assets/caseoh/splash.webp";
import { playerInput } from "../input/player";
import { getMasterVolumePercentage, setMasterVolumeFromPercentage } from "../audio/volume";
import TripshredSvg from "../assets/icons/tripshred.svg";
import TrophySvg from "../assets/icons/trophy.svg";
import errorOgg from '../assets/audio/sfx/error.ogg';
import coinsOgg from '../assets/audio/sfx/coins.ogg';
import { loadAudio } from "../graphics/loaders";
import { requestFullscreen, requestPointerLock } from "../utils/requestFullscreen";
// Throttle focus to avoid layout thrashing
let lastFocus = 0;
function ensureFocus(el: HTMLElement) {
  const now = Date.now();
  if (el !== document.activeElement && now - lastFocus > 300) {
    lastFocus = now;
    el.focus();
  }
}
import LogOutSvg from "../assets/icons/log-out.svg";

if (!localStorage.sensitivity) {
  localStorage.sensitivity = "0.5";
}

interface InputTreeNode {
  element: HTMLElement

  up?: InputTreeNode | undefined
  down?: InputTreeNode | undefined
  left?: InputTreeNode | undefined
  right?: InputTreeNode | undefined

  upAction?: (() => void) | undefined
  downAction?: (() => void) | undefined
  leftAction?: (() => void) | undefined
  rightAction?: (() => void) | undefined

  mainAction?: (() => void) | undefined
}

let currentInputTreeNode: InputTreeNode | undefined = undefined

// ─── AUDIO INITIALIZATION & HELPER FUNCTIONS ────────────────────────────────

const errorAudio = loadAudio(errorOgg, { loop: false, volume: 0.05 });
const coinsAudio = loadAudio(coinsOgg, { loop: false, volume: 0.05 });

// ─── GAME START & DECISION HANDLERS ─────────────────────────────────────────────

export const hideMainMenu = async () => {
  document.querySelector("#caseoh")!.setAttribute("is-hidden", "true");
};

export const setPickerVisibility = (visible: boolean) => {
  const decision = document.querySelector("#caseoh-decision")!;
  decision.setAttribute("is-hidden", visible ? "false" : "true");
  state.setPicking(visible);

  if (visible) {
    const yes = document.querySelector("#caseoh-decision .yes button") as HTMLElement;
    const no = document.querySelector("#caseoh-decision .no button") as HTMLElement;
    const cancel = document.querySelector("#caseoh-decision .cancel button") as HTMLElement;

    const yesInputNode: InputTreeNode = {
      element: yes,
      down: undefined,

      mainAction() {
        handleDecision(true)
      },
    }

    const cancelInputNode: InputTreeNode = {
      element: cancel,
      up: undefined,

      mainAction() {
        cancelDecision()
      },
    }

    const noInputNode: InputTreeNode = {
      element: no,
      up: yesInputNode,
      down: cancelInputNode,

      mainAction() {
        handleDecision(false)
      },
    }

    yesInputNode.down = noInputNode;
    cancelInputNode.up = noInputNode;

    if (state.tookPicture) {
      currentInputTreeNode = yesInputNode;
    } else {
      currentInputTreeNode = noInputNode;
      noInputNode.up = undefined;
    }
  } else {
    currentInputTreeNode?.element.blur();
    currentInputTreeNode = undefined;
  }
}

export const setSettingsVisibility = (visible: boolean) => {
  const settingsOverlay = document.querySelector("#caseoh-settings")!;
  settingsOverlay.setAttribute("is-hidden", visible ? "false" : "true");

  if (visible) {
    const volumeInput = document.querySelector("#caseoh-settings .volume") as HTMLInputElement;
    const sensitivityInput = document.querySelector("#caseoh-settings .sensitivity") as HTMLInputElement;
    const exitButton = document.querySelector("#caseoh-settings .exit") as HTMLButtonElement;

    const volumeInputNode: InputTreeNode = {
      element: volumeInput,
      down: undefined,

      leftAction() {
        const currentVolume = parseFloat(volumeInput.value);
        if (currentVolume > 0) {
          volumeInput.value = (currentVolume - 5).toString();
          setMasterVolumeFromPercentage(currentVolume - 5);
        }
      },

      rightAction() {
        const currentVolume = parseFloat(volumeInput.value);
        if (currentVolume < 100) {
          volumeInput.value = (currentVolume + 5).toString();
          setMasterVolumeFromPercentage(currentVolume + 5);
        }
      },
    }

    const sensitivityInputNode: InputTreeNode = {
      element: sensitivityInput,
      up: volumeInputNode,

      leftAction() {
        const currentSensitivity = parseFloat(sensitivityInput.value);
        if (currentSensitivity > 0) {
          sensitivityInput.value = (currentSensitivity - 5).toString();
          localStorage.setItem('sensitivity', (parseFloat(sensitivityInput.value) / 100).toString());
        }
      },

      rightAction() {
        const currentSensitivity = parseFloat(sensitivityInput.value);
        if (currentSensitivity < 100) {
          sensitivityInput.value = (currentSensitivity + 5).toString();
          localStorage.setItem('sensitivity', (parseFloat(sensitivityInput.value) / 100).toString());
        }
      },
    }

    const exitButtonNode: InputTreeNode = {
      element: exitButton,
      up: sensitivityInputNode,

      mainAction() {
        setAreYouSureVisibility(true);
      },
    }

    volumeInputNode.down = sensitivityInputNode;
    sensitivityInputNode.down = exitButtonNode;

    currentInputTreeNode = volumeInputNode;
  } else {
    currentInputTreeNode?.element.blur();
    currentInputTreeNode = undefined;
  }
}

export const setAreYouSureVisibility = (visible: boolean) => {
  const areYouSure = document.querySelector("#caseoh-settings .are-you-sure")!;
  areYouSure.setAttribute("is-hidden", visible ? "false" : "true");

  if (visible) {
    const yesButton = document.querySelector("#caseoh-settings .are-you-sure button:first-child") as HTMLButtonElement;
    const noButton = document.querySelector("#caseoh-settings .are-you-sure button:last-child") as HTMLButtonElement;

    const yesButtonNode: InputTreeNode = {
      element: yesButton,
      right: undefined,

      mainAction() {
        window.close();
      },
    }

    const noButtonNode: InputTreeNode = {
      element: noButton,
      left: yesButtonNode,

      mainAction() {
        setAreYouSureVisibility(false);
        setSettingsVisibility(true);
      },
    }

    yesButtonNode.right = noButtonNode;

    currentInputTreeNode = yesButtonNode;
  } else {
    currentInputTreeNode?.element.blur();
    currentInputTreeNode = undefined;
  }
}

window.addEventListener("click", () => {
  try {
    if (!state.picking && !state.inSettings && document.pointerLockElement !== renderer.domElement) {
      requestFullscreen();
      requestPointerLock(renderer.domElement);
    }
  } catch { }
})

document.addEventListener("pointerlockchange", () => {
  if (!state.picking && document.pointerLockElement !== renderer.domElement) {
    state.setInSettings(true);
  }
})

/**
 * Handles a decision from the user (YES/NO) regarding the anomaly.
 */
const handleDecision = async (decision: boolean) => {
  try {
    setPickerVisibility(false);

    unloadScene();

    if (state.anomaly && state.foundAnomaly && decision) {
      state.incrementWins();
      removeCurrentAnomaly();
      state.setIsTutorial(false);
      coinsAudio.then(audio => audio.play());
    } else if (!state.anomaly && !decision) {
      state.incrementWins();
      coinsAudio.then(audio => audio.play());
    } else if (decision && state.winAnomalyIndex === 3) {
      state.incrementWins();
      coinsAudio.then(audio => audio.play());
    } else {
      errorAudio.then(audio => audio.play());
      state.decrementWins();
    }

    // re-enter fullscreen and pointer lock
    requestFullscreen();
    requestPointerLock(renderer.domElement);

    // caseoh-loading
    document.querySelector("#caseoh-loading")!.setAttribute("is-hidden", "false");

    await new Promise(resolve => setTimeout(resolve, 500));

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
    setPickerVisibility(false);

    requestFullscreen();
    requestPointerLock(renderer.domElement);
  } catch (error) {
    console.error("Error canceling decision:", error);
  }
};

// ─── GLOBAL INPUT HANDLING (GAMEPAD) ──────────────────────────────────────────

// Use a high order so this handler is called last.
playerInput.emitter.on(
  "justpressed",
  ({ action, consume, inputSource }) => {
    // ensure fullscreen
    requestFullscreen();

    if (action === "interact" && state.picking) {
      setPickerVisibility(false);

      consume()

      // request pointer lock
      // pointer lock + fullscreen
      requestPointerLock(renderer.domElement);
      requestFullscreen();

      return
    }

    if (action === "settings") {
      if (state.picking) {
        setPickerVisibility(false);

        consume()

        return
      }

      setAreYouSureVisibility(false);

      state.toggleSettings();
      consume()
  
      requestFullscreen();
  
      return
    }

    if (action === "cancel") {
      cancelDecision()
      state.setInSettings(false)

      consume()

      setAreYouSureVisibility(false);
      
      return
    }

    if (inputSource === "keyboard") {
      return
    }

    if (action === "up" || action === "down" || action === "left" || action === "right" || action === "mainAction1") {
      const hasFocus = currentInputTreeNode?.element === document.activeElement;
      
      if (!hasFocus && currentInputTreeNode) {
        ensureFocus(currentInputTreeNode.element);

        return
      }
    }

    if (action === "up") {
      if (currentInputTreeNode?.upAction) {
        currentInputTreeNode.upAction();
      } else if (currentInputTreeNode?.up) {
        currentInputTreeNode = currentInputTreeNode.up;
        ensureFocus(currentInputTreeNode.element);
      }

      return
    }

    if (action === "down") {
      if (currentInputTreeNode?.downAction) {
        currentInputTreeNode.downAction();
      } else if (currentInputTreeNode?.down) {
        currentInputTreeNode = currentInputTreeNode.down;
        ensureFocus(currentInputTreeNode.element);
      }

      return
    }

    if (action === "left") {
      if (currentInputTreeNode?.leftAction) {
        currentInputTreeNode.leftAction();
      } else if (currentInputTreeNode?.left) {
        currentInputTreeNode = currentInputTreeNode.left;
        ensureFocus(currentInputTreeNode.element);
      }

      return
    }

    if (action === "right") {
      if (currentInputTreeNode?.rightAction) {
        currentInputTreeNode.rightAction();
      } else if (currentInputTreeNode?.right) {
        currentInputTreeNode = currentInputTreeNode.right;
        ensureFocus(currentInputTreeNode.element);
      }

      return
    }

    if (action === "mainAction1") {
      if (currentInputTreeNode?.mainAction) {
        currentInputTreeNode.mainAction();
      } else if (currentInputTreeNode) {
        currentInputTreeNode.element.click();
      }

      return
    }
  },
  { order: -5 }
);

// ─── REACT COMPONENT ───────────────────────────────────────────────────────────

export const CrazeOh = () => {
  const [volume, setVolume] = React.useState(getMasterVolumePercentage());
  const [pointerLocked, setPointerLocked] = React.useState(false);

  React.useEffect(() => {
    const handlePointerLockChange = () => {
      setPointerLocked(!!document.pointerLockElement);
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, []);

  React.useEffect(() => {
    // Throttle stats/UI updates to 1 Hz
    function updateStats() {
      const wins = document.getElementById("caseoh-wins")!;
      const stats = document.getElementById("caseoh-stats")!;
      wins.innerText = `${state.wins} / 20 WINS`;
      stats.setAttribute(
        "is-hidden",
        state.gameStarted && !state.picking && !state.inDialogue ? "false" : "true"
      );
    }
    // Initial update
    updateStats();
    const intervalId = setInterval(updateStats, 100);
    return () => clearInterval(intervalId);
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
            {/* <button onClick={startGame}>Play</button> */}
            {/* <SVG src={DpadSoloIconSvg} style={{
              width: '4em',
              transform: 'rotate(-90deg)',
              position: 'absolute',
              left: '-6em'
            }} /> */}
          </div>
        </div>
        <div className="credits">
          <p>made by</p>
          <a href="mailto:contact@tripshred.com" target="_blank" rel="noreferrer">
            <h2>Kemal Albayrak</h2>
          </a>
          <a href="https://poisonapple.dev" target="_blank" rel="noreferrer">
            <h2>Andres Sweeney-Rios</h2>
          </a>
        </div>
        <div className="tripshred">
          <a href="https://tripshred.com" target="_blank" rel="noreferrer">
            <SVG src={TripshredSvg} />
          </a>
        </div>
      </div>

      <div id="caseoh-stats" is-hidden="true">
        <SVG src={TrophySvg} />
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
          {/* <h1>IS THIS AN ANOMALY?</h1> */}
          <div className="split">
            <div className="yes">
              <button onClick={() => handleDecision(true)}>
              <span>✓</span> This is the anomaly
              </button>
              {/* <SVG src={DpadSoloIconSvg} style={{ transform: 'rotate(-90deg)' }} /> */}
            </div>
            <div className="no">
              <button onClick={() => handleDecision(false)}>
              <span>✖</span> There is no anomaly
              </button>
              {/* <SVG src={DpadSoloIconSvg} style={{ transform: 'rotate(-90deg)' }} /> */}
            </div>
            <div className="cancel">
              <button onClick={cancelDecision}>
                <span className="cancel-arrow">&lt;</span> Cancel
              </button>
              {/* <SVG src={DpadSoloIconSvg} style={{ transform: 'rotate(180deg)' }} /> */}
            </div>
          </div>
          <h2>(Sometimes, there is no anomaly.)</h2>
        </div>
      </div>

      <div id="caseoh-settings" is-hidden="true">
        <h1>Settings</h1>
        <div className="caseoh-setting">
          <label>VOLUME</label>
          <input className="volume" type="range" min="0" max="100" step="1" defaultValue={volume} onChange={(e) => {
            setMasterVolumeFromPercentage(parseFloat(e.target.value));
          }} />
        </div>
        <div className="caseoh-setting">
          <label>SENSITIVITY</label>
          <input className="sensitivity" type="range" min="0" max="100" step="1" defaultValue={parseFloat(localStorage.getItem('sensitivity')!) * 100} onChange={(e) => {
            localStorage.setItem('sensitivity', (parseFloat(e.target.value) / 100).toString());
          }} />
        </div>
        <button className="exit" onClick={() => {
          setAreYouSureVisibility(true);
        }}>
          <SVG src={LogOutSvg} />
          Exit Game
        </button>
        <div className="are-you-sure" is-hidden="true">
          <h2>Are you sure you want to quit?</h2>
          <h3>(All progress will be lost.)</h3>
          <div>
            <button onClick={() => {
              window.close();
            }}>Yes</button>
            <button onClick={() => {
              setAreYouSureVisibility(false);
              setSettingsVisibility(true);
            }}>No</button>
          </div>
        </div>
      </div>

      {/* "Press Any Button" overlay */}
      <div id="caseoh-anybutton" is-hidden="true">
        <h1>Press Any Button</h1>
      </div>

      {/* Loading overlay */}
      <div id="caseoh-loading" is-hidden="false">
        <img src={TvWebp} alt="TV Loading" />
        {/* <h1>Randomizing anomaly...</h1> */}
      </div>

      <img src={SplashWebp} alt="Explainer" id="caseoh-explainer" is-hidden="true" />
    </>
  ), []);
};

export default CrazeOh;
