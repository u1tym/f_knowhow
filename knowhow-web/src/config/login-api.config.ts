const fromEnv = import.meta.env.VITE_LOGIN_API_BASE_URL
const defaultBase = 'http://192.168.2.169:8000/api/auth'

function trimBase(url: string) {
  return url.trim().replace(/\/$/, '')
}

export const loginApiBaseUrl =
  typeof fromEnv === 'string' && fromEnv.trim() !== '' ? trimBase(fromEnv) : defaultBase
