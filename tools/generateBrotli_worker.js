import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

// Worker logic
try {
  const file = workerData.file;
  const outputFilePath = `${file}.br`;

  // Read the file content
  const input = fs.readFileSync(file);

  // Compress using Brotli
  const compressed = zlib.brotliCompressSync(input, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11, // Maximum compression
    },
  });

  // Write the compressed file
  fs.writeFileSync(outputFilePath, compressed);

  // Notify the main thread of success
  parentPort.postMessage({ success: true });
} catch (error) {
  // Notify the main thread of failure
  parentPort.postMessage({ success: false, error: error.message });
}
