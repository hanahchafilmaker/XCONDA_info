import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/htmlGuides.json"), "utf8"));
const LANGS = { ko: "ko", en: "en", ja: "ja", zh: "zh-CN" };
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), "utf8");

function docOf(...parts) {
  return new JSDOM(read(...parts));
}
function assertNoExecutableSource(doc, page) {
  assert.equal(doc.querySelectorAll("iframe, object, embed, base, form").length, 0, page);
  for (const element of doc.querySelectorAll("*")) {
    for (const { name, value } of element.attributes) {
      assert.ok(!/^on/i.test(name) && name !== "srcdoc", `${page}: ${name}`);
      if (/^(href|src|action|formaction)$/i.test(name)) assert.doesNotMatch(value, /^\s*(?:javascript|vbscript):/i, page);
    }
  }
  const scripts = [...doc.querySelectorAll("script")];
  assert.ok(scripts.length <= 1, page);
  for (const script of scripts) assert.equal(script.getAttribute("src"), "../assets/zoom.js", page);
  const csp = doc.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content ?? "";
  assert.match(csp, /default-src 'none'/, page);
  assert.match(csp, /script-src 'self'/, page);
  assert.match(csp, /frame-src 'none'/, page);
  assert.match(doc.querySelector('meta[name="robots"]')?.content ?? "", /noindex/i, page);
}

test("catalogue covers the 19 hub tools plus separate Turn Video and Asset Library", () => {
  assert.equal(CATALOG.length, 21);
  assert.equal(new Set(CATALOG.map((x) => x.slug)).size, 21);
  assert.equal(new Set(CATALOG.map((x) => x.source)).size, 21);
  const source = read("src/content/tools.ts");
  const hubSlugs = [...source.matchAll(/\bslug: "([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.equal(hubSlugs.length, 19);
  for (const slug of hubSlugs) assert.ok(CATALOG.some((guide) => guide.slug === slug), slug);
  assert.ok(CATALOG.some((guide) => guide.slug === "turn-video"));
  assert.ok(CATALOG.some((guide) => guide.slug === "asset-library"));
});

test("every guide and index has the right language, navigation, safe scripts and intact screenshots", () => {
  const checkedImages = new Set();
  let images = 0;
  for (const [lang, htmlLang] of Object.entries(LANGS)) {
    const indexDom = docOf("manuals", lang, "index.html");
    const index = indexDom.window.document;
    assert.equal(index.documentElement.lang, htmlLang);
    assertNoExecutableSource(index, `${lang}/index.html`);
    const indexHrefs = [...index.querySelectorAll("main li a")].map((a) => a.getAttribute("href"));
    assert.deepEqual(new Set(indexHrefs), new Set(CATALOG.map((x) => `${x.slug}.html`)));
    assert.equal(indexHrefs.length, 21);
    assert.equal(index.querySelectorAll(".xconda-manual-languages a").length, 4);
    indexDom.window.close();

    for (const guide of CATALOG) {
      const page = `${lang}/${guide.slug}.html`;
      const dom = docOf("manuals", lang, `${guide.slug}.html`);
      const doc = dom.window.document;
      assert.equal(doc.documentElement.lang, htmlLang, page);
      assert.ok(doc.title.trim(), page);
      assert.ok(doc.body.textContent.trim().length > 200, page);
      assertNoExecutableSource(doc, page);
      assert.equal(doc.querySelector('.xconda-manual-nav a[href="index.html"]')?.textContent.length > 0, true, page);
      for (const [target, targetHtml] of Object.entries(LANGS)) {
        const a = doc.querySelector(`.xconda-manual-languages a[hreflang="${targetHtml}"]`);
        assert.equal(a?.getAttribute("href"), `../${target}/${guide.slug}.html`, page);
        assert.equal(a?.getAttribute("aria-current") === "page", target === lang, page);
      }
      const imgs = [...doc.querySelectorAll("img[src]")];
      assert.ok(imgs.length > 0, page);
      for (const img of imgs) {
        assert.ok(img.hasAttribute("alt"), `${page}: image lacks alt`);
        const src = img.getAttribute("src");
        assert.match(src, /^\.\.\/assets\/screens\/[a-f0-9]{64}\.(?:png|jpg|webp)$/, page);
        const asset = path.resolve(ROOT, "manuals", lang, src);
        assert.ok(fs.existsSync(asset), `${page}: missing ${src}`);
        if (!checkedImages.has(asset)) {
          const hash = crypto.createHash("sha256").update(fs.readFileSync(asset)).digest("hex");
          assert.equal(path.basename(asset).split(".")[0], hash, `${page}: image hash mismatch`);
          checkedImages.add(asset);
        }
        images++;
      }
      dom.window.close();
    }
  }
  assert.ok(images >= 1000, `expected the supplied screenshots, got ${images}`);
  assert.ok(checkedImages.size > 200, `expected deduplicated source screenshots, got ${checkedImages.size}`);
});

test("the local screenshot viewer supports keyboard opening, focus and Escape", () => {
  const html = read("manuals/ko/flexboard.html");
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://example.test/manuals/ko/flexboard.html" });
  const { document: doc } = dom.window;
  dom.window.eval(read("manuals/assets/zoom.js"));
  const image = doc.querySelector(".image-plate img");
  const dialog = doc.querySelector('.zoom[role="dialog"]');
  const close = dialog.querySelector("button");
  assert.equal(image.getAttribute("role"), "button");
  image.focus();
  image.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  assert.equal(dialog.hidden, false);
  assert.equal(doc.activeElement, close);
  assert.equal(dialog.querySelector("img").src, image.src);
  const tab = new dom.window.KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
  doc.dispatchEvent(tab);
  assert.equal(tab.defaultPrevented, true);
  doc.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(dialog.hidden, true);
  assert.equal(doc.activeElement, image);
  dom.window.close();
});

test("the existing Korean standalone guide links each of its 19 tools and the full index", () => {
  const dom = docOf("user-guide.html");
  const doc = dom.window.document;
  const links = [...doc.querySelectorAll("[data-html-guide]")];
  assert.equal(links.length, 19);
  assert.equal(new Set(links.map((a) => a.dataset.htmlGuide)).size, 19);
  for (const a of links) {
    const slug = a.dataset.htmlGuide;
    assert.ok(CATALOG.some((guide) => guide.slug === slug), slug);
    assert.equal(a.getAttribute("href"), `manuals/ko/${slug}.html`);
    assert.equal(a.target, "_blank");
    assert.match(a.rel, /noopener/);
    assert.ok(fs.existsSync(path.join(ROOT, a.getAttribute("href"))));
  }
  assert.ok(doc.querySelector('a[href="manuals/ko/index.html"]'));
  dom.window.close();
});

test("import stages all languages, deduplicates images and removes source scripts and unsafe attributes", (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "xconda-guide-test-"));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const input = path.join(tmp, "input");
  const output = path.join(tmp, "output");
  fs.mkdirSync(input, { recursive: true });
  fs.mkdirSync(path.join(output, "assets", "screens"), { recursive: true });
  fs.writeFileSync(path.join(output, "assets", "screens", "stale.png"), "old");
  fs.writeFileSync(path.join(output, "assets", "navigation.css"), "preserve source");
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a+ukAAAAASUVORK5CYII=";
  const raw = `<!doctype html><html lang="en"><head><title>Fixture</title><meta http-equiv="refresh" content="0;url=https://evil.test"><style>.example { \n color: red; \n}</style></head><body><h1>Guide fixture</h1><pre>keep${" ".repeat(2)}\nspaces</pre><script>window.BAD = true</script><iframe src="https://evil.test"></iframe><a href="javascript:alert(1)" onclick="alert(1)">bad link</a><div class="image-plate"><img src="data:image/png;base64,${png}" alt="sample" onerror="alert(1)"></div><div class="zoom" role="dialog" hidden><button>close</button><img alt="zoom"></div></body></html>`;
  for (const guide of CATALOG) {
    for (const lang of ["KO", "EN", "JA", "ZH"]) {
      fs.writeFileSync(path.join(input, `${guide.source}_Guide_${lang}.html`), raw);
    }
  }
  const command = [path.join(ROOT, "scripts/import-html-guides.mjs"), input, output];
  const result = spawnSync(process.execPath, command, { encoding: "utf8", timeout: 60000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(fs.readFileSync(path.join(output, "assets", "navigation.css"), "utf8"), "preserve source");
  assert.equal(fs.readdirSync(path.join(output, "assets", "screens")).length, 1);
  for (const [lang, htmlLang] of Object.entries(LANGS)) {
    assert.equal(fs.readdirSync(path.join(output, lang)).length, 22);
    const dom = new JSDOM(fs.readFileSync(path.join(output, lang, "turn.html"), "utf8"));
    const doc = dom.window.document;
    assert.equal(doc.documentElement.lang, htmlLang);
    assert.equal(doc.querySelector('meta[http-equiv="refresh"]'), null);
    assert.equal(doc.querySelector('a[href^="javascript:"]'), null);
    assert.equal(doc.querySelector('[onerror], [onclick], iframe'), null);
    assert.equal(doc.querySelector("pre").textContent, "keep  \nspaces", "preformatted whitespace is preserved");
    assert.doesNotMatch(doc.querySelector("style").textContent, /[ \t]+\n/, "formatting whitespace is tidied");
    assert.equal(doc.querySelectorAll('script[src="../assets/zoom.js"]').length, 1);
    assertNoExecutableSource(doc, `${lang}/fixture`);
    dom.window.close();
  }
  const sentinel = path.join(output, "ko", "turn.html");
  const before = fs.readFileSync(sentinel, "utf8");
  fs.rmSync(path.join(input, `${CATALOG[0].source}_Guide_ZH.html`));
  const missing = spawnSync(process.execPath, command, { encoding: "utf8", timeout: 60000 });
  assert.notEqual(missing.status, 0, "an incomplete import must fail");
  assert.equal(fs.readFileSync(sentinel, "utf8"), before, "an incomplete import must not replace served files");
});
