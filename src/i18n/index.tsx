import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { META, setCurrentLang, translate, type Lang } from "./dict";
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

/** 브라우저 언어 → 목표 언어 (지원하지 않는 언어는 한국어 원문) */
function browserTarget(): Target {
  const nav = (typeof navigator !== "undefined" ? navigator.language || "" : "").toLowerCase();
  if (nav.startsWith("en")) return "en";
  if (nav.startsWith("ja")) return "ja";
  if (nav.startsWith("zh")) return "zh-CN";
  return "ko";
}

/**
 * 목표 언어 결정 — 사이트 전체에서 이 함수 한 곳뿐입니다.
 *   ① 사용자가 직접 고른 언어(localStorage) — 항상 최우선
 *   ② (저장소를 쓸 수 없을 때만) googtrans 쿠키
 *   ③ 브라우저 언어
 *
 * googtrans 쿠키는 이 결정의 결과물(위젯 구동용)이지 입력이 아닙니다.
 * 예전에는 쿠키를 먼저 믿었고, <head> 부트스트랩이 저장된 "ko"를 무시한 채 브라우저 언어로
 * `/ko/en` 쿠키를 매번 다시 써서 — 영어/일본어/중국어 브라우저에서는 KO 를 눌러도
 * 리로드 후 원래 언어로 되돌아갔습니다(2026-10 수정, scripts/smoke-lang.mjs 가 회귀 방지).
 */
export function detectInitialTarget(): Target {
  if (typeof window === "undefined") return "ko";
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
 * 브라우저 자체 번역 잠금: 사용자가 KO 를 "직접" 고른 경우 크롬 등의 내장 번역
 * (예: "한국어 항상 번역")이 한국어 화면을 다시 영어로 바꾸지 못하게
 * `<html translate="no">` + `<meta name="google" content="notranslate">` 를 겁니다.
 * 자동 감지로 KO 가 된 경우(지원하지 않는 언어의 브라우저)는 브라우저 번역 제안을 그대로 둡니다.
 */
function applyDocumentLanguage(target: Target): void {
  if (typeof document === "undefined") return;
  try {
    const root = document.documentElement;
    // ja/zh 모드에서는 실제 표시 언어가 html lang 에 반영됩니다.
    root.lang = target;

    const lockKorean = target === "ko" && readSavedTarget() === "ko";
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

    const m = META[target];
    document.title = m.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", m.description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", m.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", m.description);
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
    () => ({ lang, target, setTarget, setLang, toggle, t, pick }),
    [lang, target, setTarget, setLang, toggle, t, pick]
  );

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
