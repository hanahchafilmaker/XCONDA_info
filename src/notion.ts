/* =============================================================================
 * XCONDA 가이드 센터  ⇄  Notion 연동 어댑터
 * -----------------------------------------------------------------------------
 * ▸ Notion 데이터베이스 1개로 공지 · 업데이트 · 가이드 · FAQ 를 모두 관리합니다.
 * ▸ 브라우저에서 api.notion.com 을 직접 호출하면 CORS 차단 + 토큰 노출 문제가
 *   있으므로, 프록시(Cloudflare Worker 등)를 경유합니다.
 *     └ 예제: /notion-worker/worker.js , 설정 가이드: /NOTION_SETUP.md
 *
 * 엔드포인트 지정 방법 (우선순위 순)
 *   1) URL 파라미터  ?notion=…   (테스트용, 로컬에 기억됨 · ?notion=off 로 해제 → 샘플 모드)
 *   2) .env          VITE_NOTION_ENDPOINT=…
 *   3) 기본값        DEFAULT_ENDPOINT (아래 상수)
 *
 * 엔드포인트 값으로 쓸 수 있는 것
 *   ▸ Cloudflare Worker 프록시 주소  https://xxx.workers.dev        (비공개 DB용)
 *   ▸ 웹에 게시(Publish)된 노션 페이지 — URL / 32자리 ID / public:ID  (토큰·배포 불필요)
 *     예) https://silicon-mascara-c7d.notion.site/XCONDA_NEWs-3e72ebc017ad8024a3f5ef8fb9f8c6dd
 *
 * 프록시 API (Worker 방식)
 *   GET {endpoint}               → Notion database query 응답 (results[])
 *   GET {endpoint}/blocks/{id}   → Notion block children 응답 (results[])
 * ========================================================================== */

import type { Block, Change, ChangeKind, Entry, EntryTranslation, EntryType, Rich, RichSeg } from "./content/types";
import { extractPageId, fetchPublicBlocks, fetchPublicEntries } from "./notionPublic";
import { getLang } from "./i18n/dict";

type R = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const LS_ENDPOINT = "xconda:notion-endpoint";
const LS_CACHE = "xconda:notion-cache:v1";

/** 기본 연동 대상: 웹에 게시된 XCONDA_NEWs 노션 페이지 (공개 · 토큰 불필요) */
const DEFAULT_ENDPOINT = "public:3e72ebc017ad8024a3f5ef8fb9f8c6dd";

/** Worker URL은 그대로, 노션 페이지 URL·ID는 "public:<id>" 로 정규화 */
function normalizeEndpoint(raw: string): string {
  const v = raw.trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(v) && !/notion\.(so|site)\//i.test(v)) return v; // Worker 프록시
  const id = extractPageId(v);
  return id ? `public:${id}` : v;
}

export const isPublicEndpoint = (endpoint: string) => endpoint.startsWith("public:");

export function resolveEndpoint(): string | undefined {
  try {
    const qs = new URLSearchParams(window.location.search).get("notion");
    if (qs === "off") {
      localStorage.removeItem(LS_ENDPOINT);
      return undefined; // 샘플 콘텐츠 모드
    }
    if (qs) {
      const norm = normalizeEndpoint(qs);
      localStorage.setItem(LS_ENDPOINT, norm);
      return norm;
    }
    const stored = localStorage.getItem(LS_ENDPOINT);
    if (stored) return normalizeEndpoint(stored);
  } catch {
    /* SSR / private mode */
  }
  const env = import.meta.env.VITE_NOTION_ENDPOINT;
  if (env) return normalizeEndpoint(env);
  return DEFAULT_ENDPOINT;
}

/* ------------------------------ 속성 읽기 ------------------------------ */

function prop(props: R, names: string[]): R | undefined {
  const keys = Object.keys(props);
  for (const n of names) {
    const hit = keys.find((k) => k.trim().toLowerCase() === n.toLowerCase());
    if (hit) return props[hit];
  }
  return undefined;
}

const plain = (arr?: R[]): string => (Array.isArray(arr) ? arr.map((t) => t.plain_text ?? "").join("") : "");

function text(p?: R): string {
  if (!p) return "";
  switch (p.type) {
    case "title":
      return plain(p.title).trim();
    case "rich_text":
      return plain(p.rich_text).trim();
    case "select":
      return p.select?.name ?? "";
    case "status":
      return p.status?.name ?? "";
    case "number":
      return p.number != null ? String(p.number) : "";
    case "url":
      return p.url ?? "";
    case "formula":
      return String(p.formula?.[p.formula?.type] ?? "");
    default:
      return "";
  }
}
const multi = (p?: R): string[] => (p?.multi_select ?? []).map((t: R) => t.name).filter(Boolean);
const date = (p?: R): string => p?.date?.start ?? "";
const check = (p?: R): boolean => Boolean(p?.checkbox);
const num = (p?: R): number | undefined => (typeof p?.number === "number" ? p.number : undefined);
function fileUrl(p?: R): string {
  const f = p?.files?.[0];
  return f?.external?.url ?? f?.file?.url ?? "";
}

export const TYPE_MAP: Record<string, EntryType> = {
  공지: "notice", 공지사항: "notice", notice: "notice", announcement: "notice",
  업데이트: "update", 릴리스: "update", update: "update", release: "update", changelog: "update",
  가이드: "guide", 사용법: "guide", guide: "guide", tutorial: "guide", "how-to": "guide",
  faq: "faq", 질문: "faq", "자주 묻는 질문": "faq",
};

export function parseChanges(raw: string): Change[] {
  return raw
    .split(/\n+/)
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^\[?(new|신규|추가|improved|개선|fixed|수정|버그)\]?\s*[:\-]?\s*(.*)$/i);
      if (!m) return { kind: "Improved" as ChangeKind, text: line };
      const k = m[1].toLowerCase();
      const kind: ChangeKind = /new|신규|추가/.test(k) ? "New" : /fix|수정|버그/.test(k) ? "Fixed" : "Improved";
      return { kind, text: m[2] };
    });
}

export function mapPage(page: R): Entry | null {
  const p: R = page.properties ?? {};
  const title = text(prop(p, ["Title", "Name", "제목", "이름", "질문"]));
  if (!title) return null;
  const rawType = text(prop(p, ["Type", "유형", "타입", "구분"])).toLowerCase();
  const type = TYPE_MAP[rawType] ?? "notice";
  const published = prop(p, ["Published", "공개", "게시"]);
  if (published && published.type === "checkbox" && !published.checkbox) return null;

  const changesRaw = text(prop(p, ["Changes", "변경사항", "변경 사항"]));
  const titleEn = text(prop(p, ["Title EN", "English Title", "제목 EN", "영문 제목"]));
  const summaryEn = text(prop(p, ["Summary EN", "English Summary", "요약 EN", "영문 요약", "Answer EN"]));
  const categoryEn = text(prop(p, ["Category EN", "English Category", "카테고리 EN", "영문 카테고리"]));
  const changesEnRaw = text(prop(p, ["Changes EN", "English Changes", "변경사항 EN", "영문 변경사항"]));
  const english: EntryTranslation = {
    ...(titleEn ? { title: titleEn } : {}),
    ...(summaryEn ? { summary: summaryEn } : {}),
    ...(categoryEn ? { category: categoryEn } : {}),
    ...(changesEnRaw ? { changes: parseChanges(changesEnRaw) } : {}),
  };
  const hasEnglish = Object.keys(english).length > 0;
  return {
    id: page.id,
    type,
    title,
    summary: text(prop(p, ["Summary", "요약", "설명", "답변", "Answer"])),
    category: text(prop(p, ["Category", "카테고리", "분류"])) || (type === "notice" ? "공지" : ""),
    date: date(prop(p, ["Date", "날짜", "게시일"])) || page.created_time || new Date().toISOString(),
    tags: multi(prop(p, ["Tags", "태그"])),
    cover: fileUrl(prop(p, ["Cover", "커버", "썸네일", "Image"])) || page.cover?.external?.url || page.cover?.file?.url || undefined,
    url: text(prop(p, ["Link", "URL", "링크"])) || undefined,
    pinned: check(prop(p, ["Pinned", "고정", "상단고정"])),
    important: check(prop(p, ["Important", "중요"])),
    version: text(prop(p, ["Version", "버전"])) || undefined,
    tool: text(prop(p, ["Tool", "툴", "도구"])) || undefined,
    order: num(prop(p, ["Order", "순서"])),
    changes: changesRaw ? parseChanges(changesRaw) : undefined,
    remote: true,
    translations: hasEnglish ? { en: english } : undefined,
  };
}

/* ------------------------------ 블록 변환 ------------------------------ */

function rich(arr?: R[]): Rich {
  if (!Array.isArray(arr)) return "";
  return arr.map<RichSeg>((t) => ({
    text: t.plain_text ?? "",
    bold: t.annotations?.bold,
    italic: t.annotations?.italic,
    code: t.annotations?.code,
    strike: t.annotations?.strikethrough,
    href: t.href ?? undefined,
  }));
}

export function mapBlocks(results: R[]): Block[] {
  const out: Block[] = [];
  for (const b of results) {
    const d = b[b.type] ?? {};
    const last = out[out.length - 1];
    switch (b.type) {
      case "paragraph":
        if (plain(d.rich_text).trim()) out.push({ type: "p", text: rich(d.rich_text) });
        break;
      case "heading_1":
      case "heading_2":
        out.push({ type: "h2", text: rich(d.rich_text) });
        break;
      case "heading_3":
        out.push({ type: "h3", text: rich(d.rich_text) });
        break;
      case "bulleted_list_item":
        if (last?.type === "ul") last.items.push(rich(d.rich_text));
        else out.push({ type: "ul", items: [rich(d.rich_text)] });
        break;
      case "numbered_list_item":
        if (last?.type === "ol") last.items.push(rich(d.rich_text));
        else out.push({ type: "ol", items: [rich(d.rich_text)] });
        break;
      case "to_do":
        if (last?.type === "todo") last.items.push({ text: rich(d.rich_text), checked: !!d.checked });
        else out.push({ type: "todo", items: [{ text: rich(d.rich_text), checked: !!d.checked }] });
        break;
      case "quote":
        out.push({ type: "quote", text: rich(d.rich_text) });
        break;
      case "callout":
        out.push({ type: "callout", text: rich(d.rich_text), icon: d.icon?.emoji });
        break;
      case "code":
        out.push({ type: "code", text: plain(d.rich_text), language: d.language });
        break;
      case "divider":
        out.push({ type: "divider" });
        break;
      case "image":
        out.push({ type: "img", src: d.external?.url ?? d.file?.url ?? "", caption: plain(d.caption) || undefined });
        break;
      case "video":
        out.push({ type: "video", src: d.external?.url ?? d.file?.url ?? "", caption: plain(d.caption) || undefined });
        break;
      case "bookmark":
      case "embed":
      case "link_preview":
        if (d.url) out.push({ type: "link", href: d.url, caption: plain(d.caption) || undefined });
        break;
      case "toggle":
        out.push({ type: "toggle", text: rich(d.rich_text), children: b.children ? mapBlocks(b.children) : undefined });
        break;
    }
  }
  return out;
}

/* ------------------------------ Fetch / Cache ------------------------------ */

export type ContentPayload = { entries: Entry[]; source: "notion" | "sample"; syncedAt: number };

export function readCache(): ContentPayload | null {
  try {
    const raw = localStorage.getItem(LS_CACHE);
    return raw ? (JSON.parse(raw) as ContentPayload) : null;
  } catch {
    return null;
  }
}

function writeCache(p: ContentPayload) {
  try {
    localStorage.setItem(LS_CACHE, JSON.stringify(p));
  } catch {
    /* quota */
  }
}

export async function fetchEntries(endpoint: string, signal?: AbortSignal): Promise<Entry[]> {
  if (isPublicEndpoint(endpoint)) return fetchPublicEntries(endpoint.slice("public:".length), signal);
  const res = await fetch(endpoint, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Notion proxy ${res.status}`);
  const data = await res.json();
  const results: R[] = Array.isArray(data) ? data : data.results ?? [];
  // 프록시가 이미 Entry[] 형태로 반환하는 경우도 지원
  if (results.length && "type" in results[0] && "title" in results[0] && typeof results[0].title === "string") {
    return results as Entry[];
  }
  return results.map(mapPage).filter((e): e is Entry => e !== null);
}

export async function syncFromNotion(endpoint: string, signal?: AbortSignal): Promise<ContentPayload> {
  const entries = await fetchEntries(endpoint, signal);
  const payload: ContentPayload = { entries, source: "notion", syncedAt: Date.now() };
  writeCache(payload);
  return payload;
}

const blockCache = new Map<string, Block[]>();

export async function fetchBlocks(endpoint: string, pageId: string): Promise<Block[]> {
  if (blockCache.has(pageId)) return blockCache.get(pageId)!;
  if (isPublicEndpoint(endpoint)) {
    const blocks = await fetchPublicBlocks(pageId);
    blockCache.set(pageId, blocks);
    return blocks;
  }
  const res = await fetch(`${endpoint}/blocks/${pageId}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Notion blocks ${res.status}`);
  const data = await res.json();
  const blocks = mapBlocks(Array.isArray(data) ? data : data.results ?? []);
  blockCache.set(pageId, blocks);
  return blocks;
}

/* ------------------------------ 포맷 유틸 ------------------------------ */

export function formatDate(iso: string): string {
  const lang = getLang();
  try {
    if (lang === "en") {
      return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(
        new Date(iso)
      );
    }
    return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
      .format(new Date(iso))
      .replace(/\.\s?/g, ".")
      .replace(/\.$/, "");
  } catch {
    return iso;
  }
}

export function timeAgo(ts: number | string): string {
  const t = typeof ts === "number" ? ts : new Date(ts).getTime();
  const s = Math.max(0, (Date.now() - t) / 1000);
  const en = getLang() === "en";
  if (s < 60) return en ? "just now" : "방금 전";
  if (s < 3600) {
    const m = Math.floor(s / 60);
    return en ? `${m}m ago` : `${m}분 전`;
  }
  if (s < 86400) {
    const h = Math.floor(s / 3600);
    return en ? `${h}h ago` : `${h}시간 전`;
  }
  if (s < 86400 * 7) {
    const d = Math.floor(s / 86400);
    return en ? `${d}d ago` : `${d}일 전`;
  }
  return formatDate(new Date(t).toISOString());
}

export const isNew = (iso: string, days = 7) => Date.now() - new Date(iso).getTime() < days * 86400000;
