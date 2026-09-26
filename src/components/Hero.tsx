import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, ChevronRight, Command, Megaphone, Rocket, Search, Sparkles, Wrench } from "lucide-react";
import { Container, Serif } from "./ui";
import { localizeTool, useLang } from "../i18n";
import { useContent } from "../content/ContentContext";
import { TOOLS } from "../content/tools";
import type { Entry } from "../content/types";
import { formatDate, isNew, timeAgo } from "../notion";
import { NewBadge, SyncStatus, TypeLabel } from "./common";
import { cn } from "../utils/cn";

type Result =
  | { kind: "entry"; entry: Entry; score: number }
  | { kind: "tool"; slug: string; name: string; tagline: string; score: number };

const QUICK = [
  { label: "Turn (턴)", slug: "turn" },
  { label: "FlexBoard (플렉스보드)", slug: "flexboard" },
  { label: "Blocking Board (블로킹보드)", slug: "blocking-board" },
  { label: "Director's Cut", slug: "directors-cut" },
  { label: "Art Director Pro", slug: "art-director-pro" },
];

function score(hay: string, q: string) {
  const h = hay.toLowerCase();
  if (h.startsWith(q)) return 3;
  if (h.includes(q)) return 2;
  return q.split(/\s+/).every((w) => h.includes(w)) ? 1 : 0;
}

export default function Hero() {
  const { t, pick, lang } = useLang();
  const { entries, notices, updates, guides, openEntry, openTool, syncedAt } = useContent();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const pinned = notices.find((n) => n.pinned) ?? notices[0];
  const latestUpdate = updates[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA")) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    };
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setFocused(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const results = useMemo<Result[]>(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    const r: Result[] = [];
    for (const e of entries) {
      const s = Math.max(score(e.title, query) * 2, score(`${e.summary} ${e.tags.join(" ")} ${e.category} ${e.tool ?? ""}`, query));
      if (s) r.push({ kind: "entry", entry: e, score: s });
    }
    for (const tool of TOOLS.map((item) => localizeTool(item, lang))) {
      const s = Math.max(score(tool.name, query) * 2, score(`${tool.tagline} ${tool.desc} ${tool.group}`, query));
      if (s) r.push({ kind: "tool", slug: tool.slug, name: tool.name, tagline: tool.tagline, score: s + 0.5 });
    }
    return r.sort((a, b) => b.score - a.score).slice(0, 8);
  }, [q, entries, lang]);

  useEffect(() => setCursor(0), [q]);

  const choose = (r: Result) => {
    setFocused(false);
    if (r.kind === "entry") openEntry(r.entry);
    else openTool(r.slug);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[cursor]);
    } else if (e.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  const showResults = focused && q.trim().length > 0;

  return (
    <section id="top" className="relative isolate pb-16 pt-32 sm:pb-24 sm:pt-40">
      {/* Ambient */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="grid-bg mask-radial absolute inset-0 opacity-70" />
        <div className="animate-drift absolute -top-40 left-1/2 h-[40rem] w-[40rem] -translate-x-[75%] rounded-full bg-violet-600/25 blur-[120px]" />
        <div className="animate-drift-slow absolute -top-24 left-1/2 h-[32rem] w-[32rem] -translate-x-[5%] rounded-full bg-fuchsia-600/20 blur-[120px]" />
        <div className="grain absolute inset-0 opacity-[0.06] mix-blend-overlay" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink-950" />
      </div>

      <Container>
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="hero-in" style={{ animationDelay: "0ms" }}>
            <SyncStatus />
          </div>

          <h1
            className="hero-in mt-7 text-balance text-[2.5rem] font-bold leading-[1.12] tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl"
            style={{ animationDelay: "80ms" }}
          >
            <span className="text-gradient-soft">XCONDA</span> <Serif className="text-gradient pr-1 font-normal">Guide</Serif>
            <br />
            <span className="text-gradient-soft">{t("hero.title2")}</span>
          </h1>

          <p className="hero-in mt-6 max-w-xl text-pretty text-base leading-relaxed text-zinc-400 sm:text-lg" style={{ animationDelay: "160ms" }}>
            {t("hero.subtitle")}
          </p>

          {/* Search */}
          <div ref={boxRef} className="hero-in relative mt-9 w-full max-w-2xl" style={{ animationDelay: "240ms" }}>
            <div
              className={cn(
                "gradient-border rounded-2xl p-px transition-shadow duration-500",
                focused ? "shadow-[0_0_0_4px_rgba(139,92,246,0.15),0_20px_70px_-20px_rgba(236,72,153,0.5)]" : "shadow-[0_20px_60px_-28px_rgba(139,92,246,0.6)]"
              )}
            >
              <div className="glass-strong flex items-center gap-3 rounded-[15px] px-4 sm:px-5">
                <Search className="h-5 w-5 shrink-0 text-zinc-400" aria-hidden />
                <label htmlFor="guide-search" className="sr-only">{t("hero.searchLabel")}</label>
                <input
                  ref={inputRef}
                  id="guide-search"
                  type="search"
                  role="combobox"
                  aria-expanded={showResults}
                  aria-controls="search-results"
                  aria-activedescendant={showResults && results[cursor] ? `sr-${cursor}` : undefined}
                  autoComplete="off"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onKeyDown={onKeyDown}
                  placeholder={t("hero.searchPlaceholder")}
                  className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-white placeholder-zinc-500 outline-none sm:h-16 sm:text-base [&::-webkit-search-cancel-button]:hidden"
                />
                <kbd className="hidden shrink-0 items-center gap-0.5 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-1 font-mono text-[11px] text-zinc-400 sm:inline-flex">
                  <Command className="h-3 w-3" />K
                </kbd>
              </div>
            </div>

            {showResults && (
              <div className="modal-in glass-strong absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl text-left shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
                {results.length ? (
                  <ul id="search-results" role="listbox" className="max-h-[22rem] overflow-y-auto p-1.5">
                    {results.map((r, i) => (
                      <li key={r.kind === "entry" ? r.entry.id : r.slug} id={`sr-${i}`} role="option" aria-selected={i === cursor}>
                        <button
                          type="button"
                          onMouseEnter={() => setCursor(i)}
                          onClick={() => choose(r)}
                          className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors", i === cursor ? "bg-white/[0.08]" : "hover:bg-white/[0.04]")}
                        >
                          {r.kind === "entry" ? (
                            <>
                              <TypeLabel type={r.entry.type} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm text-white">{r.entry.title}</span>
                                <span className="block truncate text-xs text-zinc-500">{r.entry.summary}</span>
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-fuchsia-400/12 px-2 py-0.5 text-[11px] font-semibold text-fuchsia-200 ring-1 ring-inset ring-fuchsia-400/25">
                                <Wrench className="h-3 w-3" /> {t("common.tool")}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm text-white">{pick(`${r.name} 사용법`, `${r.name} guide`)}</span>
                                <span className="block truncate text-xs text-zinc-500">{r.tagline}</span>
                              </span>
                            </>
                          )}
                          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-5 py-8 text-center text-sm text-zinc-400">
                    {pick(`“${q}”에 대한 결과가 없습니다. `, `No results for “${q}”. `)}
                    <a href="#support" className="text-fuchsia-300 underline underline-offset-4">{t("common.contact")}</a>
                  </div>
                )}
                <div className="hidden items-center gap-4 border-t border-white/5 px-4 py-2 text-[11px] text-zinc-500 sm:flex">
                  <span>↑↓ {t("hero.keyMove")}</span><span>↵ {t("hero.keyOpen")}</span><span>esc {t("hero.keyClose")}</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick chips */}
          <div className="hero-in mt-5 flex flex-wrap items-center justify-center gap-2" style={{ animationDelay: "320ms" }}>
            <span className="text-xs text-zinc-500">{t("hero.quickLinks")}</span>
            {QUICK.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => openTool(c.slug)}
                className="rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 ring-1 ring-inset ring-white/10 transition hover:bg-white/10 hover:text-white"
              >
                {c.label}
              </button>
            ))}
            <a href="#credits" className="rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 ring-1 ring-inset ring-white/10 transition hover:bg-white/10 hover:text-white">
              {t("hero.rechargeCredits")}
            </a>
          </div>
        </div>

        {/* Pinned notice + status cards */}
        <div className="hero-in mx-auto mt-14 grid max-w-5xl gap-3 md:grid-cols-[1.6fr_1fr_1fr]" style={{ animationDelay: "420ms" }}>
          {pinned ? (
            <button
              type="button"
              onClick={() => openEntry(pinned)}
              className="group glass flex items-start gap-4 rounded-2xl p-5 text-left transition hover:bg-white/[0.07]"
            >
              <span className="bg-brand grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-[0_8px_24px_-8px_rgba(236,72,153,0.8)]">
                <Megaphone className="h-4.5 w-4.5 text-white" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-xs text-zinc-400">
                  {pinned.pinned ? t("hero.pinnedNotice") : t("hero.latestNotice")} · {formatDate(pinned.date)}
                  {isNew(pinned.date) && <NewBadge />}
                </span>
                <span className="mt-1 block truncate font-semibold text-white">{pinned.title}</span>
                <span className="mt-0.5 line-clamp-1 block text-sm text-zinc-400">{pinned.summary}</span>
              </span>
              <ArrowRight className="mt-3 h-4 w-4 shrink-0 text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-white" />
            </button>
          ) : (
            <div className="skeleton h-[92px] rounded-2xl" />
          )}

          <a href="#updates" className="group glass flex items-center gap-4 rounded-2xl p-5 transition hover:bg-white/[0.07]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-400/12 text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs text-zinc-400">{t("hero.latestUpdate")}</span>
              <span className="block truncate font-semibold text-white">
                {latestUpdate ? `${latestUpdate.version ?? ""} · ${timeAgo(latestUpdate.date)}` : "—"}
              </span>
            </span>
          </a>

          <div className="glass grid grid-cols-3 divide-x divide-white/[0.06] rounded-2xl py-4 text-center">
            {[
              { icon: Megaphone, n: notices.length, l: t("hero.statNotices") },
              { icon: BookOpen, n: guides.length + TOOLS.length, l: t("hero.statGuides") },
              { icon: Rocket, n: updates.length, l: t("hero.statReleases") },
            ].map((s) => (
              <div key={s.l} className="flex flex-col items-center justify-center px-2">
                <span className="text-xl font-bold tabular-nums tracking-tight text-white">{s.n}</span>
                <span className="text-[11px] text-zinc-500">{s.l}</span>
              </div>
            ))}
          </div>
        </div>
        {syncedAt && <span className="sr-only">{t("hero.lastSynced")} {timeAgo(syncedAt)}</span>}
      </Container>
    </section>
  );
}
