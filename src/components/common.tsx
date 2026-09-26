import { useState, type ReactNode } from "react";
import { Check, Copy, ExternalLink, ImageOff, RefreshCw } from "lucide-react";
import type { Block, EntryType, Rich } from "../content/types";
import { useContent } from "../content/ContentContext";
import { useLang, typeLabel } from "../i18n";
import { timeAgo } from "../notion";
import { cn } from "../utils/cn";

/* ----------------------------- Badges ----------------------------- */

const CATEGORY_TONE: Record<string, string> = {
  공지: "bg-violet-400/12 text-violet-200 ring-violet-400/25",
  점검: "bg-amber-400/12 text-amber-200 ring-amber-400/25",
  이벤트: "bg-fuchsia-400/12 text-fuchsia-200 ring-fuchsia-400/25",
  정책: "bg-sky-400/12 text-sky-200 ring-sky-400/25",
  업데이트: "bg-emerald-400/12 text-emerald-200 ring-emerald-400/25",
};

export function CategoryBadge({ children, className }: { children: ReactNode; className?: string }) {
  const tone = typeof children === "string" ? CATEGORY_TONE[children] : undefined;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        tone ?? "bg-white/[0.06] text-zinc-300 ring-white/10",
        className
      )}
    >
      {children}
    </span>
  );
}

export function TypeLabel({ type }: { type: EntryType }) {
  const { lang } = useLang();
  return <CategoryBadge>{typeLabel(type, lang)}</CategoryBadge>;
}

export function NewBadge() {
  return (
    <span className="bg-brand inline-flex shrink-0 items-center rounded-full px-1.5 py-px text-[9px] font-bold tracking-wider text-white">
      NEW
    </span>
  );
}

/* --------------------------- Sync status --------------------------- */

export function SyncStatus({ className }: { className?: string }) {
  const { t, pick } = useLang();
  const { source, status, syncedAt, refresh, endpoint } = useContent();
  const live = source === "notion" && status !== "error";
  const label =
    status === "loading"
      ? t("sync.loading")
      : status === "syncing"
        ? t("sync.syncing")
        : live
          ? pick(
              `Notion 실시간 연동 · ${syncedAt ? timeAgo(syncedAt) : ""}`,
              `Live from Notion · ${syncedAt ? timeAgo(syncedAt) : ""}`
            )
          : status === "error"
            ? t("sync.error")
            : t("sync.sample");
  return (
    <div className={cn("glass inline-flex items-center gap-2 rounded-full py-1.5 pl-3 pr-1.5 text-xs text-zinc-300", className)}>
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
            live ? "bg-emerald-400" : status === "error" ? "bg-rose-400" : "bg-amber-400"
          )}
        />
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", live ? "bg-emerald-400" : status === "error" ? "bg-rose-400" : "bg-amber-400")} />
      </span>
      <NotionMark className="h-3.5 w-3.5 text-zinc-200" />
      <span aria-live="polite">{label}</span>
      {endpoint && (
        <button
          type="button"
          onClick={refresh}
          aria-label={t("sync.now")}
          className="grid h-6 w-6 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", (status === "syncing" || status === "loading") && "animate-spin")} />
        </button>
      )}
      {!endpoint && <span className="w-1.5" />}
    </div>
  );
}

export function NotionMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M4.46 4.2c.75.6 1.03.56 2.44.46l13.28-.8c.28 0 .05-.28-.05-.33l-2.2-1.6c-.43-.33-1-.7-2.1-.61L2.97 2.28c-.47.04-.56.28-.38.47l1.87 1.45zm.8 3.1v13.97c0 .75.37 1.03 1.22.98l14.6-.84c.84-.05.94-.56.94-1.17V6.36c0-.6-.24-.94-.75-.89l-15.26.89c-.56.05-.75.33-.75.94zm14.41.75c.1.42 0 .84-.42.89l-.7.14v10.3c-.61.33-1.17.52-1.64.52-.75 0-.94-.24-1.5-.94l-4.6-7.2v6.97l1.46.33s0 .84-1.17.84l-3.22.19c-.1-.19 0-.66.33-.75l.84-.23V9.84L7.88 9.75c-.1-.42.14-1.03.8-1.08l3.46-.23 4.77 7.3V9.28l-1.22-.14c-.1-.52.28-.89.75-.94l3.23-.14z" />
    </svg>
  );
}

/* ---------------------------- Smart image ---------------------------- */

export function SmartImage({ src, alt = "", className }: { src?: string; alt?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cn("grid place-items-center bg-gradient-to-br from-violet-600/25 via-fuchsia-600/15 to-amber-500/15", className)}>
        <ImageOff className="h-6 w-6 text-white/30" aria-hidden />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={className} />;
}

/* --------------------------- Rich text --------------------------- */

export function RichText({ value }: { value: Rich }) {
  if (typeof value === "string") return <>{value}</>;
  return (
    <>
      {value.map((s, i) => {
        let node: ReactNode = s.text;
        if (s.code) node = <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-fuchsia-200">{node}</code>;
        if (s.bold) node = <strong className="font-semibold text-white">{node}</strong>;
        if (s.italic) node = <em>{node}</em>;
        if (s.strike) node = <s className="text-zinc-500">{node}</s>;
        if (s.href)
          node = (
            <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-fuchsia-300 underline decoration-fuchsia-300/40 underline-offset-4 hover:decoration-fuchsia-300">
              {node}
            </a>
          );
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}

function youTubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function CodeBlock({ text, language }: { text: string; language?: string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative overflow-hidden rounded-xl bg-black/40 ring-1 ring-white/[0.08]">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2 text-[11px] text-zinc-500">
        <span className="font-mono">{language ?? "code"}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(text).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-300" /> : <Copy className="h-3 w-3" />}
          {copied ? t("common.copied") : t("common.copy")}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-zinc-300">
        <code>{text}</code>
      </pre>
    </div>
  );
}

/* --------------------------- Block renderer --------------------------- */

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4 text-[15px] leading-[1.8] text-zinc-300">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "p":
            return <p key={i}><RichText value={b.text} /></p>;
          case "h2":
            return <h3 key={i} className="pt-4 text-xl font-semibold tracking-[-0.02em] text-white"><RichText value={b.text} /></h3>;
          case "h3":
            return <h4 key={i} className="pt-2 text-base font-semibold text-white"><RichText value={b.text} /></h4>;
          case "ul":
            return (
              <ul key={i} className="space-y-2 pl-1">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="bg-brand mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span><RichText value={it} /></span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="space-y-3">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/[0.07] font-mono text-xs font-medium text-white ring-1 ring-inset ring-white/10">
                      {j + 1}
                    </span>
                    <span><RichText value={it} /></span>
                  </li>
                ))}
              </ol>
            );
          case "todo":
            return (
              <ul key={i} className="space-y-2">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-3">
                    <span className={cn("mt-1 grid h-4.5 w-4.5 shrink-0 place-items-center rounded ring-1 ring-inset", it.checked ? "bg-brand ring-transparent" : "ring-white/20")}>
                      {it.checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </span>
                    <span className={cn(it.checked && "text-zinc-400")}><RichText value={it.text} /></span>
                  </li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote key={i} className="border-l-2 border-fuchsia-400/60 pl-4 text-zinc-200 italic">
                <RichText value={b.text} />
              </blockquote>
            );
          case "callout":
            return (
              <div key={i} className="flex gap-3 rounded-xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/[0.08]">
                <span className="text-lg leading-7" aria-hidden>{b.icon ?? "💡"}</span>
                <p className="text-zinc-200"><RichText value={b.text} /></p>
              </div>
            );
          case "code":
            return <CodeBlock key={i} text={b.text} language={b.language} />;
          case "divider":
            return <hr key={i} className="border-white/10" />;
          case "img":
            return (
              <figure key={i} className="overflow-hidden rounded-xl ring-1 ring-white/10">
                <SmartImage src={b.src} alt={b.caption ?? ""} className="w-full min-h-40 object-cover" />
                {b.caption && <figcaption className="bg-white/[0.02] px-4 py-2 text-xs text-zinc-500">{b.caption}</figcaption>}
              </figure>
            );
          case "video": {
            const yt = youTubeEmbed(b.src);
            return (
              <figure key={i} className="overflow-hidden rounded-xl ring-1 ring-white/10">
                {yt ? (
                  <iframe src={yt} title={b.caption ?? "video"} className="aspect-video w-full" allowFullScreen loading="lazy" />
                ) : (
                  <video src={b.src} controls playsInline className="aspect-video w-full bg-black" />
                )}
                {b.caption && <figcaption className="px-4 py-2 text-xs text-zinc-500">{b.caption}</figcaption>}
              </figure>
            );
          }
          case "link":
            return (
              <a
                key={i}
                href={b.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-zinc-200 ring-1 ring-inset ring-white/[0.08] transition hover:bg-white/[0.06]"
              >
                <span className="truncate">{b.caption ?? b.href}</span>
                <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500" />
              </a>
            );
          case "toggle":
            return (
              <details key={i} className="group rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-inset ring-white/[0.06]">
                <summary className="cursor-pointer list-none font-medium text-white marker:hidden">
                  <span className="mr-2 inline-block transition-transform group-open:rotate-90">▸</span>
                  <RichText value={b.text} />
                </summary>
                {b.children && <div className="mt-3"><Blocks blocks={b.children} /></div>}
              </details>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
