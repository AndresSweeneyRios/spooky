import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import wasm from "vite-plugin-wasm"
import { ViteEjsPlugin } from 'vite-plugin-ejs'

const ENV = process.env.ENV || 'production'
const PROJECT = (process.env.VITE_PROJECT || 'tripshred') as 'crazeoh' | 'spooky' | 'tripshred'

const config = defineConfig({
  base: './',
  assetsInclude: ['**/*.glb', '**/*.mid'],
  plugins: [
    ViteEjsPlugin({
      ENV: ENV,
      PROJECT: PROJECT,
    }),
    wasm(),
    checker({
      typescript: true,
    }),
    // Custom plugin to copy crazeoh build files to electron directory
    {
      name: 'copy-crazeoh-to-electron',
      closeBundle: {
        sequential: true,
        order: 'post',
        handler: async () => {
          if (PROJECT === 'crazeoh') {
            const fs = await import('fs-extra');
            const path = await import('path');
            const sourcePath = path.resolve('dist/crazeoh');
            const targetPath = path.resolve('crazeoh/resources/app/dist');

            console.log(`Copying build files from ${sourcePath} to ${targetPath}`);
            await fs.ensureDir(targetPath);
            await fs.emptyDir(targetPath);
            await fs.copy(sourcePath, targetPath);
            console.log('Files copied successfully');
          }
        }
      }
    }
  ],
  define: {
    'process.env.ENV': JSON.stringify(ENV),
    'process.env.PROJECT': JSON.stringify(PROJECT),
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    assetsInlineLimit: 1024 * 4,
    chunkSizeWarningLimit: 1024 * 4,
    emptyOutDir: true,
    outDir: `dist/${PROJECT}`,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
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
