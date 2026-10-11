/**
 * Google Translate(위젯) 연동 — 사이트 언어 전환의 "엔진" 쪽.
 * -----------------------------------------------------------------------------
 * ▸ 사이트는 항상 한국어 원문 기반으로 렌더링됩니다 (EN 모드는 UI 크롬만 정제된
 *   영문 사전 적용). 실제 번역은 숨김 처리된 Google Translate 위젯이 수행합니다:
 *     - EN → 노션 등 EN 필드가 없는 한국어 콘텐츠가 영문으로 번역
 *     - JA / ZH → 페이지 전체(크롬 + 콘텐츠)가 한/일 · 한/중으로 번역
 * ▸ 위젯은 `googtrans` 쿠키(`/ko/<목표언어>`)로 구동되며, 언어 변경 =
 *   쿠키 갱신 + 페이지 리로드 (`LanguageProvider.setTarget` 참고).
 * ▸ 쿠키는 목표 언어 결정의 "결과물"일 뿐 입력이 아닙니다. 목표 언어는
 *   `src/i18n/index.tsx` 의 `detectInitialTarget` 한 곳에서만 정합니다.
 * ▸ 위젯은 EN/JA/ZH 에서만 로드합니다(`loadTranslateWidget`). KO 는 번역할 것이
 *   없으므로 위젯을 아예 띄우지 않고, 그래서 지워지지 않은 googtrans 쿠키가
 *   남아 있더라도 KO 화면이 영어 등으로 다시 번역되지 않습니다.
 * ▸ 위젯 UI 자체(상단 배너 · 언어 선택 바)는 숨기고 내비게이션의
 *   KO/EN/JA/ZH 버튼만이 컨트롤입니다.
 */

export const TARGETS = ["ko", "en", "ja", "zh-CN"] as const;
export type Target = (typeof TARGETS)[number];

export const isTarget = (value: unknown): value is Target =>
  typeof value === "string" && (TARGETS as readonly string[]).includes(value);

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
 * 호스트 전용 쿠키와 domain=호스트 쿠키 두 변형을 모두 써서 Google 쪽 설정과 맞춰 둡니다.
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
  return isTarget(target) ? target : null;
}

/* ------------------------------------------------------------------ *
 * 위젯 로더
 * ------------------------------------------------------------------ */

export const WIDGET_SCRIPT_SRC = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
const WIDGET_CONTAINER_ID = "google_translate_element";

type TranslateElementCtor = new (options: Record<string, unknown>, containerId: string) => unknown;
type WidgetWindow = Window & {
  googleTranslateElementInit?: () => void;
  google?: { translate?: { TranslateElement?: TranslateElementCtor } };
};

/**
 * Google 번역 위젯을 띄웁니다 — 목표 언어가 EN/JA/ZH 일 때만, 페이지당 한 번.
 * 반드시 `applyGoogtransCookie(target)` 다음에 호출하세요(위젯은 로드 시점에 쿠키를 읽습니다).
 */
export function loadTranslateWidget(target: Target): void {
  if (target === "ko" || typeof document === "undefined") return;
  if (document.getElementById(WIDGET_CONTAINER_ID)) return; // 이미 로드됨

  const parent = document.body ?? document.documentElement;
  const container = document.createElement("div");
  container.id = WIDGET_CONTAINER_ID;
  container.style.display = "none";
  parent.appendChild(container);

  const w = window as WidgetWindow;
  w.googleTranslateElementInit = () => {
    const TranslateElement = w.google?.translate?.TranslateElement;
    if (!TranslateElement) return;
    // EN 모드: 정제된 영문 크롬 + 한국어 노션 콘텐츠가 섞여 있으므로
    // pageLanguage 를 지정하지 않고 노드별 자동 감지를 씀 (영문은 그대로, 한문만 번역).
    // JA/ZH 모드: 페이지가 전부 한국어 원문이므로 소스 언어를 ko 로 고정.
    const options: Record<string, unknown> = { includedLanguages: "en,ja,zh-CN", autoDisplay: false };
    if (target !== "en") options.pageLanguage = "ko";
    new TranslateElement(options, WIDGET_CONTAINER_ID);
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = WIDGET_SCRIPT_SRC;
  parent.appendChild(script);
}
