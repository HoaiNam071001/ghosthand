import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // nội dung Hướng dẫn nằm ở internal/guide (go:embed bên Go) – frontend import thẳng (bước 51)
  server: { fs: { allow: ['..'] } },
})
