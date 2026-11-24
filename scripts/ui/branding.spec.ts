import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import fs, { readFileSync } from "node:fs";
import path from "node:path";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
};

const wordmark = new URL("../../assets/img/logo/xconda-wordmark-official.png", import.meta.url);
const wordmarkInk = new URL("../../assets/img/logo/xconda-wordmark-ink.png", import.meta.url);

/**
 * 이 저장소 자산은 **원본 도메인 절대 주소**로도 요청됩니다.
 * 앱은 `/hub/`(제품 사이트 프록시) 아래에서 로컬 커버를 `https://hub.xconda.ai/assets/…`
 * 로 부릅니다 — 프록시가 `/hub/assets/*` 를 넘겨주지 않기 때문입니다(2026-11-17).
 * 테스트는 외부 요청을 막아 두므로, 그 자산 요청만 로컬 파일로 응답해 실제 배포와 같게 만듭니다.
 * (노션·미디어 서버처럼 진짜 외부인 주소는 계속 차단 — 그게 실패 경로를 검증합니다)
 */
const HUB_ORIGIN = "https://hub.xconda.ai/";
const ROOT = new URL("../../", import.meta.url).pathname;
const LOCAL_ASSET = /^assets\/(img|app\.(?:js|css)|i18n-paths\.json)/;

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (["127.0.0.1", "localhost"].includes(url.hostname)) return route.continue();
    if (url.origin === HUB_ORIGIN.slice(0, -1)) {
      const rel = url.pathname.replace(/^\/+/, "");
      if (LOCAL_ASSET.test(rel)) {
        const file = path.join(ROOT, rel);
        if (fs.existsSync(file)) {
          return route.fulfill({
            status: 200,
            contentType: MIME[path.extname(file)] ?? "application/octet-stream",
            body: fs.readFileSync(file),
          });
        }
      }
    }
    return route.abort();
  });
  await page.addInitScript(() => localStorage.setItem("xconda-lang", "ko"));
  await page.goto("/dev.html");
  await expect(page.locator("[data-featured-notice]")).toBeVisible();
});

test("featured notice cover fills the card without cropping at every breakpoint", async ({ page }) => {
  const card = page.locator("[data-featured-notice]");
  const image = card.locator("img");
  await card.scrollIntoViewIfNeeded();
  await expect(image).toHaveAttribute("src", /assets\/img\/covers\//);
  // 프록시(/hub/) 아래에서는 원본 도메인 절대 주소로 옵니다 — 파일 경로는 같습니다.
  await expect(image).toHaveAttribute("src", /^(?:https:\/\/hub\.xconda\.ai\/)?\.?\/?assets\/img\/covers\//);
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  for (const width of [320, 390, 467, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const cardBox = (await card.boundingBox())!;
    const mediaBox = (await card.locator("[data-card-cover]").boundingBox())!;
    const imageBox = (await image.boundingBox())!;
    // A 1px border is the only inset; no padding/max-width/negative-margin gap.
    expect(Math.abs(mediaBox.x - cardBox.x - 1)).toBeLessThan(1);
    expect(Math.abs(mediaBox.width - (cardBox.width - 2))).toBeLessThan(1);
    expect(imageBox.width).toBeCloseTo(mediaBox.width, 1);
    expect(imageBox.height).toBeCloseTo(mediaBox.height, 1);
    const naturalRatio = await image.evaluate((img: HTMLImageElement) => img.naturalWidth / img.naturalHeight);
    expect(imageBox.width / imageBox.height).toBeCloseTo(naturalRatio, 2);
    await expect(image).toHaveCSS("object-fit", "contain");
    await card.hover();
    await expect(image).toHaveCSS("transform", "none");
    await expect(card.locator("[data-card-title]")).toHaveCSS("font-weight", "700");
  }
  for (const selector of ["#blog [data-card-title]", "#news [data-card-title]", "#top h1", "#guides h3"]) {
    await expect(page.locator(selector).first()).toHaveCSS("font-weight", "700");
  }
  await card.click();
  await expect(page.locator("#article-title")).toHaveCSS("font-weight", "700");
  await expect(page.locator("[data-article-cover] img")).toHaveCSS("object-fit", "contain");
});

test("header and footer show the supplied wordmark artwork", async ({ page }) => {
  // 대표 제공 원본(흰색)은 그대로 보관하고, 밝은 화면에는 같은 도안의 잉크색 사본을 씁니다.
  expect(createHash("sha256").update(readFileSync(wordmark)).digest("hex"))
    .toBe("37af2c10459010812eb9d733dd30ba61dbd8bf31aa75c388a2e42fa1f984c501");
  expect(createHash("sha256").update(readFileSync(wordmarkInk)).digest("hex"))
    .toBe("578e9584d7d736d5fc95c8e78a26ac5f9d97a8b06a5fd6ff64ad6355ac2226f3");

  const logos = page.locator("[data-brand-logo]");
  await expect(logos).toHaveCount(2); // 헤더 + 푸터
  for (const logo of await logos.all()) {
    const img = logo.locator("img[data-brand-wordmark]");
    await expect(img).toHaveAttribute("src", /assets\/img\/logo\/xconda-wordmark-ink\.png$/);
    await expect(img).toHaveAttribute("alt", "Xconda");
    // 원본 비율(268×64)이 그대로 유지되어야 합니다 — 글자가 찌그러지면 안 됩니다.
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => [el.naturalWidth, el.naturalHeight]))
      .toEqual([268, 64]);
    const box = (await img.boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(268 / 64, 2);
  }
});

test("failed notice covers keep their full-width media area", async ({ page }) => {
  await page.route("**/assets/img/covers/**", (route) => route.abort());
  await page.route("https://hub.xconda.ai/assets/img/covers/**", (route) => route.abort());
  await page.reload();
  const cover = page.locator("[data-featured-notice] [data-card-cover]");
  await cover.scrollIntoViewIfNeeded();
  await expect(cover.locator("img")).toHaveCount(0);
  await expect(cover.locator("svg")).toBeVisible();
  const box = (await cover.boundingBox())!;
  expect(box.width / box.height).toBeCloseTo(1200 / 630, 2);
});

test("neutral editorial surfaces match the approved light design without yellow backgrounds", async ({ page }) => {
  await expect(page.locator('#top[data-home-design="neutral-editorial"]')).toBeVisible();
  await expect(page.locator("#top")).toHaveCSS("background-color", "rgb(244, 243, 240)");
  await expect(page.locator("#top")).toHaveCSS("background-image", "none");
  for (const selector of ["[data-hub-hero-nav]", "[data-featured-guide]", "[data-featured-notice]"]) {
    await expect(page.locator(selector)).toHaveCSS("background-color", "rgb(255, 255, 255)");
  }
  await expect(page.locator("#top form button")).toHaveCSS("color", "oklch(0.145 0 0)");
  const cover = page.locator("[data-featured-guide] img");
  await expect(cover).toHaveCSS("object-fit", "contain");
  await page.locator("[data-featured-guide]").hover();
  await expect(cover).toHaveCSS("transform", "none");
  // A single connected, equal-width navigation band on desktop.
  const links = await page.locator("[data-hub-hero-nav] a").all();
  const first = (await links[0].boundingBox())!;
  await expect(links[0]).toHaveCSS("border-left-width", "0px");
  for (const link of links.slice(1)) await expect(link).toHaveCSS("border-left-width", "1px");
  for (const link of links) {
    const box = (await link.boundingBox())!;
    expect(box.y).toBeCloseTo(first.y, 0);
    expect(box.width).toBeCloseTo(first.width, 0);
  }
});

test("neutral homepage retains readable responsive layouts in all four locales", async ({ page }) => {
  for (const locale of ["ko", "en", "ja", "zh-CN"]) {
    await page.evaluate((lang) => localStorage.setItem("xconda-lang", lang), locale);
    await page.reload();
    await expect(page.locator("[data-featured-notice]")).toBeVisible();
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      for (const el of await page.locator("#top h1, #top form, [data-hub-hero-nav] a, [data-featured-notice], #notices [role=tablist]").all()) {
        const box = (await el.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      }
    }
  }
});
