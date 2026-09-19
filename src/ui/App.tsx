import { useEffect, useState } from "react";
import { HeaderList } from "./HeaderList";
import { InfoRow } from "./InfoRow";
import { IpCard } from "./IpCard";
import type { WhoamiResponse } from "./types";
import "./app.css";

type Snapshot = {
  ip: WhoamiResponse["ip"];
  country: WhoamiResponse["country"];
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "loaded";
      current: WhoamiResponse;
      previous: Snapshot | null;
      refreshing: boolean;
      refreshError: string | null;
    };

const FETCH_ERROR_MESSAGE = "接続情報を取得できませんでした";

function Guide() {
  return (
    <div className="guide">
      <section className="guide__section" aria-labelledby="how-to-heading">
        <h2 id="how-to-heading" className="guide__title">
          使い方
        </h2>
        <ol className="guide__steps">
          <li>
            ページを開きます。操作は不要で、表示と同時に接続情報を取得します。
          </li>
          <li>
            グローバルIPと接続元の国を確認します。判定できないときは「不明」と出ます。
          </li>
          <li>コピーボタンでIPをクリップボードへ貼り付けできます。</li>
          <li>
            送信ヘッダの表で、ブラウザが送ったヘッダを確認できます。
          </li>
          <li>回線や VPN を切り替えたら再取得を押します。</li>
        </ol>
      </section>
      <section className="guide__section" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="guide__title">
          よくある質問
        </h2>
        <h3 className="guide__q">表示されるIPは何ですか？</h3>
        <p className="guide__a">
          いまインターネットへ出ている出口のグローバルIPです。VPNや回線を切り替えたあとの確認に使えます。
        </p>
        <h3 className="guide__q">
          接続元の国が「不明」になるのはなぜですか？
        </h3>
        <p className="guide__a">
          国を判定できないときです。Tor経由などは不明になります。このアプリが位置を推定することはありません。
        </p>
        <h3 className="guide__q">住所や過去の接続履歴は分かりますか？</h3>
        <p className="guide__a">
          分かりません。国コードまでで、精密な位置も履歴も扱いません。表示はいまの取得結果と、再取得したときの直前1件との比較だけです。
        </p>
      </section>
    </div>
  );
}

function isWhoamiResponse(value: unknown): value is WhoamiResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (typeof v.ip === "string" || v.ip === null) &&
    (typeof v.country === "string" || v.country === null) &&
    Array.isArray(v.headers)
  );
}

async function fetchWhoami(): Promise<WhoamiResponse> {
  const res = await fetch("/api/whoami");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json: unknown = await res.json();
  if (!isWhoamiResponse(json)) throw new Error("unexpected response");
  return json;
}

function ipChangeText(previous: string | null, current: string | null): string {
  if (previous === current) return "変化なし";
  return `IPが変わりました（前回 ${previous ?? "判定できません"}）`;
}

function countryChangeText(
  previous: string | null,
  current: string | null,
): string {
  if (previous === current) return "変化なし";
  return `国が変わりました（前回 ${previous ?? "不明"}）`;
}

export function App() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetchWhoami()
      .then((json) => {
        if (!cancelled) {
          setState({
            status: "loaded",
            current: json,
            previous: null,
            refreshing: false,
            refreshError: null,
          });
        }
      })
      .catch(() => {
        // file:// や API 停止でもタイトル骨格は描画し続ける
        if (!cancelled) {
          setState({
            status: "error",
            message: FETCH_ERROR_MESSAGE,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRefresh() {
    if (state.status !== "loaded" || state.refreshing) return;

    setState((prev) => {
      if (prev.status !== "loaded") return prev;
      return { ...prev, refreshing: true, refreshError: null };
    });

    try {
      const json = await fetchWhoami();
      setState((prev) => {
        if (prev.status !== "loaded") return prev;
        return {
          status: "loaded",
          current: json,
          previous: {
            ip: prev.current.ip,
            country: prev.current.country,
          },
          refreshing: false,
          refreshError: null,
        };
      });
    } catch {
      setState((prev) => {
        if (prev.status !== "loaded") return prev;
        return {
          ...prev,
          refreshing: false,
          refreshError: FETCH_ERROR_MESSAGE,
        };
      });
    }
  }

  return (
    <main className="app">
      <header className="app__hero">
        <p className="app__eyebrow">Connection Checker</p>
        <h1 className="app__title">接続情報チェッカー</h1>
        <p className="app__lead">
          いまのグローバルIP・接続元の国・送信ヘッダを、開いた瞬間に確認できます。
        </p>
      </header>

      {state.status === "loading" ? (
        <p className="app__status" role="status">
          取得中…
        </p>
      ) : null}

      {state.status === "error" ? (
        <p className="app__error" role="alert" data-testid="fetch-error">
          {state.message}
        </p>
      ) : null}

      {state.status === "loaded" ? (
        <>
          <button
            type="button"
            className="app__refresh"
            onClick={handleRefresh}
            disabled={state.refreshing}
          >
            再取得
          </button>
          {state.refreshError ? (
            <p className="app__error" role="alert" data-testid="fetch-error">
              {state.refreshError}
            </p>
          ) : null}
          <div className="app__body">
            <div>
              <IpCard ip={state.current.ip} />
              {state.previous ? (
                <p className="app__change" data-testid="ip-change">
                  {ipChangeText(state.previous.ip, state.current.ip)}
                </p>
              ) : null}
            </div>
            <div>
              <dl className="app__meta">
                <InfoRow label="接続元の国" value={state.current.country} />
              </dl>
              {state.previous ? (
                <p className="app__change" data-testid="country-change">
                  {countryChangeText(
                    state.previous.country,
                    state.current.country,
                  )}
                </p>
              ) : null}
            </div>
            <HeaderList headers={state.current.headers} />
          </div>
        </>
      ) : null}

      <Guide />
    </main>
  );
}
