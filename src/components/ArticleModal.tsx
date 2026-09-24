import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, Link2, Check, X, Pin } from "lucide-react";
import { useContent } from "../content/ContentContext";
import type { Block } from "../content/types";
import { fetchBlocks, formatDate } from "../notion";
import { Blocks, CategoryBadge, NewBadge, SmartImage, TypeLabel } from "./common";
import { isNew } from "../notion";
import { cn } from "../utils/cn";

const KIND_TONE = {
  New: "bg-emerald-400/12 text-emerald-200 ring-emerald-400/25",
  Improved: "bg-sky-400/12 text-sky-200 ring-sky-400/25",
  Fixed: "bg-amber-400/12 text-amber-200 ring-amber-400/25",
};

export default function ArticleModal() {
  const { active, closeEntry, endpoint, entries, openEntry } = useContent();
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!active) return;
    setBlocks(active.blocks ?? null);
    scrollRef.current?.scrollTo({ top: 0 });
    if (!active.blocks && active.remote && endpoint) {
      setLoading(true);
      fetchBlocks(endpoint, active.id)
        .then(setBlocks)
        .catch(() => setBlocks([]))
        .finally(() => setLoading(false));
    }
  }, [active, endpoint]);

  useEffect(() => {
    if (!active) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeEntry();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      prevFocus?.focus?.();
    };
  }, [active, closeEntry]);

  if (!active) return null;

  const related = entries
    .filter((e) => e.id !== active.id && e.type === active.type && e.type !== "faq")
    .slice(0, 3);

  const share = () => {
    const url = `${location.origin}${location.pathname}${location.search}#post=${encodeURIComponent(active.id)}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="article-title" className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <button type="button" aria-label="닫기" tabIndex={-1} onClick={closeEntry} className="absolute inset-0 cursor-default bg-ink-950/75 backdrop-blur-md" />
      <div className="modal-in glass-strong relative z-10 flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] sm:max-w-3xl sm:rounded-[28px]">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5 sm:px-7">
          <div className="flex min-w-0 items-center gap-2">
            <TypeLabel type={active.type} />
            {active.category && active.category !== "공지" && <CategoryBadge>{active.category}</CategoryBadge>}
            {active.version && <span className="font-mono text-xs text-zinc-400">{active.version}</span>}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Link2 className="h-3.5 w-3.5" />}
              <span aria-live="polite">{copied ? "링크 복사됨" : "공유"}</span>
            </button>
            <button
              ref={closeRef}
              type="button"
              onClick={closeEntry}
              aria-label="닫기"
              className="grid h-9 w-9 place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="overflow-y-auto overscroll-contain">
          {active.cover && (
            <div className="relative aspect-[21/9] w-full overflow-hidden">
              <SmartImage src={active.cover} className="h-full w-full object-cover" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-900/90 to-transparent" />
            </div>
          )}
          <article className="px-5 pb-10 pt-7 sm:px-10">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              {active.pinned && (
                <span className="inline-flex items-center gap-1 text-fuchsia-300">
                  <Pin className="h-3.5 w-3.5" /> 고정 공지
                </span>
              )}
              {!active.id.startsWith("tool-") ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> {formatDate(active.date)}
                </span>
              ) : null}
              {isNew(active.date) && active.type !== "faq" && !active.id.startsWith("tool-") && <NewBadge />}
            </div>
            <h2 id="article-title" className="mt-3 text-balance text-2xl font-bold leading-snug tracking-[-0.03em] text-white sm:text-[2rem]">
              {active.title}
            </h2>
            {active.summary && <p className="mt-3 text-pretty text-base leading-relaxed text-zinc-400">{active.summary}</p>}

            {active.changes && active.changes.length > 0 && (
              <ul className="mt-6 space-y-2 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.06]">
                {active.changes.map((c, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-zinc-200">
                    <span className={cn("mt-0.5 w-[68px] shrink-0 rounded-md py-0.5 text-center text-[11px] font-semibold ring-1 ring-inset", KIND_TONE[c.kind])}>{c.kind}</span>
                    {c.text}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8">
              {loading ? (
                <div className="space-y-3" aria-label="본문 불러오는 중">
                  {[100, 92, 96, 70, 88].map((w, i) => (
                    <div key={i} className="skeleton h-4 rounded" style={{ width: `${w}%` }} />
                  ))}
                  <div className="skeleton mt-4 h-40 w-full rounded-xl" />
                </div>
              ) : blocks && blocks.length ? (
                <Blocks blocks={blocks} />
              ) : null}
            </div>

            {active.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {active.tags.map((t) => (
                  <span key={t} className="rounded-full bg-white/[0.05] px-2.5 py-1 text-xs text-zinc-400">#{t}</span>
                ))}
              </div>
            )}

            {active.url && (
              <a
                href={active.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink-950 transition hover:shadow-[0_10px_30px_-8px_rgba(236,72,153,0.7)] active:scale-95"
              >
                {active.type === "guide" ? "스튜디오에서 바로 해보기" : "자세히 보기"}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            )}

            {related.length > 0 && (
              <div className="mt-12 border-t border-white/[0.06] pt-8">
                <p className="text-sm font-semibold text-white">관련 글</p>
                <ul className="mt-3 divide-y divide-white/[0.05]">
                  {related.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => openEntry(r)}
                        className="group flex w-full items-center justify-between gap-4 py-3 text-left"
                      >
                        <span className="truncate text-sm text-zinc-300 transition group-hover:text-white">{r.title}</span>
                        <span className="shrink-0 text-xs text-zinc-500">{formatDate(r.date)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
