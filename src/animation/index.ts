import * as THREE from 'three';
import { AnimationKey } from '../assets/animations';

export const animationsPromise = fetch('/3d/animations/animations.json.br').then((response) => response.json()).then((json) => {
  const rawAnimations: {
    [key: string]: any
  } = json;

  animations = {};

  for (const key in rawAnimations) {
    animations[key] = THREE.AnimationClip.parse(rawAnimations[key]);
  }

  return animations;
})

let animations: {
  [key: string]: THREE.AnimationClip
} = null!;

export const getAnimation = (name: AnimationKey) => {
  return animations[name];
}

export * from './animationPlayer';
export * as adapter from './adapter';
export * from './transform'
