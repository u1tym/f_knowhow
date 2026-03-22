/**
 * 開発時: 既定で同一オリジン上の /knowhow-proxy 経由（Vite が API サーバーへ転送）。CORS 回避用。
 * VITE_KNOWHOW_USE_DEV_PROXY=false で直接 URL に切り替え（ブラウザから API へ直叩き・CORS 要確認）。
 *
 * 本番・preview: VITE_KNOWHOW_API_BASE_URL または既定の直 URL。
 */
const fromEnv = import.meta.env.VITE_KNOWHOW_API_BASE_URL
const defaultDirect = 'http://192.168.2.169:9999'

function trimBase(url: string) {
  return url.trim().replace(/\/$/, '')
}

const useDevProxy =
  import.meta.env.DEV && import.meta.env.VITE_KNOWHOW_USE_DEV_PROXY !== 'false'

export const knowhowApiBaseUrl = useDevProxy
  ? '/knowhow-proxy'
  : typeof fromEnv === 'string' && fromEnv.trim() !== ''
    ? trimBase(fromEnv)
    : defaultDirect
