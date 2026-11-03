/* Exercise the real app bundle: each tool and language must open its own HTML guide. */
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
const cases = [
  { target: "ko", folder: "ko" },
  { target: "en", folder: "en" },
  { target: "ja", folder: "ja" },
  { target: "zh-CN", folder: "zh" },
];

expect(slugs.length === 19, `expected 19 tools, got ${slugs.length}`);
for (const { target, folder } of cases) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (error) => errors.push(error.message));
  vc.on("error", (...args) => errors.push(args.join(" ")));
  const dom = new JSDOM('<!doctype html><html><head><title>test</title></head><body><div id="root"></div></body></html>', {
    url: `https://example.test/XCONDA_info/?lang=${target}`,
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      Object.defineProperty(window.navigator, "userAgent", { value: "Mozilla/5.0 Chrome/130.0 Safari/537.36", configurable: true });
      window.IntersectionObserver = class { constructor(cb) { this.cb = cb; } observe(el) { this.cb([{ isIntersecting: true, target: el }], this); } unobserve() {} disconnect() {} };
      window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      window.scrollTo = () => {};
      Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", { value() {}, writable: true });
      Object.defineProperty(window.HTMLElement.prototype, "scrollTo", { value() {}, writable: true });
    },
  });
  const { window } = dom;
  const doc = window.document;
  const script = doc.createElement("script");
  script.textContent = bundle;
  doc.body.append(script);
  await wait(700);

  const q = (selector) => doc.querySelector(selector);
  const buttons = [...doc.querySelectorAll("#guides nav ul li button")];
  expect(buttons.length === slugs.length, `${target}: tool list mismatch (${buttons.length})`);
  const index = q("#guides [data-html-guide-index]");
  expect(index?.getAttribute("href") === `/XCONDA_info/manuals/${folder}/index.html`, `${target}: incorrect index link`);
  expect(index?.getAttribute("target") === "_blank" && /noopener/.test(index.rel), `${target}: index must open safely`);
  for (let i = 0; i < slugs.length; i++) {
    buttons[i].dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await wait(30);
    const link = q("#guides article [data-html-guide]");
    expect(link?.getAttribute("data-html-guide") === slugs[i], `${target}: selected ${slugs[i]} has wrong guide`);
    expect(link?.getAttribute("href") === `/XCONDA_info/manuals/${folder}/${slugs[i]}.html`, `${target}: ${slugs[i]} link is wrong`);
    expect(link?.getAttribute("target") === "_blank" && /noopener/.test(link.rel), `${target}: ${slugs[i]} opens unsafely`);
  }
  // Existing modal and Drive video remain available, with the new link in the modal as well.
  buttons[0].dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await wait(80);
  expect(!!q('#guides article a[href*="drive.google.com/file/d/"]'), `${target}: Turn video link disappeared`);
  const full = [...doc.querySelectorAll("#guides article button")].find((button) => /전체 가이드 열기|Open full guide/.test(button.textContent ?? ""));
  expect(!!full, `${target}: existing modal button is missing`);
  full.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await wait(150);
  const modal = q('[role="dialog"][aria-modal="true"]');
  expect(!!modal, `${target}: existing modal did not open`);
  expect(modal.querySelector('[data-html-guide="turn"]')?.getAttribute("href") === `/XCONDA_info/manuals/${folder}/turn.html`, `${target}: modal guide link is wrong`);
  expect(!!modal.querySelector('a[href*="drive.google.com/file/d/"]'), `${target}: modal video link disappeared`);
  expect(errors.length === 0, `${target}: runtime error: ${errors.join("; ")}`);
  console.log(`✔ ${target}: 19 tool links, index, existing modal and video`);
  window.close();
}
