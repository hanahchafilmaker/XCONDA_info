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
  await page.locator("#top").getByRole("button", { name: "FLEXBOARD", exact: true }).click();
  await expect(input(page)).toHaveValue("FLEXBOARD");
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
