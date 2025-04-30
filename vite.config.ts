import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import wasm from "vite-plugin-wasm"
import { ViteEjsPlugin } from 'vite-plugin-ejs'
import fs from 'node:fs'
import path from 'node:path'

const ENV = process.env.ENV || 'production'
const PROJECT = (process.env.PROJECT || 'tripshred') as 'crazeoh' | 'spooky' | 'tripshred'

// Custom plugin to selectively copy public files
function selectivePublicCopy(excludePatterns: RegExp[]) {
  return {
    name: 'selective-public-copy',
    enforce: 'post',
    apply: 'build',
    // Use writeBundle instead of closeBundle for more reliable execution
    writeBundle() {
      const publicDir = path.resolve('public')
      const outDir = path.resolve(`dist/${PROJECT}`)

      console.log(`Copying from ${publicDir} to ${outDir}`)
      console.log(`Excluding patterns:`, excludePatterns.map(p => p.toString()))

      // Function to copy a file or directory recursively with exclusions
      function copyRecursive(src: string, dest: string) {
        const stat = fs.statSync(src)

        // temporarily block any file that isnt favicon.ico
        if (src.endsWith('favicon.ico')) {
          console.log(`Copying: ${src}`)
          fs.copyFileSync(src, dest)
          return
        }

        // Check if path matches any exclude pattern
        const relativePath = path.relative(publicDir, src).replace(/\\/g, '/')
        const shouldExclude = excludePatterns.some(pattern => pattern.test(relativePath))

        if (shouldExclude) {
          console.log(`Excluding: ${relativePath}`)
          return
        }

        if (stat.isDirectory()) {
          // Create destination directory if it doesn't exist
          if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true })
          }

          // Copy each file/folder in directory
          const entries = fs.readdirSync(src)
          for (const entry of entries) {
            copyRecursive(path.join(src, entry), path.join(dest, entry))
          }
        } else {
          // Create parent directories if they don't exist
          const parentDir = path.dirname(dest)
          if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true })
          }

          // Copy the file
          fs.copyFileSync(src, dest)
          console.log(`Copied: ${relativePath}`)
        }
      }

      // Start the copy process
      if (fs.existsSync(publicDir)) {
        copyRecursive(publicDir, outDir)
        console.log('Selectively copied public directory files')
      } else {
        console.error(`Public directory not found: ${publicDir}`)
      }
    }
  }
}

const config = defineConfig({
  base: './',
  // Disable default public directory copying
  publicDir: (process.env.ENV !== "production") ? "public" : false,
  assetsInclude: ['**/*.glb', '**/*.mid'], // Include .glb files as assets
  plugins: [
    ViteEjsPlugin({
      ENV: ENV,
      PROJECT: PROJECT,
    }),
    wasm(),
    checker({
      typescript: true,
    }),
    // Add our custom plugin with patterns to exclude
    selectivePublicCopy([
      /\.blend/,
      /\.blend1/,
      /\.fbx/,
      /\.png/,
      /\.xcf/,
      /\.wav/,
      /\.mp3/,
      /\.zip/,
      /\.flac/,
      /animations\/humanoid\//,
      /crazeoh\.glb/,
      /interloper\.glb/,
      /stomach\.glb/,
      /dropper\.glb/,
      /barricade\.glb/,
    ]),
  ],
  define: {
    'process.env.ENV': JSON.stringify(ENV),
    'process.env.PROJECT': JSON.stringify(PROJECT),
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    assetsInlineLimit: 1024 * 4,
    chunkSizeWarningLimit: 1024 * 4,
    emptyOutDir: true,
    outDir: `dist/${PROJECT}`,
    rollupOptions: {
      // We can remove the external config since it's not helping with public directory
    }
  },
  preview: {
    port: 3000,
    open: true,
    host: '0.0.0.0',
    cors: false,
    proxy: {},
  },
})

export default config
