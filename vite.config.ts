import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import wasm from "vite-plugin-wasm"

const config = defineConfig({
  base: './',
  plugins: [
    wasm(),
    checker({
      typescript: true,
    }),
  ],
  build: {
    target: 'esnext',
    sourcemap: false,
    assetsInlineLimit: 1024 * 4,
    chunkSizeWarningLimit: 1024 * 4,
    emptyOutDir: true,
  },
  preview: {
    port: 3000,
    open: true,
    host: '0.0.0.0',
    cors: false,
    proxy: {
    },
  },
})

export default config
