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

export let foundAnomoly = false

export const setFoundAnomoly = (value: boolean) => {
  foundAnomoly = value
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
