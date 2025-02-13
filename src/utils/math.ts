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
 * Computes the angle (in degrees) between the normalized vector from the object to the player
 * and an adjusted camera forward vector. The adjustment rotates the camera vector downward by 20°.
 *
 * @param {THREE.Vector3} object - The object's position.
 * @param {THREE.Vector3} player - The player's position.
 * @param {THREE.Camera} camera - The active camera.
 * @returns {number} - The angle in degrees.
 */
export function getAngle(object: THREE.Vector3, player: THREE.Vector3, camera: THREE.Camera) {
  const objectToPlayer = new THREE.Vector3();
  objectToPlayer.subVectors(player, object).normalize();

  // Get the camera's forward direction.
  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);

  // Invert the camera's forward vector (as required by your setup).
  cameraDirection.negate();

  // Rotate the cameraDirection downward by 20°.
  const offsetAngle = THREE.MathUtils.degToRad(-20);
  // Compute the camera's right axis: cross(camera.up, cameraDirection)
  const right = new THREE.Vector3();
  right.crossVectors(camera.up, cameraDirection).normalize();

  // Create a quaternion to rotate around the right axis.
  const quat = new THREE.Quaternion();
  quat.setFromAxisAngle(right, -offsetAngle); // negative rotates downward

  // Apply the rotation.
  cameraDirection.applyQuaternion(quat);

  // Compute and return the angle between the adjusted cameraDirection and objectToPlayer.
  const angle = objectToPlayer.angleTo(cameraDirection) * (180 / Math.PI);
  return angle;
}
