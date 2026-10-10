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
import { applyGoogtransCookie, readGoogtransTarget, TARGETS, type Target } from "./google";

export type { Lang } from "./dict";
export { categoryLabel, changeLabel, groupLabel, typeLabel } from "./dict";
export { localizeEntry, localizeTool } from "./content";
export { TARGETS, type Target } from "./google";

const STORAGE_KEY = "xconda-lang";

/**
 * 목표 언어 → 렌더링에 쓰는 사전(정제 번역) 언어.
 * - en → 정제된 영문 사전으로 UI 크롬·정적 콘텐츠를 렌더 (노션 원문은 Google 위젯이 번역)
 * - ko/ja/zh-CN → 한국어 원문 렌더 (ja/zh는 Google 위젯이 전체 번역)
 */
const dictLangOf = (target: Target): Lang => (target === "en" ? "en" : "ko");

/**
 * 최초 목표 언어 감지 (우선순위: 위젯 쿠키 → 저장된 선택 → 브라우저 언어).
 * - 쿠키가 권위: Google 위젯이 실제로 적용할 상태가 그대로 쿠키에 있습니다.
 * - 브라우저 감지는 기존 ko/en 자동 전환과 동일한 정책 (ja/zh-CN 포함).
 */
function detectInitialTarget(): Target {
  if (typeof window === "undefined") return "ko";
  const fromCookie = readGoogtransTarget();
  if (fromCookie) return fromCookie;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && (TARGETS as readonly string[]).includes(saved)) return saved as Target;
  } catch {
    /* noop */
  }
  const nav = (navigator.language || "").toLowerCase();
  if (nav.startsWith("ko")) return "ko";
  if (nav.startsWith("en")) return "en";
  if (nav.startsWith("ja")) return "ja";
  if (nav.startsWith("zh")) return "zh-CN";
  return "ko";
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
  const [target, setTargetState] = useState<Target>(() => detectInitialTarget());
  const lang = dictLangOf(target);

  useEffect(() => {
    setCurrentLang(lang);
    try {
      window.localStorage.setItem(STORAGE_KEY, target);
    } catch {
      /* noop */
    }
    // 위젯 쿠키와 목표 언어를 항상 일치시킴 (첫 로드 자동 감지 · 오래된 상태 복구).
    applyGoogtransCookie(target);
    try {
      // ja/zh 모드에서는 실제 표시 언어가 html lang 에 반영됩니다.
      document.documentElement.lang = target;
      const meta = META[target];
      document.title = meta.title;
      document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);
      document.querySelector('meta[property="og:title"]')?.setAttribute("content", meta.title);
      document.querySelector('meta[property="og:description"]')?.setAttribute("content", meta.description);
    } catch {
      /* noop */
    }
  }, [target, lang]);

  const setTarget = useCallback(
    (t: Target) => {
      if (t === target) return;
      try {
        window.localStorage.setItem(STORAGE_KEY, t);
      } catch {
        /* noop */
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
