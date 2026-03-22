/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KNOWHOW_API_BASE_URL?: string
  /** 開発プロキシの転送先（vite.config と表示用） */
  readonly VITE_KNOWHOW_PROXY_TARGET?: string
  /** 'false' のとき開発でもプロキシを使わず VITE_KNOWHOW_API_BASE_URL / 既定 URL へ直接接続 */
  readonly VITE_KNOWHOW_USE_DEV_PROXY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
