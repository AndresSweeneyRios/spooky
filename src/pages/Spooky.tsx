import "./Spooky.css";

import React, { Fragment } from 'react';
import { Viewport } from '../components/Viewport';
import { DialogueBox } from '../components/DialogueBox';
import { scenes } from "../scenes";
import * as Input from "../input/spookyBattle"

import _SVG from 'react-inlinesvg';

const SVG = _SVG as any;

import DpadSvg from '../assets/spooky/dpad.svg';
import * as midi from '../audio/midi';

Input.listenForEvents()

export default function Spooky() {
  React.useEffect(() => {
    // return

    // the dpad is our note icon. this is a rhythm game. the notes will spawn in from right to left based on notes[x].percentage.
    // clone the dpad svg and move it to the right side of the screen. we will need to maintain a list of notes that are currently on the screen.

    const noteElementMap = new Map<symbol, HTMLElement>();
    const noteMap = new Map<symbol, midi.Note>();

    async function playNotes() {
      for await (const notes of midi.playNotesWithinInterval("/audio/music/fastbeat.wav", "/audio/music/fastbeat.mid", 4000, 2, 2000, 300, 200)) {
        const dpad = document.getElementById("dpad");

        for (const note of notes) {
          if (!dpad) {
            break
          }

          noteMap.set(note.note, note);

          if (!noteElementMap.has(note.note)) {
            const noteElement = dpad.cloneNode(true) as HTMLElement;
            noteElement.style.right = "0";
            noteElement.style.left = "auto";
            noteElement.style.opacity = "1";
            noteElement.classList.add("note");
            noteElement.id = "";
            dpad.parentElement!.appendChild(noteElement);
            noteElementMap.set(note.note, noteElement);

            const up = noteElement.querySelector(".up") as SVGPathElement;
            const down = noteElement.querySelector(".down") as SVGPathElement;
            const left = noteElement.querySelector(".left") as SVGPathElement;
            const right = noteElement.querySelector(".right") as SVGPathElement;
            const middle = noteElement.querySelector(".middle") as SVGPathElement;

            const buttonTypeMap = {
              [midi.ButtonType.Up]: up,
              [midi.ButtonType.Down]: down,
              [midi.ButtonType.Left]: left,
              [midi.ButtonType.Right]: right,
              [midi.ButtonType.Middle]: middle,
            };

            const button = buttonTypeMap[note.button];

            button.style.fill = "white"
            button.style.fillOpacity = "1"
          }

          const noteElement = noteElementMap.get(note.note)!;

          noteElement.style.left = `${note.percentage}%`;
        }

        // cleanup
        for (const [note, noteElement] of noteElementMap) {
          if (notes.every(n => n.note !== note)) {
            noteElementMap.delete(note);

            if (!noteMap.has(note)) {
              continue;
            }

            noteElement.style.left = "0";

            if (noteMap.get(note)!.hit) {
              noteElement.setAttribute("hit", "true");
            } else {
              noteElement.setAttribute("hit", "false");
            }

            setTimeout(() => {
              noteElement.remove();
            }, 500);
          }
        }
      }
    }

    // playNotes();
  }, []);

  return (
    <Fragment>
      <Viewport scene={scenes.gatesOfHeaven} />
      {/* <div id="spooky">
        <div id="battle-track">
          <div id="dpad-container">
            <SVG id="dpad" src={DpadSvg} />
          </div>
        </div>
      </div> */}
      <DialogueBox />
    </Fragment>
  )
}
