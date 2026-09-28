import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Entry } from "./types";
import { SAMPLE_ENTRIES } from "./sample";
import { TOOLS, toolToEntry } from "./tools";
import { readCache, resolveEndpoint, syncFromNotion } from "../notion";
import { localizeEntry, useLang } from "../i18n";

const POLL_MS = 3 * 60 * 1000;

type Status = "loading" | "ready" | "syncing" | "error";

type Ctx = {
  entries: Entry[];
  notices: Entry[];
  news: Entry[];
  guides: Entry[];
  blogs: Entry[];
  faqs: Entry[];
  source: "notion" | "sample";
  status: Status;
  syncedAt: number | null;
  endpoint?: string;
  refresh: (force?: boolean, manual?: boolean) => void;
  openEntry: (e: Entry) => void;
  openTool: (slug: string) => void;
  closeEntry: () => void;
  active: Entry | null;
};

const ContentCtx = createContext<Ctx | null>(null);

const byDateDesc = (a: Entry, b: Entry) => +new Date(b.date) - +new Date(a.date);
const byOrder = (a: Entry, b: Entry) => (a.order ?? 999) - (b.order ?? 999) || byDateDesc(a, b);

export function ContentProvider({ children }: { children: ReactNode }) {
  const { lang } = useLang();
  const endpoint = useMemo(() => resolveEndpoint(), []);
  const cached = useMemo(() => (endpoint ? readCache() : null), [endpoint]);

  const [entries, setEntries] = useState<Entry[]>(cached?.entries ?? (endpoint ? [] : SAMPLE_ENTRIES));
  const [source, setSource] = useState<"notion" | "sample">(cached ? "notion" : "sample");
  const [syncedAt, setSyncedAt] = useState<number | null>(cached?.syncedAt ?? (endpoint ? null : Date.now()));
  const [status, setStatus] = useState<Status>(endpoint && !cached ? "loading" : "ready");
  const [active, setActive] = useState<Entry | null>(null);
  const inflight = useRef<AbortController | null>(null);
  const syncedAtRef = useRef(syncedAt);
  syncedAtRef.current = syncedAt;

  /**
   * @param force   브라우저/스냅샷 캐시를 무효화하고 다시 읽는다 (자동 폴링·가시성 복귀 포함)
   * @param manual  사용자가 "지금 동기화" 버튼을 직접 눌렀다 — 공개 프록시 실시간 조회를 먼저 시도
   */
  const refresh = useCallback((force = true, manual = false) => {
    if (!endpoint) return;
    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;
    setStatus((s) => (s === "loading" ? "loading" : "syncing"));
    syncFromNotion(endpoint, ctrl.signal, force, manual)
      .then((p) => {
        setEntries(p.entries);
        setSource("notion");
        setSyncedAt(p.syncedAt);
        setStatus("ready");
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        console.warn("[XCONDA허브] Notion 동기화 실패:", err);
        setEntries((prev) => (prev.length ? prev : SAMPLE_ENTRIES));
        setSource((s) => (cached ? s : "sample"));
        setStatus("error");
      });
  }, [endpoint, cached]);

  // 최초 동기화 + 주기적 폴링 + 탭 복귀 시 재동기화
  useEffect(() => {
    if (!endpoint) return;
    refresh(false); // 초기 로드는 캐시 허용
    const id = window.setInterval(() => document.visibilityState === "visible" && refresh(true), POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible" && syncedAtRef.current && Date.now() - syncedAtRef.current > 30_000) {
        refresh(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      inflight.current?.abort();
    };
  }, [endpoint, refresh]);

  /* ---------------- 모달 & 딥링크 (#post=ID) ---------------- */
  const openEntry = useCallback((entry: Entry) => {
    // Components receive localized entries; keep the source entry in state so
    // switching back to Korean can always recover the original fields.
    setActive(entries.find((source) => source.id === entry.id) ?? entry);
    try {
      history.replaceState(null, "", `#post=${encodeURIComponent(entry.id)}`);
    } catch {
      /* noop */
    }
  }, [entries]);

  const closeEntry = useCallback(() => {
    setActive(null);
    try {
      if (location.hash.startsWith("#post=")) history.replaceState(null, "", location.pathname + location.search);
    } catch {
      /* noop */
    }
  }, []);

  const openTool = useCallback(
    (slug: string) => {
      const tool = TOOLS.find((t) => t.slug === slug);
      if (!tool) return;
      // Notion에 해당 툴 가이드가 있으면 우선 사용
      const notionGuide = entries.find((e) => e.type === "guide" && e.tool?.toLowerCase() === tool.name.toLowerCase() && e.remote);
      openEntry(notionGuide ?? toolToEntry(tool));
    },
    [entries, openEntry]
  );

  useEffect(() => {
    const m = location.hash.match(/^#post=(.+)$/);
    if (!m || active) return;
    const id = decodeURIComponent(m[1]);
    const hit = entries.find((e) => e.id === id);
    if (hit) setActive(hit);
    else if (id.startsWith("tool-")) {
      const tool = TOOLS.find((t) => `tool-${t.slug}` === id);
      if (tool) setActive(toolToEntry(tool));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  const value = useMemo<Ctx>(() => {
    const localized = entries.map((entry) => localizeEntry(entry, lang));
    const notices = localized
      .filter((entry) => entry.type === "notice")
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || byDateDesc(a, b));
    return {
      entries: localized,
      notices,
      news: localized.filter((entry) => entry.type === "news").sort(byDateDesc),
      guides: localized.filter((entry) => entry.type === "guide").sort(byOrder),
      blogs: localized.filter((entry) => entry.type === "blog").sort(byDateDesc),
      faqs: localized.filter((entry) => entry.type === "faq").sort(byOrder),
      source,
      status,
      syncedAt,
      endpoint,
      refresh,
      openEntry,
      openTool,
      closeEntry,
      active: active ? localizeEntry(active, lang) : null,
    };
  }, [entries, lang, source, status, syncedAt, endpoint, refresh, openEntry, openTool, closeEntry, active]);

  return <ContentCtx.Provider value={value}>{children}</ContentCtx.Provider>;
}

export function useContent() {
  const ctx = useContext(ContentCtx);
  if (!ctx) throw new Error("useContent must be used within ContentProvider");
  return ctx;
}
