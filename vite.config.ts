import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  server: {
    port: 9999,
  },
  plugins: [
    tsConfigPaths(),
    TanStackRouterVite(),
    viteReact(),
    tailwindcss(),
  ],
})