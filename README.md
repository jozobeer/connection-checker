# 接続情報チェッカー

ページを開くと `GET /api/whoami` から自分のグローバル IP・接続元の国・送信 HTTP ヘッダを取得し、一覧表示する単一ページの Web アプリ。IP はコピーボタンでクリップボードに貼り付けできる。VPN 確認や回線切替のたびに「いまの出口 IP」をすぐ確かめるための道具で、精密位置情報・ポート開放チェック・履歴保存はしない。

## できること

- 開いた瞬間にグローバル IP を自動表示（操作不要）
- 接続元の国を表示（判定不能時は「不明」）
- ブラウザが送った主要ヘッダ（User-Agent・Accept-Language など）をテーブル表示
- IP のワンクリックコピーと「コピーしました」フィードバック
- API 不通時でもタイトルと `apps.jozo.beer` フッターは描画

## API

| パス | 応答 |
|------|------|
| `GET /api/whoami` | `{ ip, country, headers }`（判定不能な値は `null`。常に 200） |
| `GET /api/health` | `{ "ok": true }` |

IP / 国は Cloudflare 付与ヘッダ（`CF-Connecting-IP` / `CF-IPCountry`）から取得。`cf-*` 系ヘッダはクライアント送信ではないため一覧から除外する。

## 公開URL

https://connection-checker.jozo.beer

## 開発

[kojo](https://github.com/jozobeer/kojo)（1日1アプリ自動生成基盤）により生成されたリポジトリです。

初回セットアップ: `npm install`（Playwright ブラウザ未取得の環境では `npx playwright install chromium`）

- `npm run dev` — wrangler dev でローカル起動（http://127.0.0.1:8787）
- `npm test` — build → typecheck → vitest（ユニット）→ Playwright（E2E）
- `npm run verify` — 不変条件チェック（favicon / apps.jozo.beer フッター / 単一ファイル出力）
- `npm run deploy` — ビルドして Cloudflare Workers へデプロイ

## 構成

- `index.html` + `src/ui/` — React UI の正本（`App` / `IpCard` / `InfoRow` / `HeaderList`。`public/index.html` はビルド出力）
- `src/worker/index.ts` — Hono の Worker（`/api/health`・`/api/whoami`。状態なし）
- `tests/unit/` — vitest（`buildWhoami`・health）、`tests/app.spec.ts` — Playwright E2E
- `PLAN.md` — 初回実装時の計画（歴史的文書。現状の正は本 README とテスト）
