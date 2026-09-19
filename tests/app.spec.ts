import { expect, test, type Page } from "@playwright/test";

// 雛形スモーク。builder は受け入れ条件ごとの機能テストをこのファイルに追記する（雛形は削除しない）
test("ページがロードできてページエラーがない", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  expect(errors).toEqual([]);
});

test("GET /api/health が 200 で ok:true を返す", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});

const sampleWhoami = {
  ip: "203.0.113.1",
  country: "JP",
  headers: [
    { name: "user-agent", value: "PlaywrightTest/1.0" },
    { name: "accept-language", value: "ja,en;q=0.8" },
  ],
};

test("ページを開くと whoami のグローバルIP・国・ヘッダが一覧表示される", async ({
  page,
}) => {
  await page.route("**/api/whoami", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sampleWhoami),
    });
  });

  await page.goto("/");

  await expect(page.getByTestId("ip-address")).toHaveText("203.0.113.1");
  await expect(page.getByTestId("info-接続元の国")).toHaveText("JP");
  await expect(page.getByTestId("header-list")).toContainText("user-agent");
  await expect(page.getByTestId("header-list")).toContainText(
    "PlaywrightTest/1.0",
  );
  await expect(page.getByTestId("header-list")).toContainText(
    "accept-language",
  );
});

test("国が判定できない場合は不明と表示される", async ({ page }) => {
  await page.route("**/api/whoami", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...sampleWhoami, country: null }),
    });
  });

  await page.goto("/");
  await expect(page.getByTestId("info-接続元の国")).toHaveText("不明");
});

test("コピーボタンでIPをクリップボードにコピーしフィードバックを表示する", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.route("**/api/whoami", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sampleWhoami),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "IPアドレスをコピー" }).click();

  await expect(page.getByTestId("copy-feedback")).toHaveText("コピーしました");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "203.0.113.1",
  );
});

test("APIに到達できなくてもタイトルとフッターが描画される", async ({
  page,
}) => {
  await page.route("**/api/whoami", (route) => route.abort());

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "接続情報チェッカー" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "apps.jozo.beer" }),
  ).toBeVisible();
  await expect(page.getByTestId("fetch-error")).toBeVisible();
});

function jsonLdNodes(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.flatMap(jsonLdNodes);
  }
  if (typeof value !== "object" || value === null) {
    return [];
  }
  const node = value as Record<string, unknown>;
  const nested = node["@graph"] !== undefined ? jsonLdNodes(node["@graph"]) : [];
  return [node, ...nested];
}

test("公開HTMLに空でない meta description がある", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /\S/,
  );
});

test("JSON-LD に WebApplication の必須フィールドがある", async ({ page }) => {
  await page.goto("/");
  const scripts = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  expect(scripts.length).toBeGreaterThan(0);

  const nodes = scripts.flatMap((text) => jsonLdNodes(JSON.parse(text)));
  const app = nodes.find((node) => {
    const type = node["@type"];
    const types = Array.isArray(type) ? type : [type];
    return types.includes("WebApplication");
  });

  expect(app).toBeDefined();
  expect(String(app?.name ?? "").trim()).not.toBe("");
  expect(String(app?.description ?? "").trim()).not.toBe("");
  expect(String(app?.url ?? "").trim()).not.toBe("");
  expect(String(app?.applicationCategory ?? "").trim()).not.toBe("");

  const offers = app?.offers;
  const offerList = Array.isArray(offers) ? offers : [offers];
  const hasFreePrice = offerList.some(
    (offer) =>
      typeof offer === "object" &&
      offer !== null &&
      String((offer as Record<string, unknown>).price) === "0",
  );
  expect(hasFreePrice).toBe(true);
});

test("使い方とよくある質問の見出しがDOM上にある", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "使い方" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "よくある質問" }),
  ).toBeVisible();
});

test("GET /api/whoami が IP・国・ヘッダを含む JSON を 200 で返す", async ({
  request,
}) => {
  const res = await request.get("/api/whoami");
  expect(res.status()).toBe(200);
  const body = await res.json();
  // null も正規の値（expect.anything() は null にマッチしない）
  expect(Object.keys(body).sort()).toEqual(["country", "headers", "ip"]);
  expect(body.ip === null || typeof body.ip === "string").toBe(true);
  expect(body.country === null || typeof body.country === "string").toBe(true);
  expect(Array.isArray(body.headers)).toBe(true);
});

const whoamiFirst = {
  ip: "203.0.113.5",
  country: "JP",
  headers: [
    { name: "user-agent", value: "PlaywrightTest/1.0" },
    { name: "accept-language", value: "ja,en;q=0.8" },
  ],
};

const whoamiChanged = {
  ip: "198.51.100.7",
  country: "US",
  headers: [{ name: "user-agent", value: "PlaywrightTest/2.0" }],
};

async function stubWhoamiSequence(
  page: Page,
  responses: Array<object | "abort">,
) {
  let i = 0;
  await page.route("**/api/whoami", async (route) => {
    const next = responses[Math.min(i, responses.length - 1)];
    i += 1;
    if (next === "abort") {
      await route.abort();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(next),
    });
  });
}

test("再取得すると新しいIP・国を表示し前回からの変化を示す", async ({
  page,
}) => {
  await stubWhoamiSequence(page, [whoamiFirst, whoamiChanged]);

  await page.goto("/");
  await expect(page.getByTestId("ip-address")).toHaveText("203.0.113.5");

  await page.getByRole("button", { name: "再取得" }).click();

  await expect(page.getByTestId("ip-address")).toHaveText("198.51.100.7");
  await expect(page.getByTestId("info-接続元の国")).toHaveText("US");
  await expect(page.getByTestId("ip-change")).toHaveText(
    "IPが変わりました（前回 203.0.113.5）",
  );
  await expect(page.getByTestId("country-change")).toHaveText(
    "国が変わりました（前回 JP）",
  );
});

test("再取得してもIPと国が同じなら変化なしと示す", async ({ page }) => {
  await stubWhoamiSequence(page, [whoamiFirst, whoamiFirst]);

  await page.goto("/");
  await expect(page.getByTestId("ip-address")).toHaveText("203.0.113.5");

  await page.getByRole("button", { name: "再取得" }).click();

  await expect(page.getByTestId("ip-address")).toHaveText("203.0.113.5");
  await expect(page.getByTestId("ip-change")).toHaveText("変化なし");
  await expect(page.getByTestId("country-change")).toHaveText("変化なし");
});

test("比較は初回取得直後とリロード後には出ない", async ({ page }) => {
  await stubWhoamiSequence(page, [whoamiFirst, whoamiChanged]);

  await page.goto("/");
  await expect(page.getByTestId("ip-address")).toHaveText("203.0.113.5");
  await expect(page.getByTestId("ip-change")).toHaveCount(0);
  await expect(page.getByTestId("country-change")).toHaveCount(0);

  await page.getByRole("button", { name: "再取得" }).click();
  await expect(page.getByTestId("ip-change")).toHaveCount(1);
  await expect(page.getByTestId("country-change")).toHaveCount(1);

  await page.reload();
  await expect(page.getByTestId("ip-change")).toHaveCount(0);
  await expect(page.getByTestId("country-change")).toHaveCount(0);
  await expect(page.getByText("IPが変わりました")).toHaveCount(0);
});

test("再取得が失敗しても直前の表示を残し比較は出さない", async ({ page }) => {
  await stubWhoamiSequence(page, [whoamiFirst, "abort"]);

  await page.goto("/");
  await expect(page.getByTestId("ip-address")).toHaveText("203.0.113.5");
  await expect(page.getByTestId("info-接続元の国")).toHaveText("JP");
  await expect(page.getByTestId("header-list")).toBeVisible();
  await expect(page.getByTestId("header-list")).toContainText("user-agent");
  await expect(page.getByTestId("header-list")).toContainText(
    "PlaywrightTest/1.0",
  );

  await page.getByRole("button", { name: "再取得" }).click();

  await expect(page.getByTestId("ip-address")).toHaveText("203.0.113.5");
  await expect(page.getByTestId("info-接続元の国")).toHaveText("JP");
  await expect(page.getByTestId("header-list")).toBeVisible();
  await expect(page.getByTestId("header-list")).toContainText(
    "PlaywrightTest/1.0",
  );
  await expect(page.getByTestId("fetch-error")).toHaveText(
    "接続情報を取得できませんでした",
  );
  await expect(page.getByTestId("ip-change")).toHaveCount(0);
  await expect(page.getByTestId("country-change")).toHaveCount(0);
});
