#!/usr/bin/env node
// run after `vite build` to finalize the extension dist folder
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dist = resolve(__dirname, 'dist')

function copy(src, dest) {
  const destDir = dirname(dest)
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true })
  copyFileSync(src, dest)
  console.log(`Copied: ${dest}`)
}

// manifest
copy(resolve(__dirname, 'manifest.json'), resolve(dist, 'manifest.json'))

// background service worker
copy(resolve(__dirname, 'public/background.js'), resolve(dist, 'background.js'))

// rules.json
copy(resolve(__dirname, 'public/rules.json'), resolve(dist, 'rules.json'))

console.log('\n✅ Extension dist ready. Load the `dist/` folder in chrome://extensions')
