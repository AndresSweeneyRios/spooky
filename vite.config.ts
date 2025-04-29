import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import wasm from "vite-plugin-wasm"
import { ViteEjsPlugin } from 'vite-plugin-ejs'

const ENV = process.env.ENV || 'production'
const PROJECT = (process.env.PROJECT || 'tripshred') as 'crazeoh' | 'spooky' | 'tripshred'

const config = defineConfig({
  base: './',
  plugins: [
    ViteEjsPlugin({
      ENV: ENV,
      PROJECT: PROJECT,
    }),
    wasm(),
    checker({
      typescript: true,
    }),
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
    outDir: `electron/resources/app/dist/${PROJECT}`,
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
