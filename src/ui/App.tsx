import { useEffect, useState } from "react";
import { HeaderList } from "./HeaderList";
import { InfoRow } from "./InfoRow";
import { IpCard } from "./IpCard";
import type { WhoamiResponse } from "./types";
import "./app.css";

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; data: WhoamiResponse }
  | { status: "error"; message: string };

function isWhoamiResponse(value: unknown): value is WhoamiResponse {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (typeof v.ip === "string" || v.ip === null) &&
    (typeof v.country === "string" || v.country === null) &&
    Array.isArray(v.headers)
  );
}

export function App() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/whoami")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: unknown = await res.json();
        if (!isWhoamiResponse(json)) throw new Error("unexpected response");
        if (!cancelled) setState({ status: "loaded", data: json });
      })
      .catch(() => {
        // file:// や API 停止でもタイトル骨格は描画し続ける
        if (!cancelled) {
          setState({
            status: "error",
            message: "接続情報を取得できませんでした",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
        <div className="app__body">
          <IpCard ip={state.data.ip} />
          <dl className="app__meta">
            <InfoRow label="接続元の国" value={state.data.country} />
          </dl>
          <HeaderList headers={state.data.headers} />
        </div>
      ) : null}
    </main>
  );
}
