import { expect, test } from "@playwright/test";

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
