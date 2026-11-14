/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { allTimes, APP_URL, buildIcs, DEFAULT_REMINDERS, icsPath } from './src/reminders.ts'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

/**
 * Publishes a calendar file for every reminder at every time it can be set to.
 * See src/reminders.ts for why these have to be real files on the site.
 */
function reminderFiles(): Plugin {
  return {
    name: 'reminder-files',
    generateBundle() {
      const now = new Date()
      for (const reminder of DEFAULT_REMINDERS) {
        for (const time of allTimes()) {
          this.emitFile({
            type: 'asset',
            fileName: icsPath(reminder.id, time),
            source: buildIcs({ ...reminder, time }, APP_URL, now),
          })
        }
      }
    },
  }
}

export default defineConfig({
  // Relative paths so the same build works on any host and inside a native wrapper later.
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    reminderFiles(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'The Cave',
        short_name: 'The Cave',
        description: 'Habits, discipline and growth. Enter the cave, come out stronger.',
        theme_color: '#171412',
        background_color: '#171412',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Calendar files must come from the network as files, never the app shell.
        navigateFallbackDenylist: [/\/reminders\//],
      },
    }),
  ],
  test: { environment: 'node' },
})
