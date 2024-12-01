import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import brotli from 'brotli';

const app = express();
const port = 8888;

app.use(express.json({
  limit: '1000mb',
}));
app.use(cors()); // Add this line to enable CORS for all origins

interface Body {
  typescript: string
  json: string
}

console.log(import.meta.dirname);

app.post<undefined, string, Body>('/update-animations', (req, res) => {
  try {
    console.log('Updating animations..');

    const animationsIndexPath = path.join(import.meta.dirname, '../src/assets/animations/index.ts');
    const animationsJsonPath = path.join(import.meta.dirname, '../public/3d/animations/animations.json.br');
    console.log(animationsIndexPath, animationsJsonPath);
    fs.writeFileSync(animationsIndexPath, req.body.typescript);
    const buffer = Buffer.from(req.body.json, 'ascii');
    const compressedData = brotli.compress(buffer);
    fs.writeFileSync(animationsJsonPath, compressedData);

    console.log('Animations updated!');
  } catch (error) {
    console.error(error);

    res.status(500);
    res.send(JSON.stringify(error));
  }

  res.status(200);
  res.send('{}');
});

app.listen(port, () => {
  console.log(`Engine is running on port ${port}`);
});

export let open = false;
