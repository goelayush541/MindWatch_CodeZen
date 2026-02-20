import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'mind-watch-code-zen-1xd1.vercel.app',
                changeOrigin: true,
                secure: false
            }
        }
    }
})
