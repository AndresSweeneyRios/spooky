import { vec3 } from "gl-matrix"
import * as THREE from "three"

export const lerp = (a: number, b: number, t: number) => {
  return a + (b - a) * t
}

export const lerpVec3 = (a: vec3, b: vec3, t: number) => {
  return vec3.fromValues(
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  )
}

export const vec3ToThree = (v: vec3) => {
  return new THREE.Vector3(v[0], v[1], v[2])
}

/**
 * Function to check if the object has a clear line of sight to the player 
 * and if the angle is within a given threshold compared to the camera angle.
 * 
 * @param {THREE.Object3D} object - The object that is raycasting.
 * @param {THREE.Object3D} player - The player target.
 * @param {THREE.Camera} camera - The active camera.
 * @param {number} angleThreshold - Angle threshold in degrees.
 * @returns {boolean} - True if the conditions are met.
 */
export function checkVisibility(object: THREE.Object3D, player: THREE.Object3D, camera: THREE.Camera, angleThreshold = 45) {
  const raycaster = new THREE.Raycaster();
  const objectToPlayer = new THREE.Vector3();
  const cameraDirection = new THREE.Vector3();

  // Get object and player positions
  objectToPlayer.subVectors(player.position, object.position).normalize();

  // Set raycaster to check direct line
  raycaster.set(object.position, objectToPlayer);

  // Perform raycast, but ignore all objects (we assume no colliders affect this)
  const intersections = raycaster.intersectObjects([], true);

  // If something is hit (which shouldn't happen here), it means we didn't ignore colliders properly
  if (intersections.length > 0) {
    return false; // Something blocked the line
  }

  // Get the camera's forward direction
  camera.getWorldDirection(cameraDirection);

  // Compute angle between object-to-player vector and camera forward vector
  const angle = objectToPlayer.angleTo(cameraDirection) * (180 / Math.PI); // Convert to degrees

  return angle <= angleThreshold;
}
