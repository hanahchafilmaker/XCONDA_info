/* =============================================================================
 * 공개(웹에 게시된) Notion 페이지 어댑터 — 토큰 · 서버 배포 불필요
 * -----------------------------------------------------------------------------
 * ▸ Notion에서 "웹에 게시(Publish)"한 페이지라면, 통합 토큰이나 Cloudflare Worker
 *   없이도 공개 API 프록시(notion-api.splitbee.io, CORS 허용)로 바로 읽을 수 있습니다.
 * ▸ 페이지 안에 데이터베이스(표)를 하나 만들면 그 행들이 콘텐츠가 됩니다.
 *   속성 스키마는 NOTION_SETUP.md 와 동일합니다. (Title/Type/Published/Date …)
 * ▸ 엔드포인트 형식: "public:<32자리 페이지 ID>"  → src/notion.ts 가 라우팅합니다.
 * ========================================================================== */

import type { Block, Entry, EntryType, Rich, RichSeg } from "./content/types";
import { TYPE_MAP, parseChanges } from "./notion";

type R = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const API = "https://notion-api.splitbee.io/v1";

/** notion.so / notion.site URL, 32자리 ID, UUID 등에서 페이지 ID를 추출 */
export function extractPageId(input: string): string | undefined {
  const m = input.replace(/-/g, "").match(/[0-9a-f]{32}(?![0-9a-f])/i);
  return m ? m[0].toLowerCase() : undefined;
}

const dashed = (id: string) =>
  `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;

/* ------------------------------ 행 → Entry ------------------------------ */

function pick(row: R, names: string[]): unknown {
  const keys = Object.keys(row);
  for (const n of names) {
    const hit = keys.find((k) => k.trim().toLowerCase() === n.toLowerCase());
    if (hit) return row[hit];
  }
  return undefined;
}

const asText = (v: unknown): string => (v == null ? "" : Array.isArray(v) ? v.map(String).join(", ") : String(v)).trim();
const asList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : v ? [String(v)] : []);
const asBool = (v: unknown): boolean => v === true || v === "Yes" || v === "true";
const asNum = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
};
function asFileUrl(v: unknown): string {
  if (Array.isArray(v) && v[0]) {
    const f: R = v[0];
    return f.url ?? f.rawUrl ?? (typeof f === "string" ? f : "");
  }
  return typeof v === "string" ? v : "";
}

const PUBLISHED_KEYS = ["Published", "공개", "게시"];

function mapRow(row: R, requirePublished: boolean): Entry | null {
  const title = asText(pick(row, ["Title", "Name", "제목", "이름", "질문"]));
  if (!title) return null;
  if (requirePublished && !asBool(pick(row, PUBLISHED_KEYS))) return null;

  const rawType = asText(pick(row, ["Type", "유형", "타입", "구분"])).toLowerCase();
  const type: EntryType = TYPE_MAP[rawType] ?? "notice";
  const changesRaw = asText(pick(row, ["Changes", "변경사항", "변경 사항"]));

  return {
    id: row.id,
    type,
    title,
    summary: asText(pick(row, ["Summary", "요약", "설명", "답변", "Answer"])),
    category: asText(pick(row, ["Category", "카테고리", "분류"])) || (type === "notice" ? "공지" : ""),
    date: asText(pick(row, ["Date", "날짜", "게시일"])) || new Date().toISOString(),
    tags: asList(pick(row, ["Tags", "태그"])),
    cover: asFileUrl(pick(row, ["Cover", "커버", "썸네일", "Image"])) || undefined,
    url: asText(pick(row, ["Link", "URL", "링크"])) || undefined,
    pinned: asBool(pick(row, ["Pinned", "고정", "상단고정"])),
    important: asBool(pick(row, ["Important", "중요"])),
    version: asText(pick(row, ["Version", "버전"])) || undefined,
    tool: asText(pick(row, ["Tool", "툴", "도구"])) || undefined,
    order: asNum(pick(row, ["Order", "순서"])),
    changes: changesRaw ? parseChanges(changesRaw) : undefined,
    remote: true,
  };
}

export async function fetchPublicEntries(pageId: string, signal?: AbortSignal): Promise<Entry[]> {
  const res = await fetch(`${API}/table/${pageId}`, { signal, headers: { Accept: "application/json" } });
  const data = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(data)) {
    const msg = (data as R | null)?.error ?? `HTTP ${res.status}`;
    throw new Error(
      `공개 Notion 페이지에서 데이터베이스를 찾지 못했습니다 (${msg}). ` +
        `페이지 안에 표(데이터베이스)를 만들고 NOTION_SETUP.md 의 속성을 추가해 주세요.`
    );
  }
  // Published 열이 하나라도 있으면 체크된 행만, 아예 없으면 전부 노출
  const hasPublishedCol = data.some((row: R) => Object.keys(row).some((k) => PUBLISHED_KEYS.some((n) => k.trim().toLowerCase() === n.toLowerCase())));
  return data.map((row: R) => mapRow(row, hasPublishedCol)).filter((e): e is Entry => e !== null);
}

/* ------------------------------ 본문 블록 ------------------------------ */

type LegacyBlock = {
  id: string;
  type: string;
  properties?: R;
  format?: R;
  content?: string[];
};

/** legacy rich text [["텍스트", [["b"],["a","url"]]], …] → Rich */
function legacyRich(val?: unknown[]): Rich {
  if (!Array.isArray(val)) return "";
  const segs: RichSeg[] = [];
  for (const item of val) {
    if (!Array.isArray(item)) continue;
    const [text, decos] = item as [string, [string, string?][]?];
    if (typeof text !== "string") continue;
    const seg: RichSeg = { text };
    if (Array.isArray(decos)) {
      for (const d of decos) {
        if (!Array.isArray(d)) continue;
        if (d[0] === "b") seg.bold = true;
        else if (d[0] === "i") seg.italic = true;
        else if (d[0] === "s") seg.strike = true;
        else if (d[0] === "c") seg.code = true;
        else if (d[0] === "a" && d[1]) seg.href = d[1];
      }
    }
    segs.push(seg);
  }
  return segs;
}

const legacyPlain = (val?: unknown[]): string =>
  Array.isArray(val) ? val.map((i) => (Array.isArray(i) ? String(i[0] ?? "") : "")).join("") : "";

/** 노션 내부(S3) 이미지 URL을 공개 서명 URL로 변환 */
function signImage(src: string, blockId: string): string {
  if (!src || src.startsWith("data:")) return src;
  const internal =
    src.startsWith("/") ||
    src.startsWith("attachment:") ||
    /(^https?:\/\/)(s3[^/]*\.amazonaws\.com|file\.notion\.so|prod-files-secure)/i.test(src) ||
    src.includes("secure.notion-static.com");
  if (!internal) return src;
  const abs = src.startsWith("/") ? `https://www.notion.so${src}` : src;
  return `https://www.notion.so/image/${encodeURIComponent(abs)}?table=block&id=${blockId}&cache=v2`;
}

function convertLegacy(ids: string[], map: Map<string, LegacyBlock>, depth = 0): Block[] {
  const out: Block[] = [];
  for (const id of ids) {
    const b = map.get(id);
    if (!b) continue;
    const p = b.properties ?? {};
    const f = b.format ?? {};
    const title = legacyRich(p.title);
    const last = out[out.length - 1];
    switch (b.type) {
      case "text":
        if (legacyPlain(p.title).trim()) out.push({ type: "p", text: title });
        break;
      case "header":
      case "sub_header":
        out.push({ type: "h2", text: title });
        break;
      case "sub_sub_header":
        out.push({ type: "h3", text: title });
        break;
      case "bulleted_list":
        if (last?.type === "ul") last.items.push(title);
        else out.push({ type: "ul", items: [title] });
        break;
      case "numbered_list":
        if (last?.type === "ol") last.items.push(title);
        else out.push({ type: "ol", items: [title] });
        break;
      case "to_do": {
        const checked = legacyPlain(p.checked) === "Yes";
        if (last?.type === "todo") last.items.push({ text: title, checked });
        else out.push({ type: "todo", items: [{ text: title, checked }] });
        break;
      }
      case "quote":
        out.push({ type: "quote", text: title });
        break;
      case "callout":
        out.push({ type: "callout", text: title, icon: typeof f.page_icon === "string" && f.page_icon.length <= 4 ? f.page_icon : undefined });
        break;
      case "code":
        out.push({ type: "code", text: legacyPlain(p.title), language: legacyPlain(p.language).toLowerCase() || undefined });
        break;
      case "divider":
        out.push({ type: "divider" });
        break;
      case "image": {
        const src = legacyPlain(p.source) || f.display_source || "";
        if (src) out.push({ type: "img", src: signImage(src, b.id), caption: legacyPlain(p.caption) || undefined });
        break;
      }
      case "video": {
        const src = f.display_source || legacyPlain(p.source) || "";
        if (src) out.push({ type: "video", src, caption: legacyPlain(p.caption) || undefined });
        break;
      }
      case "bookmark":
      case "embed": {
        const href = legacyPlain(p.link) || legacyPlain(p.source) || f.display_source || "";
        if (href) out.push({ type: "link", href, caption: legacyPlain(p.caption) || legacyPlain(p.description) || undefined });
        break;
      }
      case "toggle":
        out.push({
          type: "toggle",
          text: title,
          children: depth < 2 && b.content?.length ? convertLegacy(b.content, map, depth + 1) : undefined,
        });
        break;
    }
  }
  return out;
}

export async function fetchPublicBlocks(pageId: string): Promise<Block[]> {
  const res = await fetch(`${API}/page/${pageId}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`공개 Notion 페이지 본문을 불러오지 못했습니다 (HTTP ${res.status})`);
  const data: R = await res.json();

  const map = new Map<string, LegacyBlock>();
  for (const [id, entry] of Object.entries<R>(data ?? {})) {
    const v: R | undefined = entry?.value?.value ?? entry?.value; // 응답 형태 2종 모두 지원
    if (v?.id && v?.type) map.set(id, v as LegacyBlock);
  }
  const rootId = dashed(extractPageId(pageId) ?? pageId.replace(/-/g, ""));
  const root = map.get(rootId) ?? map.get(pageId);
  return root?.content?.length ? convertLegacy(root.content, map) : [];
}
