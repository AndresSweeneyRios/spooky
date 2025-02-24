import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRDracoMeshCompression } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * Optimize a GLB file by re‑applying Draco compression and converting all textures to WebP,
 * while constraining texture dimensions to a maximum of 2048 pixels.
 * @param inputPath - Path to the input GLB.
 * @param outputPath - Path to write the optimized GLB.
 * @param quality - WebP quality (0–100).
 */
async function optimizeGLB(inputPath, outputPath, quality = 75) {
  // Read input file as a Buffer.
  const inputBuffer = fs.readFileSync(inputPath);

  // Create a NodeIO instance and register the Draco extension and its dependencies.
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule(),
    });

  // Read and decode the GLB file.
  const doc = await io.readBinary(new Uint8Array(inputBuffer));

  const materials = doc.getRoot().listMaterials();

  // Create and configure the Draco extension.
  doc.createExtension(KHRDracoMeshCompression)
    .setRequired(true)
    .setEncoderOptions({
      method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,
      encodeSpeed: 5,
      decodeSpeed: 5,
    });

  // Convert all textures to WebP using sharp, with a maximum dimension of 2048 pixels.
  const textures = doc.getRoot().listTextures();
  for (const texture of textures) {
    const image = texture.getImage();
    if (!image) continue;

    // Ensure we have a Node Buffer.
    let inputImage;
    if (Buffer.isBuffer(image)) {
      inputImage = image;
    } else if (image instanceof Uint8Array) {
      inputImage = Buffer.from(image);
    } else {
      console.warn('Texture image not in a convertible format, skipping texture conversion.');
      continue;
    }

    try {
      // Resize image if larger than 2K in either dimension, then convert to WebP.
      const webpBuffer = await sharp(inputImage)
        .resize({
          width: 4096,
          height: 4096,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality })
        .toBuffer();
      texture.setImage(webpBuffer);
      texture.setMimeType('image/webp');
    } catch (error) {
      console.error('Error converting texture to WebP:', error);
    }
  }

  // (Optional: Add additional transforms like dedup() or prune() here if needed.)

  // Write out the optimized GLB.
  const outputBuffer = await io.writeBinary(doc);
  fs.writeFileSync(outputPath, Buffer.from(outputBuffer));
  console.log(`Optimized GLB saved to ${outputPath}`);
}

// Usage: node optimize.js <input-file>
const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Usage: node optimize.js <input-file>');
  process.exit(1);
}

const ext = path.extname(inputFile);
const baseName = path.basename(inputFile, ext);
const outputFile = path.join(path.dirname(inputFile), `${baseName}_OPTIMIZED.glb`);

optimizeGLB(inputFile, outputFile, 50)
  .then(() => {
    console.log('Optimization complete.');
  })
  .catch((error) => {
    console.error('Error during optimization:', error);
  });
