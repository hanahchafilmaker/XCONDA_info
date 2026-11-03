/**
 * www 메인으로 이관할 Seedance 프로모션 카드. 이 저장소에 둔 것만으로는
 * 운영 사이트에 적용되지 않습니다. 기존 중앙 팝업을 제거한 뒤 헤더 다음의
 * 일반 문서 흐름에 놓인 전용 슬롯에서 mountSaleCard를 호출하세요.
 */
export const SALE_END_MS = Date.parse("2026-11-06T11:00:00+09:00");
export const SALE_DISMISSED_KEY = "xconda-seedance-sale-2026-11-06-dismissed";
const MAX_TIMEOUT_MS = 2_147_483_647;
const mounted = new WeakMap();

const COPY = {
  ko: {
    region: "할인 행사 안내",
    title: "Seedance 2.5 프로모션",
    description: "할인 내용을 확인해 보세요.",
    action: "가격 보기 →",
    close: "할인 안내 닫기",
  },
  en: {
    region: "Promotion",
    title: "Seedance 2.5 promotion",
    description: "Explore the promotion details.",
    action: "See pricing →",
    close: "Close promotion",
  },
  ja: {
    region: "キャンペーンのお知らせ",
    title: "Seedance 2.5 キャンペーン",
    description: "割引の詳細をご確認ください。",
    action: "料金を見る →",
    close: "キャンペーンを閉じる",
  },
  zh: {
    region: "优惠活动通知",
    title: "Seedance 2.5 优惠活动",
    description: "查看优惠详情。",
    action: "查看价格 →",
    close: "关闭优惠通知",
  },
};

/**
 * @param {HTMLElement} slot 헤더 바로 뒤의 빈 슬롯. CSS도 함께 포함해야 합니다.
 * @param {{locale?: string, pricingHref?: string, storageKey?: string, now?: () => number}} [options]
 * @returns {() => void} 페이지 언마운트 시 이벤트와 타이머를 정리하는 함수.
 *
 * now는 테스트용입니다. 운영에서는 생략해 실제 시각을 사용합니다.
 * 기존 팝업이 이미 닫힘을 저장했다면 적용 시 기존 키/값도 이 키의 "1"로
 * 이관해야 이전 사용자의 닫힘 상태가 유지됩니다.
 */
export function mountSaleCard(slot, options = {}) {
  const doc = slot?.ownerDocument;
  const win = doc?.defaultView;
  if (!slot || !doc || !win || typeof slot.append !== "function") {
    throw new TypeError("헤더 아래에 연결된 카드 슬롯이 필요합니다.");
  }

  // SPA 재렌더나 중복 초기화 시 이전 카드와 리스너를 남기지 않습니다.
  mounted.get(slot)?.();

  const requestedLang = String(options.locale || doc.documentElement.lang || "en").toLowerCase().split("-")[0];
  const lang = Object.hasOwn(COPY, requestedLang) ? requestedLang : "en";
  const copy = COPY[lang];
  const pricingHref = options.pricingHref ?? (lang === "en" ? "/pricing" : `/${lang}/pricing`);
  const storageKey = options.storageKey ?? SALE_DISMISSED_KEY;
  const now = options.now ?? (() => Date.now());

  const storage = (name) => {
    try { return win[name]; } catch { return null; }
  };
  const wasDismissed = () => ["localStorage", "sessionStorage"].some((name) => {
    try { return storage(name)?.getItem(storageKey) === "1"; } catch { return false; }
  });
  const rememberDismissal = () => {
    // 로컬 저장이 차단된 브라우저에서는 최소한 현재 탭 세션에 기억합니다.
    for (const name of ["localStorage", "sessionStorage"]) {
      try {
        const store = storage(name);
        if (store) { store.setItem(storageKey, "1"); return; }
      } catch { /* 다른 저장소 시도 */ }
    }
  };

  if (now() >= SALE_END_MS || wasDismissed()) return () => {};

  const card = doc.createElement("aside");
  card.className = "xconda-sale-card";
  card.setAttribute("aria-label", copy.region);

  const link = doc.createElement("a");
  link.className = "xconda-sale-card__link";
  link.href = pricingHref;
  for (const [className, text] of [
    ["xconda-sale-card__title", copy.title],
    ["xconda-sale-card__description", copy.description],
    ["xconda-sale-card__action", copy.action],
  ]) {
    const line = doc.createElement("span");
    line.className = className;
    line.textContent = text;
    link.append(line);
  }

  // 닫기 버튼을 링크와 형제 요소로 두어 클릭해도 요금 페이지로 이동하지 않습니다.
  const close = doc.createElement("button");
  close.type = "button";
  close.className = "xconda-sale-card__close";
  close.setAttribute("aria-label", copy.close);
  close.textContent = "×";
  card.append(link, close);
  slot.classList.add("xconda-sale-slot");
  slot.append(card);

  let timer = null;
  let disposed = false;
  const removeCard = () => {
    if (disposed) return;
    disposed = true;
    if (timer !== null) win.clearTimeout(timer);
    win.removeEventListener("storage", onStorage);
    win.removeEventListener("pageshow", refresh);
    win.removeEventListener("focus", refresh);
    doc.removeEventListener("visibilitychange", refresh);
    close.removeEventListener("click", dismiss);
    card.remove();
    slot.classList.remove("xconda-sale-slot");
    if (mounted.get(slot) === removeCard) mounted.delete(slot);
  };
  const refresh = () => {
    if (disposed) return;
    if (timer !== null) win.clearTimeout(timer);
    const remaining = SALE_END_MS - now();
    if (remaining <= 0 || wasDismissed()) {
      removeCard();
      return;
    }
    // 탭이 열려 있는 동안에도 종료하며, 긴 대기 시간은 안전한 범위로 나눕니다.
    timer = win.setTimeout(refresh, Math.min(remaining, MAX_TIMEOUT_MS));
  };
  const onStorage = (event) => {
    if (event.key === storageKey || event.key === null) refresh();
  };
  const dismiss = (event) => {
    event.stopPropagation();
    rememberDismissal();
    removeCard();
  };

  mounted.set(slot, removeCard);
  close.addEventListener("click", dismiss);
  win.addEventListener("storage", onStorage);
  win.addEventListener("pageshow", refresh);
  win.addEventListener("focus", refresh);
  doc.addEventListener("visibilitychange", refresh);
  refresh();
  return removeCard;
}
