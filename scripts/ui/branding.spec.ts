import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const wordmark = new URL("../../assets/img/logo/xconda-wordmark-official.png", import.meta.url);

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => ["127.0.0.1", "localhost"].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.addInitScript(() => localStorage.setItem("xconda-lang", "ko"));
  await page.goto("/dev.html");
  await expect(page.locator("[data-featured-notice]")).toBeVisible();
});

test("featured notice cover fills the card without cropping at every breakpoint", async ({ page }) => {
  const card = page.locator("[data-featured-notice]");
  const image = card.locator("img");
  await card.scrollIntoViewIfNeeded();
  await expect(image).toHaveAttribute("src", /assets\/img\/covers\//);
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

test("header and footer use the exact supplied wordmark, including subpath deployments", async ({ page }) => {
  expect(createHash("sha256").update(readFileSync(wordmark)).digest("hex"))
    .toBe("6fee4abdb9b8129b3d09628c83fc40ca893b87803997e5aacda29a8f7e0423b7");
  const logos = page.locator("[data-official-wordmark]");
  await expect(logos).toHaveCount(2);
  for (const logo of await logos.all()) {
    await expect(logo).toHaveAttribute("src", "/assets/img/logo/xconda-wordmark-official.png");
    await expect.poll(() => logo.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])).toEqual([179, 60]);
    await expect(logo).toHaveCSS("filter", "none");
    const box = (await logo.boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(179 / 60, 2);
  }
  // Serve the same file under a Pages project prefix, while executing the dev app.
  await page.route("**/XCONDA_info/assets/img/logo/xconda-wordmark-official.png", (route) => route.fulfill({ body: readFileSync(wordmark), contentType: "image/png" }));
  await page.addInitScript(() => history.replaceState(null, "", "/XCONDA_info/"));
  await page.goto("/dev.html");
  for (const logo of await page.locator("[data-official-wordmark]").all()) {
    await expect(logo).toHaveAttribute("src", "/XCONDA_info/assets/img/logo/xconda-wordmark-official.png");
    await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(179);
  }
});

test("failed notice covers keep their full-width media area", async ({ page }) => {
  await page.route("**/assets/img/covers/**", (route) => route.abort());
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
