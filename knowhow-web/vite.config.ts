import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget =
    env.VITE_KNOWHOW_PROXY_TARGET?.trim() || 'http://192.168.2.169:9999'

  return {
    plugins: [vue()],
    server: {
      proxy: {
        '/knowhow-proxy': {
          target: proxyTarget.replace(/\/$/, ''),
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/knowhow-proxy/, '') || '/',
        },
      },
    },
  }
})
