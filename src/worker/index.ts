import { Hono } from "hono";

export type WhoamiHeader = { name: string; value: string };

export type WhoamiResponse = {
  ip: string | null;
  country: string | null;
  headers: WhoamiHeader[];
};

/** Cloudflare が国を特定できないときに返すコード */
const UNKNOWN_COUNTRY_CODES = new Set(["XX", "T1"]);

/**
 * リクエストヘッダから whoami レスポンスを組み立てる純関数。
 * CF-Connecting-IP / CF-IPCountry は Cloudflare 付与。cf-* はクライアント送信ではないため除外する。
 */
export function buildWhoami(req: Request): WhoamiResponse {
  const ipHeader = req.headers.get("CF-Connecting-IP");
  const ip = ipHeader && ipHeader.length > 0 ? ipHeader : null;

  const rawCountry = req.headers.get("CF-IPCountry");
  const country =
    rawCountry &&
    rawCountry.length > 0 &&
    !UNKNOWN_COUNTRY_CODES.has(rawCountry.toUpperCase())
      ? rawCountry.toUpperCase()
      : null;

  const headers: WhoamiHeader[] = [];
  req.headers.forEach((value, name) => {
    if (name.startsWith("cf-")) return;
    headers.push({ name, value });
  });

  return { ip, country, headers };
}

const app = new Hono();

// 機械検証と監視が依存する。パスとレスポンス形を変えないこと
app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/whoami", (c) => c.json(buildWhoami(c.req.raw)));

export default app;
