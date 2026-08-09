# PLAN — 接続情報チェッカー

## 1. 概要

自分のグローバルIPアドレス・接続元の国・ブラウザが実際に送信しているHTTPヘッダを、サーバ側API（`GET /api/whoami`）で取得して一覧表示する単一ページのWebアプリを作る。ページを開いた瞬間に接続情報が自動表示され、IPアドレスはボタン一つでクリップボードにコピーできる。表示とコピーに機能を絞り、精密位置情報・ポート開放チェック・履歴保存は実装しない。

## 2. 意図（明示）

VPNの接続確認や回線切替・IP申請のたびに「今の自分のグローバルIP」を確かめたい人が、開いた瞬間に見るための道具。グローバルIPはサーバに聞かないと分からない（クライアント単体では取得不能）ことがサーバAPIの存在理由。表示とコピーに絞り、精密位置情報・ポート開放チェック・履歴保存はやらない。

## 3. 受け入れ条件

- [ ] ページを開くと `/api/whoami` が返すグローバルIPアドレスが自動で表示される（ユーザー操作なしで取得・表示される）
- [ ] 接続元の国が表示され、判定できない場合は「不明」である旨が表示される
- [ ] ブラウザが送信している主要なHTTPヘッダ（User-Agent・Accept-Language を含む）が一覧表示される
- [ ] IPアドレスの隣のボタンを1回押すとIPアドレスがクリップボードにコピーされ、コピー完了のフィードバックが表示される
- [ ] `GET /api/whoami` は IP・国・ヘッダ一覧を含むJSONを返し、IPや国が判定できない環境でも 200 とJSON構造を維持する（値は null）
- [ ] `GET /api/health` は 200 と `{"ok":true}` を返し続ける／APIに到達できない環境（file:// 表示）でもタイトルとフッターが描画される

## 4. 実装方針

### API — `src/worker/index.ts`（Hono / Cloudflare Workers）

既存の Hono アプリに `GET /api/whoami` を追加する。状態なし・バインディングなし・外部API不使用（AGENTS.md の制約どおり）。

- **IP取得**: Cloudflare が付与する `CF-Connecting-IP` リクエストヘッダから読む。無ければ `null`
- **国判定**: `CF-IPCountry` ヘッダ（無ければ `null`。`"XX"`/`"T1"` など不明系の値も `null` に正規化）
- **ヘッダ一覧**: 受信リクエストの全ヘッダを `{ name, value }` の配列で返す。ただし Cloudflare が内部的に付ける `cf-*` 系はクライアントが「実際に送った」ヘッダではないため除外する
- **レスポンス形**:

  ```json
  { "ip": "203.0.113.1", "country": "JP", "headers": [{ "name": "user-agent", "value": "..." }] }
  ```

- 主要関数: `buildWhoami(req: Request): WhoamiResponse` — リクエストからレスポンスJSONを組み立てる純関数。vitest で直接テストする
- `GET /api/health` は現状のまま変更しない

### UI — `index.html` + `src/ui/`（React 19 / 状態管理はリフトアップのみ）

- **`App.tsx`**: マウント時に `useEffect` で `/api/whoami` を fetch し、`useState` で `loading | loaded | error` の3状態を持つ。到達不能でもタイトルは描画し、エラーメッセージのみ差し替える
- **コンポーネント構成**（props受け渡しのみ、全て `src/ui/` 内）:
  - `IpCard` — IPアドレスを大きく表示＋コピーボタン。`navigator.clipboard.writeText` でコピーし、成功時に「コピーしました」を数秒表示（`useState` のローカル状態）
  - `InfoRow` — 国などのラベル・値の1行表示。値が `null` なら「判定できません」を表示
  - `HeaderList` — ヘッダ名と値のテーブル表示
- **レイアウト**: 中央寄せ1カラム。最上部にIPカード（このアプリの主役なので開いた瞬間に目に入る大きさ）、その下に国、最後にヘッダ一覧。ダーク系のネットワークツール調テーマ
- **`index.html`**: favicon（テーマに合うSVGのインライン data URI）と、`#root` 外の hub フッター（AGENTS.md 指定のマークアップ）を含める

### テスト

- `tests/unit/whoami.test.ts`（vitest）: `buildWhoami` のIP/国/ヘッダ抽出、`cf-*` 除外、不明時の `null` 正規化、`/api/whoami` のステータスとJSON形。既存の health テストは残す
- `tests/app.spec.ts`（Playwright）: 自動表示（IP・国・ヘッダ一覧の描画）、コピーボタンの動作とフィードバック表示、API不達時の骨格描画。既存スモークテストは残す

### 完了確認

`npm run verify` と `npm test` が通ること。
