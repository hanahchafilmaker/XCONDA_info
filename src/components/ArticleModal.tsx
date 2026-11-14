import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { ArrowUpRight, BookOpen, CalendarDays, Link2, Check, Printer, X, Pin } from "lucide-react";
import { useContent } from "../content/ContentContext";
import { categoryLabel, changeLabel, useLang } from "../i18n";
import type { Block } from "../content/types";
import { cleanFaqBlocks } from "../content/body";
import { fetchBlocks, formatDate } from "../notion";
import { Blocks, Byline, CategoryBadge, NewBadge, SmartImage, TypeLabel, youTubeEmbed } from "./common";
import { isNew } from "../notion";
import { cn } from "../utils/cn";
import { TOOLS } from "../content/tools";
import { htmlGuideLabels, htmlGuidePath } from "../content/htmlGuides";
import { hubAbsolute, hubBase, shareUrlFor } from "../seo";
import { productLinks } from "../content/cta";
import { isEndedTitle } from "../content/seo";

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
  const [copied, setCopied] = useState(false);
  const [guideView, setGuideView] = useState<"illustrated" | "original">("illustrated");
  const [frameStatus, setFrameStatus] = useState<"loading" | "ready" | "error">("loading");
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameCleanup = useRef<(() => void) | null>(null);
  const modalGuidePath = activeToolSlug ? htmlGuidePath(activeToolSlug, target) : undefined;
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
    setGuideView("illustrated");
    setFrameStatus("loading");
    return () => {
      frameCleanup.current?.();
      frameCleanup.current = null;
    };
  }, [activeToolSlug, target]);

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

  const guideTool = active.type === "guide"
    ? TOOLS.find((tool) => active.id === `tool-${tool.slug}` || (active.tool && active.tool.toLowerCase() === tool.name.toLowerCase()))
    : undefined;
  const guidePath = guideTool ? htmlGuidePath(guideTool.slug, target) : undefined;

  const related = entries
    // 끝난 행사 글(제목에 「종료」)은 추천하지 않습니다 — 정적 페이지의 관련 글과 같은 기준.
    .filter((e) => e.id !== active.id && e.type === active.type && e.type !== "faq" && !isEndedTitle(e.title))
    .slice(0, 3);

  const share = () => {
    // Tool-dialog links reopen the same illustrated guide and selected language;
    // ordinary article links continue to use their canonical article URL.
    const url = modalGuidePath && activeToolSlug
      ? `${hubAbsolute("")}?lang=${encodeURIComponent(target)}#post=${encodeURIComponent(`tool-${activeToolSlug}`)}`
      : shareUrlFor(active);
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const onFrameLoad = (event: SyntheticEvent<HTMLIFrameElement>) => {
    frameCleanup.current?.();
    frameCleanup.current = null;
    try {
      const frame = event.currentTarget;
      const doc = frame.contentDocument;
      if (!doc?.querySelector(".slide.cover")) {
        setFrameStatus("error");
        return;
      }
      doc.documentElement.classList.add("xconda-guide-embedded");
      const onKey = (keyEvent: KeyboardEvent) => {
        // Escape first closes an enlarged screenshot, then closes the outer dialog.
        if (doc.querySelector('.zoom[role="dialog"]:not([hidden])')) return;
        if (keyEvent.key === "Escape") {
          keyEvent.preventDefault();
          closeEntry();
          return;
        }
        if (keyEvent.key !== "Tab" || !dialogRef.current) return;
        const children = visibleFocusables(doc);
        const focused = doc.activeElement;
        const beforeFirst = focused === doc.body || focused === doc.documentElement || focused === children[0];
        const afterLast = focused === children[children.length - 1] || (!children.length && beforeFirst);
        const controls = visibleFocusables(dialogRef.current);
        const frameIndex = controls.indexOf(frame);
        if (frameIndex < 0) return;
        if (keyEvent.shiftKey && beforeFirst) {
          keyEvent.preventDefault();
          (controls[frameIndex - 1] ?? controls[controls.length - 1])?.focus();
        } else if (!keyEvent.shiftKey && afterLast) {
          keyEvent.preventDefault();
          (controls[frameIndex + 1] ?? controls[0])?.focus();
        }
      };
      doc.addEventListener("keydown", onKey, true);
      frameCleanup.current = () => doc.removeEventListener("keydown", onKey, true);
      setFrameStatus("ready");
    } catch {
      setFrameStatus("error");
    }
  };

  const printGuide = () => {
    if (frameStatus !== "ready") return;
    frameRef.current?.contentWindow?.focus();
    frameRef.current?.contentWindow?.print();
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={modalGuidePath ? "manual-modal-title" : "article-title"} className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <button type="button" aria-label={t("common.close")} tabIndex={-1} onClick={closeEntry} className="absolute inset-0 cursor-default bg-ink-950/75 backdrop-blur-md" />
      <div
        ref={dialogRef}
        className={cn(
          "anim-modal relative z-10 flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-black/10 bg-ink-900 shadow-[0_-20px_90px_-20px_rgba(0,0,0,0.9)] sm:rounded-[28px]",
          modalGuidePath ? "h-[94dvh] sm:h-[min(90dvh,900px)] sm:max-w-[980px]" : "sm:max-w-3xl",
        )}
      >
        {modalGuidePath && <h2 id="manual-modal-title" className="sr-only">{active.title} — {labels.illustrated}</h2>}
        {/* Top bar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-black/[0.06] px-4 py-3 sm:px-7">
          <div className="flex min-w-0 items-center gap-2">
            <TypeLabel type={active.type} />
            {active.category && !["공지", "Notice"].includes(active.category) && (
              <span className={modalGuidePath ? "hidden sm:contents" : "contents"}>
                <CategoryBadge>{categoryLabel(active.category, lang)}</CategoryBadge>
              </span>
            )}
            {active.version && <span className="font-mono text-xs text-neutral-500">{active.version}</span>}
          </div>
          <div className="ml-auto flex items-center gap-1">
            {modalGuidePath && (
              <button
                type="button"
                data-guide-view={guideView === "illustrated" ? "original" : "illustrated"}
                aria-controls={guideView === "illustrated" ? "original-guide" : "illustrated-guide"}
                onClick={() => setGuideView(guideView === "illustrated" ? "original" : "illustrated")}
                className="notranslate inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-black/[0.08]"
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {guideView === "illustrated" ? labels.original : labels.illustrated}
              </button>
            )}
            {modalGuidePath && guideView === "illustrated" && (
              <button
                type="button"
                data-guide-print
                onClick={printGuide}
                disabled={frameStatus !== "ready"}
                aria-label={labels.print}
                title={labels.print}
                className="notranslate inline-flex items-center gap-1.5 rounded-full border border-black/10 px-2.5 py-1.5 text-xs font-medium text-neutral-500 transition hover:border-black/25 hover:text-black disabled:opacity-40"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden min-[480px]:inline">{labels.print}</span>
              </button>
            )}
            <button
              type="button"
              data-modal-share
              onClick={share}
              aria-label={copied ? t("common.linkCopied") : t("common.share")}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-2.5 py-1.5 text-xs font-medium text-neutral-500 transition hover:border-black/25 hover:text-black"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Link2 className="h-3.5 w-3.5" />}
              <span aria-live="polite" className={modalGuidePath ? "sr-only min-[480px]:not-sr-only" : undefined}>{copied ? t("common.linkCopied") : t("common.share")}</span>
            </button>
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

        {modalGuidePath && (
          <div id="illustrated-guide" hidden={guideView !== "illustrated"} className="relative min-h-0 flex-1 bg-white">
            <iframe
              ref={frameRef}
              data-html-guide={activeToolSlug}
              src={`${hubBase()}${modalGuidePath}`}
              title={`${guideTool?.name ?? active.title} — ${labels.illustrated}`}
              sandbox="allow-scripts allow-same-origin allow-modals"
              onLoad={onFrameLoad}
              className="block h-full w-full border-0"
            />
            {frameStatus !== "ready" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white p-6 text-center text-sm text-neutral-600">
                <p role={frameStatus === "error" ? "alert" : "status"}>{frameStatus === "error" ? labels.failed : labels.loading}</p>
                {frameStatus === "error" && (
                  <a href={`${hubBase()}${modalGuidePath}`} target="_blank" rel="noopener noreferrer" className="notranslate underline underline-offset-4">
                    {labels.openNew} ↗
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        <div id="original-guide" ref={scrollRef} hidden={!!modalGuidePath && guideView === "illustrated"} className="min-h-0 overflow-y-auto overscroll-contain">
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
                  {active.modified && <span className="text-xs text-neutral-500">수정 {formatDate(active.modified)}</span>}
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
            <ProductLinks lang={String(target).slice(0, 2)} tool={active.tool} title={active.title} placement="top" />

            {guidePath && !modalGuidePath && (
              <a
                data-html-guide={guideTool?.slug}
                href={`${hubBase()}${guidePath}`}
                target="_blank"
                rel="noopener noreferrer"
                className="notranslate mt-6 inline-flex items-center gap-2 rounded-none bg-amber-50 px-4 py-3 text-sm font-medium text-neutral-900 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100"
              >
                {htmlGuideLabels[target].read}
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
            )}

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
