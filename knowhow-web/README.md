# KNOWHOW管理（フロントエンド）

Vue 3 + TypeScript + Vite で動く、ノウハウ管理用のスマホ向け画面です。バックエンドの HTTP API と連携します。

## 必要な環境

- Node.js **18.0 以上**（Raspberry Pi 等でのビルドを想定。Vite は 5 系に固定してあり、Node 18 で動作します）
- npm

Vite 8 系は Node.js 20.19+ が必要なため、このプロジェクトでは Node 18 でもビルドできるよう **Vite 5** を使っています。Node を 20.19 以上に上げられる環境では、そのままで問題ありません。

## セットアップ

リポジトリ内の `knowhow-web` ディレクトリで依存関係をインストールします。

```bash
cd knowhow-web
npm install
```

## 起動方法

### 開発サーバー

```bash
npm run dev
```

ブラウザで表示された URL（通常は `http://localhost:5173`）を開きます。ファイルを保存するとホットリロードされます。

### 本番用ビルド

```bash
npm run build
```

成果物は `dist/` に出力されます。

### ビルド結果の確認

```bash
npm run preview
```

`dist/` の内容をローカルでプレビューします。API への接続先は **本番モード** のため、下記の環境変数 `VITE_KNOWHOW_API_BASE_URL`（またはコード内の既定 URL）が使われます。

## 環境変数（`.env`）

Vite では `VITE_` で始まる変数だけがクライアントに埋め込まれます。KNOWHOW 関連の名前は次のとおりです。

| 変数 | 説明 |
|------|------|
| `VITE_KNOWHOW_PROXY_TARGET` | **開発時のみ**。`npm run dev` で Vite が立てるプロキシの転送先 API サーバー（例: `http://192.168.2.169:9999`）。未設定時は `http://192.168.2.169:9999`。 |
| `VITE_KNOWHOW_API_BASE_URL` | **本番ビルド・preview、または開発でプロキシを切ったとき**の API のベース URL。末尾の `/` は有ってもなくてもよいです。 |
| `VITE_KNOWHOW_USE_DEV_PROXY` | 開発時に `false` にすると、プロキシを使わず `VITE_KNOWHOW_API_BASE_URL`（未設定なら既定の直 URL）へブラウザから直接リクエストします。**その場合、API 側の CORS 設定が必要**です。 |

テンプレートとして `.env.example` を参照し、必要に応じて `.env` を作成してください（`.env` は Git に含めない想定です）。

### 開発時の API 接続の考え方

- **既定**: ブラウザ → 同一オリジンの `/knowhow-proxy/...` → Vite が `VITE_KNOWHOW_PROXY_TARGET` へ転送。CORS を気にせず開発しやすい構成です。
- **直結**: `.env` に `VITE_KNOWHOW_USE_DEV_PROXY=false` を指定し、API を直接指定します。

## API 仕様

HTTP API のパス・JSON 形式は、リポジトリ直下の **`SPECIFICATION_JA.md`**（データベース・HTTP API 仕様）に従います。

補足: 仕様書に **ノウハウの新規作成（POST）** が載っていない場合でも、画面上の「ノウハウ追加」は慣例的なパスを呼び出す実装になっています。サーバーが未実装のときはエラーになります。

## ヘッダー画像

次のファイルを **`public/images/`** に配置してください。

- `PORTAL.jpg`
- `KNOWHOW.jpg`
- `CONFIG.jpg`

画像は画面上で円形に切り抜いて表示されます。ファイルが無いと画像が壊れて見えます。

## 画面からの遷移

- **PORTAL** アイコン: 相対パス **`../m.html`** へ遷移します（デプロイ先の URL 階層に合わせて必要なら `App.vue` 内の `href` を変更してください）。

## トラブルシューティング

- **API に届かない・CORS エラー**  
  開発ではプロキシ有効（既定）のままにするか、API サーバーでブラウザのオリジンを許可してください。
- **ビルドエラー**  
  `npm run build` は `vue-tsc` で型チェック後に Vite がビルドします。TypeScript エラーを解消してください。

## 技術スタック

- Vue 3（Composition API、`script setup`）
- TypeScript
- Vite 5（Node.js 18 互換のため 8 系は使用していません）
