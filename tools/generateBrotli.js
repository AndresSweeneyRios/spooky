import fs from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';
import os from 'os';

const __dirname = import.meta.dirname;

const skipRegex = /(\.br|\.gz|.blend|.xcf)$/;

// Collect all files in the directory recursively
const collectFiles = (dir, fileList = []) => {
  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      collectFiles(filePath, fileList);
    } else {
      if (!skipRegex.test(filePath)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
};

// Dynamically determine max threads
const maxThreads = os.cpus().length; // Number of logical CPU cores
console.log(`Detected ${maxThreads} logical CPU cores.`);

// Path to the worker script
const workerPath = path.join(__dirname, './generateBrotli_worker.js');

// Function to compress files using worker threads
const processFilesWithWorkers = (files, maxThreads) => {
  let index = 0;
  let activeWorkers = 0;

  const processNextFile = () => {
    if (index >= files.length) {
      if (activeWorkers === 0) {
        console.log('All files processed.');
      }
      return;
    }

    const file = files[index];
    const worker = new Worker(workerPath, { workerData: { file } });
    activeWorkers++;
    index++;

    worker.on('message', (message) => {
      if (message.success) {
        console.log(`File ${file} compressed successfully.`);
      } else {
        console.error(`Failed to compress file ${file}:`, message.error);
      }
      activeWorkers--;
      processNextFile(); // Start the next task
    });

    worker.on('error', (err) => {
      console.error(`Worker error for file ${file}:`, err);
      activeWorkers--;
      processNextFile();
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
      }
    });

    // Start the next file if there are available threads
    if (activeWorkers < maxThreads) {
      processNextFile();
    }
  };

  // Kick off the workers
  for (let i = 0; i < maxThreads; i++) {
    processNextFile();
  }
};

const files = collectFiles(path.join(__dirname, '../dist'));

if (files.length > 0) {
  console.log(`Processing ${files.length} files with up to ${maxThreads} threads...`);
  processFilesWithWorkers(files, maxThreads);
} else {
  console.log('No files to process.');
}
