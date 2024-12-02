import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'
import wasm from "vite-plugin-wasm"

const config = defineConfig({
  plugins: [
    wasm(),
    checker({
      typescript: true,
    }),
  ],
  build: {
    target: 'esnext',
    sourcemap: true,
    assetsInlineLimit: 1024*4,
    chunkSizeWarningLimit: 1024*4,
    emptyOutDir: false,
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
