import React, { useState } from 'react';
import { WebIO, Document } from '@gltf-transform/core';
import { dedup, prune, draco } from '@gltf-transform/functions';
import { KHRDracoMeshCompression, KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';

import draco3d from 'draco3dgltf';

const GLTFOptimizer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [optimizing, setOptimizing] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setDownloadUrl('');
    } else {
      setSelectedFile(null);
    }
  };

  // Custom transform: Convert all textures in the document to WebP.
  const convertTexturesToWebp = async (doc: Document, quality: number) => {
    const textures = doc.getRoot().listTextures();
    for (const texture of textures) {
      const imageData = texture.getImage();
      if (!imageData) continue;

      // Determine the source MIME type (default to PNG if not specified).
      const sourceMime = texture.getMimeType() || 'image/png';

      // Create a Blob from the texture’s image data.
      const blob = new Blob([imageData], { type: sourceMime });
      // Create an ImageBitmap from the blob.
      const imageBitmap = await createImageBitmap(blob);

      // Create an offscreen canvas with the same dimensions.
      const canvas = document.createElement('canvas');
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.drawImage(imageBitmap, 0, 0);

      // Convert the canvas content to a WebP blob.
      const webpBlob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error('Canvas toBlob conversion failed.'));
        }, 'image/webp', quality);
      });

      // Read the WebP blob into an ArrayBuffer and update the texture.
      const webpBuffer = new Uint8Array(await webpBlob.arrayBuffer());
      texture.setImage(webpBuffer);
      texture.setMimeType('image/webp');
    }
  };

  const optimizeFile = async () => {
    if (!selectedFile) return;
    setOptimizing(true);
    try {
      // Read file into an ArrayBuffer.
      const arrayBuffer = await selectedFile.arrayBuffer();
      const io = new WebIO()
      .registerExtensions(KHRONOS_EXTENSIONS)
      .registerDependencies({
        // 'draco3d.decoder': await draco3d.createDecoderModule(), // Optional.
        'draco3d.encoder': await draco3d.createEncoderModule(), // Optional.
      });
      
      // Read the GLTF/GLB document.
      const doc = await io.readBinary(new Uint8Array(arrayBuffer));

      // Apply transforms:
      // 1. dedup(): Remove duplicate data.
      // 2. prune(): Remove unused nodes/materials/animations.
      // 3. draco(): Reapply Draco compression.
      await doc.transform(
        dedup(),
        prune(),
        draco(),
      );

      // Convert all textures to WebP with 75% quality.
      await convertTexturesToWebp(doc, 0.75);

      doc.createExtension(KHRDracoMeshCompression)
        .setRequired(true)
        .setEncoderOptions({
          method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,
          encodeSpeed: 5,
          decodeSpeed: 5,
        });

      // Write the optimized document as a binary GLB.
      const outputBuffer = await io.writeBinary(doc);
      const blob = new Blob([outputBuffer], { type: 'model/gltf-binary' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (error) {
      console.error('Optimization error:', error);
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>GLTF/GLB Optimizer</h1>
      <input type="file" accept=".glb,.gltf" onChange={handleFileChange} />
      <br /><br />
      <button onClick={optimizeFile} disabled={!selectedFile || optimizing}>
        {optimizing ? 'Optimizing...' : 'OPTIMIZE'}
      </button>
      <br /><br />
      {downloadUrl && selectedFile && (
        <a
          href={downloadUrl}
          download={selectedFile.name.replace(/(\.glb|\.gltf)$/i, '') + '_OPTIMIZED.glb'}
        >
          Download Optimized GLB
        </a>
      )}
    </div>
  );
};

export default GLTFOptimizer;
