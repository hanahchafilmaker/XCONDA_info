#!/usr/bin/env node
/* =============================================================================
 * XCONDA 가이드 센터 · 공개 Notion 스냅샷 생성기
 * -----------------------------------------------------------------------------
 * 웹에 게시(Publish)된 Notion 페이지/데이터베이스를 서버(깃허브 액션)에서 읽어
 * 사이트와 같은 도메인에 놓이는 `notion-content.json` 으로 저장합니다.
 *
 *   왜 필요한가?
 *   ▸ 브라우저에서 api.notion.com / www.notion.so 를 직접 부르면 CORS 로 막힙니다.
 *   ▸ 그래서 지금까지 무료 공개 프록시(notion-api.splitbee.io)를 썼는데,
 *     해당 서비스의 /table 경로가 응답하지 않아(500) 동기화가 실패했습니다.
 *   ▸ 서버(액션 러너)에는 CORS 가 없으므로 여기서 미리 읽어 두면
 *     사이트는 같은 출처의 정적 JSON 만 읽으면 됩니다. (항상 성공)
 *
 * 사용법
 *   node scripts/notion-snapshot.mjs [--out notion-content.json] [--print]
 * 환경 변수
 *   NOTION_PAGE_ID      게시된 페이지 ID/URL            (기본: XCONDA_NEWs)
 *   NOTION_DATABASE_ID  페이지 안 데이터베이스 ID/URL   (선택, 있으면 우선)
 * ========================================================================== */

const DEFAULT_PAGE_ID = "3e72ebc017ad8024a3f5ef8fb9f8c6dd";
const DEFAULT_DATABASE_ID = "3b54d2ea0d5e4ab5b33cff12de807517";

const API = "https://www.notion.so/api/v3";
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const ROW_LIMIT = 300;
const TIME_ZONE = "Asia/Seoul";

/* ------------------------------ 공통 유틸 ------------------------------ */

const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

export function extractId(input) {
  if (!input) return undefined;
  const m = String(input).replace(/-/g, "").match(/[0-9a-f]{32}(?![0-9a-f])/i);
  return m ? m[0].toLowerCase() : undefined;
}

const dashed = (id) =>
  `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;

const undashed = (id) => String(id).replace(/-/g, "").toLowerCase();

async function notionPost(path, body, { retries = 3 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(`${API}/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`${path} HTTP ${res.status}: ${text.slice(0, 300)}`);
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`${path}: JSON 파싱 실패 — ${text.slice(0, 200)}`);
      }
    } catch (error) {
      lastError = error;
      console.warn(`  ! ${path} 시도 ${attempt}/${retries} 실패: ${error?.message ?? error}`);
      if (attempt < retries) await new Promise((r) => setTimeout(r, attempt * 1200));
    }
  }
  throw lastError;
}

/* --------------------------- 레코드맵 읽기 --------------------------- */

/** recordMap 의 `{ id: { role, value } }` / `{ id: { value: { value } } }` 양쪽 형태 지원 */
function unwrap(entry) {
  if (!isRecord(entry)) return undefined;
  const v = entry.value;
  if (isRecord(v) && isRecord(v.value)) return v.value;
  return isRecord(v) ? v : undefined;
}

async function loadPageChunk(pageId, chunkNumber = 0, cursor = { stack: [] }) {
  return notionPost("loadPageChunk", {
    pageId: dashed(pageId),
    limit: 200,
    cursor,
    chunkNumber,
    verticalColumns: false,
  });
}

/** 페이지(또는 데이터베이스) 하위 블록을 전부 담은 recordMap.block 을 모읍니다. */
async function loadBlockMap(pageId) {
  const blocks = {};
  let cursor = { stack: [] };
  let chunkNumber = 0;
  for (let i = 0; i < 12; i += 1) {
    const data = await loadPageChunk(pageId, chunkNumber, cursor);
    const chunk = data?.recordMap?.block ?? {};
    for (const [id, entry] of Object.entries(chunk)) {
      const value = unwrap(entry);
      if (value?.id && value?.type) blocks[id] = { value };
    }
    const next = data?.cursor;
    if (!next || !Array.isArray(next.stack) || next.stack.length === 0) break;
    cursor = next;
    chunkNumber += 1;
  }
  return blocks;
}

/** 페이지 안에서 첫 번째 데이터베이스(collection_view) 블록을 찾습니다. */
function findCollectionView(blocks, preferredId) {
  const wanted = preferredId ? undashed(preferredId) : undefined;
  const candidates = [];
  for (const entry of Object.values(blocks)) {
    const b = entry.value;
    if (!b || !/^collection_view/.test(String(b.type))) continue;
    const collectionId = b.collection_id ?? b.format?.collection_pointer?.id;
    const viewId = Array.isArray(b.view_ids) ? b.view_ids[0] : undefined;
    if (!collectionId || !viewId) continue;
    const found = {
      blockId: b.id,
      collectionId,
      viewId,
      spaceId: b.space_id ?? b.format?.collection_pointer?.spaceId,
    };
    if (wanted && undashed(b.id) === wanted) return found;
    candidates.push(found);
  }
  return candidates[0];
}

async function queryCollection({ collectionId, viewId, spaceId }) {
  // 현재(reducer) 형식 → 실패 시 구(loader:table) 형식으로 재시도
  const attempts = [
    {
      collection: { id: collectionId, spaceId },
      collectionView: { id: viewId, spaceId },
      loader: {
        type: "reducer",
        reducers: {
          collection_group_results: { type: "results", limit: ROW_LIMIT },
        },
        searchQuery: "",
        userTimeZone: TIME_ZONE,
      },
    },
    {
      collectionId,
      collectionViewId: viewId,
      loader: { type: "table", limit: ROW_LIMIT, loadContentCover: true, userTimeZone: TIME_ZONE },
      query: {},
    },
  ];

  let lastError;
  for (const body of attempts) {
    try {
      const data = await notionPost("queryCollection?src=initial_load", body, { retries: 2 });
      const result = data?.result ?? {};
      const blockIds =
        result?.reducerResults?.collection_group_results?.blockIds ??
        result?.blockIds ??
        result?.reducerResults?.results?.blockIds ??
        [];
      if (!Array.isArray(blockIds)) throw new Error("queryCollection: blockIds 없음");
      return { blockIds, recordMap: data?.recordMap ?? {} };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/* --------------------------- 셀 값 디코딩 --------------------------- */

const cellText = (value) =>
  Array.isArray(value) ? value.map((part) => (Array.isArray(part) ? String(part[0] ?? "") : "")).join("") : "";

function cellDate(value) {
  if (!Array.isArray(value)) return "";
  for (const part of value) {
    if (!Array.isArray(part) || !Array.isArray(part[1])) continue;
    for (const deco of part[1]) {
      if (Array.isArray(deco) && deco[0] === "d" && isRecord(deco[1]) && typeof deco[1].start_date === "string") {
        return deco[1].start_date;
      }
    }
  }
  return "";
}

function cellFiles(value, rowId) {
  if (!Array.isArray(value)) return [];
  const files = [];
  for (const part of value) {
    if (!Array.isArray(part) || !Array.isArray(part[1])) continue;
    const link = part[1].find((d) => Array.isArray(d) && d[0] === "a");
    const raw = Array.isArray(link) && typeof link[1] === "string" ? link[1] : "";
    if (!raw) continue;
    const rawUrl = raw.startsWith("/") ? `https://www.notion.so${raw}` : raw;
    files.push({
      name: String(part[0] ?? ""),
      url: `https://www.notion.so/image/${encodeURIComponent(rawUrl)}?table=block&id=${rowId}&cache=v2`,
      rawUrl,
    });
  }
  return files;
}

function decodeCell(value, type, rowId) {
  switch (type) {
    case "checkbox":
      return cellText(value) === "Yes";
    case "date":
      return cellDate(value);
    case "multi_select":
      return cellText(value)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    case "number": {
      const n = Number(cellText(value));
      return Number.isFinite(n) ? n : undefined;
    }
    case "file":
      return cellFiles(value, rowId);
    default:
      return cellText(value);
  }
}

const PUBLISHED_KEYS = ["published", "공개", "게시"];

/** collection 스키마 + row 블록 → `{ id, Title, Published, … }` 평면 객체 */
function rowToObject(block, schema) {
  const row = { id: block.id };
  const props = isRecord(block.properties) ? block.properties : {};
  for (const [propId, column] of Object.entries(schema)) {
    const name = typeof column?.name === "string" ? column.name.trim() : "";
    if (!name) continue;
    const value = props[propId];
    if (value === undefined) continue;
    const decoded = decodeCell(value, column.type, block.id);
    if (decoded !== undefined && decoded !== "") row[name] = decoded;
  }
  if (block.format?.page_cover && !row.Cover) {
    const cover = String(block.format.page_cover);
    row.__pageCover = cover.startsWith("/")
      ? `https://www.notion.so/image/${encodeURIComponent(`https://www.notion.so${cover}`)}?table=block&id=${block.id}&cache=v2`
      : cover;
  }
  return row;
}

const isPublished = (row) => {
  const key = Object.keys(row).find((k) => PUBLISHED_KEYS.includes(k.trim().toLowerCase()));
  return key === undefined ? true : row[key] === true;
};

const hasPublishedColumn = (schema) =>
  Object.values(schema).some((c) => PUBLISHED_KEYS.includes(String(c?.name ?? "").trim().toLowerCase()));

/* ------------------------------ 스냅샷 ------------------------------ */

export async function buildSnapshot({ pageId, databaseId } = {}) {
  const page = extractId(pageId ?? process.env.NOTION_PAGE_ID ?? DEFAULT_PAGE_ID);
  const database = extractId(databaseId ?? process.env.NOTION_DATABASE_ID ?? DEFAULT_DATABASE_ID);
  if (!page && !database) throw new Error("NOTION_PAGE_ID 또는 NOTION_DATABASE_ID 가 필요합니다");

  const rootId = page ?? database;
  const blocks = await loadBlockMap(rootId);
  let view = findCollectionView(blocks, database);

  // 페이지가 아니라 데이터베이스 ID 만 주어진 경우 해당 블록을 직접 조회
  if (!view && database) {
    const dbBlocks = await loadBlockMap(database);
    view = findCollectionView(dbBlocks, database);
  }
  if (!view) throw new Error("게시된 페이지 안에서 데이터베이스(표)를 찾지 못했습니다");

  const { blockIds, recordMap } = await queryCollection(view);
  const collection = unwrap(recordMap?.collection?.[view.collectionId]) ?? {};
  const schema = isRecord(collection.schema) ? collection.schema : {};
  const requirePublished = hasPublishedColumn(schema);

  const rows = [];
  for (const id of blockIds) {
    const block = unwrap(recordMap?.block?.[id]);
    if (!block || block.alive === false) continue;
    const row = rowToObject(block, schema);
    if (!row.id) continue;
    if (requirePublished && !isPublished(row)) continue;
    rows.push(row);
  }

  // 각 글의 본문 블록(상세 모달용)까지 미리 담아 둡니다.
  const pages = {};
  for (const row of rows) {
    try {
      pages[row.id] = await loadBlockMap(row.id);
    } catch (error) {
      console.warn(`  · 본문 로드 실패 (${row.id}): ${error?.message ?? error}`);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    source: {
      pageId: page ? dashed(page) : null,
      collectionViewId: view.blockId ?? null,
      collectionId: view.collectionId ?? null,
    },
    rows,
    pages,
  };
}

/* ------------------------------ CLI ------------------------------ */

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf("--out");
  const out = outIndex >= 0 ? args[outIndex + 1] : "notion-content.json";
  const print = args.includes("--print");

  buildSnapshot()
    .then(async (snapshot) => {
      const json = `${JSON.stringify(snapshot, null, 0)}\n`;
      if (print) console.log(JSON.stringify(snapshot.rows, null, 2));
      const { writeFile } = await import("node:fs/promises");
      await writeFile(out, json, "utf8");
      console.log(
        `✔ ${out} 생성 — 글 ${snapshot.rows.length}개 / 본문 ${Object.keys(snapshot.pages).length}개 (${(json.length / 1024).toFixed(1)} KB)`
      );
      for (const row of snapshot.rows) {
        const title = row.Title ?? row.title ?? row["제목"] ?? "(제목 없음)";
        console.log(`  · ${row.Type ?? row["유형"] ?? "?"} | ${title}`);
      }
    })
    .catch((error) => {
      console.error(`✖ Notion 스냅샷 생성 실패: ${error?.message ?? error}`);
      process.exit(1);
    });
}
