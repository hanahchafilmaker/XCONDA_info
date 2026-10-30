import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, Link2, Check, X, Pin } from "lucide-react";
import { useContent } from "../content/ContentContext";
import { categoryLabel, changeLabel, useLang } from "../i18n";
import type { Block } from "../content/types";
import { fetchBlocks, formatDate } from "../notion";
import { Blocks, Byline, CategoryBadge, NewBadge, SmartImage, TypeLabel, youTubeEmbed } from "./common";
import { isNew } from "../notion";
import { cn } from "../utils/cn";
import { STUDIO_URL } from "../content/tools";
import { shareUrlFor } from "../seo";

const KIND_TONE = {
  New: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  Improved: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  Fixed: "border-volt-400/35 bg-volt-400/10 text-volt-300",
};

export default function ArticleModal() {
  const { t, lang } = useLang();
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
    // 주소가 있는 글은 글 주소(/post/{slug}/)를, 없으면 예전 #post=ID 링크를 복사합니다.
    const url = shareUrlFor(active);
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="article-title" className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <button type="button" aria-label={t("common.close")} tabIndex={-1} onClick={closeEntry} className="absolute inset-0 cursor-default bg-ink-950/75 backdrop-blur-md" />
      <div className="anim-modal relative z-10 flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-black/10 bg-ink-900 shadow-[0_-20px_90px_-20px_rgba(0,0,0,0.9)] sm:max-w-3xl sm:rounded-[28px]">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-5 py-3.5 sm:px-7">
          <div className="flex min-w-0 items-center gap-2">
            <TypeLabel type={active.type} />
            {active.category && !["공지", "Notice"].includes(active.category) && (
              <CategoryBadge>{categoryLabel(active.category, lang)}</CategoryBadge>
            )}
            {active.version && <span className="font-mono text-xs text-neutral-500">{active.version}</span>}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={share}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:border-black/25 hover:text-black"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Link2 className="h-3.5 w-3.5" />}
              <span aria-live="polite">{copied ? t("common.linkCopied") : t("common.share")}</span>
            </button>
            <button
              ref={closeRef}
              type="button"
              onClick={closeEntry}
              aria-label={t("common.close")}
              className="grid h-9 w-9 place-items-center rounded-full text-neutral-500 transition hover:bg-black/10 hover:text-black"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="overflow-y-auto overscroll-contain">
          {(() => {
            // Link 가 YouTube 영상이면 상단 커버 자리에 바로 재생할 수 있게 끼워 넣습니다.
            const ytEmbed = active.url ? youTubeEmbed(active.url) : null;
            if (ytEmbed) {
              return (
                <div className="relative aspect-video w-full overflow-hidden bg-black">
                  <iframe
                    src={ytEmbed}
                    title={active.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-0"
                  />
                </div>
              );
            }
            return active.cover ? (
              <div className="relative aspect-[21/9] w-full overflow-hidden">
                <SmartImage src={active.cover} fallbackSrc={active.coverFallback} className="h-full w-full object-cover" />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-900/90 to-transparent" />
              </div>
            ) : null;
          })()}
          <article className="px-5 pb-10 pt-7 sm:px-10">
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              {active.pinned && (
                <span className="inline-flex items-center gap-1 text-volt-300">
                  <Pin className="h-3.5 w-3.5" /> {t("modal.pinnedNotice")}
                </span>
              )}
              {!active.id.startsWith("tool-") ? (
                <span className="inline-flex items-center gap-1.5 text-neutral-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <Byline author={active.author} date={active.date} className="text-xs" />
                </span>
              ) : null}
              {isNew(active.date) && active.type !== "faq" && !active.id.startsWith("tool-") && <NewBadge />}
            </div>
            <h2
              id="article-title"
              className={cn(
                "mt-3 text-balance text-2xl font-medium leading-snug tracking-[-0.03em] text-black sm:text-[2rem]",
                /* 툴 가이드는 제목이 제품명이므로 번역 대상에서 제외 */
                active.id.startsWith("tool-") && "notranslate"
              )}
            >
              {active.title}
            </h2>
            {active.summary && <p className="mt-3 text-pretty text-base leading-relaxed text-neutral-500">{active.summary}</p>}

            {active.changes && active.changes.length > 0 && (
              <ul className="mt-6 space-y-2 rounded-none bg-black/[0.03] p-4 border border-black/[0.07]">
                {active.changes.map((c, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-neutral-800">
                    <span className={cn("mt-0.5 w-[68px] shrink-0 rounded-md border py-0.5 text-center text-[11px] font-medium", KIND_TONE[c.kind])}>{changeLabel(c.kind, lang)}</span>
                    {c.text}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8">
              {loading ? (
                <div className="space-y-3" aria-label={t("modal.loadingAria")}>
                  {[100, 92, 96, 70, 88].map((w, i) => (
                    <div key={i} className="skeleton h-4 rounded" style={{ width: `${w}%` }} />
                  ))}
                  <div className="skeleton mt-4 h-40 w-full rounded-none" />
                </div>
              ) : blocks && blocks.length ? (
                <Blocks blocks={blocks} alt={active.title} />
              ) : null}
            </div>

            {active.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {active.tags.map((t) => (
                  <span key={t} className="rounded-full bg-black/[0.05] px-2.5 py-1 text-xs text-neutral-500">#{t}</span>
                ))}
              </div>
            )}

            {active.url && (
              <a
                href={active.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-extrabold text-white transition hover:opacity-80 active:scale-95"
              >
                {active.type === "guide" ? t("modal.tryInStudio") : t("common.readMore")}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            )}

            {related.length > 0 && (
              <div className="mt-12 border-t border-black/[0.06] pt-8">
                <p className="text-sm font-medium text-black">{t("modal.related")}</p>
                <ul className="mt-3 divide-y divide-black/[0.05]">
                  {related.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => openEntry(r)}
                        className="group flex w-full items-center justify-between gap-4 py-3 text-left"
                      >
                        <span className="truncate text-sm text-neutral-700 transition group-hover:text-black">{r.title}</span>
                        <span className="shrink-0 text-xs text-neutral-500">{formatDate(r.date)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <a href={STUDIO_URL} className="mt-10 inline-flex items-center gap-2 rounded-full border border-volt-400/40 px-5 py-3 text-sm font-medium text-volt-400 transition hover:border-volt-400 hover:text-volt-300">
              {t("modal.visitXconda")}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </article>
        </div>
      </div>
    </div>
  );
}
