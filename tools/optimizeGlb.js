import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRDracoMeshCompression, KHRMaterialsSpecular } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

  // Track textures that are used for metalness or specular to remove them later
  const materials = doc.getRoot().listMaterials();
  console.log(`Processing ${materials.length} materials to remove metalness and specular properties...`);
  
  // Process materials to remove metalness and specular properties
  for (const material of materials) {
    const materialName = material.getName() || 'unnamed';
    console.log(`Processing material: ${materialName}`);
    
    // Remove metalness by setting metallic factor to 0
    material.setMetallicFactor(0);
    
    // Remove metallic-roughness texture if it exists
    const metallicRoughnessTexture = material.getMetallicRoughnessTexture();
    if (metallicRoughnessTexture) {
      console.log(`- Removing metallic-roughness texture from ${materialName}`);
      // Store the texture for removal
      material.setMetallicRoughnessTexture(null);
    }
    
    console.log(`Removed metalness and specular from material: ${materialName}`);
  }

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
// Get directory of current module
const __dirname = dirname(fileURLToPath(import.meta.url));

// Usage: node optimizeGlb.js <regex>
// The script now accepts a regex pattern to match files under assets/3d
const inputArg = process.argv[2];
if (!inputArg) {
  console.error('Usage: node optimizeGlb.js <regex>');
  process.exit(1);
}

// Function to process a single file
async function processFile(inputFile) {
  const ext = path.extname(inputFile);
  const baseName = path.basename(inputFile, ext);
  const outputFile = path.join(path.dirname(inputFile), `${baseName}_OPTIMIZED.glb`);
  
  console.log(`Processing: ${inputFile}`);
  await optimizeGLB(inputFile, outputFile, 90);
  console.log(`Completed: ${outputFile}`);
}

// Function to recursively find all GLB files
function findGlbFiles(dir) {
  let results = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      results = results.concat(findGlbFiles(filePath));
    } else if (path.extname(file).toLowerCase() === '.glb') {
      results.push(filePath);
    }
  }
  
  return results;
}

// Main execution: recursive search under assets/3d, filter by provided regex
;(async () => {
  const assetsDir = path.join(__dirname, '..', 'src', 'assets', '3d');
  console.log(`Searching for GLB files in: ${assetsDir}`);
  if (!fs.existsSync(assetsDir)) {
    console.error(`Directory does not exist: ${assetsDir}`);
    process.exit(1);
  }

  // Compile regex from argument
  let fileRegex;
  try {
    fileRegex = new RegExp(inputArg);
  } catch (err) {
    console.error(`Invalid regex pattern: ${inputArg}`);
    process.exit(1);
  }

  // Find all .glb files
  const allGlbFiles = findGlbFiles(assetsDir);
  // Filter by regex and skip already optimized
  const glbFiles = allGlbFiles.filter(f => fileRegex.test(path.basename(f)) && !f.includes('_OPTIMIZED'));
  console.log(`Found ${glbFiles.length} matching GLB files`);

  for (const file of glbFiles) {
    try {
      console.log(`Processing: ${file}`);
      await processFile(file);
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
  console.log('All matching optimizations complete.');
})();
