import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { traverse, traverseParents } from './traverse'

describe('traverse utilities', () => {
  it('traverse yields all descendants', () => {
    const root = new THREE.Object3D()
    const child = new THREE.Object3D()
    const grand = new THREE.Object3D()
    child.add(grand)
    root.add(child)
    const list = Array.from(traverse(root))
    expect(list).toHaveLength(3)
    expect(list[0]).toBe(root)
    expect(list[1]).toBe(child)
    expect(list[2]).toBe(grand)
  })

  it('traverseParents yields parents up to root', () => {
    const root = new THREE.Object3D()
    const child = new THREE.Object3D()
    root.add(child)
    const parents = Array.from(traverseParents(child))
    expect(parents).toEqual([root])
  })
})
