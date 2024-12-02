import * as THREE from 'three'

/*
root
pelvis
spine_01
spine_02
chest
neck
head
upper_armL
lower_armL
handL
upper_armR
lower_armR
handR
thighL
shinL
footL
leg_endL
thighR
shinR
footR
leg_endR
*/

const mapName = (name: string): string => {
  if (name.includes("UNKNOWN")) {
    return name;
  }
  
  if (/root/i.test(name)) {
    return 'root';
  }

  if (/pelvis/i.test(name)) {
    return 'pelvis';
  }

  const spineMatch = name.match(/spine.?0*(\d+)/i);
  if (spineMatch) {
    let index = parseInt(spineMatch[1]);
    if (index === 1) {
      return 'spine_01';
    } else if (index === 2) {
      return 'spine_02';
    }
    return 'chest';
  }

  if (/chest/i.test(name)) {
    return 'chest';
  }

  if (/neck/i.test(name)) {
    return 'neck';
  }

  if (/head/i.test(name)) {
    return 'head';
  }

  const upperArmMatch = name.match(/upper_arm([LR])/i);
  if (upperArmMatch) {
    return `upper_arm${upperArmMatch[1].toUpperCase()}`;
  }

  const lowerArmMatch = name.match(/forearm([LR])/i);
  if (lowerArmMatch) {
    return `lower_arm${lowerArmMatch[1].toUpperCase()}`;
  }

  const handMatch = name.match(/hand([LR])/i);
  if (handMatch) {
    return `hand${handMatch[1].toUpperCase()}`;
  }

  const thighMatch = name.match(/thigh([LR])/i);
  if (thighMatch) {
    return `thigh${thighMatch[1].toUpperCase()}`;
  }

  const shinMatch = name.match(/shin([LR])/i);
  if (shinMatch) {
    return `shin${shinMatch[1].toUpperCase()}`;
  }

  const footMatch = name.match(/foot([LR])/i);
  if (footMatch) {
    return `foot${footMatch[1].toUpperCase()}`;
  }

  const legEndMatch = name.match(/leg_end([LR])/i);
  if (legEndMatch) {
    return `leg_end${legEndMatch[1].toUpperCase()}`;
  }

  const shoulderMatch = name.match(/shoulder([LR])/i);
  if (shoulderMatch) {
    return `upper_arm${shoulderMatch[1].toUpperCase()}`;
  }

  return 'UNKNOWN';
};

export const adaptAnimation = (animation: THREE.AnimationClip) => {
  for (let i = 0; i < animation.tracks.length; i++) {
    const track = animation.tracks[i]
    const segments = track.name.split('.')
    const key = segments.pop()
    const name = segments.join('.')

    const originalTrackName = track.name

    track.name = `${mapName(name)}.${key}`
    
    console.log(`${originalTrackName} mapped to ${track.name}`)
  }
}
