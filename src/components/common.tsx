import { useState, type ReactNode } from "react";
import { Check, Copy, ExternalLink, ImageOff, PenLine } from "lucide-react";
import type { Block, EntryType, Rich } from "../content/types";
import { useContent } from "../content/ContentContext";
import { useLang, typeLabel } from "../i18n";
import { formatDate, isPublicEndpoint, timeAgo } from "../notion";
import { cn } from "../utils/cn";

/* ----------------------------- Badges ----------------------------- */

const CATEGORY_TONE: Record<string, string> = {
  점검: "bg-rose-400/10 text-rose-300",
  Maintenance: "bg-rose-400/10 text-rose-300",
};

export function CategoryBadge({ children, className }: { children: ReactNode; className?: string }) {
  const tone = typeof children === "string" ? CATEGORY_TONE[children] : undefined;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[12px] font-semibold",
        tone ?? "bg-white/[0.06] text-zinc-400",
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

/**
 * 작성자 · 글쓴 날짜 — 블로그 카드와 상세 모달이 같은 모양을 씁니다.
 * 날짜가 있으면 항상 보이고, 작성자(노션 Author)는 값이 있을 때만 붙습니다.
 */
export function Byline({ author, date, className }: { author?: string; date?: string; className?: string }) {
  const { t } = useLang();
  const when = date ? formatDate(date) : "";
  if (!author && !when) return null;
  return (
    <span
      data-byline={author || undefined}
      className={cn("inline-flex min-w-0 items-center gap-1.5 text-zinc-400", className)}
      title={[when, author ? `${t("common.author")}: ${author}` : ""].filter(Boolean).join(" · ")}
    >
      {when ? (
        <time dateTime={date} className="shrink-0 tabular-nums">
          {when}
        </time>
      ) : null}
      {when && author ? <span aria-hidden className="text-zinc-600">·</span> : null}
      {author ? (
        <>
          <PenLine className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
          <span className="sr-only">{t("common.author")}: </span>
          <span className="truncate">{author}</span>
        </>
      ) : null}
    </span>
  );
}

export function NewBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-volt-400 px-2 py-px text-[9px] font-extrabold tracking-wider text-ink-950">
      NEW
    </span>
  );
}

/* --------------------------- Sync status --------------------------- */

/**
 * (수동 "지금 동기화" 버튼은 10/21 UI 결정으로 숨김 — 방문자에게는 아래 배지로
 *  동기화 상태만 보여주고, 즉시 반영은 저장소 Actions 의 Notion 동기화 수동 실행으로 합니다.)
 */

/**
 * 서버 스냅샷이 이 시간보다 오래됐으면 "지연"으로 표시합니다.
 * GitHub 의 기본 `schedule` 은 수 시간까지 밀리므로, 배지만 초록색으로 두면
 * "노션에 올렸는데 사이트엔 왜 안 나오지?" 의 원인을 알 수 없습니다.
 * (해결: NOTION_SETUP.md 「⏱ 반영 속도 보장하기」 — 외부 스케줄러 10분 호출)
 */
const SYNC_DELAY_MS = 90 * 60 * 1000;

export function SyncStatus({ className }: { className?: string }) {
  const { t, pick } = useLang();
  const { source, status, syncedAt, endpoint } = useContent();
  const live = source === "notion" && status !== "error";
  const isPublic = endpoint ? isPublicEndpoint(endpoint) : false;
  const ago = syncedAt ? timeAgo(syncedAt) : "";
  const delayed = live && isPublic && !!syncedAt && Date.now() - syncedAt > SYNC_DELAY_MS;
  const label =
    status === "loading"
      ? t("sync.loading")
      : status === "syncing"
        ? t("sync.syncing")
        : live
          ? delayed
            ? pick(`Notion 동기화 지연 · ${ago}`, `Notion sync delayed · ${ago}`)
            : isPublic
              ? pick(`Notion 동기화 · ${ago}`, `Notion Synced · ${ago}`)
              : pick(`Notion 실시간 연동 · ${ago}`, `Live from Notion · ${ago}`)
          : status === "error"
            ? t("sync.error")
            : t("sync.sample");
  return (
    <div
      className={cn("inline-flex items-center gap-2 text-[13px] text-zinc-500", className)}
      title={
        delayed
          ? pick(
              `서버 동기화가 ${ago} 멈춰 있습니다 — 노션에 올린 새 글이 아직 사이트에 반영되지 않았을 수 있습니다. 저장소 Actions → “Notion 동기화” → Run workflow 로 즉시 반영하거나, NOTION_SETUP.md 의 「⏱ 반영 속도 보장하기」대로 외부 스케줄러를 설정하면 약 10분 주기로 반영됩니다.`,
              `The server snapshot is ${ago} — new Notion posts may not appear yet. Run the “Notion 동기화” workflow in Actions, or set up the external scheduler described in NOTION_SETUP.md for ~10-minute updates.`
            )
          : pick(
              "Notion 데이터베이스와 연동된 상태입니다. 노션에서 글 작성 시 Published 체크가 필요합니다. 표시된 시각은 서버 스냅샷이 만들어진 시각이며, 새 글은 다음 동기화 이후에 나타납니다.",
              "Connected to Notion database. The Published checkbox must be checked in Notion. The time shown is when the server snapshot was generated; new posts appear after the next sync."
            )
      }
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          live ? (delayed ? "bg-amber-400" : "bg-emerald-400") : status === "error" ? "bg-rose-400" : "bg-amber-400"
        )}
      />
      <NotionMark className="h-3.5 w-3.5 text-zinc-400" />
      <span aria-live="polite">{label}</span>
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

/**
 * 이미지 + 자동 폴백.
 * 노션에 직접 올린 파일은 열 수 있는 공개 주소가 둘(prod-files · attachment 프록시)이라
 * 첫 주소가 실패하면 `fallbackSrc` 로 한 번 더 시도하고, 그래도 안 되면 자리 표시자를 씁니다.
 */
export function SmartImage({
  src,
  fallbackSrc,
  alt = "",
  className,
}: {
  src?: string;
  fallbackSrc?: string;
  alt?: string;
  className?: string;
}) {
  // 0 = 첫 주소 · 1 = 폴백 주소 · 2 = 자리 표시자
  const [stage, setStage] = useState(0);
  const active = stage === 0 ? src : stage === 1 ? fallbackSrc : undefined;
  if (!active) {
    return (
      <div className={cn("grid place-items-center bg-gradient-to-br from-volt-400/18 via-volt-500/10 to-ink-800", className)}>
        <ImageOff className="h-6 w-6 text-white/30" aria-hidden />
      </div>
    );
  }
  return (
    <img
      src={active}
      alt={alt}
      loading="lazy"
      onError={() => setStage((s) => Math.min(2, s + 1))}
      className={className}
    />
  );
}

/* --------------------------- Rich text --------------------------- */

export function RichText({ value }: { value: Rich }) {
  if (typeof value === "string") return <>{value}</>;
  return (
    <>
      {value.map((s, i) => {
        let node: ReactNode = s.text;
        if (s.code) node = <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-volt-300">{node}</code>;
        if (s.bold) node = <strong className="font-semibold text-white">{node}</strong>;
        if (s.italic) node = <em>{node}</em>;
        if (s.strike) node = <s className="text-zinc-500">{node}</s>;
        if (s.href)
          node = (
            <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-volt-300 underline decoration-volt-400/40 underline-offset-4 hover:decoration-volt-400">
              {node}
            </a>
          );
        const colorMap: Record<string, string> = { gray: "#9ca3af", brown: "#a16207", orange: "#f97316", yellow: "#eab308", green: "#22c55e", blue: "#3b82f6", purple: "#a855f7", pink: "#ec4899", red: "#ef4444", gray_background: "#6b7280", brown_background: "#78350f", orange_background: "#7c2d12", yellow_background: "#713f12", green_background: "#14532d", blue_background: "#1e3a8a", purple_background: "#581c87", pink_background: "#831843", red_background: "#7f1d1d" };
        return <span key={i} style={s.color ? { color: colorMap[s.color] ?? undefined, backgroundColor: s.color.endsWith("_background") ? `${colorMap[s.color]}33` : undefined } : undefined}>{node}</span>;
      })}
    </>
  );
}

function youTubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

/**
 * Google Drive controls its own `frame-ancestors` policy. It can block an otherwise
 * valid `/preview` URL depending on the file's sharing/access state, and that policy
 * cannot be overridden by this site. Keep Drive URLs as links rather than iframes.
 */
const isDriveUrl = (url: string) => /(^|\.)drive\.google\.com\//i.test(url);

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

/**
 * 본문 블록 출력.
 * - 노션 H2 → <h2>, H3 → <h3> (검색 엔진이 단계 구조를 읽도록 그대로 씁니다. 글 제목 <h2> 와 같은 단계)
 * - 이미지 alt = 노션 캡션(측션). 캡션이 비면 `alt`(보통 글 제목)를 씁니다.
 */
export function Blocks({ blocks, alt = "" }: { blocks: Block[]; alt?: string }) {
  const { pick } = useLang();
  return (
    <div className="space-y-4 text-[15px] leading-[1.8] text-zinc-300">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "p":
            return <p key={i}><RichText value={b.text} /></p>;
          case "h2":
            return <h2 key={i} className="pt-4 text-xl font-semibold tracking-[-0.02em] text-white"><RichText value={b.text} /></h2>;
          case "h3":
            return <h3 key={i} className="pt-2 text-base font-semibold text-white"><RichText value={b.text} /></h3>;
          case "ul":
            return (
              <ul key={i} className="space-y-2 pl-1">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="bg-volt-400 mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full" />
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
                    <span className={cn("mt-1 grid h-4.5 w-4.5 shrink-0 place-items-center rounded ring-1 ring-inset", it.checked ? "bg-volt-400 ring-transparent" : "ring-white/20")}>
                      {it.checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </span>
                    <span className={cn(it.checked && "text-zinc-400")}><RichText value={it.text} /></span>
                  </li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote key={i} className="border-l-2 border-volt-400/60 pl-4 text-zinc-200 italic">
                <RichText value={b.text} />
              </blockquote>
            );
          case "callout":
            return (
              <div key={i} className="rounded-xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/[0.08]">
                <div className="flex gap-3"><span className="text-lg leading-7" aria-hidden>{b.icon ?? "💡"}</span><p className="text-zinc-200"><RichText value={b.text} /></p></div>
                {b.children?.length ? <div className="mt-3"><Blocks blocks={b.children} alt={alt} /></div> : null}
              </div>
            );
          case "code":
            return <CodeBlock key={i} text={b.text} language={b.language} />;
          case "divider":
            return <hr key={i} className="border-white/10" />;
          case "img":
            return (
              <figure key={i} className="overflow-hidden rounded-xl ring-1 ring-white/10">
                <SmartImage src={b.src} alt={b.caption || alt} className="w-full min-h-40 object-cover" />
                {b.caption && <figcaption className="bg-white/[0.02] px-4 py-2 text-xs text-zinc-500">{b.caption}</figcaption>}
              </figure>
            );
          case "video": {
            const yt = youTubeEmbed(b.src);
            /* Google Drive controls its own CSP; do not iframe it, even on /preview URLs. */
            if (!yt && isDriveUrl(b.src)) {
              return (
                <a
                  key={i}
                  href={b.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-zinc-200 ring-1 ring-inset ring-white/[0.08] transition hover:bg-white/[0.06]"
                >
                  <span className="truncate">
                    {b.caption ? `${b.caption} — ` : ""}
                    {pick("Google Drive 링크 (새 창에서 열기)", "Google Drive link (opens in a new tab)")}
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500" />
                </a>
              );
            }
            return (
              <figure key={i} className="overflow-hidden rounded-xl ring-1 ring-white/10">
                {yt ? (
                  <iframe src={yt} title={b.caption ?? "video"} className="aspect-video w-full" allow="autoplay; encrypted-media" allowFullScreen loading="lazy" />
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
          case "column_list": {
            const cols = b.children.filter((child) => child.type === "column");
            const ratios = cols.map((col) => col.type === "column" ? Math.max(0.1, col.ratio ?? 1) : 1);
            return <div key={i} className="grid grid-cols-1 gap-4 md:grid-cols-2" style={{ gridTemplateColumns: ratios.map((ratio) => `minmax(0, ${ratio}fr)`).join(" ") }}>{cols.map((col, j) => <div key={j}><Blocks blocks={col.type === "column" ? col.children : [col]} alt={alt} /></div>)}</div>;
          }
          case "column":
            return <div key={i} className="min-w-0">{b.children.map((child, j) => <Blocks key={j} blocks={[child]} alt={alt} />)}</div>;
          case "file":
          case "pdf":
            return <a key={i} href={b.type === "file" ? b.url : b.src} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl bg-white/[0.04] p-4 ring-1 ring-white/10">{b.type === "file" ? b.name : b.caption || "PDF 보기"}{b.type === "file" && b.size ? <small>{b.size}</small> : null}<ExternalLink className="h-4 w-4" /></a>;
          case "audio":
            return <figure key={i} className="space-y-2"><audio controls preload="metadata" src={b.src} className="w-full" />{b.caption && <figcaption className="text-xs text-zinc-500">{b.caption}</figcaption>}</figure>;
          case "table":
            return <div key={i} className="overflow-x-auto rounded-lg ring-1 ring-white/10"><table className="w-full border-collapse text-left"><tbody>{b.rows.map((row, ri) => <tr key={ri}>{row.cells.map((cell, ci) => <td key={ci} className="border border-white/10 px-3 py-2"><RichText value={cell} /></td>)}</tr>)}</tbody></table></div>;
          case "toggle":
            return (
              <details key={i} className="group rounded-xl bg-white/[0.03] px-4 py-3 ring-1 ring-inset ring-white/[0.06]">
                <summary className="cursor-pointer list-none font-medium text-white marker:hidden">
                  <span className="mr-2 inline-block transition-transform group-open:rotate-90">▸</span>
                  <RichText value={b.text} />
                </summary>
                {b.children && <div className="mt-3"><Blocks blocks={b.children} alt={alt} /></div>}
              </details>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
