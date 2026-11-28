import { cpSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/My-POS/',
  plugins: [
    react(),
    {
      name: 'prepare-github-pages-output',
      apply: 'build',
      writeBundle(options) {
        const outputDirectory = resolve(options.dir || 'dist')
        cpSync(resolve('icons'), resolve(outputDirectory, 'icons'), {
          recursive: true,
        })
        cpSync(resolve('sw.js'), resolve(outputDirectory, 'sw.js'))
        cpSync(
          resolve(outputDirectory, 'index.html'),
          resolve(outputDirectory, '404.html'),
        )
      },
    },
  ],
})
