import { defineConfig } from 'vite'
import checker from 'vite-plugin-checker'

const config = defineConfig({
  plugins: [
    checker({
      // e.g. use TypeScript check
      typescript: true,
    }),
  ],
  build: {
    target: 'esnext',
    assetsInlineLimit: 4096 * 1024,
    sourcemap: true,
  },
  preview: {
    port: 3000,
    open: true,
    host: '0.0.0.0',
    cors: false,
    proxy: {
    },
  }
})

export default config
