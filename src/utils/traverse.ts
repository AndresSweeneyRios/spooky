import type * as THREE from "three"

export function *traverse(object: THREE.Object3D): Generator<THREE.Object3D> {
  yield object

  for (const child of object.children) {
    yield* traverse(child)
  }
}

export function *traverseParents(object: THREE.Object3D): Generator<THREE.Object3D> {
  let parent = object.parent

  while (parent) {
    yield parent
    parent = parent.parent
  }
}
