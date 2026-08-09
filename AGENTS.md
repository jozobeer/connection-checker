# 接続情報チェッカー

このリポジトリは kojo が生成した Web アプリです（React UI + Hono API）。

## アイデア

# 接続情報チェッカー

自分のグローバルIPアドレス・接続元の国・ブラウザが実際に送っているHTTPヘッダを、サーバ側API（/api/whoami）で取得して表示するアプリ。

## 意図

VPNの接続確認や回線切替・IP申請のたびに「今の自分のグローバルIP」を確かめたい人が、開いた瞬間に見るための道具。グローバルIPはサーバに聞かないと分からない（クライアント単体では取得不能）ことがサーバAPIの存在理由。表示とコピーに絞り、精密位置情報・ポート開放チェック・履歴保存はやらない。

## 受け入れ条件の種

- ページを開くと /api/whoami が返すグローバルIPアドレスが自動で表示される
- 接続元の国と主要な送信ヘッダ（User-Agent・Accept-Language など）が一覧表示される（判定できない項目はその旨を表示する）
- IPアドレスをボタン一つでクリップボードにコピーできる


## 技術スタック（不変）

- TypeScript / React 19（ReactCompiler有効。状態管理ライブラリ禁止、リフトアップとprops受け渡しのみ） / Hono / Vite + vite-plugin-singlefile / vitest + Playwright
- UI の正本は `index.html` と `src/ui/`。`public/index.html` は単一ファイルのビルド出力（直接編集しない）
- 配信: Cloudflare Workers（main=`src/worker/index.ts`、assets=`public/`、/api/* が Worker に落ちる）
- 保守時もこのスタックを維持すること。フレームワーク・ビルドツール・宣言外ライブラリの導入は禁止

## 制約

- サーバは src/worker/index.ts の Hono アプリ。/api/* の JSON のみを提供し、HTML を返さない
- バインディング（KV/D1/DO）・外部 API・サーバ側の永続化は使わない（状態なし API）
- GET /api/health は 200 と {"ok":true} を返し続けること（機械検証が依存。壊さない）
- UI は API に到達できなくても骨格（タイトル・フッター）を描画すること（視覚検証は file:// で行われる）
- 受け入れ条件のテスト: API/ロジックは tests/unit/*.test.ts（vitest）、ブラウザ挙動は tests/app.spec.ts（Playwright）に書く
- PLAN.md の受け入れ条件それぞれに対応するテストを書き、`npm test` が通ること。API/ロジックは `tests/unit/*.test.ts`（vitest）、ブラウザ挙動は `tests/app.spec.ts`（Playwright）。雛形のスモークテストと health テストは削除しない
- UI の正本は `index.html` と `src/ui/`。`public/` は `npm run build` の出力なので直接編集しない
- favicon は `index.html` の `<head>` に `<link rel="icon" href="data:image/svg+xml,...">` のインライン data URI で含める（外部ファイル・外部URL不可。アプリのテーマに合った絵柄にする）
- hub（apps.jozo.beer）へのフッター導線は `index.html` の React ルート（`#root`）の外に置く（JS が読めない環境でも描画されるため）。マークアップは次のとおり固定する:

  ```html
  <footer style="margin-top:3rem;text-align:center;font-size:.8rem;opacity:.6">
    <a href="https://apps.jozo.beer" style="color:inherit">apps.jozo.beer</a>
  </footer>
  ```

  スタイル（リンク色を含む）はアプリのテーマに合わせて調整してよいが、リンク先 `https://apps.jozo.beer` とリンクテキスト `apps.jozo.beer` は変えない。リンク色を変える場合は背景とのコントラストを確保すること
- README.md はテンプレートが生成済み。削除しないこと
- apple-touch-icon / manifest / og-image / robots / sitemap は factory が公開時に自動生成するため、builder は書かない
- 完成条件: PLAN.md の受け入れ条件をすべて満たし、`npm run verify` と `npm test` が通ること
