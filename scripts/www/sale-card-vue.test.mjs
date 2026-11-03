import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import { SALE_DISMISSED_KEY, SALE_END_MS } from "../../www/snippets/sale-card.js";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("Vue 이관 예시는 SSR·언어 전환·닫기·기존 팝업 숨김을 처리한다", async (t) => {
  const dom = new JSDOM("<!doctype html><html><body><div id='app'></div></body></html>", {
    url: "https://www.xconda.ai/ko",
  });
  const names = ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "useI18n", "useLocalePath"];
  const previous = new Map(names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const realNow = Date.now;
  t.after(() => {
    Date.now = realNow;
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
    dom.window.close();
  });
  for (const name of names.slice(0, 6)) {
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: dom.window[name] });
  }

  // Vue runtime-dom은 import 시 document를 확인하므로 jsdom을 먼저 설치합니다.
  const { parse, compileScript } = await import("vue/compiler-sfc");
  const { createApp, createSSRApp, ref, nextTick } = await import("vue");
  const { renderToString } = await import("vue/server-renderer");
  const locale = ref("ko");
  globalThis.useI18n = () => ({ locale });
  globalThis.useLocalePath = () => (route) => locale.value === "en" ? route : `/${locale.value}${route}`;

  const source = readFileSync(path.join(root, "www/snippets/SaleCard.vue"), "utf8");
  const { descriptor, errors } = parse(source);
  assert.deepEqual(errors, []);
  assert.ok(descriptor.template);
  let compiled = compileScript(descriptor, { id: "sale-card-test", inlineTemplate: true }).content;
  assert.match(compiled, /import ["']\.\/sale-card\.css["']/);
  // Node는 CSS import를 처리하지 않습니다. 실제 CSS는 별도 스타일 테스트에서 검증합니다.
  compiled = compiled
    .replace(/^import ["']\.\/sale-card\.css["'];?\s*$/m, "")
    .replace(/["']\.\/sale-card\.js["']/, JSON.stringify(pathToFileURL(path.join(root, "www/snippets/sale-card.js")).href));
  const temporary = mkdtempSync(path.join(root, "node_modules/.sale-card-vue-test-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const modulePath = path.join(temporary, "component.mjs");
  writeFileSync(modulePath, compiled);
  const { default: SaleCard } = await import(pathToFileURL(modulePath).href);

  let now = SALE_END_MS - 120_000;
  Date.now = () => now;
  const ssr = await renderToString(createSSRApp(SaleCard));
  assert.match(ssr, /<div><\/div>/);
  assert.doesNotMatch(ssr, /xconda-sale-card/, "서버 렌더링 중에는 브라우저 API를 쓰지 않습니다");

  const find = (selector) => dom.window.document.querySelector(selector);
  const first = createApp(SaleCard);
  first.mount("#app");
  await nextTick();
  assert.equal(find(".xconda-sale-card__link").getAttribute("href"), "/ko/pricing");
  locale.value = "ja";
  await nextTick();
  assert.equal(dom.window.document.querySelectorAll(".xconda-sale-card").length, 1);
  assert.equal(find(".xconda-sale-card__link").getAttribute("href"), "/ja/pricing");
  find(".xconda-sale-card__close").click();
  assert.equal(dom.window.localStorage.getItem(SALE_DISMISSED_KEY), "1");
  assert.equal(find(".xconda-sale-card"), null);
  first.unmount();

  dom.window.localStorage.clear();
  dom.window.localStorage.setItem("popupHide:verified", String(now + 30_000));
  const second = createApp(SaleCard, { previousNoticeId: "verified" });
  second.mount("#app");
  await nextTick();
  assert.equal(find(".xconda-sale-card"), null);
  now += 30_000;
  locale.value = "zh";
  await nextTick();
  assert.equal(find(".xconda-sale-card__link").getAttribute("href"), "/zh/pricing");
  now = SALE_END_MS;
  dom.window.document.dispatchEvent(new dom.window.Event("visibilitychange"));
  assert.equal(find(".xconda-sale-card"), null);
  second.unmount();
});
