/* Exercise the built app: the full-guide button opens the selected HTML in a dialog. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundle = fs.readFileSync(path.join(ROOT, "dist-test/app.js"), "utf8");
const toolsSource = fs.readFileSync(path.join(ROOT, "src/content/tools.ts"), "utf8");
const slugs = [...toolsSource.matchAll(/\bslug: "([a-z0-9-]+)"/g)].map((m) => m[1]);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const expect = (condition, message) => { if (!condition) throw new Error(message); };
async function eventually(condition, message) {
  const deadline = Date.now() + 1500;
  while (!condition() && Date.now() < deadline) await wait(25);
  expect(condition(), message);
}
const cases = [
  { target: "ko", folder: "ko" },
  { target: "en", folder: "en" },
  { target: "ja", folder: "ja" },
  { target: "zh-CN", folder: "zh" },
];

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
for (const { target, folder } of cases) {
  const { window, doc, errors, copies, popups } = await openApp(`https://example.test/XCONDA_info/?notion=off&lang=${target}`);
  const q = (selector) => doc.querySelector(selector);
  const buttons = [...doc.querySelectorAll("#guides nav ul li button")];
  expect(buttons.length === slugs.length, `${target}: tool list mismatch (${buttons.length})`);
  const index = q("#guides [data-html-guide-index]");
  expect(index?.getAttribute("href") === `/XCONDA_info/manuals/${folder}/index.html`, `${target}: incorrect index link`);
  expect(index?.getAttribute("target") === "_blank" && /noopener/.test(index.rel), `${target}: index must open safely`);

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    click(window, buttons[i]);
    await wait(20);
    const full = q('#guides article button[aria-haspopup="dialog"]');
    expect(!!full, `${target}: full guide button missing for ${slug}`);
    expect(!q('#guides article a[data-html-guide]'), `${target}: ${slug} still opens the primary guide in a new tab`);
    click(window, full);
    await wait(50);
    const modal = q('[role="dialog"][aria-modal="true"]');
    const frame = modal?.querySelector('iframe[data-html-guide]');
    const original = modal?.querySelector('#original-guide');
    expect(!!modal && !!frame, `${target}: ${slug} did not open a guide dialog`);
    expect(frame.getAttribute("data-html-guide") === slug, `${target}: wrong guide for ${slug}`);
    expect(frame.getAttribute("src") === `/XCONDA_info/manuals/${folder}/${slug}.html`, `${target}: wrong iframe URL for ${slug}`);
    expect(!!frame.title && frame.getAttribute("sandbox")?.includes("allow-scripts"), `${target}: frame is missing a title or restrictions`);
    expect(!modal.querySelector('#illustrated-guide').hidden && original.hidden, `${target}: ${slug} did not start on the illustrated guide`);
    expect(window.location.pathname === "/XCONDA_info/" && window.location.hash === `#post=tool-${slug}`, `${target}: ${slug} dialog is not reloadable`);
    expect(doc.body.style.overflow === "hidden", `${target}: background scrolling not locked`);

    if (i === 0) {
      click(window, modal.querySelector('[data-modal-share]'));
      await wait(10);
      expect(copies.at(-1) === `https://example.test/XCONDA_info/?lang=${encodeURIComponent(target)}#post=tool-${slug}`, `${target}: sharing does not reopen the selected guide and language`);
      // A same-origin manual is decorated only inside the iframe. Escape closes a
      // screenshot zoom first; a second Escape closes the outer modal.
      const frameDoc = frame.contentDocument;
      frameDoc.open();
      frameDoc.write('<!doctype html><html><head></head><body><section class="slide cover">Guide fixture</section><div class="zoom" role="dialog"></div></body></html>');
      frameDoc.close();
      frame.dispatchEvent(new window.Event("load"));
      await wait(20);
      expect(frameDoc.documentElement.classList.contains("xconda-guide-embedded"), `${target}: embedded navigation not configured`);
      expect(!modal.querySelector('[data-guide-print]').disabled, `${target}: print remains disabled after the guide loads`);
      click(window, modal.querySelector('[data-guide-view="original"]'));
      await wait(20);
      expect(!original.hidden && modal.querySelector('#illustrated-guide').hidden, `${target}: original guide is inaccessible`);
      expect(!!original.querySelector('a[href*="drive.google.com/file/d/"]'), `${target}: existing Turn video is missing`);
      click(window, modal.querySelector('[data-guide-view="illustrated"]'));
      await wait(20);
      expect(modal.querySelector('iframe[data-html-guide]') === frame, `${target}: switching views should preserve the manual`);
      frameDoc.dispatchEvent(new frame.contentWindow.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await wait(20);
      expect(!!q('[role="dialog"][aria-modal="true"]'), `${target}: screenshot zoom Escape also closed the guide`);
      frameDoc.querySelector('.zoom').hidden = true;
      frameDoc.dispatchEvent(new frame.contentWindow.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    } else {
      if (slug === "video") {
        click(window, modal.querySelector('[data-guide-view="original"]'));
        await wait(20);
        expect(!!original.querySelector('a[href*="drive.google.com/file/d/"]'), `${target}: existing Video Generator video is missing`);
      }
      if (i === 1) {
        frame.contentDocument.open();
        frame.contentDocument.write("<!doctype html><html><body><h1>Not found</h1></body></html>");
        frame.contentDocument.close();
        frame.dispatchEvent(new window.Event("load"));
        await wait(20);
        expect(!!modal.querySelector('[role="alert"]'), `${target}: missing iframe fallback message`);
        expect(modal.querySelector('[role="alert"] + a')?.getAttribute("href") === `/XCONDA_info/manuals/${folder}/${slug}.html`, `${target}: fallback link is wrong`);
      }
      click(window, modal.querySelector('[data-modal-close]'));
    }
    await eventually(
      () => !q('[role="dialog"][aria-modal="true"]') && doc.body.style.overflow === "",
      `${target}: ${slug} did not close or restore background scrolling`,
    );
  }
  expect(popups.length === 0, `${target}: a full guide unexpectedly opened a new window`);
  expect(errors.length === 0, `${target}: runtime error: ${errors.join("; ")}`);
  window.close();

  const reopened = await openApp(`https://example.test/XCONDA_info/?notion=off&lang=${target}#post=tool-directors-cut`);
  expect(reopened.doc.querySelector('iframe[data-html-guide="directors-cut"]')?.getAttribute("src") === `/XCONDA_info/manuals/${folder}/directors-cut.html`, `${target}: shared/reloaded guide does not reopen`);
  expect(reopened.errors.length === 0, `${target}: shared guide runtime error: ${reopened.errors.join("; ")}`);
  reopened.window.close();
  console.log(`✔ ${target}: 19 in-place guide dialogs, original guides/videos, sharing and reload`);
}

// A direct Notion article stays an article; opening that same tool from its card
// switches to the illustrated modal without discarding the original content.
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
expect(!article.doc.querySelector('iframe[data-html-guide]'), "direct Notion article was replaced by an illustrated guide");
click(article.window, article.doc.querySelector('[data-modal-close]'));
await wait(40);
const flexButton = [...article.doc.querySelectorAll('#guides nav ul li button')][slugs.indexOf("flexboard")];
click(article.window, flexButton);
await wait(30);
click(article.window, article.doc.querySelector('#guides article button[aria-haspopup="dialog"]'));
await wait(70);
expect(!!article.doc.querySelector('iframe[data-html-guide="flexboard"]'), "Notion-backed tool did not open the illustrated guide");
expect(article.window.location.hash === "#post=tool-flexboard", "Notion-backed tool is not reloadable as a guide dialog");
click(article.window, article.doc.querySelector('[data-guide-view="original"]'));
await wait(30);
expect(article.doc.querySelector('#original-guide #article-title')?.textContent.includes("Existing FLEXBOARD article"), "Notion-backed original guide was discarded");
expect(article.errors.length === 0, `Notion guide runtime error: ${article.errors.join("; ")}`);
article.window.close();

// A shared guide appears immediately even if the Notion snapshot is slow;
// when it arrives, the existing guide is retained without resetting the frame.
const delayed = await openApp("https://example.test/XCONDA_info/?lang=ko#post=tool-flexboard", snapshot, 1200);
const delayedFrame = delayed.doc.querySelector('iframe[data-html-guide="flexboard"]');
expect(!!delayedFrame, "shared guide did not open while Notion was loading");
delayedFrame.contentDocument.open();
delayedFrame.contentDocument.write('<!doctype html><html><body><section class="slide cover">Guide fixture</section></body></html>');
delayedFrame.contentDocument.close();
delayedFrame.dispatchEvent(new delayed.window.Event("load"));
await eventually(() => !delayed.doc.querySelector('[data-guide-print]').disabled, "shared guide frame did not load");
await eventually(() => delayed.doc.querySelector('#original-guide #article-title')?.textContent.includes("Existing FLEXBOARD article"), "late Notion guide did not become the original view");
expect(delayed.doc.querySelector('iframe[data-html-guide="flexboard"]') === delayedFrame && !delayed.doc.querySelector('[data-guide-print]').disabled, "late Notion guide reset the loaded manual");
expect(delayed.errors.length === 0, `delayed Notion runtime error: ${delayed.errors.join("; ")}`);
delayed.window.close();
console.log("✔ direct Notion articles remain intact; shared guides retain late-loading Notion content");
