// vite.config.js

/**
 * 配置 Vite 开发服务器：
 * 1. server.host 监听所有网络接口
 * 2. server.hmr.host 使用外网 IP 进行 HMR 连接
 * 3. server.proxy 将 API 请求代理到后端服务
 * 4. 保持端口为 3000，与项目默认端口一致
 */
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',       // 简化注释：监听所有地址，允许局域网访问
    port: 3000,            // 简化注释：开发服务器端口
    hmr: {
      host: '117.50.179.83', // 简化注释：HMR WebSocket 连接使用的外网地址
      port: 3000             // 简化注释：HMR WebSocket 端口
    },

    // --- 新增的代理配置 ---
    proxy: {
      // 简化注释：将所有以 /human, /offer, /answer, /candidate 开头的请求代理到 8010 端口
      '/human': {
        target: 'http://127.0.0.1:8010', // 简化注释：目标后端服务地址
        changeOrigin: true,              // 简化注释：必须设置为 true
      },
      '/offer': {
        target: 'http://127.0.0.1:8010',
        changeOrigin: true,
      },
      '/answer': {
        target: 'http://127.0.0.1:8010',
        changeOrigin: true,
      },
      '/candidate': {
        target: 'http://127.0.0.1:8010',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')  // 简化注释：设置 @ 为 src 目录别名
    }
  }
});