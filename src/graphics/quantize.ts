export function getRGBBits(totalBits: number) {
  // Minimum bits per channel to ensure some color representation
  const minBits = 1;

  // Start with an even distribution
  let rBits = Math.floor(totalBits / 3);
  let gBits = Math.floor(totalBits / 3);
  let bBits = Math.floor(totalBits / 3);

  // Distribute remaining bits, prioritizing green > red > blue
  let remainingBits = totalBits - (rBits + gBits + bBits);

  while (remainingBits > 0) {
    if (remainingBits > 0 && gBits < totalBits - 2 * minBits) {
      gBits++;
      remainingBits--;
    }
    if (remainingBits > 0 && rBits < totalBits - 2 * minBits) {
      rBits++;
      remainingBits--;
    }
    if (remainingBits > 0 && bBits < totalBits - 2 * minBits) {
      bBits++;
      remainingBits--;
    }
  }

  // Ensure each channel has at least minBits
  rBits = Math.max(rBits, minBits);
  gBits = Math.max(gBits, minBits);
  bBits = Math.max(bBits, minBits);

  return { r: rBits, g: gBits, b: bBits };
}
