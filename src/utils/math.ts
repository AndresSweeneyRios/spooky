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
