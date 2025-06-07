import { vec3 } from "gl-matrix";
import * as THREE from "three";

export const lerp = (a: number, b: number, t: number) => {
  return a + (b - a) * t;
};

export const lerpVec3 = (a: vec3, b: vec3, t: number) => {
  return vec3.fromValues(
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t)
  );
};

export const vec3ToThree = (v: vec3) => {
  return new THREE.Vector3(v[0], v[1], v[2]);
};

export function getAngle(
  object: THREE.Vector3,
  player: THREE.Vector3,
  camera: THREE.Camera
): number {
  // Compute the normalized vector from the player's position to the object's position.
  const playerToObj = new THREE.Vector3()
    .subVectors(object, player)
    .normalize();

  // Get the camera's forward direction.
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);

  // Project both vectors onto the horizontal (XZ) plane.
  playerToObj.y = 0;
  camDir.y = 0;
  playerToObj.normalize();
  camDir.normalize();

  // Compute the angle (in radians) between the two horizontal directions.
  const angleRad = playerToObj.angleTo(camDir);
  const angleDeg = THREE.MathUtils.radToDeg(angleRad);

  return angleDeg;
}

export function getMeshCenter(mesh: THREE.Mesh): THREE.Vector3 {
  // Ensure the geometry's bounding box is up-to-date.
  mesh.geometry.computeBoundingBox();
  const boundingBox = mesh.geometry.boundingBox;

  if (!boundingBox) {
    return new THREE.Vector3();
  }

  // Compute the center of the bounding box.
  const center = new THREE.Vector3();
  boundingBox.getCenter(center);

  // Convert the local center to world coordinates.
  mesh.localToWorld(center);

  return center;
}
