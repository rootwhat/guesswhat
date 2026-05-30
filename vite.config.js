import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Vite 設定：Vue 3 單檔元件 + 對 WebSocket 伺服器的開發代理
export default defineConfig({
  // GitHub Pages 專案頁面位於 /guesswhat/ 子路徑，用絕對 base 才能在有/無結尾斜線時都正確載入資源
  base: '/guesswhat/',
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
