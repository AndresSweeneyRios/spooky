import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import mime from 'mime';
import zlib from 'zlib';

const app = express();
const port = 8888;

const __dirname = import.meta.dirname;
const distPath = path.join(__dirname, '../dist');

// Enable JSON parsing and CORS
app.use(
  express.json({
    limit: '1000mb',
  })
);
app.use(cors()); // Enable CORS for all origins

// Interface for the request body
interface Body {
  typescript: string;
  json: string;
}

// Middleware to serve Brotli files if available
app.use((req: Request, res: Response, next: NextFunction) => {
  let url = req.url || '';

  if (url.endsWith('/')) {
    url += 'index.html';
  }

  const acceptEncoding = req.headers['accept-encoding'] || '';
  const originalPath = path.join(distPath, url || '');
  const brotliPath = url.endsWith('.br') ? originalPath : `${originalPath}.br`;

  if (acceptEncoding.includes('br') && fs.existsSync(brotliPath)) {
    res.setHeader('Content-Encoding', 'br');
    const mimeType = mime.lookup(url || '');
    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.sendFile(brotliPath);
  } else {
    next(); // Fallback to serving original files
  }
});

// Serve original files as a fallback
app.use(express.static(distPath));

// Endpoint to update animations
app.post<undefined, string, Body>('/update-animations', (req, res) => {
  try {
    console.log('Updating animations...');

    const animationsIndexPath = path.join(__dirname, '../src/assets/animations/index.ts');
    const animationsJsonPath = path.join(__dirname, '../public/3d/animations/animations.json.br');
    console.log(animationsIndexPath, animationsJsonPath);

    // Write TypeScript content
    fs.writeFileSync(animationsIndexPath, req.body.typescript);

    // Compress JSON data with zlib's Brotli
    const buffer = Buffer.from(req.body.json, 'utf8');
    const compressedData = zlib.brotliCompressSync(buffer, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11, // Maximum compression quality
      },
    });

    // Write compressed data to the Brotli file
    fs.writeFileSync(animationsJsonPath, compressedData);

    console.log('Animations updated successfully!');
    res.status(200).send('{}');
  } catch (error) {
    console.error('Error updating animations:', error);
    res.status(500).send(JSON.stringify(error));
  }
});

// Handle 404 for unmatched routes
app.use((req: Request, res: Response) => {
  res.status(404).send('File not found');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
