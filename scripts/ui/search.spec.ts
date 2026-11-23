import { test, expect, type Page } from "@playwright/test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// Local content only: no live Google translation, analytics or remote images.
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return ["127.0.0.1", "localhost"].includes(url.hostname) ? route.continue() : route.abort();
  });
  await page.addInitScript(() => { if (!localStorage.getItem("xconda-lang")) localStorage.setItem("xconda-lang", "ko"); });
  await page.goto("/dev.html");
  await expect(page.locator("#top h1")).toBeVisible();
});

const dialog = (page: Page) => page.locator("[data-search-dialog]");
const trigger = (page: Page) => page.locator("header button[aria-haspopup=dialog]");
const input = (page: Page) => dialog(page).getByRole("combobox");

async function audit(page: Page, selector?: string) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(async (selector) => {
    const axe = (window as any).axe;
    const result = await axe.run(selector ? document.querySelector(selector) : document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return {
      violations: result.violations.map((v: any) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) })),
      incomplete: result.incomplete.map((v: any) => ({ id: v.id, count: v.nodes.length })),
    };
  }, selector);
  await test.info().attach("axe-results", { body: JSON.stringify(result, null, 2), contentType: "application/json" });
  expect(result.violations).toEqual([]);
}

test("search keyboard selection, IME, article handoff and focus restoration", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await trigger(page).click();
  await expect(input(page)).toBeFocused();
  await input(page).fill("FLEXBOARD");
  await expect(dialog(page).getByRole("option").first()).toBeVisible();
  await input(page).dispatchEvent("keydown", { key: "Enter", isComposing: true });
  await expect(dialog(page)).toBeVisible();
  await input(page).press("ArrowDown");
  const selected = dialog(page).locator('[role=option][aria-selected=true] [data-search-title]');
  const title = await selected.textContent();
  await input(page).press("Enter");
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.locator("#article-title")).toHaveText(title!);
  await expect(page.locator("[data-modal-close]")).toBeFocused();
  await page.keyboard.press("Control+k");
  await expect(dialog(page)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(trigger(page)).toBeFocused();
  expect(errors).toEqual([]);
});

test("filters, clear, empty recovery, pagination and no stale hero keyword", async ({ page }) => {
  await page.locator("#top").getByRole("button", { name: "Flex Board", exact: true }).click();
  await expect(input(page)).toHaveValue("Flex Board");
  await page.keyboard.press("Escape");
  await trigger(page).click();
  await expect(input(page)).toHaveValue("");
  const count = await dialog(page).getByRole("option").count();
  await dialog(page).getByRole("button", { name: "검색 결과 더 보기" }).click();
  await expect(dialog(page).getByRole("option")).toHaveCount(count + 24);
  const filter = dialog(page).getByRole("button", { name: "Q&A", exact: true });
  await filter.focus();
  await filter.press("Enter");
  await expect(filter).toHaveAttribute("aria-pressed", "true");
  await expect(dialog(page)).toBeVisible();
  for (const option of await dialog(page).getByRole("option").all()) await expect(option).toHaveAttribute("data-search-kind", "faq");
  await input(page).fill("no-match-9284759824");
  await expect(dialog(page).getByRole("option")).toHaveCount(0);
  await expect(dialog(page).getByText("검색 결과가 없습니다.")).toBeVisible();
  await dialog(page).getByRole("button", { name: "검색어와 필터 초기화" }).click();
  await expect(input(page)).toHaveValue("");
  await expect(input(page)).toBeFocused();
  await expect(dialog(page).getByRole("button", { name: "전체", exact: true })).toHaveAttribute("aria-pressed", "true");
  await input(page).fill("FLEXBOARD");
  await dialog(page).getByRole("button", { name: "검색어 지우기" }).click();
  await expect(input(page)).toHaveValue("");
});

test("focus trap, dismissal, shortcuts and editable-field protection", async ({ page }) => {
  await trigger(page).focus();
  await page.keyboard.press("Control+k");
  await expect(input(page)).toBeFocused();
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog(page).evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press("Shift+Tab");
    expect(await dialog(page).evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(trigger(page)).toBeFocused();
  await page.keyboard.press("/");
  await expect(dialog(page)).toBeVisible();
  await page.mouse.click(4, 4);
  await expect(dialog(page)).toHaveCount(0);
  await expect(trigger(page)).toBeFocused();
  await page.locator("#top input").focus();
  await page.keyboard.press("/");
  await expect(dialog(page)).toHaveCount(0);
  await page.evaluate(() => {
    const field = document.createElement("div"); field.contentEditable = "true";
    document.body.appendChild(field); field.focus();
  });
  await page.keyboard.press("Control+k");
  await expect(dialog(page)).toHaveCount(0);
});

test("clipboard success, rejected permission and missing API show honest toasts", async ({ page }) => {
  await page.locator("#blog article button").first().click();
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => { (window as any).__copiedUrl = text; } } }));
  await page.locator("[data-modal-share]").click();
  await expect(page.locator("[data-sonner-toast][data-type=success]")).toContainText("링크 복사됨");
  expect(await page.evaluate(() => (window as any).__copiedUrl)).toMatch(/^https?:\/\//);
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("denied"); } } }));
  await page.locator("[data-modal-share]").click();
  await expect(page.locator("[data-sonner-toast][data-type=error]")).toContainText("링크를 복사하지 못했습니다");
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined }));
  await page.locator("[data-modal-share]").click();
  await expect(page.locator("[data-sonner-toast][data-type=error]")).toContainText("링크를 복사하지 못했습니다");
  await expect(page.locator("[data-modal-share]")).toBeEnabled();
  await page.locator("[data-code-copy]").first().click();
  await expect(page.locator('[data-sonner-toast][data-type=error]').filter({ hasText: "텍스트를 복사하지 못했습니다" })).toBeVisible();
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => {} } }));
  await page.locator("[data-code-copy]").first().click();
  await expect(page.locator('[data-sonner-toast][data-type=success]').filter({ hasText: "복사됨" })).toBeVisible();
  await page.getByRole("region", { name: "코드 블록", exact: true }).first().focus();
  await expect(page.getByRole("region", { name: "코드 블록", exact: true }).first()).toBeFocused();
});

test("@a11y desktop homepage and search populated/empty states", async ({ page }) => {
  await audit(page);
  await trigger(page).click();
  await audit(page);
  await input(page).fill("no-match-9284759824");
  await audit(page);
});

test("@a11y mobile search and navigation without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("#mobile-navigation")).toHaveAttribute("inert", "");
  await page.locator("[data-hub-menu-toggle]").click();
  await expect(page.locator("#mobile-navigation")).not.toHaveAttribute("inert", "");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-hub-menu-toggle]")).toBeFocused();
  await trigger(page).click();
  await input(page).fill("FLEXBOARD");
  await audit(page);
  const box = await dialog(page).boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
});

test("@a11y English search labels and article share feedback", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("xconda-lang", "en"));
  await page.reload();
  await trigger(page).click();
  await expect(dialog(page).getByRole("heading", { name: "Search" })).toBeVisible();
  await expect(dialog(page).getByRole("button", { name: "Clear search" })).toHaveCount(0);
  await audit(page);
  await page.keyboard.press("Escape");
  await page.locator("#blog article button").first().click();
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined }));
  await page.locator("[data-modal-share]").click();
  await expect(page.locator("[data-sonner-toast][data-type=error]")).toContainText("Could not copy the link");
  await audit(page, '[role="dialog"]');
});


test("neutral editorial home: search form, five destinations and featured guide work", async ({ page }) => {
  await expect(page.locator('#top[data-home-design="neutral-editorial"]')).toBeVisible();
  await expect(page.locator("#top h1")).toContainText("더 잘 만들기 위한");
  const destinations = await page.locator("[data-hub-hero-nav] a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(destinations).toEqual(["#notices", "#news", "#guides", "#blog", "#faq"]);
  await page.locator("#top input").fill("Turn");
  await page.locator("#top form button").click();
  await expect(input(page)).toHaveValue("Turn");
  await page.keyboard.press("Escape");
  const featured = page.locator("[data-featured-guide]");
  await featured.click();
  // 2026-11-18 현재판은 같은 출처 정적 자산이라 모달 안에서 바로 읽고 재생합니다.
  const dialog = page.locator('[role="dialog"][aria-modal="true"]');
  await expect(dialog.locator('iframe[data-html-guide="flexboard"]')).toHaveAttribute(
    "src",
    /\/assets\/guides\/current\/ko\/flexboard\.html\?embedded=1$/,
  );
  await expect(dialog.locator('video[data-tool-video="flexboard"]')).toHaveAttribute(
    "src",
    /\/assets\/guides\/current\/video\/19_ko\.mp4$/,
  );
  await expect(dialog.locator('a[data-html-guide="flexboard"]')).toHaveCount(0);
  await expect(dialog.locator("[data-guide-view]")).toHaveCount(0);
  await page.locator("[data-modal-close]").click();
  await expect(featured).toBeFocused();
});

test("compact notices expand and FAQ answers remain keyboard accessible", async ({ page }) => {
  await expect(page.locator("#notices li button")).toHaveCount(5);
  await page.locator("[data-notices-more]").click();
  expect(await page.locator("#notices li button").count()).toBeGreaterThan(5);
  await page.locator("[data-notices-more]").click();
  await expect(page.locator("#notices li button")).toHaveCount(5);
  const question = page.locator("#faq button[aria-expanded]").first();
  const id = await question.getAttribute("aria-controls");
  const answer = page.locator(`[id="${id}"]`);
  await expect(question).toHaveAttribute("aria-expanded", "false");
  await expect(answer).toHaveAttribute("inert", "");
  await question.focus();
  await question.press("Enter");
  await expect(answer).not.toHaveAttribute("inert", "");
  await expect(answer.locator("p")).toBeVisible();
  await question.press("Tab");
  await expect(answer.getByRole("button")).toBeFocused();
  await answer.getByRole("button").click();
  await expect(page.locator("#article-title")).toBeVisible();
});

test("@a11y neutral editorial home stays inside mobile, tablet and desktop viewports", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const element of await page.locator("#top form, [data-featured-guide], [data-hub-hero-nav] a, header button:visible, header a:visible").all()) {
      const box = await element.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    }
    if (width === 390 || width === 1440) await test.info().attach(`neutral-home-${width}`, { body: await page.screenshot(), contentType: "image/png" });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await audit(page);
});
