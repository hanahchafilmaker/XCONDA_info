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
vc.on("jsdomError", (e) => problems.push(`jsdomError: ${e.message}`));
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

const interactions = {
  searchOpened: !!overlay,
  term,
  hitsIdle,
  hitsFiltered,
  overlayClosedOnEsc: overlayClosed,
  h1AfterKo,
  koreanActive: qa('header button[aria-pressed="true"]').some((b) => b.textContent?.trim().toLowerCase() === "ko"),
};

const sections = ["top", "notices", "guides", "updates", "credits", "faq"].map((id) => ({
  id,
  present: !!doc.getElementById(id),
}));

const result = {
  mounted: (q("#root")?.children.length ?? 0) > 0,
  h1: q("h1")?.textContent?.trim().slice(0, 70) ?? null,
  sections,
  counts: {
    guideToolButtons: qa("#guides ul li button").length,
    noticeRows: qa("#notices li button").length,
    updateCards: qa("#updates article").length,
    creditsCards: qa("#credits article").length,
    faqItems: qa("#faq button[aria-expanded]").length,
  },
  voltPaletteActive: !!q("[class*='text-volt-400']"),
  legacyPaletteLeft: qa("[class*='text-fuchsia-'], [class*='bg-brand'], [class*='gradient-border']").length,
  footer: !!q("footer"),
  langToggleButtons: qa("button[aria-pressed]").length,
  syncStatus: qa("#updates [aria-label]").length > 0,
};

console.log(JSON.stringify({ result, interactions, problems: problems.slice(0, 20) }, null, 2));

const fail = [];
if (!result.mounted) fail.push("app did not mount");
for (const s of sections) if (!s.present) fail.push(`missing section #${s.id}`);
if (result.counts.guideToolButtons < 10) fail.push(`guides tool list short: ${result.counts.guideToolButtons}`);
if (result.counts.creditsCards < 5) fail.push(`credits packs missing: ${result.counts.creditsCards}`);
if (!result.voltPaletteActive) fail.push("volt palette not applied");
if (result.legacyPaletteLeft > 0) fail.push("legacy palette classes still present");
if (!result.footer) fail.push("footer missing");
if (!interactions.searchOpened) fail.push("search overlay did not open");
if (!interactions.hitsIdle) fail.push("search overlay returned no results");
if (interactions.hitsFiltered > interactions.hitsIdle) fail.push("search filter did not narrow results");
if (!interactions.overlayClosedOnEsc) fail.push("Escape did not close search overlay");
if (!interactions.koreanActive) fail.push("language toggle did not switch to KO");
if (!/[가-힣]/.test(interactions.h1AfterKo ?? "")) fail.push("hero copy did not become Korean");
if (problems.length) fail.push("runtime errors present");

window.close();
if (fail.length) {
  console.error("\nFAIL:\n - " + fail.join("\n - "));
  process.exit(1);
}
console.log("\nPASS — app mounts, all sections render, no runtime errors.");
