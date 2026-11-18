/* Exercise the built app: current Drive guide links replace the 2026-11-03 local manuals. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundle = fs.readFileSync(path.join(ROOT, "dist-test/app.js"), "utf8");
const toolsSource = fs.readFileSync(path.join(ROOT, "src/content/tools.ts"), "utf8");
const DRIVE = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/driveGuides.json"), "utf8"));
const view = (id) => `https://drive.google.com/file/d/${id}/view?usp=drive_link`;
const targetKey = { ko: "ko", en: "en", ja: "ja", "zh-CN": "zh" };
const docBySlug = new Map(DRIVE.docs.map((doc) => [doc.slug, doc]));
const guideIndexUrl = view(DRIVE.indexes.textIndex);
const slugs = [...toolsSource.matchAll(/\bslug: "([a-z0-9-]+)"/g)].map((m) => m[1]);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const expect = (condition, message) => { if (!condition) throw new Error(message); };
async function eventually(condition, message) {
  const deadline = Date.now() + 1500;
  while (!condition() && Date.now() < deadline) await wait(25);
  expect(condition(), message);
}

async function openApp(url, snapshot, fetchDelay = 0) {
  const errors = [];
  const copies = [];
  const popups = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (error) => errors.push(error.message));
  vc.on("error", (...args) => errors.push(args.join(" ")));
  const dom = new JSDOM('<!doctype html><html><head><title>test</title></head><body><div id="root"></div></body></html>', {
    url,
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      Object.defineProperty(window.navigator, "userAgent", { value: "Mozilla/5.0 Chrome/130.0 Safari/537.36", configurable: true });
      Object.defineProperty(window.navigator, "clipboard", { value: { writeText: async (text) => copies.push(text) }, configurable: true });
      window.open = (...args) => { popups.push(args); return null; };
      window.IntersectionObserver = class { constructor(cb) { this.cb = cb; } observe(el) { this.cb([{ isIntersecting: true, target: el }], this); } unobserve() {} disconnect() {} };
      window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      window.scrollTo = () => {};
      Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", { value() {}, writable: true });
      Object.defineProperty(window.HTMLElement.prototype, "scrollTo", { value() {}, writable: true });
      if (snapshot) window.fetch = async (input) => {
        if (!String(input).includes("notion-content.json")) return { ok: false, status: 404, json: async () => ({}) };
        if (fetchDelay) await wait(fetchDelay);
        return { ok: true, status: 200, json: async () => snapshot };
      };
    },
  });
  const { window } = dom;
  const script = window.document.createElement("script");
  script.textContent = bundle;
  window.document.body.append(script);
  await wait(600);
  return { window, doc: window.document, errors, copies, popups };
}

const click = (window, element) => {
  expect(!!element, "missing click target");
  element.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
};

expect(slugs.length === 19, `expected 19 tools, got ${slugs.length}`);
const cases = [
  { target: "ko", key: "ko" },
  { target: "en", key: "en" },
  { target: "ja", key: "ja" },
  { target: "zh-CN", key: "zh" },
];

for (const { target, key } of cases) {
  const { window, doc, errors, copies, popups } = await openApp(`https://example.test/XCONDA_info/?notion=off&lang=${target}`);
  const q = (selector) => doc.querySelector(selector);
  const buttons = [...doc.querySelectorAll("#guides nav ul li button")];
  expect(buttons.length === slugs.length, `${target}: tool list mismatch (${buttons.length})`);
  const index = q("#guides [data-html-guide-index]");
  expect(index?.getAttribute("href") === guideIndexUrl, `${target}: incorrect current guide index link`);
  expect(index?.getAttribute("target") === "_blank" && /noopener/.test(index.rel), `${target}: index must open safely`);
  const library = q("#guides #latest-guides");
  expect(!!library, `${target}: current guide library missing`);
  expect(library?.getAttribute("data-drive-guide-count") === "96", `${target}: expected 96 document links`);
  expect(library?.getAttribute("data-drive-video-count") === "65", `${target}: expected 65 video links`);

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    click(window, buttons[i]);
    await wait(20);
    const full = q('#guides article button[aria-haspopup="dialog"]');
    expect(!!full, `${target}: full guide button missing for ${slug}`);
    expect(!q("#guides article a[data-html-guide]"), `${target}: ${slug} still opens the primary guide in a new tab`);
    click(window, full);
    await wait(50);
    const modal = q('[role="dialog"][aria-modal="true"]');
    const link = modal?.querySelector("a[data-html-guide]");
    const original = modal?.querySelector("#original-guide");
    expect(!!modal && !!link, `${target}: ${slug} did not open a current guide dialog`);
    expect(!modal.querySelector("iframe[data-html-guide]"), `${target}: ${slug} must not iframe Google Drive`);
    expect(link.getAttribute("data-html-guide") === slug, `${target}: wrong guide for ${slug}`);
    expect(link.getAttribute("href") === view(docBySlug.get(slug).files[key]), `${target}: wrong current Drive URL for ${slug}`);
    expect(link.getAttribute("target") === "_blank" && /noopener/.test(link.rel), `${target}: ${slug} link must open safely`);
    expect(!!original?.hidden, `${target}: ${slug} did not start on the current guide`);
    expect(window.location.hash === `#post=tool-${slug}`, `${target}: ${slug} dialog is not reloadable`);
    expect(doc.body.style.overflow === "hidden", `${target}: background scrolling not locked`);

    click(window, modal.querySelector('[data-guide-view="original"]'));
    await wait(20);
    expect(!original.hidden && modal.querySelector("#illustrated-guide").hidden, `${target}: original guide is inaccessible`);
    expect(!!original.querySelector('a[href*="drive.google.com/file/d/"]'), `${target}: ${slug} current video link is missing`);

    if (i === 0) {
      click(window, modal.querySelector("[data-modal-share]"));
      await wait(10);
      expect(copies.at(-1) === `https://example.test/XCONDA_info/?lang=${encodeURIComponent(target)}#post=tool-${slug}`, `${target}: sharing does not reopen the selected guide and language`);
    }
    click(window, modal.querySelector("[data-modal-close]"));
    await eventually(
      () => !q('[role="dialog"][aria-modal="true"]') && doc.body.style.overflow === "",
      `${target}: ${slug} did not close or restore background scrolling`,
    );
  }
  expect(popups.length === 0, `${target}: a full guide unexpectedly opened a new window`);
  expect(errors.length === 0, `${target}: runtime error: ${errors.join("; ")}`);
  window.close();

  const reopened = await openApp(`https://example.test/XCONDA_info/?notion=off&lang=${target}#post=tool-directors-cut`);
  expect(reopened.doc.querySelector('a[data-html-guide="directors-cut"]')?.getAttribute("href") === view(docBySlug.get("directors-cut").files[key]), `${target}: shared/reloaded guide does not reopen`);
  expect(reopened.errors.length === 0, `${target}: shared guide runtime error: ${reopened.errors.join("; ")}`);
  reopened.window.close();
  console.log(`✔ ${target}: 19 current Drive guide links, 96 docs / 65 videos, original guides and reload`);
}

// A direct Notion article stays an article; opening that same tool from its card
// switches to the current Drive guide without discarding the original content.
const row = {
  id: "3ed2ebc0-17ad-810d-9a48-e1f3860cfccf", __type: "guide", Title: "Existing FLEXBOARD article",
  Tool: "FlexBoard (플렉스보드)", Published: true, Date: "2026-11-02", Slug: "existing-flexboard", "SEO 준비됨": true,
};
const snapshot = {
  generatedAt: new Date().toISOString(),
  source: { pageId: "3e72ebc017ad8024a3f5ef8fb9f8c6dd" }, rows: [row], pages: {},
};
const article = await openApp("https://example.test/XCONDA_info/guide/existing-flexboard/?lang=ko", snapshot);
expect(article.doc.querySelector('[role="dialog"] #article-title')?.textContent.includes("Existing FLEXBOARD article"), "direct Notion article did not open");
expect(!article.doc.querySelector("iframe[data-html-guide]"), "direct Notion article was replaced by an illustrated guide");
click(article.window, article.doc.querySelector("[data-modal-close]"));
await wait(40);
const flexButton = [...article.doc.querySelectorAll("#guides nav ul li button")][slugs.indexOf("flexboard")];
click(article.window, flexButton);
await wait(30);
click(article.window, article.doc.querySelector('#guides article button[aria-haspopup="dialog"]'));
await wait(70);
expect(!!article.doc.querySelector('a[data-html-guide="flexboard"]'), "Notion-backed tool did not open the current guide");
expect(article.window.location.hash === "#post=tool-flexboard", "Notion-backed tool is not reloadable as a guide dialog");
click(article.window, article.doc.querySelector('[data-guide-view="original"]'));
await wait(30);
expect(article.doc.querySelector("#original-guide #article-title")?.textContent.includes("Existing FLEXBOARD article"), "Notion-backed original guide was discarded");
expect(article.errors.length === 0, `Notion guide runtime error: ${article.errors.join("; ")}`);
article.window.close();

// A shared guide appears immediately even if the Notion snapshot is slow;
// when it arrives, the existing guide is retained.
const delayed = await openApp("https://example.test/XCONDA_info/?lang=ko#post=tool-flexboard", snapshot, 1200);
expect(!!delayed.doc.querySelector('a[data-html-guide="flexboard"]'), "shared guide did not open while Notion was loading");
await eventually(() => delayed.doc.querySelector("#original-guide #article-title")?.textContent.includes("Existing FLEXBOARD article"), "late Notion guide did not become the original view");
expect(delayed.errors.length === 0, `delayed Notion runtime error: ${delayed.errors.join("; ")}`);
delayed.window.close();
console.log("✔ direct Notion articles remain intact; shared guides retain late-loading Notion content");
