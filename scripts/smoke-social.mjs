/** Render the actual application bundle, with no external requests, in each locale. */
import fs from "node:fs";
import assert from "node:assert/strict";
import { JSDOM, VirtualConsole } from "jsdom";
import { socialAccountsFor } from "../src/content/socialAccounts.js";

const bundle = fs.readFileSync(new URL("../dist-test/app.js", import.meta.url), "utf8");
for (const locale of ["ko", "en", "ja", "zh-CN"]) {
  const errors = [];
  const console = new VirtualConsole();
  console.on("jsdomError", (error) => errors.push(error.message));
  console.on("error", (...args) => errors.push(args.join(" ")));
  const dom = new JSDOM('<!doctype html><html lang="ko"><head><title>Social links</title></head><body><div id="root"></div></body></html>', {
    url: "https://hub.xconda.ai/dev.html", runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: console,
  });
  const { window } = dom;
  try {
    window.localStorage.setItem("xconda-lang", locale);
    window.IntersectionObserver = class {
      constructor(callback) { this.callback = callback; }
      observe(target) { this.callback([{ isIntersecting: true, target }], this); }
      unobserve() {}
      disconnect() {}
    };
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    window.HTMLElement.prototype.scrollIntoView = () => {};
    window.scrollTo = () => {};
    window.fetch = async () => ({ ok: false, status: 503 });
    window.eval(bundle);
    for (let i = 0; i < 100 && !window.document.querySelector("footer [data-social-channel]"); i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const document = window.document;
    const expected = socialAccountsFor(locale);
    for (const [selector, attribute] of [["footer [data-social-channel]", "data-social-channel"], ['#news [data-channel-card]:not([data-channel-card="web"])', "data-channel-card"]]) {
      const links = [...document.querySelectorAll(selector)];
      assert.deepEqual(links.map((a) => [a.getAttribute(attribute), a.href]), expected.map((a) => [a.id, a.href]), `${locale}: ${selector}`);
      for (const [i, link] of links.entries()) {
        assert.equal(link.target, "_blank");
        assert.match(link.rel, /noopener/);
        assert.match(link.rel, /noreferrer/);
        const label = attribute === "data-social-channel" ? link.getAttribute("aria-label") : link.textContent;
        assert.ok(label.includes(expected[i].handle), `${locale}: missing account label`);
      }
    }
    assert.equal(document.querySelectorAll('#news [data-channel-card="web"]').length, 1);
    assert.equal(document.querySelectorAll('[data-channel-card="naver"], [data-social-channel="naver"]').length, 0);
    assert.deepEqual(errors, [], `${locale}: runtime errors`);
    process.stdout.write(`✔ ${locale}: news and footer share the correct ${expected.length} official accounts\n`);
  } finally {
    window.close();
  }
}
