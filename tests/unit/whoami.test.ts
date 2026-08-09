import { describe, expect, it } from "vitest";
import app, { buildWhoami } from "../../src/worker/index";

function requestWithHeaders(headers: Record<string, string>): Request {
  return new Request("https://example.com/api/whoami", { headers });
}

describe("buildWhoami", () => {
  it("CF-Connecting-IP から IP を取り出す", () => {
    const result = buildWhoami(
      requestWithHeaders({ "CF-Connecting-IP": "203.0.113.1" }),
    );
    expect(result.ip).toBe("203.0.113.1");
  });

  it("CF-Connecting-IP が無いとき ip は null", () => {
    const result = buildWhoami(requestWithHeaders({}));
    expect(result.ip).toBeNull();
  });

  it("CF-IPCountry から国コードを取り出す", () => {
    const result = buildWhoami(requestWithHeaders({ "CF-IPCountry": "JP" }));
    expect(result.country).toBe("JP");
  });

  it("CF-IPCountry が XX / T1 のとき country は null", () => {
    expect(
      buildWhoami(requestWithHeaders({ "CF-IPCountry": "XX" })).country,
    ).toBeNull();
    expect(
      buildWhoami(requestWithHeaders({ "CF-IPCountry": "T1" })).country,
    ).toBeNull();
  });

  it("CF-IPCountry が無いとき country は null", () => {
    expect(buildWhoami(requestWithHeaders({})).country).toBeNull();
  });

  it("受信ヘッダを name/value 配列で返し、cf-* は除外する", () => {
    const result = buildWhoami(
      requestWithHeaders({
        "User-Agent": "TestAgent/1.0",
        "Accept-Language": "ja",
        "CF-Connecting-IP": "203.0.113.1",
        "CF-IPCountry": "JP",
        "CF-Ray": "abc123",
      }),
    );
    expect(result.headers).toEqual(
      expect.arrayContaining([
        { name: "user-agent", value: "TestAgent/1.0" },
        { name: "accept-language", value: "ja" },
      ]),
    );
    expect(result.headers.every((h) => !h.name.startsWith("cf-"))).toBe(true);
  });
});

describe("GET /api/whoami", () => {
  it("200 と ip/country/headers を含む JSON を返す", async () => {
    const res = await app.request("/api/whoami", {
      headers: {
        "CF-Connecting-IP": "198.51.100.10",
        "CF-IPCountry": "US",
        "User-Agent": "Vitest",
      },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ip: "198.51.100.10",
      country: "US",
      headers: expect.any(Array),
    });
    expect(Array.isArray(body.headers)).toBe(true);
  });

  it("判定できない環境でも 200 と null を含む構造を維持する", async () => {
    const res = await app.request("/api/whoami");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ip: null,
      country: null,
      headers: expect.any(Array),
    });
  });
});
