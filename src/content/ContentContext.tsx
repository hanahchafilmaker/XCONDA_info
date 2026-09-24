import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Entry } from "./types";
import { SAMPLE_ENTRIES } from "./sample";
import { TOOLS, toolToEntry } from "./tools";
import { readCache, resolveEndpoint, syncFromNotion } from "../notion";

const POLL_MS = 3 * 60 * 1000;

type Status = "loading" | "ready" | "syncing" | "error";

type Ctx = {
  entries: Entry[];
  notices: Entry[];
  updates: Entry[];
  guides: Entry[];
  faqs: Entry[];
  source: "notion" | "sample";
  status: Status;
  syncedAt: number | null;
  endpoint?: string;
  refresh: () => void;
  openEntry: (e: Entry) => void;
  openTool: (slug: string) => void;
  closeEntry: () => void;
  active: Entry | null;
};

const ContentCtx = createContext<Ctx | null>(null);

const byDateDesc = (a: Entry, b: Entry) => +new Date(b.date) - +new Date(a.date);
const byOrder = (a: Entry, b: Entry) => (a.order ?? 999) - (b.order ?? 999) || byDateDesc(a, b);

export function ContentProvider({ children }: { children: ReactNode }) {
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

  const refresh = useCallback(() => {
    if (!endpoint) return;
    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;
    setStatus((s) => (s === "loading" ? "loading" : "syncing"));
    syncFromNotion(endpoint, ctrl.signal)
      .then((p) => {
        setEntries(p.entries);
        setSource("notion");
        setSyncedAt(p.syncedAt);
        setStatus("ready");
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        console.warn("[XCONDA Guide] Notion 동기화 실패:", err);
        setEntries((prev) => (prev.length ? prev : SAMPLE_ENTRIES));
        setSource((s) => (cached ? s : "sample"));
        setStatus("error");
      });
  }, [endpoint, cached]);

  // 최초 동기화 + 주기적 폴링 + 탭 복귀 시 재동기화
  useEffect(() => {
    if (!endpoint) return;
    refresh();
    const id = window.setInterval(() => document.visibilityState === "visible" && refresh(), POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible" && syncedAtRef.current && Date.now() - syncedAtRef.current > 30_000) refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      inflight.current?.abort();
    };
  }, [endpoint, refresh]);

  /* ---------------- 모달 & 딥링크 (#post=ID) ---------------- */
  const openEntry = useCallback((e: Entry) => {
    setActive(e);
    try {
      history.replaceState(null, "", `#post=${encodeURIComponent(e.id)}`);
    } catch {
      /* noop */
    }
  }, []);

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
    const notices = entries
      .filter((e) => e.type === "notice")
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || byDateDesc(a, b));
    return {
      entries,
      notices,
      updates: entries.filter((e) => e.type === "update").sort(byDateDesc),
      guides: entries.filter((e) => e.type === "guide").sort(byOrder),
      faqs: entries.filter((e) => e.type === "faq").sort(byOrder),
      source,
      status,
      syncedAt,
      endpoint,
      refresh,
      openEntry,
      openTool,
      closeEntry,
      active,
    };
  }, [entries, source, status, syncedAt, endpoint, refresh, openEntry, openTool, closeEntry, active]);

  return <ContentCtx.Provider value={value}>{children}</ContentCtx.Provider>;
}

export function useContent() {
  const ctx = useContext(ContentCtx);
  if (!ctx) throw new Error("useContent must be used within ContentProvider");
  return ctx;
}
