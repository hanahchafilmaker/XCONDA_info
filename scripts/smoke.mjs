/**
 * Runtime smoke test: builds the real app as a classic IIFE bundle, executes it
 * in jsdom, and asserts the page mounts with every section rendered.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const here = path.dirname(fileURLToPath(import.meta.url));
const bundle = fs.readFileSync(path.join(here, "../dist-test/app.js"), "utf8");

const problems = [];
const vc = new VirtualConsole();
vc.on("jsdomError", (e) => {
  // 언어 전환은 Google 번역 쿠키 + window.location.reload (jsdom 은 네비게이션 불가 — 기대되는 오류)
  if (/Not implemented: (window\.location\.reload|navigation to another Document)/.test(String(e?.message ?? e))) return;
  problems.push(`jsdomError: ${e.message}`);
});
vc.on("error", (...a) => problems.push(`console.error: ${a.join(" ")}`));

const dom = new JSDOM(
  `<!doctype html><html lang="ko" class="scroll-smooth"><head><meta charset="utf-8">
   <title>t</title><meta name="description" content=""><meta property="og:title" content="">
   <meta property="og:description" content=""></head><body><div id="root"></div></body></html>`,
  { runScripts: "dangerously", pretendToBeVisual: true, url: "http://localhost/dev.html", virtualConsole: vc },
);

const { window } = dom;

// --- minimal polyfills the app expects from a real browser ---
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
// jsdom has no Element.prototype.scrollTo — the article modal scrolls its body to the top on open.
Object.defineProperty(window.HTMLElement.prototype, "scrollTo", { value() {}, writable: true });

const script = window.document.createElement("script");
script.textContent = bundle;
window.document.body.appendChild(script);

await new Promise((r) => setTimeout(r, 1500));

const doc = window.document;
const q = (s) => doc.querySelector(s);
const qa = (s) => [...doc.querySelectorAll(s)];

/* ---------- interaction phase ---------- */
const click = (el) => el?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

// 1) open the unified search overlay via the header trigger
const searchBtn = qa("header button").find((b) => /검색|Search/.test(b.textContent ?? ""));
click(searchBtn);
await new Promise((r) => setTimeout(r, 400));

const overlay = q('div[role="dialog"], .fixed.inset-0.z-\\[95\\]');
const searchInput = q('input[type="text"], input:not([type])');
const hitsIdle = overlay ? overlay.querySelectorAll("li button").length : 0;

// 2) type a term that actually exists in the data and confirm it narrows results
const firstHitTitle = overlay?.querySelector("li button span span")?.textContent?.trim() ?? "";
const term = firstHitTitle.slice(0, 4);
if (searchInput && term) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(searchInput, term);
  searchInput.dispatchEvent(new window.Event("input", { bubbles: true }));
}
await new Promise((r) => setTimeout(r, 400));
const hitsFiltered = overlay ? overlay.querySelectorAll("li button").length : 0;

// 3) close with Escape
window.document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
await new Promise((r) => setTimeout(r, 300));
const overlayClosed = !qa(".fixed.inset-0.z-\\[95\\]").length;

// 4) switch language to Korean and confirm copy changes
const koBtn = qa("header button").find((b) => b.textContent?.trim().toLowerCase() === "ko");
click(koBtn);
await new Promise((r) => setTimeout(r, 400));
const h1AfterKo = q("h1")?.textContent?.trim().slice(0, 60) ?? null;

// 5) open a blog post and confirm the article modal shows the author byline
const blogCard = qa("#blog article button")[0];
click(blogCard);
await new Promise((r) => setTimeout(r, 500));
const modal = q('div[role="dialog"][aria-modal="true"]');
const modalByline = modal?.querySelector("[data-byline]")?.getAttribute("data-byline") ?? null;
window.document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
await new Promise((r) => setTimeout(r, 300));

const interactions = {
  searchOpened: !!overlay,
  term,
  hitsIdle,
  hitsFiltered,
  overlayClosedOnEsc: overlayClosed,
  h1AfterKo,
  koreanActive: qa('header button[aria-pressed="true"]').some((b) => b.textContent?.trim().toLowerCase() === "ko"),
};

const EXPECTED_ORDER = ["top", "notices", "news", "guides", "blog", "faq"];
const sections = EXPECTED_ORDER.map((id) => ({
  id,
  present: !!doc.getElementById(id),
}));

// 실제 DOM 순서가 요청된 섹션 순서(공지사항 → 뉴스 → 툴사용법 → 블로그 → Q&A)와 일치하는지 확인
const renderedOrder = qa("main section[id], footer section[id], section[id]")
  .map((el) => el.id)
  .filter((id) => EXPECTED_ORDER.includes(id));
const orderOk = JSON.stringify(renderedOrder.slice(0, EXPECTED_ORDER.length)) === JSON.stringify(EXPECTED_ORDER);

const result = {
  mounted: (q("#root")?.children.length ?? 0) > 0,
  h1: q("h1")?.textContent?.trim().slice(0, 70) ?? null,
  sections,
  renderedOrder,
  orderOk,
  counts: {
    guideToolButtons: qa("#guides ul li button").length,
    noticeRows: qa("#notices li button").length,
    newsItems: qa("#news article").length,
    channelCards: qa("#news a[target='_blank'], #news div.rounded-2xl").length,
    blogCards: qa("#blog article").length,
    blogThumbnails: qa("#blog article img").length,
    blogBylines: qa("#blog article [data-byline]").length,
    modalByline,
    faqItems: qa("#faq button[aria-expanded]").length,
  },
  voltPaletteActive: !!q("[class*='text-volt-400']"),
  legacyPaletteLeft: qa("[class*='text-fuchsia-'], [class*='bg-brand'], [class*='gradient-border']").length,
  footer: !!q("footer"),
  langToggleButtons: qa("button[aria-pressed]").length,
  // 언어 코드(KO/EN/JA/ZH)는 Google 번역기 오역(WHO/IN/AND) 대상이므로
  // notranslate 스팬으로 보호된 상태여야 합니다.
  langCodeTexts: qa("header button[aria-pressed] > span.notranslate").map((s) => s.textContent?.trim()),
  syncStatus: qa("#news [aria-label]").length > 0,
};

console.log(JSON.stringify({ result, interactions, problems: problems.slice(0, 20) }, null, 2));

const fail = [];
if (!result.mounted) fail.push("app did not mount");
if (!result.orderOk) fail.push(`section order wrong: ${result.renderedOrder.join(" → ")}`);
for (const s of sections) if (!s.present) fail.push(`missing section #${s.id}`);
if (result.counts.guideToolButtons < 10) fail.push(`guides tool list short: ${result.counts.guideToolButtons}`);
if (result.counts.newsItems < 3) fail.push(`news items missing: ${result.counts.newsItems}`);
if (result.counts.blogCards < 3) fail.push(`blog cards missing: ${result.counts.blogCards}`);
if (!result.counts.blogThumbnails) fail.push("blog cards render no thumbnail <img>");
if (result.counts.blogBylines < 3) fail.push(`blog cards missing author byline: ${result.counts.blogBylines}`);
if (!modalByline) fail.push("article modal did not show the author byline");
if (!result.voltPaletteActive) fail.push("volt palette not applied");
if (result.legacyPaletteLeft > 0) fail.push("legacy palette classes still present");
if (!result.footer) fail.push("footer missing");
if (!interactions.searchOpened) fail.push("search overlay did not open");
if (!interactions.hitsIdle) fail.push("search overlay returned no results");
if (interactions.hitsFiltered > interactions.hitsIdle) fail.push("search filter did not narrow results");
if (!interactions.overlayClosedOnEsc) fail.push("Escape did not close search overlay");
if (!interactions.koreanActive) fail.push("language toggle did not switch to KO");
if (JSON.stringify(result.langCodeTexts) !== JSON.stringify(["KO", "EN", "JA", "ZH"])) {
  fail.push(`language codes missing or not notranslate-protected: ${JSON.stringify(result.langCodeTexts)}`);
}
if (!/[가-힣]/.test(interactions.h1AfterKo ?? "")) fail.push("hero copy did not become Korean");
if (problems.length) fail.push("runtime errors present");

window.close();
if (fail.length) {
  console.error("\nFAIL:\n - " + fail.join("\n - "));
  process.exit(1);
}
console.log("\nPASS — app mounts, all sections render, no runtime errors.");
