import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { mountSaleCard, SALE_DISMISSED_KEY, SALE_END_MS } from "../../www/snippets/sale-card.js";

function page(t, lang = "ko") {
  const dom = new JSDOM(`<!doctype html><html lang="${lang}"><body><header>헤더</header><div id="sale"></div><main>본문</main></body></html>`, {
    url: "https://www.xconda.ai/",
  });
  t.after(() => dom.window.close());
  return { window: dom.window, document: dom.window.document, slot: dom.window.document.querySelector("#sale") };
}

const card = (slot) => slot.querySelector(".xconda-sale-card");
const link = (slot) => slot.querySelector(".xconda-sale-card__link");
const close = (slot) => slot.querySelector(".xconda-sale-card__close");

test("종료 시각은 브라우저 시간대와 무관하게 2026-11-06 11:00 KST", () => {
  assert.equal(new Date(SALE_END_MS).toISOString(), "2026-11-06T02:00:00.000Z");
});

test("종료 직전에는 노출하고 종료 시각부터는 노출하지 않는다", (t) => {
  const { slot } = page(t);
  const dispose = mountSaleCard(slot, { now: () => SALE_END_MS - 1 });
  assert.ok(card(slot));
  dispose();
  for (const timestamp of [SALE_END_MS, SALE_END_MS + 1]) {
    mountSaleCard(slot, { now: () => timestamp });
    assert.equal(card(slot), null);
  }
});

test("카드는 언어별 가격 페이지로 연결되고 닫기는 이동 없이 영구 저장된다", (t) => {
  const { window, slot } = page(t);
  mountSaleCard(slot, { now: () => SALE_END_MS - 60_000 });
  assert.equal(link(slot).getAttribute("href"), "/ko/pricing");
  assert.equal(close(slot).getAttribute("aria-label"), "할인 안내 닫기");
  assert.equal(close(slot).getAttribute("type"), "button");
  assert.notEqual(close(slot).parentElement, link(slot), "닫기 버튼은 링크 밖에 있어야 합니다");
  let linkClicks = 0;
  link(slot).addEventListener("click", () => { linkClicks += 1; });
  close(slot).click();
  assert.equal(linkClicks, 0);
  assert.equal(window.localStorage.getItem(SALE_DISMISSED_KEY), "1");
  assert.equal(card(slot), null);
  mountSaleCard(slot, { now: () => SALE_END_MS - 30_000 });
  assert.equal(card(slot), null, "다시 초기화해도 닫은 카드는 뜨지 않습니다");
});

test("기존 팝업의 다시 보지 않기 기록은 선택적으로 종료 시각까지 존중한다", (t) => {
  const { window, slot } = page(t);
  const legacyKey = "popupHide:verified-promotion-id";
  let now = SALE_END_MS - 10_000;
  window.localStorage.setItem(legacyKey, String(SALE_END_MS - 5_000));

  mountSaleCard(slot, { now: () => now, legacyHideUntilKey: legacyKey });
  assert.equal(card(slot), null);
  assert.equal(window.localStorage.getItem(SALE_DISMISSED_KEY), null, "기간제 기록을 영구 닫힘으로 바꾸지 않습니다");

  now = SALE_END_MS - 5_000;
  const dispose = mountSaleCard(slot, { now: () => now, legacyHideUntilKey: legacyKey });
  assert.ok(card(slot), "기존 기록이 만료되면 행사 종료 전까지 다시 보입니다");
  dispose();
});

test("기존 팝업 기록을 지정하지 않거나 값이 유효하지 않으면 차단하지 않는다", (t) => {
  const { window, slot } = page(t);
  const legacyKey = "popupHide:verified-promotion-id";
  window.localStorage.setItem(legacyKey, "not-a-timestamp");
  let dispose = mountSaleCard(slot, { now: () => SALE_END_MS - 60_000, legacyHideUntilKey: legacyKey });
  assert.ok(card(slot));
  dispose();
  window.localStorage.setItem(legacyKey, String(SALE_END_MS));
  dispose = mountSaleCard(slot, { now: () => SALE_END_MS - 60_000 });
  assert.ok(card(slot), "검증되지 않은 다른 팝업 기록은 읽지 않습니다");
  dispose();
});

test("다른 탭에서 기존 팝업의 다시 보지 않기를 선택해도 카드가 닫힌다", (t) => {
  const { window, slot } = page(t);
  const legacyKey = "popupHide:verified-promotion-id";
  mountSaleCard(slot, { now: () => SALE_END_MS - 60_000, legacyHideUntilKey: legacyKey });
  window.localStorage.setItem(legacyKey, String(SALE_END_MS));
  window.dispatchEvent(new window.StorageEvent("storage", { key: legacyKey, newValue: String(SALE_END_MS) }));
  assert.equal(card(slot), null);
});

test("탭을 계속 열어 둔 경우 타이머가 정각에 카드를 숨긴다", (t) => {
  const { window, slot } = page(t);
  let now = SALE_END_MS - 2_000;
  let scheduled;
  window.setTimeout = (fn, delay) => { scheduled = { fn, delay }; return 1; };
  window.clearTimeout = () => {};
  mountSaleCard(slot, { now: () => now });
  assert.equal(scheduled.delay, 2_000);
  now = SALE_END_MS;
  scheduled.fn();
  assert.equal(card(slot), null);
});

test("백그라운드 탭의 타이머가 지연돼도 복귀 시 기한을 다시 검사한다", (t) => {
  const { document, slot } = page(t);
  let now = SALE_END_MS - 5_000;
  mountSaleCard(slot, { now: () => now });
  now = SALE_END_MS + 5_000;
  document.dispatchEvent(new document.defaultView.Event("visibilitychange"));
  assert.equal(card(slot), null);
});

test("다른 탭에서 닫으면 열린 카드도 닫는다", (t) => {
  const { window, slot } = page(t);
  mountSaleCard(slot, { now: () => SALE_END_MS - 60_000 });
  window.localStorage.setItem(SALE_DISMISSED_KEY, "1");
  window.dispatchEvent(new window.StorageEvent("storage", { key: SALE_DISMISSED_KEY, newValue: "1" }));
  assert.equal(card(slot), null);
});

test("로컬 저장소가 차단되면 현재 탭 세션에 닫힘을 기억한다", (t) => {
  const { window, slot } = page(t);
  Object.defineProperty(window, "localStorage", { configurable: true, get() { throw new Error("blocked"); } });
  mountSaleCard(slot, { now: () => SALE_END_MS - 60_000 });
  close(slot).click();
  assert.equal(window.sessionStorage.getItem(SALE_DISMISSED_KEY), "1");
  mountSaleCard(slot, { now: () => SALE_END_MS - 60_000 });
  assert.equal(card(slot), null);
});

test("모든 저장소가 차단돼도 닫기는 오류 없이 현재 카드만 숨긴다", (t) => {
  const { window, slot } = page(t);
  for (const name of ["localStorage", "sessionStorage"]) {
    Object.defineProperty(window, name, { configurable: true, get() { throw new Error("blocked"); } });
  }
  mountSaleCard(slot, { now: () => SALE_END_MS - 60_000 });
  close(slot).click();
  assert.equal(card(slot), null);
});

test("언어별 요금 경로와 대체 경로를 사용한다", async (t) => {
  for (const [language, href] of [["ko", "/ko/pricing"], ["en", "/pricing"], ["ja-JP", "/ja/pricing"], ["zh-Hans", "/zh/pricing"], ["fr", "/pricing"]]) {
    await t.test(language, (subtest) => {
      const { slot } = page(subtest, language);
      mountSaleCard(slot, { now: () => SALE_END_MS - 60_000 });
      assert.equal(link(slot).getAttribute("href"), href);
    });
  }
  await t.test("사이트가 명시한 가격 경로", (subtest) => {
    const { slot } = page(subtest);
    mountSaleCard(slot, { pricingHref: "/pricing?from=sale", now: () => SALE_END_MS - 60_000 });
    assert.equal(link(slot).getAttribute("href"), "/pricing?from=sale");
  });
});

test("다시 초기화하거나 정리해도 카드가 중복되지 않고 다른 요소는 남는다", (t) => {
  const { document, slot } = page(t);
  const keep = document.createElement("span");
  keep.textContent = "유지";
  slot.append(keep);
  mountSaleCard(slot, { now: () => SALE_END_MS - 60_000 });
  const dispose = mountSaleCard(slot, { now: () => SALE_END_MS - 60_000 });
  assert.equal(slot.querySelectorAll(".xconda-sale-card").length, 1);
  dispose();
  dispose(); // 정리 함수는 여러 번 호출해도 안전합니다.
  assert.equal(card(slot), null);
  assert.equal(slot.textContent, "유지");
});

test("기한이 매우 멀면 setTimeout 오버플로 없이 나눠서 대기한다", (t) => {
  const { window, slot } = page(t);
  let delay;
  window.setTimeout = (_fn, ms) => { delay = ms; return 1; };
  window.clearTimeout = () => {};
  mountSaleCard(slot, { now: () => SALE_END_MS - 3_000_000_000 });
  assert.equal(delay, 2_147_483_647);
});

test("슬롯은 헤더 뒤·본문 앞에서 흐름을 차지하며 카드는 오른쪽에 정렬된다", (t) => {
  const { window, document, slot } = page(t);
  const css = readFileSync(new URL("../../www/snippets/sale-card.css", import.meta.url), "utf8");
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);
  mountSaleCard(slot, { now: () => SALE_END_MS - 60_000 });
  assert.equal(slot.previousElementSibling.tagName, "HEADER");
  assert.equal(slot.nextElementSibling.tagName, "MAIN");
  assert.equal(window.getComputedStyle(slot).display, "flex");
  assert.equal(window.getComputedStyle(slot).justifyContent, "flex-end");
  assert.notEqual(window.getComputedStyle(slot).position, "fixed");
  assert.equal(window.getComputedStyle(card(slot)).position, "relative");
  assert.equal(window.getComputedStyle(close(slot)).position, "absolute");
  assert.match(css, /width:\s*min\(320px,\s*100%\)/);
});
