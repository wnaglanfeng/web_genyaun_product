import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      '.fcv3.1473200263418811.cn-hangzhou.fc.devsapp.net',
    ],
  },
})
