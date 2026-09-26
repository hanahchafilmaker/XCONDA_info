/* =============================================================================
 * 공개(웹에 게시된) Notion 페이지 어댑터 — 토큰 · 서버 배포 불필요
 * -----------------------------------------------------------------------------
 * ▸ Notion에서 "웹에 게시(Publish)"한 페이지라면, 통합 토큰이나 Cloudflare Worker
 *   없이도 공개 API 프록시(notion-api.splitbee.io, CORS 허용)로 바로 읽을 수 있습니다.
 * ▸ 페이지 안에 데이터베이스(표)를 하나 만들면 그 행들이 콘텐츠가 됩니다.
 *   속성 스키마는 NOTION_SETUP.md 와 동일합니다. (Title/Type/Published/Date …)
 * ▸ 엔드포인트 형식: "public:<32자리 페이지 ID>"  → src/notion.ts 가 라우팅합니다.
 * ========================================================================== */

import type { Block, Entry, EntryTranslation, EntryType, Rich, RichSeg } from "./content/types";
import { TYPE_MAP, parseChanges } from "./notion";

type R = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const API = "https://notion-api.splitbee.io/v1";

type LegacySchema = Record<string, { name?: unknown; type?: unknown }>;

/** A compact description suitable for a user-facing sync error. */
function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

function isRecord(value: unknown): value is R {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Splitbee's historical `/table` route is no longer reliable (it began
 * returning network/5xx failures in 2026). Its `/page` route is still
 * available and includes the same collection rows in each `collection_view`
 * block. The fallback below decodes that legacy record-map response.
 */
async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = isRecord(data) && typeof data.error === "string" ? `: ${data.error}` : "";
    throw new Error(`HTTP ${res.status}${message}`);
  }
  return data;
}

/** `[text, decorations?][]` → unformatted text in Notion's legacy format. */
function legacyValueText(value: unknown): string {
  if (!Array.isArray(value)) return value == null ? "" : String(value);
  return value
    .map((part) => (Array.isArray(part) ? String(part[0] ?? "") : ""))
    .join("");
}

function legacyDate(value: unknown): string {
  if (!Array.isArray(value)) return "";
  for (const part of value) {
    if (!Array.isArray(part) || !Array.isArray(part[1])) continue;
    for (const decoration of part[1]) {
      if (!Array.isArray(decoration) || decoration[0] !== "d" || !isRecord(decoration[1])) continue;
      const start = decoration[1].start_date;
      if (typeof start === "string") return start;
    }
  }
  return "";
}

function legacyFiles(value: unknown, rowId: string): Array<{ name: string; url: string; rawUrl: string }> {
  if (!Array.isArray(value)) return [];
  const files: Array<{ name: string; url: string; rawUrl: string }> = [];
  for (const part of value) {
    if (!Array.isArray(part) || !Array.isArray(part[1])) continue;
    const link = part[1].find((decoration: unknown) => Array.isArray(decoration) && decoration[0] === "a");
    const raw = Array.isArray(link) && typeof link[1] === "string" ? link[1] : "";
    if (!raw) continue;
    const rawUrl = raw.startsWith("/") ? `https://www.notion.so${raw}` : raw;
    const url = `https://www.notion.so/image/${encodeURIComponent(rawUrl)}?table=block&id=${rowId}&cache=v2`;
    files.push({ name: String(part[0] ?? ""), url, rawUrl });
  }
  return files;
}

/** Convert a raw collection cell returned by Splitbee's `/page` route. */
function decodeLegacyCell(value: unknown, type: unknown, rowId: string): unknown {
  const cellType = typeof type === "string" ? type : "text";
  switch (cellType) {
    case "checkbox":
      return legacyValueText(value) === "Yes";
    case "date":
      return legacyDate(value);
    case "multi_select":
      return legacyValueText(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    case "number": {
      const n = Number(legacyValueText(value));
      return Number.isFinite(n) ? n : undefined;
    }
    case "file":
      return legacyFiles(value, rowId);
    default:
      return legacyValueText(value);
  }
}

/**
 * Returns null when the response does not contain an inline database.
 * An empty array is a valid, empty database.
 */
function rowsFromPageRecordMap(payload: unknown): R[] | null {
  if (!isRecord(payload)) return null;

  for (const block of Object.values(payload)) {
    if (!isRecord(block)) continue;
    const collection = isRecord(block.collection)
      ? block.collection
      : isRecord(block.value) && isRecord(block.value.collection)
        ? block.value.collection
        : null;
    if (!collection || !Array.isArray(collection.data)) continue;

    const schema: LegacySchema = isRecord(collection.schema) ? collection.schema as LegacySchema : {};
    return collection.data.filter(isRecord).map((rawRow) => {
      const row: R = { id: typeof rawRow.id === "string" ? rawRow.id : "" };
      const properties = isRecord(rawRow.properties) ? rawRow.properties : {};
      for (const [propertyId, column] of Object.entries(schema)) {
        const name = typeof column.name === "string" ? column.name : "";
        if (!name) continue;
        const value = propertyId in rawRow ? rawRow[propertyId] : properties[propertyId];
        if (value !== undefined) row[name] = decodeLegacyCell(value, column.type, row.id);
      }
      return row;
    });
  }
  return null;
}

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
  const titleEn = asText(pick(row, ["Title EN", "English Title", "제목 EN", "영문 제목"]));
  const summaryEn = asText(pick(row, ["Summary EN", "English Summary", "요약 EN", "영문 요약", "Answer EN"]));
  const categoryEn = asText(pick(row, ["Category EN", "English Category", "카테고리 EN", "영문 카테고리"]));
  const changesEnRaw = asText(pick(row, ["Changes EN", "English Changes", "변경사항 EN", "영문 변경사항"]));
  const english: EntryTranslation = {
    ...(titleEn ? { title: titleEn } : {}),
    ...(summaryEn ? { summary: summaryEn } : {}),
    ...(categoryEn ? { category: categoryEn } : {}),
    ...(changesEnRaw ? { changes: parseChanges(changesEnRaw) } : {}),
  };
  const hasEnglish = Object.keys(english).length > 0;

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
    translations: hasEnglish ? { en: english } : undefined,
  };
}

function rowsToEntries(data: R[]): Entry[] {
  // Published 열이 하나라도 있으면 체크된 행만, 아예 없으면 전부 노출
  const hasPublishedCol = data.some((row) =>
    Object.keys(row).some((key) => PUBLISHED_KEYS.some((name) => key.trim().toLowerCase() === name.toLowerCase()))
  );
  return data.map((row) => mapRow(row, hasPublishedCol)).filter((entry): entry is Entry => entry !== null);
}

export async function fetchPublicEntries(pageId: string, signal?: AbortSignal): Promise<Entry[]> {
  let tableFailure: unknown;

  try {
    const table = await fetchJson(`${API}/table/${pageId}`, signal);
    if (!Array.isArray(table)) throw new Error("응답에 데이터베이스 행이 없습니다");
    return rowsToEntries(table.filter(isRecord));
  } catch (error) {
    // An explicit cancellation must never turn into a second request or a
    // misleading configuration error.
    if (signal?.aborted) throw error;
    tableFailure = error;
  }

  try {
    // `/table` has an upstream outage, but the same public service's `/page`
    // endpoint still returns inline database data as a legacy record map.
    const page = await fetchJson(`${API}/page/${pageId}`, signal);
    const rows = rowsFromPageRecordMap(page);
    if (rows === null) throw new Error("페이지 안에서 표(데이터베이스)를 찾지 못했습니다");
    return rowsToEntries(rows);
  } catch (pageFailure) {
    if (signal?.aborted) throw pageFailure;
    throw new Error(
      "공개 Notion 동기화에 실패했습니다. " +
        `공개 API의 table 요청(${describeError(tableFailure)}) 및 page 대체 요청(${describeError(pageFailure)})을 모두 완료하지 못했습니다. ` +
        "노션 페이지의 웹 게시 상태를 확인하거나, 안정적인 운영을 위해 NOTION_SETUP.md의 Cloudflare Worker 프록시를 연결해 주세요."
    );
  }
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
