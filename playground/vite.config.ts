import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  root: './playground',
  plugins: [react(), tailwindcss()],
  envDir: '../',
})
