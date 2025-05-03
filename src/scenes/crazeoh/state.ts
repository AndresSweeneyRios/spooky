import * as THREE from 'three'

// -----

export let anomaly = false

export const setAnomaly = (value: boolean) => {
  anomaly = value
}

// -----

export let foundAnomaly = false

export const setFoundAnomaly = (value: boolean) => {
  foundAnomaly = value
}

// -----

export let anomalyPosition = new THREE.Vector3(0, 0, 0)

export const setAnomalyPosition = (value: THREE.Vector3) => {
  anomalyPosition = value
}

// -----

export let wins = 0

export const incrementWins = () => {
  wins++

  if (winAnomalyIndex < wins) {
    incrementWinAnomalyIndex();
  }
}

export const resetWins = () => {
  // wins = 0
}

export const decrementWins = () => {
  if (wins <= 1) {
    return
  }

  wins--
}

// -----

export let tookPicture = false

export const setTookPicture = (value: boolean) => {
  tookPicture = value
}

// -----

export let gameStarted = false

export const setGameStarted = (value: boolean) => {
  gameStarted = value
}

// -----

export let winScriptIndex = -1

export const incrementWinScriptIndex = () => {
  winScriptIndex++
}

// -----

export let winAnomalyIndex = 0

export const incrementWinAnomalyIndex = () => {
  winAnomalyIndex++
}

// -----

export let inDialogue = false

export const setInDialogue = (value: boolean) => {
  inDialogue = value
}

// -----

export let picking = false

export const setPicking = (value: boolean) => {
  picking = value
}

// -----

export let isTutorial = true

export const setIsTutorial = (value: boolean) => {
  isTutorial = value
}

// -----

export let outro = false

export const setOutro = (value: boolean) => {
  outro = value
}

// -----

export const setVolume = (value: number) => {
  localStorage.setItem('volume', value.toString())
}

export const getVolume = () => {
  return parseFloat(localStorage.getItem('volume') || '0.5')
}

// -----

export let inSettings = false

export const setInSettings = (value: boolean) => {
  inSettings = value

  document.querySelector("#caseoh-settings")!.setAttribute("is-hidden", value ? "false" : "true")
}

export const toggleSettings = () => {
  setInSettings(!inSettings)
}

// -----

export const resetRound = () => {
  setAnomalyPosition(new THREE.Vector3(0, 0, 0));
  setAnomaly(false);
  setFoundAnomaly(false);
  setTookPicture(false);
  setPicking(false);
  setInDialogue(false);
}
