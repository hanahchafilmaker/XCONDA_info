/**
 * Google Translate(위젯) 연동 — 사이트 언어 전환의 "엔진" 쪽.
 * -----------------------------------------------------------------------------
 * ▸ 사이트는 항상 한국어 원문 기반으로 렌더링됩니다 (EN 모드는 UI 크롬만 정제된
 *   영문 사전 적용). 실제 번역은 숨김 처리된 Google Translate 위젯이 수행합니다:
 *     - EN → 노션 등 EN 필드가 없는 한국어 콘텐츠가 영문으로 번역
 *     - JA / ZH → 페이지 전체(크롬 + 콘텐츠)가 한/일 · 한/중으로 번역
 * ▸ 위젯은 `googtrans` 쿠키(`/ko/<목표언어>`)로 구동되며, 언어 변경 =
 *   쿠키 갱신 + 페이지 리로드 (`LanguageProvider.setTarget` 참고).
 * ▸ 위젯 UI 자체(상단 배너 · 언어 선택 바)는 숨기고 내비게이션의
 *   KO/EN/JA/ZH 버튼만이 컨트롤입니다.
 */

export const TARGETS = ["ko", "en", "ja", "zh-CN"] as const;
export type Target = (typeof TARGETS)[number];

const COOKIE_NAME = "googtrans";
const ONE_YEAR_MS = 31_536_000_000;

/** 각 목표 언어의 googtrans 쿠키 값 (소스 언어는 항상 ko) */
const COOKIE_VALUE: Record<Target, string> = {
  ko: "",
  en: "/ko/en",
  ja: "/ko/ja",
  "zh-CN": "/ko/zh-CN",
};

/**
 * 현재 호스트의 `googtrans` 쿠키를 목표 언어에 맞게 설정(또는 ko면 삭제)합니다.
 * path=/ 과 호스트 스클 두 변형 모두 써서 Google 쪽 설정과 맞춰 둡니다.
 */
export function applyGoogtransCookie(target: Target): void {
  const host = typeof location !== "undefined" ? location.hostname : "";
  if (target === "ko") {
    const expired = new Date(0).toUTCString();
    document.cookie = `${COOKIE_NAME}=; path=/; expires=${expired}`;
    if (host) document.cookie = `${COOKIE_NAME}=; path=/; domain=${host}; expires=${expired}`;
    return;
  }
  const value = COOKIE_VALUE[target];
  const expires = new Date(Date.now() + ONE_YEAR_MS).toUTCString();
  document.cookie = `${COOKIE_NAME}=${value}; path=/; expires=${expires}`;
  if (host) document.cookie = `${COOKIE_NAME}=${value}; path=/; domain=${host}; expires=${expires}`;
}

/** 현재 `googtrans` 쿠키를 목표 언어로 역해독합니다. (없거나 알 수 없으면 null) */
export function readGoogtransTarget(): Target | null {
  const m = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
  if (!m) return null;
  // "/ko/en" → "en"
  const target = decodeURIComponent(m[1]).replace(/^\//, "").split("/")[1];
  return (TARGETS as readonly string[]).includes(target) ? (target as Target) : null;
}
