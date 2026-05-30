import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Vite 設定：Vue 3 單檔元件 + 對 WebSocket 伺服器的開發代理
export default defineConfig({
  // 使用相對路徑，讓打包後的網站能放在任何子路徑下（例如 GitHub Pages 的 /guesswhat/）
  base: './',
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // 開發時把 /ws 代理到本地對決伺服器（npm run server）
      '/ws': {
        target: 'ws://localhost:8787',
        ws: true
      }
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js']
  }
})
