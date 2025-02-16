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

  console.log("WINNER WINNER CHICKEN DINNER")
}

export const resetWins = () => {
  wins = 0

  console.log("LOSER LOSER CHICKEN DINNER")
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
