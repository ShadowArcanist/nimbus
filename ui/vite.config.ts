import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const backendPort = process.env.PORT ?? '9000'
const backendTarget = `http://127.0.0.1:${backendPort}`

// Server version from the root Cargo.toml, embedded at build time
const cargoToml = readFileSync(fileURLToPath(new URL('../Cargo.toml', import.meta.url)), 'utf8')
const appVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1] ?? '0.0.0'

export default defineConfig({
  plugins: [sveltekit(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: {
    proxy: {
      '/api': backendTarget,
      '/healthz': backendTarget,
      '/readyz': backendTarget,
    },
  },
})
