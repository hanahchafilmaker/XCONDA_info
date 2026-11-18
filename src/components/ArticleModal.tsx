import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, Link2, X, Pin } from "lucide-react";
import { useContent } from "../content/ContentContext";
import { categoryLabel, changeLabel, useLang } from "../i18n";
import type { Block } from "../content/types";
import { cleanFaqBlocks } from "../content/body";
import { fetchBlocks, formatDate } from "../notion";
import { Blocks, Byline, CategoryBadge, NewBadge, SmartImage, TypeLabel, youTubeEmbed } from "./common";
import { isNew } from "../notion";
import { cn } from "../utils/cn";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { htmlGuideLabels, htmlGuideUrl } from "../content/htmlGuides";
import { getToolVideo } from "../content/toolVideos";
import { hubAbsolute, shareUrlFor } from "../seo";
import { productLinks } from "../content/cta";
import { isEndedTitle } from "../content/seo";
import { DRIVE_GUIDE_UPDATED } from "../content/driveGuides";

/**
 * 제품 사이트 링크(관련 툴 · 무료 시작 · 요금). 정적 페이지(scripts/build-seo.mjs)와 같은
 * 함수(src/content/cta.js)로 주소를 만들어 UTM 이 어긋나지 않게 합니다.
 */
function ProductLinks({ lang, tool, title, placement }: { lang: string; tool?: string; title: string; placement: "top" | "bottom" }) {
  const { label, links } = productLinks({ lang, tool, title, placement });
  return (
    <nav aria-label={label} data-cta={placement} className={cn("notranslate flex flex-wrap gap-2", placement === "top" ? "mt-5" : "mt-10")}>
      {links.map((link, i) => (
        <a
          key={link.kind}
          href={link.href}
          data-cta-kind={link.kind}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition active:scale-95",
            i === 0 ? "border-black bg-black text-white hover:opacity-80" : "border-black/20 text-neutral-800 hover:border-black"
          )}
        >
          {link.label}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </a>
      ))}
    </nav>
  );
}

const KIND_TONE = {
  New: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  Improved: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  Fixed: "border-volt-400/35 bg-volt-400/10 text-volt-300",
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
const visibleFocusables = (root: ParentNode) =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0);

export default function ArticleModal() {
  const { t, lang, target } = useLang();
  const { active, activeToolSlug, closeEntry, endpoint, entries, openEntry } = useContent();
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const modalGuideUrl = activeToolSlug ? htmlGuideUrl(activeToolSlug, target) : undefined;
  const modalVideoUrl = activeToolSlug ? getToolVideo(activeToolSlug, target) : undefined;
  const focusKey = activeToolSlug ?? active?.id;
  const labels = htmlGuideLabels[target];

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
    if (!focusKey) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeEntry();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const controls = visibleFocusables(dialogRef.current);
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      prevFocus?.focus?.();
    };
  }, [focusKey, closeEntry]);

  if (!active) return null;

  const related = entries
    // 끝난 행사 글(제목에 「종료」)은 추천하지 않습니다 — 정적 페이지의 관련 글과 같은 기준.
    .filter((e) => e.id !== active.id && e.type === active.type && e.type !== "faq" && !isEndedTitle(e.title))
    .slice(0, 3);

  const share = async () => {
    // Tool-dialog links reopen the same current guide and selected language;
    // ordinary article links continue to use their canonical article URL.
    const url = modalGuideUrl && activeToolSlug
      ? `${hubAbsolute("")}?lang=${encodeURIComponent(target)}#post=${encodeURIComponent(`tool-${activeToolSlug}`)}`
      : shareUrlFor(active);
    setSharing(true);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      toast.success(t("common.linkCopied"), { id: "share-link" });
    } catch {
      toast.error(t("common.copyFailed"), { id: "share-link" });
    } finally {
      setSharing(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={modalGuideUrl ? "manual-modal-title" : "article-title"} className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <button type="button" aria-label={t("common.close")} tabIndex={-1} onClick={closeEntry} className="absolute inset-0 cursor-default bg-neutral-950/35 backdrop-blur-sm" />
      <div
        ref={dialogRef}
        className={cn(
          "anim-modal relative z-10 flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-black/10 bg-ink-900 shadow-2xl sm:rounded-2xl",
          modalGuideUrl ? "h-[94dvh] sm:h-[min(90dvh,900px)] sm:max-w-[980px]" : "sm:max-w-3xl",
        )}
      >
        {modalGuideUrl && <h2 id="manual-modal-title" className="sr-only">{active.title} — {labels.illustrated}</h2>}
        {/* Top bar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-black/[0.06] px-4 py-3 sm:px-7">
          <div className="flex min-w-0 items-center gap-2">
            <TypeLabel type={active.type} />
            {active.category && !["공지", "Notice"].includes(active.category) && (
              <span className={modalGuideUrl ? "hidden sm:contents" : "contents"}>
                <CategoryBadge>{categoryLabel(active.category, lang)}</CategoryBadge>
              </span>
            )}
            {active.version && <span className="font-mono text-xs text-neutral-500">{active.version}</span>}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              data-modal-share
              onClick={share}
              disabled={sharing}
              aria-label={t("common.share")}
            >
              <Link2 className="h-3.5 w-3.5" aria-hidden />
              <span className={modalGuideUrl ? "sr-only min-[480px]:not-sr-only" : undefined}>{t("common.share")}</span>
            </Button>
            <button
              ref={closeRef}
              type="button"
              data-modal-close
              onClick={closeEntry}
              aria-label={t("common.close")}
              className="grid h-9 w-9 place-items-center rounded-full text-neutral-500 transition hover:bg-black/10 hover:text-black"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        <div id="original-guide" ref={scrollRef} className="min-h-0 overflow-y-auto overscroll-contain">
          {modalGuideUrl && (
            <section data-current-guide className="border-b border-black/[0.06] bg-neutral-50 px-4 py-6 sm:px-7">
              <div className="mx-auto max-w-4xl">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                  XCONDA / CURRENT GUIDE · {DRIVE_GUIDE_UPDATED} · {labels.illustrated}
                </p>
                <h3 className="mt-2 text-xl font-bold tracking-tight text-neutral-950 notranslate">{active.title}</h3>
                {modalVideoUrl && (
                  <video
                    data-tool-video={activeToolSlug}
                    src={modalVideoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    aria-label={`${active.title} 공식 영상 가이드`}
                    className="mt-5 aspect-video w-full rounded-xl bg-black"
                  />
                )}
                <div className="mt-5 overflow-hidden rounded-xl border border-neutral-200 bg-white">
                  <iframe
                    key={modalGuideUrl}
                    data-html-guide={activeToolSlug}
                    src={modalGuideUrl}
                    title={`${active.title} — ${labels.illustrated}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="block h-[min(70dvh,900px)] min-h-[520px] w-full border-0 bg-white"
                  />
                </div>
              </div>
            </section>
          )}

          {!modalGuideUrl && (() => {
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
              <div data-article-cover className="relative aspect-[1200/630] w-full overflow-hidden bg-neutral-100">
                <SmartImage src={active.cover} fallbackSrc={active.coverFallback} alt={active.title} className="block h-full w-full object-contain" />
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
                  {active.modified && <span className="text-xs text-neutral-500">수정 {formatDate(active.modified)}</span>}
                </span>
              ) : null}
              {isNew(active.date) && active.type !== "faq" && !active.id.startsWith("tool-") && <NewBadge />}
            </div>
            <h2
              id="article-title"
              className={cn(
                "mt-3 text-balance text-2xl font-bold leading-snug tracking-[-0.03em] text-black sm:text-[2rem]",
                /* 툴 가이드는 제목이 제품명이므로 번역 대상에서 제외 */
                active.id.startsWith("tool-") && "notranslate"
              )}
            >
              {active.title}
            </h2>
            {active.summary && <p className="mt-3 text-pretty text-base leading-relaxed text-neutral-500">{active.summary}</p>}
            <ProductLinks lang={String(target).slice(0, 2)} tool={active.tool} title={active.title} placement="top" />

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
                <Blocks blocks={active.type === "faq" ? cleanFaqBlocks(blocks) : blocks} alt={active.title} />
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
            <ProductLinks lang={String(target).slice(0, 2)} tool={active.tool} title={active.title} placement="bottom" />
          </article>
        </div>
      </div>
    </div>
  );
}
