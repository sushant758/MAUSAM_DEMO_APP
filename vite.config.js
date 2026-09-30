import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/MAUSAM_DEMO_APP/',
  plugins: [react(), tailwindcss()],

  // ── A8: Vitest configuration ──────────────────────────────────────────────
  test: {
    environment: 'jsdom',             // DOM APIs in tests
    globals: true,                    // describe / it / expect without imports
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/engine/**', 'src/lib/**', 'src/i18n/**'],
    },
  },
})
