import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@circos/ui': path.resolve(__dirname, './packages/ui/src'),
    },
  },
  test: {
    environment: 'node',
  },
})
