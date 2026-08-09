# 接続情報チェッカー

kojo が生成した Web アプリ（React UI + Hono API）。ページ表示時に `GET /api/whoami` でグローバル IP・接続元の国・送信ヘッダを取得して表示し、IP をクリップボードへコピーできる。状態なし API（バインディング・外部 API・永続化なし）。精密位置・ポート開放・履歴は対象外。

## 構成（実装）

- **UI 正本**: `index.html` + `src/ui/`
  - `App.tsx` — マウント時に `/api/whoami` を fetch。`loading | loaded | error`。不通時もタイトル骨格を維持
  - `IpCard.tsx` — IP 表示とコピー（成功時「コピーしました」）
  - `InfoRow.tsx` — 国など 1 行表示（`null` → 「不明」）
  - `HeaderList.tsx` — ヘッダ名/値のテーブル
  - `public/index.html` は `npm run build` の単一ファイル出力（直接編集しない）
- **API**: `src/worker/index.ts`（Hono）
  - `GET /api/health` → `{ ok: true }`
  - `GET /api/whoami` → `buildWhoami(req)` が返す `{ ip, country, headers }`（不足時は `null` で 200）
  - IP: `CF-Connecting-IP` / 国: `CF-IPCountry`（`XX`・`T1` は不明として `null`）/ ヘッダ: 受信ヘッダから `cf-*` を除外
- **テスト**: `tests/unit/*.test.ts`（vitest）、`tests/app.spec.ts`（Playwright）。雛形のスモークと health テストは削除しない

## 技術スタック（不変）

- TypeScript / React 19（ReactCompiler有効。状態管理ライブラリ禁止、リフトアップとprops受け渡しのみ） / Hono / Vite + vite-plugin-singlefile / vitest + Playwright
- UI の正本は `index.html` と `src/ui/`。`public/index.html` は単一ファイルのビルド出力（直接編集しない）
- 配信: Cloudflare Workers（main=`src/worker/index.ts`、assets=`public/`、/api/* が Worker に落ちる）
- 保守時もこのスタックを維持すること。フレームワーク・ビルドツール・宣言外ライブラリの導入は禁止

## 品質不変条件

壊したら公開・検証が落ちる。変更後は必ず `npm run verify` が通る状態を維持すること。

- **favicon**: `index.html` の `<head>` に `<link rel="icon" href="data:image/svg+xml,...">` のインライン data URI（外部ファイル・外部 URL 不可）
- **hub フッター**: React ルート（`#root`）の外に置く（JS が読めない環境でも描画される）。リンク先 `https://apps.jozo.beer` とリンクテキスト `apps.jozo.beer` は変えない。スタイルはテーマに合わせてよいが、背景とのコントラストを確保する

  ```html
  <footer style="margin-top:3rem;text-align:center;font-size:.8rem;opacity:.6">
    <a href="https://apps.jozo.beer" style="color:inherit">apps.jozo.beer</a>
  </footer>
  ```

- **API 契約**: `/api/*` は JSON のみ（HTML を返さない）。`GET /api/health` は 200 と `{"ok":true}` を維持。バインディング・外部 API・サーバ側永続化は使わない
- **UI 骨格**: API 不通（file:// 含む）でもタイトルとフッターを描画する
- **README.md** は削除しない。apple-touch-icon / manifest / og-image / robots / sitemap は公開基盤が生成するため、アプリ側では書かない

## 保守の進め方

1. 変更前に受け入れ条件をテストにする（API/ロジックは `tests/unit/*.test.ts`、ブラウザ挙動は `tests/app.spec.ts`）
2. 実装する（スタック不変・品質不変条件を守る）
3. `npm test` で通す（必要なら `npm run verify` も）
4. `git commit` & `git push`
5. `npm run deploy`

## ドキュメントの正

`PLAN.md` は初回実装時の計画（歴史的文書）である。現状の正は **README.md** と **テスト**（`tests/`）とする。仕様の根拠はテストと README を優先し、PLAN と食い違う場合はテスト/README に従う。
