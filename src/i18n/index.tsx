import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { setCurrentLang, translate, type Lang } from "./dict";
import { applyGoogtransCookie, isTarget, loadTranslateWidget, readGoogtransTarget, type Target } from "./google";

export type { Lang } from "./dict";
export { categoryLabel, changeLabel, groupLabel, typeLabel } from "./dict";
export { localizeEntry, localizeTool } from "./content";
export { TARGETS, type Target } from "./google";

/** 사용자가 내비 토글로 "직접 고른" 언어만 저장합니다. (자동 감지 결과는 저장하지 않음) */
const STORAGE_KEY = "xconda-lang";

/**
 * 목표 언어 → 렌더링에 쓰는 사전(정제 번역) 언어.
 * - en → 정제된 영문 사전으로 UI 크롬·정적 콘텐츠를 렌더 (노션 원문은 Google 위젯이 번역)
 * - ko/ja/zh-CN → 한국어 원문 렌더 (ja/zh는 Google 위젯이 전체 번역)
 */
const dictLangOf = (target: Target): Lang => (target === "en" ? "en" : "ko");

/**
 * 직접 고른 언어. null = 고른 적 없음, undefined = 저장소를 쓸 수 없음(차단 등).
 */
function readSavedTarget(): Target | null | undefined {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return isTarget(saved) ? saved : null;
  } catch {
    return undefined;
  }
}

function saveTarget(target: Target): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, target);
  } catch {
    /* noop — 저장소 차단 시에는 googtrans 쿠키(EN/JA/ZH)가 보조 저장소 역할 */
  }
}

/**
 * 브라우저가 알려주는 언어 태그를 선호 순서대로 정규화합니다.
 *
 * `navigator.language` 하나만 보면 안 됩니다 — 그 값은 브라우저 UI 언어라서,
 * 웹 콘텐츠 선호 순서인 `navigator.languages` 와 어긋날 수 있습니다.
 * (예: 일본에서 산 PC라 크롬 UI 는 일본어지만, 한국 구글계정으로 맞춘
 * 웹 선호언어는 한국어인 경우 → 예전에는 UI 언어만 보고 JA 로 들어갔습니다.)
 * 구글/크롬 \"계정 언어\" 자체는 웹사이트가 읽을 수 있는 방법이 없으므로
 * (브라우저가 어떤 API 로도 계정 언어를 페이지에 알려주지 않음)
 * 사이트가 쓸 수 있는 신호는 이 선호 목록과 직접 고른 언어뿐입니다.
 */
function browserLanguages(): string[] {
  if (typeof navigator === "undefined") return [];
  const preferred = navigator.languages;
  const list = preferred && preferred.length > 0 ? [...preferred] : [navigator.language ?? ""];
  return list.filter(Boolean).map((tag) => tag.toLowerCase().replace(/_/g, "-"));
}

function targetOfTag(tag: string): Target | null {
  if (tag === "ko" || tag.startsWith("ko-")) return "ko";
  if (tag === "en" || tag.startsWith("en-")) return "en";
  if (tag === "ja" || tag.startsWith("ja-")) return "ja";
  if (tag === "zh" || tag.startsWith("zh-")) return "zh-CN";
  return null;
}

/**
 * 브라우저 선호 언어 → 목표 언어.
 * 선호 목록을 앞에서부터 훑어 처음 만나는 지원 언어를 고릅니다(선호 순서 존중).
 * 지원 언어가 하나도 없으면 한국어 원문으로 둡니다.
 */
function browserTarget(): Target {
  for (const tag of browserLanguages()) {
    const target = targetOfTag(tag);
    if (target) return target;
  }
  return "ko";
}

/** 브라우저 선호 목록에 한국어가 들어 있는지 (한국어 원문을 읽을 수 있는 사용자인지) */
function browserPrefersKorean(): boolean {
  return browserLanguages().some((tag) => targetOfTag(tag) === "ko");
}

/**
 * 목표 언어 결정 — 사이트 전체에서 이 함수 한 곳뿐입니다.
 *   ① 사용자가 직접 고른 언어(localStorage) — 항상 최우선
 *   ② (저장소를 쓸 수 없을 때만) googtrans 쿠키
 *   ③ 브라우저 선호 언어 목록(`navigator.languages` 순서, `browserTarget`)
 *
 * googtrans 쿠키는 이 결정의 결과물(위젯 구동용)이지 입력이 아닙니다.
 * 예전에는 쿠키를 먼저 믿었고, <head> 부트스트랩이 저장된 "ko"를 무시한 채 브라우저 언어로
 * `/ko/en` 쿠키를 매번 다시 써서 — 영어/일본어/중국어 브라우저에서는 KO 를 눌러도
 * 리로드 후 원래 언어로 되돌아갔습니다(2026-10 수정, scripts/smoke-lang.mjs 가 회귀 방지).
 */
/**
 * 검색엔진·AI 크롤러의 User-Agent 인가?
 *
 * 같은 주소(`hub.xconda.ai/`)가 접속자 언어에 따라 다른 언어로 렌더링되면, 크롤러는
 * **그 주소의 언어를 확정하지 못합니다.** 정적 HTML 의 `<html lang="ko">`·
 * hreflang(`ko` · `x-default`)·JSON-LD `inLanguage: ko-KR` 와 실제 내용이 어긋나기 때문입니다.
 * (해외 데이터센터에서 온 크롤러가 영어 화면을 받아가는 것을 실제로 확인 — 2026-10 GEO 진단)
 * 그래서 크롤러에게는 **항상 한국어 원문**을 돌려주고, 기계번역 위젯도 띄우지 않습니다.
 */
export function isCrawlerUA(ua: string = typeof navigator === "undefined" ? "" : navigator.userAgent): boolean {
  if (!ua) return false;
  // `bot` 는 반드시 `/`·`;`·`)` 가 뒤따를 때만 봅니다 — `CUBOT X19` 처럼 기기 이름에 들어간
  // "BOT" 를 크롤러로 오인해 실제 사용자의 언어를 한국어로 고정하는 일을 막기 위해서입니다.
  return /bot[/;)]|crawler|crawling|spider|gptbot|oai-searchbot|chatgpt-user|claudebot|claude-web|anthropic-ai|perplexity|google-extended|googlebot|bingbot|yandex|baiduspider|yeti|duckduck|applebot|facebookexternalhit|slackbot|telegrambot|discordbot|linkedinbot|twitterbot|embedly|iframely|headlesschrome|lighthouse|python-requests|python-urllib|curl\/|wget\//i.test(
    ua
  );
}

/**
 * `?lang=` 로 명시한 언어 (있으면 최우선). 크롤러·자동 감지와 무관하게 주소로 언어를 고정할 때 씁니다.
 * 예: `https://hub.xconda.ai/?lang=en`
 */
function urlTarget(): Target | null {
  try {
    const value = new URLSearchParams(window.location.search).get("lang");
    return isTarget(value) ? value : null;
  } catch {
    return null;
  }
}

export function detectInitialTarget(): Target {
  if (typeof window === "undefined") return "ko";
  // ① 크롤러 — 항상 한국어 원문 (위 isCrawlerUA 설명)
  if (isCrawlerUA()) return "ko";
  // ② 주소로 명시한 언어
  const fromUrl = urlTarget();
  if (fromUrl) return fromUrl;
  const saved = readSavedTarget();
  if (saved) return saved;
  if (saved === undefined) {
    const fromCookie = readGoogtransTarget();
    if (fromCookie) return fromCookie;
  }
  return browserTarget();
}

const NO_TRANSLATE_META_ID = "xconda-lang-notranslate";

/**
 * <html lang> · title/메타 설명 · 브라우저 자체 번역 잠금을 목표 언어에 맞춥니다.
 *
 * 브라우저 자체 번역 잠금: 크롬 등의 내장 번역(예: "한국어 항상 번역",
 * 번역 대상 언어가 일본어 등으로 남아 있는 경우)이 한국어 화면을 다시
 * 바꾸지 못하게 `<html translate="no">` + `<meta name="google" content="notranslate">` 를 겁니다.
 * 잠그는 경우 — ① 사용자가 KO 를 "직접" 고른 경우
 *              ② 브라우저 선호 목록에 한국어가 있어 한국어로 감지된 경우
 *                 (한국어 원문을 읽을 수 있는 사용자를 기계번역으로 내보낼 이유가 없고,
 *                  실제로 "한국계정인데 첫 화면만 일본어로 번역됐다"는 신고가 이 경로였습니다.
 *                  KO 를 직접 누른 뒤에야 유지되던 것도 잠금이 그때 처음 걸렸기 때문입니다.)
 * 잠그지 않는 경우 — 지원하지 않는 언어(프랑스어 등)라 한국어 원문으로 떨어진 경우.
 *                 이때는 브라우저 번역 제안을 그대로 둡니다.
 */
function applyDocumentLanguage(target: Target): void {
  if (typeof document === "undefined") return;
  try {
    const root = document.documentElement;
    // ja/zh 모드에서는 실제 표시 언어가 html lang 에 반영됩니다.
    root.lang = target;

    const lockKorean = target === "ko" && (readSavedTarget() === "ko" || browserPrefersKorean());
    let meta = document.getElementById(NO_TRANSLATE_META_ID);
    if (lockKorean) {
      root.setAttribute("translate", "no");
      if (!meta) {
        meta = document.createElement("meta");
        meta.id = NO_TRANSLATE_META_ID;
        meta.setAttribute("name", "google");
        meta.setAttribute("content", "notranslate");
        document.head.appendChild(meta);
      }
    } else {
      root.removeAttribute("translate");
      meta?.remove();
    }

    // 제목 · 설명 · 공유 메타는 src/seo.ts 가 화면(글/홈)에 맞춰 갱신합니다.
    // (여기서 사이트 기본값으로 덮어쓰면 글별 제목이 모두 같아지므로 두지 않습니다)
  } catch {
    /* noop */
  }
}

let bootedTarget: Target | null = null;

/**
 * 페이지당 한 번 — 목표 언어를 정하고 googtrans 쿠키 · 문서 언어 · 번역 위젯을 그 언어에 맞춥니다.
 * (언어 전환은 항상 리로드를 거치므로 로드 시점에 한 번 맞추면 됩니다.)
 * `main.tsx` 가 첫 렌더 전에 호출하며, 여러 번 불러도 결과·부수효과는 한 번뿐입니다.
 */
export function bootstrapLanguage(): Target {
  if (bootedTarget) return bootedTarget;
  const target = detectInitialTarget();
  bootedTarget = target;
  if (typeof window !== "undefined") {
    setCurrentLang(dictLangOf(target));
    try {
      applyGoogtransCookie(target);
    } catch {
      /* noop */
    }
    applyDocumentLanguage(target);
    try {
      loadTranslateWidget(target);
    } catch {
      /* noop — 위젯이 없어도 KO/EN 정제 사전은 동작 */
    }
  }
  return target;
}

type Ctx = {
  /** 렌더링에 쓰는 정제 사전 언어 (컴포넌트는 이 값으로 라벨을 고릅니다). */
  lang: Lang;
  /** 사용자가 선택한 전체 목표 언어 (ko | en | ja | zh-CN). */
  target: Target;
  /**
   * 사용자가 직접 언어를 고른 적이 있는지 (저장값 존재 여부).
   * 자동 감지만으로 정해진 언어와 구분하는 데 씁니다 — 예: 검색용 메타(제목 등)는
   * 직접 고른 경우에만 그 언어로 바꾸고, 자동 감지 때는 한국어 기본값을 유지합니다 (A6).
   */
  hasSaved: boolean;
  /**
   * 언어 전환 — 선택을 저장하고 Google 번역 상태(googtrans 쿠키)를 갱신한 뒤
   * 페이지를 리로드합니다. (위젯은 리로드 시점에 쿠키를 읽어 적용합니다.)
   */
  setTarget: (t: Target) => void;
  /** ko/en 호환용 — setTarget 의 별칭. */
  setLang: (l: Lang) => void;
  toggle: () => void;
  /** 사전 키를 현재 언어 문자열로 변환 */
  t: (key: string) => string;
  /** 두 값 중 현재 언어에 맞는 값을 선택 */
  pick: <T>(ko: T, en: T) => T;
};

const LangCtx = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [target, setTargetState] = useState<Target>(() => bootstrapLanguage());
  // 저장소가 차단돼 undefined 면 "직접 고른 적 없음"으로 봅니다 (메타는 한국어 유지).
  const [hasSaved, setHasSaved] = useState<boolean>(() => readSavedTarget() != null);
  const lang = dictLangOf(target);

  // 로드 시점의 정렬은 bootstrapLanguage 가 끝냈고, 여기서는 (리로드 직전 · jsdom 스모크처럼)
  // 페이지 안에서 목표 언어가 바뀐 경우에도 쿠키·문서 언어를 일치시켜 둡니다.
  useEffect(() => {
    setCurrentLang(lang);
    try {
      applyGoogtransCookie(target);
    } catch {
      /* noop */
    }
    applyDocumentLanguage(target);
  }, [target, lang]);

  const setTarget = useCallback(
    (t: Target) => {
      const alreadyChosen = readSavedTarget() === t;
      saveTarget(t);
      setHasSaved(true);
      if (t === target) {
        // 이미 보고 있는 언어 — 직접 선택으로 저장만 합니다.
        // 단, 자동 감지된 KO 를 직접 KO 로 고정하는 경우에는 브라우저 자체 번역 잠금이
        // 깨끗한 로드부터 적용되도록 한 번 리로드합니다(이미 번역된 화면 복구 포함).
        if (t !== "ko" || alreadyChosen) return;
      }
      applyGoogtransCookie(t);
      // 리로드 전 렌더(·jsdom 스모크)에서 즉시 새 언어로 반영되도록 동기 갱신
      setCurrentLang(dictLangOf(t));
      setTargetState(t);
      window.location.reload();
    },
    [target]
  );

  const setLang = useCallback((l: Lang) => setTarget(l), [setTarget]);
  const toggle = useCallback(() => {
    setTarget(target === "ko" ? "en" : "ko");
  }, [setTarget, target]);
  const t = useCallback((key: string) => translate(key, lang), [lang]);
  const pick = useCallback(<T,>(ko: T, en: T): T => (lang === "ko" ? ko : en), [lang]);

  const value = useMemo<Ctx>(
    () => ({ lang, target, hasSaved, setTarget, setLang, toggle, t, pick }),
    [lang, target, hasSaved, setTarget, setLang, toggle, t, pick]
  );

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
