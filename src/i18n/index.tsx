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

export type { Lang } from "./dict";
export { groupLabel, typeLabel } from "./dict";

const STORAGE_KEY = "xconda-lang";

function detectInitial(): Lang {
  if (typeof window === "undefined") return "ko";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "ko" || saved === "en") return saved;
  } catch {
    /* noop */
  }
  const nav = (navigator.language || "").toLowerCase();
  return nav.startsWith("ko") ? "ko" : "en";
}

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  /** 사전 키를 현재 언어 문자열로 변환 */
  t: (key: string) => string;
  /** 두 값 중 현재 언어에 맞는 값을 선택 */
  pick: <T>(ko: T, en: T) => T;
};

const LangCtx = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const l = detectInitial();
    setCurrentLang(l);
    return l;
  });

  useEffect(() => {
    setCurrentLang(lang);
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* noop */
    }
    try {
      document.documentElement.lang = lang;
    } catch {
      /* noop */
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggle = useCallback(() => setLangState((p) => (p === "ko" ? "en" : "ko")), []);
  const t = useCallback((key: string) => translate(key, lang), [lang]);
  const pick = useCallback(
    <T,>(ko: T, en: T): T => (lang === "ko" ? ko : en),
    [lang]
  );

  const value = useMemo<Ctx>(() => ({ lang, setLang, toggle, t, pick }), [lang, setLang, toggle, t, pick]);

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
