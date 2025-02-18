import * as THREE from 'three'

// -----

export let playing = false

export const setPlaying = (value: boolean) => {
  playing = value
}

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
}

export const resetWins = () => {
  wins = 0
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
