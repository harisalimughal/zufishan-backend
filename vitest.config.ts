import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    timeout: 30000,
    // AI tests mock fetch but need a key so the "not configured" guard passes
    env: { GEMINI_API_KEY: 'test-gemini-key' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/config/',
        'src/server.ts',
        'prisma/',
        'tests/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
