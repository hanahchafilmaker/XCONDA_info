import { test, expect } from "@playwright/test";
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

test("Q&A chatbot answers from hub content and opens the full article", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.getByTestId("chat-open").click();
  const panel = page.getByTestId("chat-panel");
  await expect(panel).toBeVisible();
  await expect(page.getByTestId("chat-input")).toBeFocused();

  await page.getByTestId("chat-input").fill("엑스콘다 가격이 얼마예요?");
  await page.getByTestId("chat-input").press("Enter");
  const answer = page.getByTestId("chat-answer").last();
  await expect(answer.locator("h3")).toHaveText(/크레딧 팩/);

  // Unrelated question: no confident answer, support email shown instead.
  await page.getByTestId("chat-input").fill("오늘 날씨 어때");
  await page.getByTestId("chat-input").press("Enter");
  await expect(panel).toContainText("cubeberry@cuberry.kr");

  // "전체 보기" opens the existing article dialog above the chat panel.
  await answer.getByRole("button", { name: /전체 보기/ }).click();
  await expect(page.locator("[role=dialog][aria-modal=true]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeVisible();

  await page.getByRole("button", { name: "챗봇 닫기" }).click();
  await expect(panel).toBeHidden();
  await expect(page.getByTestId("chat-open")).toBeVisible();
  expect(errors).toEqual([]);
});

test("Q&A chatbot panel has no WCAG A/AA violations @a11y", async ({ page }) => {
  await page.getByTestId("chat-open").click();
  await page.getByTestId("chat-input").fill("환불 받고 싶어요");
  await page.getByTestId("chat-input").press("Enter");
  await expect(page.getByTestId("chat-answer")).toBeVisible();
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const violations = await page.evaluate(async () => {
    const axe = (window as any).axe;
    const r = await axe.run(document.querySelector("[data-testid=chat-panel]"), {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }));
  });
  expect(violations).toEqual([]);
});

test("AI summary appears above the hub answer when a worker is connected, and disappears on failure", async ({ page }) => {
  let calls = 0;
  let fail = false;
  await page.route("https://qna-ai.test/ask", async (route) => {
    calls += 1;
    const body = route.request().postDataJSON();
    expect(body.docs[0].url).toMatch(/^https:\/\/hub\.xconda\.ai\/qna\//);
    if (fail) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "llm_unavailable", fallback: "bm25" }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ answer: "AI가 정리한 테스트 답변입니다." }) });
  });
  await page.evaluate(() => localStorage.setItem("xconda-qna-ai-endpoint", "https://qna-ai.test"));
  await page.reload();
  await expect(page.locator("#top h1")).toBeVisible();

  await page.getByTestId("chat-open").click();
  await page.getByTestId("chat-input").fill("엑스콘다 가격이 얼마예요?");
  await page.getByTestId("chat-input").press("Enter");
  await expect(page.getByTestId("chat-ai")).toContainText("AI가 정리한 테스트 답변입니다.");
  await expect(page.getByTestId("chat-answer")).toHaveCount(1);

  fail = true;
  await page.getByTestId("chat-input").fill("환불 받고 싶어요");
  await page.getByTestId("chat-input").press("Enter");
  await expect(page.getByTestId("chat-answer")).toHaveCount(2);
  await expect(page.getByTestId("chat-ai")).toHaveCount(1); // 실패한 AI 칸은 사라지고 검색 답변만 남음
  expect(calls).toBe(2);
});
