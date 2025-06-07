import * as midiManager from "midi-file";
import * as Input from "../input/spookyBattle";

interface NoteEvent {
  note: number;
  time: number; // absolute time in ticks
}

/**
 * Parses a MIDI file and returns an array of note objects.
 * Each note object has:
 *   - a unique note ID (a Symbol) based on the MIDI note number and its tick time, and
 *   - the note's exact noteOn time in milliseconds.
 *
 * The algorithm (assuming 4/4 time):
 * 1. Compute measureTicks = ticksPerBeat * 4.
 * 2. Divide each measure into `subdivisionsPerMeasure` equal parts.
 * 3. For each subdivision window, compute its ideal (center) tick.
 * 4. If one or more note events fall within that window, choose the one closest to the ideal tick.
 * 5. Convert that note's tick time to milliseconds.
 *
 * @param url - The URL of the MIDI file.
 * @param subdivisionsPerMeasure - Number of subdivisions per measure (e.g. 1, 4, 1000, etc.).
 *        Only one note (if any) will be output per subdivision.
 */
export const getNotes = async (
  url: string,
  subdivisionsPerMeasure: number = 1
): Promise<Array<{ note: symbol; ms: number; noteNumber: number }>> => {
  // 1. Fetch and parse the MIDI file.
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const data = new Uint8Array(buffer);
  const parsed = midiManager.parseMidi(data);

  // 2. Get ticks per beat from the header.
  const ticksPerBeat = parsed.header.ticksPerBeat!;

  // 3. Determine BPM (use the first tempo event if available; default to 160 BPM).
  let bpm = 107;
  // Calculate milliseconds per tick:
  // One beat lasts 60000/BPM milliseconds; divide by ticksPerBeat.
  const msPerTick = 60000 / (bpm * ticksPerBeat);

  // 4. Collect note-on events (ignoring noteOn events with velocity 0) with their absolute tick times.
  const noteEvents: NoteEvent[] = [];
  for (const track of parsed.tracks) {
    let absoluteTime = 0;
    for (const event of track) {
      absoluteTime += event.deltaTime;
      if (event.type === "noteOn" && event.velocity && event.velocity > 0) {
        noteEvents.push({ note: event.noteNumber, time: absoluteTime });
      }
    }
  }
  // (They are assumed to be roughly in order; if needed, you could sort them by time.)
  // noteEvents.sort((a, b) => a.time - b.time);

  // 5. Determine the song's total duration (in ticks).
  let songDurationTicks = 0;
  for (const track of parsed.tracks) {
    let time = 0;
    for (const event of track) {
      time += event.deltaTime;
    }
    if (time > songDurationTicks) {
      songDurationTicks = time;
    }
  }

  // 6. Define the subdivision grid.
  // In 4/4, one measure lasts 4 beats.
  const measureTicks = ticksPerBeat * 4;
  const subdivisionWidth = measureTicks / subdivisionsPerMeasure;
  const totalSubdivisions = Math.ceil(songDurationTicks / subdivisionWidth);

  // 7. Process subdivisions using a pointer over noteEvents.
  // For each subdivision window, if one or more note events fall within that window,
  // choose the event closest to the window's center (idealTick).
  const outputNotes: Array<{ note: number; ms: number }> = [];
  let pointer = 0;
  const n = noteEvents.length;

  for (let i = 0; i < totalSubdivisions; i++) {
    const windowStart = i * subdivisionWidth;
    const windowEnd = (i + 1) * subdivisionWidth;
    const idealTick = (i + 0.5) * subdivisionWidth;

    // Advance pointer until noteEvents[pointer] is within the current window.
    while (pointer < n && noteEvents[pointer].time < windowStart) {
      pointer++;
    }

    // Iterate over note events that fall within this window.
    let bestCandidate: NoteEvent | null = null;
    let bestDiff = Infinity;
    let j = pointer;
    while (j < n && noteEvents[j].time < windowEnd) {
      const diff = Math.abs(noteEvents[j].time - idealTick);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestCandidate = noteEvents[j];
      }
      j++;
    }
    // Move the pointer ahead for the next subdivision.
    pointer = j;

    if (bestCandidate !== null) {
      outputNotes.push({ note: bestCandidate.note, ms: bestCandidate.time });
    }
  }

  // 8. Convert the tick times to milliseconds and ensure unique note IDs by creating Symbols.
  const processedNotes = outputNotes.map((noteObj) => {
    const ms = noteObj.ms * msPerTick;
    // Create a unique symbol with a description that includes the note number and its tick time.
    const uniqueNote = Symbol();
    return { note: uniqueNote, ms, noteNumber: noteObj.note };
  });

  return processedNotes;
};

const loadAudio = async (url: string) => {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return new Promise<AudioBufferSourceNode>((resolve) => {
    // This was causing SO MANY ISSUES BRUH
    // window.addEventListener("click", () => {
    const context = new AudioContext();
    context.decodeAudioData(buffer, (audioBuffer) => {
      const source = context.createBufferSource();
      source.buffer = audioBuffer;

      // Create a GainNode to control the volume
      const gainNode = context.createGain();

      // Set the volume to 50% (0.5)
      gainNode.gain.value = 0.4; // Change this value to adjust volume

      // Connect the source through the gain node to the destination.
      source.connect(gainNode);
      gainNode.connect(context.destination);

      // Start playback.
      resolve(source);
    });
    // });
  });
};

// Define an enum for the button types.
export enum ButtonType {
  Up = "up",
  Left = "left",
  Right = "right",
  Down = "down",
  Middle = "middle",
}

function getButtonTypeFromNoteNumber(noteNumber: number): ButtonType {
  // Map MIDI note numbers to ButtonType values.
  switch (noteNumber) {
    case 72:
      return Object.values(ButtonType)[Math.floor(Math.random() * 4)]; // C4
    case 73:
      return ButtonType.Middle; // C#4
    default:
      return ButtonType.Up; // Default to Up for any other note number.
  }
}

// Map specific MIDI note numbers to potential actions (breakers or attacks)
function getActionsForNoteNumber(
  noteNumber: number
): Input.Action | Input.Action[] | undefined {
  // C4 (MIDI 60) -> directional inputs
  if (noteNumber === 60) {
    return [
      Input.Action.Up,
      Input.Action.Down,
      Input.Action.Left,
      Input.Action.Right,
    ];
  }
  // C#4 (MIDI 61) -> major/minor breaker and attack actions
  if (noteNumber === 61) {
    return [
      Input.Action.MajorAttack,
      Input.Action.MinorAttack,
      Input.Action.MajorBreaker,
      Input.Action.MinorBreaker,
    ];
  }
  return undefined;
}

// A simple Fisher–Yates shuffle.
function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,
    randomIndex: number;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    // Swap element at currentIndex with randomIndex.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

// Create an array with 3 copies of each ButtonType, then shuffle it.
function refillButtonQueue(): ButtonType[] {
  const arr: ButtonType[] = [];
  for (const bt of Object.values(ButtonType)) {
    for (let i = 0; i < 3; i++) {
      arr.push(bt as ButtonType);
    }
  }
  return shuffle(arr);
}

export interface Note {
  note: symbol; // unique symbol (set by getNotes)
  noteNumber: number; // MIDI note number
  ms: number; // noteOn time in milliseconds
  percentage: number; // percentage of the current interval
  hit: boolean;
  button: ButtonType;
  // (Other properties may be added later)
}

export async function* playNotesWithinInterval(
  audioUrl: string,
  midiUrl: string,
  x: number, // window length in milliseconds
  subdivisionsPerMeasure: number,
  delayMs: number, // delay before audio starts (in ms)
  actionThresholdMs: number, // allowed percentage threshold (e.g. 5 means ±5%)
  inputThresholdMs: number // input threshold in ms for WasRecentlyPressed
) {
  // Load both the audio and MIDI data.
  const [source, notes] = await Promise.all([
    loadAudio(audioUrl),
    getNotes(midiUrl, subdivisionsPerMeasure),
  ]);

  // Ensure notes are sorted in increasing order by their ms onset.
  notes.sort((a, b) => a.ms - b.ms);

  // Set the audio to loop infinitely.
  // source.loop = true;

  // Compute the total duration (in ms) of the note sequence (for looping).
  // (Assumes that the last note's ms marks the end of the loop.)
  const totalDuration = notes[notes.length - 1].ms;

  // Map a ButtonType to an Action (or set of Actions).
  function getActionsForButton(
    button: ButtonType
  ): Input.Action | Input.Action[] {
    switch (button) {
      case ButtonType.Up:
        return Input.Action.Up;
      case ButtonType.Left:
        return Input.Action.Left;
      case ButtonType.Right:
        return Input.Action.Right;
      case ButtonType.Down:
        return Input.Action.Down;
      case ButtonType.Middle:
        // For Middle, allow any of the major/minor attack or breaker actions.
        return [
          Input.Action.MajorAttack,
          Input.Action.MajorBreaker,
          Input.Action.MinorAttack,
          Input.Action.MinorBreaker,
        ];
      default:
        return Input.Action.Up;
    }
  }

  // Record the wall-clock time immediately.
  const realStart = Date.now();
  // We'll capture the audio's start time (in ms) once it actually starts.
  let audioStart = 0;

  // Schedule the audio to start after delayMs.
  setTimeout(() => {
    source.start();
    // Capture the audio context's currentTime (converted to ms) at audio start.
    audioStart = source.context.currentTime * 1000;
  }, delayMs);

  const noteButtonMap = new Map<symbol, ButtonType>();

  while (true) {
    // Compute current display time.
    let currentDisplayMs: number;
    if (audioStart === 0) {
      // Audio hasn't started yet; use wall-clock time.
      currentDisplayMs = Date.now() - realStart - delayMs;
    } else {
      // Audio has started; use the audio context's time (in ms) offset so that at audio start, display time equals 0.
      currentDisplayMs = source.context.currentTime * 1000 - audioStart;
    }

    // For looping, compute effective display time modulo totalDuration.
    const effectiveDisplayMs = currentDisplayMs % totalDuration;
    const effectiveWindowEnd = effectiveDisplayMs + x;

    // Filter notes within the current window.
    let windowNotes: typeof notes;
    if (effectiveWindowEnd <= totalDuration) {
      windowNotes = notes.filter(
        (note) =>
          note.ms > effectiveDisplayMs &&
          note.ms - actionThresholdMs <= effectiveWindowEnd
      );
    } else {
      // If the window wraps around, combine notes from the end and beginning.
      windowNotes = notes
        .filter((note) => note.ms > effectiveDisplayMs)
        .concat(
          notes.filter((note) => note.ms <= effectiveWindowEnd - totalDuration)
        );
    }

    // Process each note in the current window.
    const notesToPlay = windowNotes.map((note) => {
      // Compute a signed time difference (delta) on a circle.
      let delta = note.ms - effectiveDisplayMs;
      // Adjust for wrap-around to get the minimal difference.
      if (delta > totalDuration / 2) {
        delta -= totalDuration;
      } else if (delta < -totalDuration / 2) {
        delta += totalDuration;
      }
      // Compute percentage: 0% when delta is 0, positive if note is in the future, negative if overdue.
      const percentage = (delta / x) * 100;

      const deltaTime = note.ms - effectiveDisplayMs;

      // Determine if the note is within the input detection threshold:
      // i.e. its percentage is between -actionThreshold and actionThreshold.
      let hit = false;
      // Determine actions based on MIDI note number mapping (C4 -> breakers, D4 -> attacks)
      const mappedActions = getActionsForNoteNumber(note.noteNumber);
      // Assign a ButtonType for UI fallback
      if (!noteButtonMap.has(note.note)) {
        noteButtonMap.set(
          note.note,
          getButtonTypeFromNoteNumber(note.noteNumber) as ButtonType
        );
      }
      const button = noteButtonMap.get(note.note)!;
      // Choose actions: mappedActions if defined, otherwise based on button
      const actions = mappedActions ?? getActionsForButton(button);
      if (deltaTime >= -actionThresholdMs && deltaTime <= actionThresholdMs) {
        if (Array.isArray(actions)) {
          hit = actions.some((a) =>
            Input.WasRecentlyPressed(a, inputThresholdMs)
          );
        } else {
          hit = Input.WasRecentlyPressed(actions, inputThresholdMs);
        }
      } else if (deltaTime < -actionThresholdMs) {
        noteButtonMap.delete(note.note);
      }
      return { ...note, percentage, hit, button };
    });

    if (notesToPlay.length > 0) {
      yield notesToPlay;
    }

    // Yield control to the event loop.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

// Same function as above just doesn't loop
export async function* playNotesOnce(
  audioUrl: string,
  midiUrl: string,
  x: number,
  subdivisionsPerMeasure: number,
  delayMs: number,
  actionThresholdMs: number,
  inputThresholdMs: number,
  onNoteTime?: (note: Note) => void
) {
  const [source, notes] = await Promise.all([
    loadAudio(audioUrl),
    getNotes(midiUrl, subdivisionsPerMeasure),
  ]);

  notes.sort((a, b) => a.ms - b.ms);

  const totalDuration = notes[notes.length - 1].ms;

  function getActionsForButton(
    button: ButtonType
  ): Input.Action | Input.Action[] {
    switch (button) {
      case ButtonType.Up:
        return Input.Action.Up;
      case ButtonType.Left:
        return Input.Action.Left;
      case ButtonType.Right:
        return Input.Action.Right;
      case ButtonType.Down:
        return Input.Action.Down;
      case ButtonType.Middle:
        return [
          Input.Action.MajorAttack,
          Input.Action.MajorBreaker,
          Input.Action.MinorAttack,
          Input.Action.MinorBreaker,
        ];
      default:
        return Input.Action.Up;
    }
  }

  const realStart = Date.now();
  let audioStart = 0;

  setTimeout(() => {
    source.start();
    audioStart = source.context.currentTime * 1000;
  }, delayMs);

  // If a callback is provided, schedule it to run exactly at each note's ms
  if (typeof onNoteTime === "function") {
    // Schedule all note callbacks in advance
    for (const note of notes) {
      const msUntilNote = delayMs + note.ms - (Date.now() - realStart);
      if (msUntilNote >= 0) {
        setTimeout(() => {
          // Assign a button for the note (same logic as below)
          let button: ButtonType;
          if (!noteButtonMap.has(note.note)) {
            button = getButtonTypeFromNoteNumber(note.noteNumber);
            noteButtonMap.set(note.note, button);
          } else {
            button = noteButtonMap.get(note.note)!;
          }
          const noteObj = { ...note, percentage: 0, hit: false, button };
          onNoteTime(noteObj);
        }, msUntilNote);
      }
    }
  }

  const noteButtonMap = new Map<symbol, ButtonType>();

  const endTime = realStart + delayMs + totalDuration;

  while (Date.now() < endTime) {
    let currentDisplayMs: number;
    if (audioStart === 0) {
      currentDisplayMs = Date.now() - realStart - delayMs;
    } else {
      currentDisplayMs = source.context.currentTime * 1000 - audioStart;
    }

    const effectiveWindowEnd = currentDisplayMs + x;

    const windowNotes = notes.filter(
      (note) =>
        note.ms > currentDisplayMs &&
        note.ms - actionThresholdMs <= effectiveWindowEnd
    );

    const notesToPlay = windowNotes.map((note) => {
      const delta = note.ms - currentDisplayMs;
      const percentage = (delta / x) * 100;
      // Determine actions based on MIDI note number mapping (C4 -> breakers, D4 -> attacks)
      const mappedActions = getActionsForNoteNumber(note.noteNumber);
      // Assign a ButtonType for fallback UI interactions
      if (!noteButtonMap.has(note.note)) {
        noteButtonMap.set(
          note.note,
          getButtonTypeFromNoteNumber(note.noteNumber)
        );
      }
      const button = noteButtonMap.get(note.note)!;
      // Use mapped actions if available, otherwise fall back to button mapping
      const actions = mappedActions ?? getActionsForButton(button);
      let hit = false;
      if (delta >= -actionThresholdMs && delta <= actionThresholdMs) {
        if (Array.isArray(actions)) {
          hit = actions.some((a) =>
            Input.WasRecentlyPressed(a, inputThresholdMs)
          );
        } else {
          hit = Input.WasRecentlyPressed(actions, inputThresholdMs);
        }
      } else if (delta < -actionThresholdMs) {
        noteButtonMap.delete(note.note);
      }
      const noteObj = { ...note, percentage, hit, button };
      return noteObj;
    });

    if (notesToPlay.length > 0) {
      yield notesToPlay;
    }

    await new Promise((r) => setTimeout(r, 0));
  }
}
