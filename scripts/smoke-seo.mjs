/**
 * 글별 주소 · 메타 런타임 스모크 테스트 — 실제 앱 번들을 jsdom 에서 실행합니다.
 *
 *   node scripts/smoke-seo.mjs [번들 경로]      (기본: ../dist-test/app.js · npm run test:smoke 가 먼저 만듭니다)
 *
 * 검증하는 것
 *   1) /XCONDA_info/post/{slug}/ 를 직접 열면 그 글이 열리고, 제목·설명·canonical 이 글별 값이다
 *   2) 주소 조건을 못 채운 slug 는 열리지 않고 오류 없이 홈으로 남는다
 *   3) 글을 닫으면 주소가 홈으로 돌아가고, 홈의 제목은 사이트 기본값이다
 *   4) 공유 버튼은 주소가 있는 글에서 글 주소를 복사한다
 *   5) 예전 #post=ID 링크는 주소가 있는 글이면 새 주소로 이동을 요청한다 (jsdom 은 이동하지 않으므로 요청 URL 만 확인)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const here = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(here, "../dist-test/app.js");
const bundle = fs.readFileSync(bundlePath, "utf8");

const PAGE_ID = "3e72ebc0-17ad-8024-a3f5-ef8fb9f8c6dd"; // src/notion.ts DEFAULT_ENDPOINT 와 동일
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = "/XCONDA_info/";
const SITE_TITLE_KO = "XCONDA허브 — 공지사항 · 뉴스 · 툴 사용법 · 블로그 · Q&A";

const eligible = {
  id: "3ed2ebc0-17ad-810d-9a48-e1f3860cfccf",
  __type: "news",
  Title: "DeepSeek의 공식 하네스가 발표됐습니다!",
  Summary: "DeepSeek의 공식 하네스가 발표됐습니다. 모든 것이 플러그인입니다.",
  Published: true,
  Date: "2026-10-02",
  Slug: "deepseek-official-harness",
  "SEO 준비됨": true,
  "SEO 제목": "DeepSeek 공식 하네스 공개, 모든 것이 플러그인",
  "SEO 설명": "DeepSeek의 공식 하네스가 MIT 라이선스로 공개됐습니다.",
};
const notReady = {
  id: "3ed2ebc0-17ad-8188-91bc-c74dcdab8644",
  __type: "news",
  Title: "준비 안 된 글",
  Summary: "요약",
  Published: true,
  Date: "2026-10-01",
  Slug: "not-ready",
  "SEO 준비됨": false,
};
const plain = {
  id: "3ec2ebc0-17ad-8151-bd25-de1dd726037a",
  __type: "notice",
  Title: "주소 없는 공지",
  Summary: "요약 본문",
  Published: true,
  Date: "2026-09-30",
};
const rows = [eligible, notReady, plain];

const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
});

async function openPage(urlPath, language = "ko-KR") {
  const problems = [];
  const navigations = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    const msg = String(e?.message ?? e);
    // jsdom 은 실제 페이지 이동을 하지 않고 "구현 안 됨" 오류만 남깁니다 → 이동 요청으로 기록
    if (/Not implemented: navigation/.test(msg)) return navigations.push("(jsdom: navigation requested)");
    problems.push(`jsdomError: ${msg}`);
  });
  vc.on("error", (...a) => problems.push(`console.error: ${a.join(" ")}`));

  const dom = new JSDOM(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>t</title></head><body><div id="root"></div></body></html>`,
    { runScripts: "dangerously", pretendToBeVisual: true, url: `http://localhost${urlPath}`, virtualConsole: vc }
  );
  const { window } = dom;

  class IO {
    constructor(cb) { this.cb = cb; }
    observe(el) { this.cb([{ isIntersecting: true, target: el }], this); }
    unobserve() {}
    disconnect() {}
  }
  window.IntersectionObserver = IO;
  window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.scrollTo = () => {};
  Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", { value() {}, writable: true });
  Object.defineProperty(window.HTMLElement.prototype, "scrollTo", { value() {}, writable: true });
  const copied = [];
  Object.defineProperty(window.navigator, "clipboard", {
    value: { writeText: async (text) => void copied.push(text) },
    configurable: true,
  });
  Object.defineProperty(window.navigator, "language", { value: language, configurable: true });
  Object.defineProperty(window.navigator, "languages", { value: [language], configurable: true });

  const snapshot = {
    generatedAt: new Date().toISOString(),
    source: { pageId: PAGE_ID, collectionViewId: null, collectionId: null },
    rows,
    pages: {},
  };
  window.fetch = async (input) => {
    const url = String(input);
    if (url.includes("notion-content.json")) return reply(200, snapshot);
    return reply(404, "not found");
  };

  const script = window.document.createElement("script");
  script.textContent = bundle;
  window.document.body.appendChild(script);
  await wait(1200);

  return { window, doc: window.document, problems, navigations, copied };
}

const results = [];
const check = (name, actual, expected) => {
  const ok = actual === expected;
  results.push({ name, ok, actual, expected });
};
const checkTrue = (name, actual) => results.push({ name, ok: !!actual, actual, expected: true });

/* 1) 주소로 직접 열기 */
{
  const { window, doc, problems, copied } = await openPage(`${BASE}post/deepseek-official-harness/`);
  const dialog = doc.querySelector('[role="dialog"]');
  checkTrue("주소로 직접 열면 글 상세가 열린다", dialog && dialog.textContent.includes("DeepSeek의 공식 하네스가 발표됐습니다!"));
  check("글 제목 탭 제목 = SEO 제목 | XCONDA허브", doc.title, "DeepSeek 공식 하네스 공개, 모든 것이 플러그인 | XCONDA허브");
  check(
    "메타 설명 = SEO 설명",
    doc.querySelector('meta[name="description"]')?.getAttribute("content"),
    "DeepSeek의 공식 하네스가 MIT 라이선스로 공개됐습니다."
  );
  check(
    "canonical = 글 주소",
    doc.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    `http://localhost${BASE}post/deepseek-official-harness/`
  );
  check("og:type = article", doc.querySelector('meta[property="og:type"]')?.getAttribute("content"), "article");
  check("주소 유지", window.location.pathname, `${BASE}post/deepseek-official-harness/`);
  check("오류 없음", problems.length, 0);

  // 4) 공유 버튼 → 글 주소 복사
  const shareBtn = doc.querySelector('[role="dialog"] button span[aria-live="polite"]')?.closest("button");
  shareBtn?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await wait(50);
  check("공유 버튼 → 글 주소가 클립보드에 복사된다", copied[0], `http://localhost${BASE}post/deepseek-official-harness/`);

  // 3) 닫기 → 홈 주소, 홈 제목
  const close = doc.querySelector('[role="dialog"] button[aria-label]');
  close?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await wait(50);
  check("닫으면 주소가 홈으로", window.location.pathname, BASE);
  check("홈 제목은 사이트 기본값", doc.title, SITE_TITLE_KO);
  window.close();
}

/* 2) 주소 조건을 못 채운 slug */
{
  const { doc, problems, window } = await openPage(`${BASE}post/not-ready/`);
  checkTrue("준비 안 된 글 주소는 글을 열지 않는다", !doc.querySelector('[role="dialog"]'));
  check("오류 없음", problems.length, 0);
  check("홈 제목 유지", doc.title, SITE_TITLE_KO);
  window.close();
}

/* 5) 예전 #post=ID → 주소 있는 글이면 새 주소로 이동 요청 */
{
  const { navigations, problems, window } = await openPage(`${BASE}#post=${eligible.id}`);
  // jsdom 은 이동하지 않으므로 "이동 요청이 발생했는지"만 확인합니다. 목적지 주소는 seo.test.mjs 의 경로 규칙 테스트가 확인합니다.
  checkTrue("예전 링크 → 새 주소로 이동 요청이 발생한다", navigations.length >= 1);
  check("오류 없음", problems.length, 0);
  window.close();
}

/* 5-b) 주소 없는 글의 #post=ID 는 그대로 연다 */
{
  const { doc, navigations, window } = await openPage(`${BASE}#post=${plain.id}`);
  check("주소 없는 글은 이동 요청 없이 그 자리에서 연다", navigations.length, 0);
  checkTrue("주소 없는 글 상세가 열린다", doc.querySelector('[role="dialog"]')?.textContent.includes("주소 없는 공지"));
  window.close();
}

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? "✔" : "✘"} ${r.name}${r.ok ? "" : `\n    기대: ${JSON.stringify(r.expected)}\n    실제: ${JSON.stringify(r.actual)}`}`);
}
if (failed.length) {
  console.error(`\nFAIL — 글별 주소 · 메타 검증 실패 ${failed.length}건`);
  process.exit(1);
}
console.log("\nPASS — 글 주소 직접 열기 · 메타 · 닫기 · 공유 · 예전 링크 이동이 동작합니다.");
