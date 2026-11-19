/* Exercise the built app: the 2026-11-18 current guides are inline same-origin assets. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundle = fs.readFileSync(path.join(ROOT, "dist-test/app.js"), "utf8");
const toolsSource = fs.readFileSync(path.join(ROOT, "src/content/tools.ts"), "utf8");
const DRIVE = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/driveGuides.json"), "utf8"));
const HUB_ASSET_BASE = "https://hub.xconda.ai/";
const guideLang = { ko: "ko", en: "en", ja: "ja", "zh-CN": "zh" };
const mediaLang = { ko: "ko", en: "en", ja: "en", "zh-CN": "en" };
const videoNoBySlug = new Map(DRIVE.videos.filter((video) => video.slug).map((video) => [video.slug, video.no]));
const slugs = [...toolsSource.matchAll(/\bslug: "([a-z0-9-]+)"/g)].map((m) => m[1]);
const CURRENT_COUNT = { docs: DRIVE.docs.length * 4, videos: DRIVE.videos.reduce((n, video) => n + (video.files.ko ? 1 : 0) + (video.files.en ? 1 : 0), 0) + DRIVE.extraVideos.reduce((n, video) => n + (video.files.ko ? 1 : 0) + (video.files.en ? 1 : 0), 0) };
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
const guideUrl = (base, target, slug) => `${base}assets/guides/current/${guideLang[target]}/${slug}.html?embedded=1`;
const videoUrl = (base, target, slug) => `${base}assets/guides/current/video/${videoNoBySlug.get(slug)}_${mediaLang[target]}.mp4`;
const noDrive = (doc, where) => {
  const urls = [...doc.querySelectorAll("[src], [href]")].flatMap((el) => [el.getAttribute("src"), el.getAttribute("href")]).filter(Boolean);
  expect(!urls.some((url) => /drive\.google\.com|\/preview\//i.test(url)), `${where}: Drive /view or /preview URL remains`);
};
const noLegacyGuideControls = (doc, where) => {
  expect(!doc.querySelector("[data-html-guide-index]"), `${where}: top-right legacy guide index remains`);
  expect(!doc.querySelector("#latest-guides"), `${where}: Drive library remains`);
  expect(!doc.querySelector("[data-guide-view]"), `${where}: legacy guide toggle remains`);
  expect(!doc.querySelector("#guides a[data-html-guide]"), `${where}: new-tab guide link remains`);
};

expect(slugs.length === 19, `expected 19 tools, got ${slugs.length}`);
expect(CURRENT_COUNT.docs === 96 && CURRENT_COUNT.videos === 65, `unexpected catalogue counts: ${JSON.stringify(CURRENT_COUNT)}`);
const cases = [
  { target: "ko", key: "ko" },
  { target: "en", key: "en" },
  { target: "ja", key: "ja" },
  { target: "zh-CN", key: "zh" },
];

for (const { target } of cases) {
  const base = "https://example.test/XCONDA_info/";
  const { window, doc, errors, copies, popups } = await openApp(`${base}?notion=off&lang=${target}`);
  const q = (selector) => doc.querySelector(selector);
  const buttons = [...doc.querySelectorAll("#guides nav ul li button")];
  expect(buttons.length === slugs.length, `${target}: tool list mismatch (${buttons.length})`);
  expect(q("#guides")?.getAttribute("data-current-guide-count") === "96", `${target}: expected 96 current docs`);
  expect(q("#guides")?.getAttribute("data-current-video-count") === "65", `${target}: expected 65 current videos`);
  noLegacyGuideControls(doc, target);
  noDrive(doc, target);

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    click(window, buttons[i]);
    await wait(20);
    const article = q("#guides article[data-current-guide-slug]");
    expect(article?.getAttribute("data-current-guide-slug") === slug, `${target}: wrong active tool ${slug}`);
    expect(article?.getAttribute("data-current-guide-target") === target, `${target}: wrong active target ${slug}`);
    const iframe = article?.querySelector("iframe[data-html-guide]");
    expect(!!iframe, `${target}: ${slug} inline guide iframe missing`);
    expect(iframe.getAttribute("data-html-guide") === slug, `${target}: wrong inline guide for ${slug}`);
    expect(iframe.getAttribute("src") === guideUrl(base, target, slug), `${target}: wrong same-origin guide URL for ${slug}: ${iframe.getAttribute("src")}`);
    expect(iframe.getAttribute("loading") === "lazy" && iframe.getAttribute("referrerPolicy") === "no-referrer", `${target}: ${slug} iframe is not loaded safely`);
    expect(article.querySelectorAll("a").length === 0, `${target}: ${slug} detail area contains a legacy link`);
    const videoButton = article.querySelector("button[data-guide-video-button]");
    expect(!!videoButton, `${target}: ${slug} video popup button is missing`);
    expect(videoButton.getAttribute("data-guide-video-button") === slug, `${target}: wrong video popup button for ${slug}`);
    expect(videoButton.getAttribute("aria-haspopup") === "dialog", `${target}: ${slug} video button does not announce a dialog`);
    expect(article.querySelectorAll("button[aria-haspopup='dialog']").length === 1, `${target}: ${slug} detail area contains unexpected dialog controls`);
  }
  expect(popups.length === 0, `${target}: a guide unexpectedly opened a new window`);

  // Guide video opens as an in-page popup (same-origin MP4, no new window) and closes cleanly.
  click(window, buttons[slugs.indexOf("flexboard")]);
  await wait(20);
  const flexTrigger = q("#guides article[data-current-guide-slug='flexboard'] button[data-guide-video-button='flexboard']");
  expect(!!flexTrigger, `${target}: flexboard video popup button is missing`);
  click(window, flexTrigger);
  await wait(150);
  const videoDialog = q("[data-guide-video-dialog]");
  expect(!!videoDialog, `${target}: video popup did not open`);
  expect(videoDialog.getAttribute("role") === "dialog", `${target}: video popup is not a dialog`);
  const popupVideo = videoDialog.querySelector("video[data-guide-video='flexboard']");
  expect(!!popupVideo, `${target}: popup video is missing`);
  expect(popupVideo.getAttribute("src") === videoUrl(base, target, "flexboard"), `${target}: popup video URL is wrong: ${popupVideo.getAttribute("src")}`);
  expect(popupVideo.hasAttribute("controls") && popupVideo.hasAttribute("playsinline"), `${target}: popup video is not playable`);
  expect(!!videoDialog.querySelector("[data-guide-video-close]"), `${target}: video popup close button is missing`);
  click(window, videoDialog.querySelector("[data-guide-video-close]"));
  await eventually(() => !q("[data-guide-video-dialog]"), `${target}: video popup did not close`);
  expect(popups.length === 0, `${target}: video popup opened a new window`);

  click(window, q("[data-modal-share]") || q("[data-featured-guide]"));
  await wait(70);
  const modal = q('[role="dialog"][aria-modal="true"]');
  expect(!!modal, `${target}: featured tool did not open the current guide dialog`);
  expect(modal.querySelector("iframe[data-html-guide='flexboard']")?.getAttribute("src") === guideUrl(base, target, "flexboard"), `${target}: featured modal guide URL is wrong`);
  const modalVideo = modal.querySelector("video[data-tool-video='flexboard']");
  expect(!!modalVideo, `${target}: featured modal video is missing`);
  expect(modalVideo.getAttribute("src") === videoUrl(base, target, "flexboard"), `${target}: featured modal video URL is wrong: ${modalVideo.getAttribute("src")}`);
  expect(modalVideo.hasAttribute("controls") && modalVideo.hasAttribute("playsinline"), `${target}: featured video is not playable inline`);
  expect(!modal.querySelector("a[data-html-guide]"), `${target}: modal still has a Drive new-tab guide card`);
  expect(!modal.querySelector("iframe[src*='drive.google.com']"), `${target}: modal still embeds Drive`);
  expect(!modal.querySelector("[data-guide-view]"), `${target}: modal still has the legacy view toggle`);
  expect(window.location.hash === "#post=tool-flexboard", `${target}: featured tool dialog is not reloadable`);
  expect(doc.body.style.overflow === "hidden", `${target}: background scrolling not locked`);
  click(window, modal.querySelector("[data-modal-share]"));
  await wait(10);
  expect(copies.at(-1) === `${base}?lang=${encodeURIComponent(target)}#post=tool-flexboard`, `${target}: sharing does not reopen the selected guide and language: ${copies.at(-1)}`);
  click(window, modal.querySelector("[data-modal-close]"));
  await eventually(
    () => !q('[role="dialog"][aria-modal="true"]') && doc.body.style.overflow === "",
    `${target}: featured dialog did not close or restore background scrolling`,
  );
  expect(errors.length === 0, `${target}: runtime error: ${errors.join("; ")}`);
  window.close();

  const reopened = await openApp(`${base}?notion=off&lang=${target}#post=tool-directors-cut`);
  const sharedModal = reopened.doc.querySelector('[role="dialog"][aria-modal="true"]');
  expect(sharedModal?.querySelector("iframe[data-html-guide='directors-cut']")?.getAttribute("src") === guideUrl(base, target, "directors-cut"), `${target}: shared/reloaded guide does not reopen`);
  expect(sharedModal?.querySelector("video[data-tool-video='directors-cut']")?.getAttribute("src") === videoUrl(base, target, "directors-cut"), `${target}: shared/reloaded video does not reopen`);
  expect(reopened.errors.length === 0, `${target}: shared guide runtime error: ${reopened.errors.join("; ")}`);
  reopened.window.close();
  console.log(`✔ ${target}: 19 inline current guides, 96 docs / 65 videos, inline video and reload`);
}

// A direct Notion article stays an article; a shared tool dialog adds the current
// guide and video inline while retaining late-loading Notion content below it.
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
expect(!article.doc.querySelector('[role="dialog"] iframe[data-html-guide]'), "direct Notion article was replaced by a current guide");
expect(!article.doc.querySelector("[data-guide-view]"), "direct Notion article has the removed legacy toggle");
expect(article.errors.length === 0, `Notion article runtime error: ${article.errors.join("; ")}`);
article.window.close();

const delayed = await openApp("https://example.test/XCONDA_info/?lang=ko#post=tool-flexboard", snapshot, 1200);
expect(!!delayed.doc.querySelector('iframe[data-html-guide="flexboard"]'), "shared guide did not open while Notion was loading");
expect(!!delayed.doc.querySelector('video[data-tool-video="flexboard"]'), "shared guide video did not open while Notion was loading");
await eventually(() => delayed.doc.querySelector("#original-guide #article-title")?.textContent.includes("Existing FLEXBOARD article"), "late Notion guide was discarded");
expect(!delayed.doc.querySelector("[data-guide-view]"), "late Notion guide reintroduced the legacy toggle");
expect(delayed.errors.length === 0, `delayed Notion runtime error: ${delayed.errors.join("; ")}`);
delayed.window.close();
console.log("✔ direct Notion articles remain intact; shared guides retain late-loading Notion content");

// Product-site /hub/* proxy: committed assets resolve to the canonical hub origin.
const proxy = await openApp("https://example.test/hub/?notion=off&lang=ja#post=tool-flexboard");
const proxyModal = proxy.doc.querySelector('[role="dialog"][aria-modal="true"]');
expect(proxyModal?.querySelector("iframe[data-html-guide='flexboard']")?.getAttribute("src") === guideUrl(HUB_ASSET_BASE, "ja", "flexboard"), "proxied /hub/ guide must use the canonical hub asset URL");
expect(proxyModal?.querySelector("video[data-tool-video='flexboard']")?.getAttribute("src") === videoUrl(HUB_ASSET_BASE, "ja", "flexboard"), "JA under /hub/ must use the English MP4 from the canonical hub asset URL");
expect(proxy.errors.length === 0, `proxied /hub/ runtime error: ${proxy.errors.join("; ")}`);
proxy.window.close();
console.log("✔ proxied /hub/* paths resolve current guides and JA/ZH English videos to canonical assets");
