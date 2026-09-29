#!/usr/bin/env node
/* =============================================================================
 * XCONDA허브 · 공개 Notion 스냅샷 생성기
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

import { SECTION_LABELS, TYPE_CHOICES, classifyType, pickRow } from "../src/content/classify.js";

const DEFAULT_PAGE_ID = "3e72ebc017ad8024a3f5ef8fb9f8c6dd";
const DEFAULT_DATABASE_ID = "3b54d2ea0d5e4ab5b33cff12de807517";

/** 섹션 표시 순서 (사이트와 동일: 공지사항 → 뉴스 → 툴 사용법 → 블로그 → Q&A) */
const SECTION_ORDER = ["notice", "news", "guide", "blog", "faq"];

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

const undashed = (id) => String(id).replace(/-/g, "").toLowerCase();

/** 하이픈이 있든 없든 항상 8-4-4-4-12 UUID 형태로 정규화합니다. */
const dashed = (id) => {
  const raw = undashed(id);
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
};

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

/** 렌더링에 필요한 필드만 남겨 스냅샷 용량을 줄입니다. (crdt_data 등 제거) */
function slimBlock(value) {
  const slim = { id: value.id, type: value.type };
  if (isRecord(value.properties)) slim.properties = value.properties;
  if (isRecord(value.format)) slim.format = value.format;
  if (Array.isArray(value.content)) slim.content = value.content;
  if (Array.isArray(value.view_ids)) slim.view_ids = value.view_ids;
  if (value.collection_id) slim.collection_id = value.collection_id;
  if (value.space_id) slim.space_id = value.space_id;
  if (value.alive === false) slim.alive = false;
  return slim;
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
      if (value?.id && value?.type) blocks[id] = { value: slimBlock(value) };
    }
    const next = data?.cursor;
    if (!next || !Array.isArray(next.stack) || next.stack.length === 0) break;
    cursor = next;
    chunkNumber += 1;
  }
  return blocks;
}

/**
 * 페이지 안의 데이터베이스(collection_view) 블록을 **모두** 찾습니다.
 * 표가 2개 이상이면 지금은 첫 번째(또는 지정한 ID)만 동기화하므로, 리포트에서 경고합니다
 * — "글을 다른 표에 추가해서 사이트에 안 보이는" 상황을 바로 알 수 있게 하기 위함입니다.
 */
function findCollectionViews(blocks) {
  const views = [];
  for (const entry of Object.values(blocks)) {
    const b = entry.value;
    if (!b || !/^collection_view/.test(String(b.type))) continue;
    const collectionId = b.collection_id ?? b.format?.collection_pointer?.id;
    const viewId = Array.isArray(b.view_ids) ? b.view_ids[0] : undefined;
    if (!collectionId || !viewId) continue;
    views.push({
      blockId: b.id,
      collectionId,
      viewId,
      spaceId: b.space_id ?? b.format?.collection_pointer?.spaceId,
    });
  }
  return views;
}

/** 지정한 ID(없으면 첫 번째)에 해당하는 표를 고릅니다. */
function pickCollectionView(views, preferredId) {
  if (!views.length) return undefined;
  const wanted = preferredId ? undashed(preferredId) : undefined;
  return (wanted ? views.find((v) => undashed(v.blockId) === wanted) : undefined) ?? views[0];
}

/** 이 행이 어느 섹션으로 들어가는지 — 사이트와 같은 규칙(src/content/classify.js)으로 판정 */
function classifyRow(row) {
  return classifyType({
    type: pickRow(row, ["Type", "유형", "타입", "구분"]),
    category: pickRow(row, ["Category", "카테고리", "분류"]),
    link: pickRow(row, ["Link", "URL", "링크"]),
    changes: pickRow(row, ["Changes", "변경사항", "변경 사항"]),
    version: pickRow(row, ["Version", "버전"]),
    tool: pickRow(row, ["Tool", "툴", "도구"]),
  });
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
  // 커버 속성이 없으면 노션 페이지 커버 이미지를 대신 사용합니다.
  if (!row.Cover && block.format?.page_cover) {
    const cover = String(block.format.page_cover);
    row.Cover = cover.startsWith("/")
      ? `https://www.notion.so/image/${encodeURIComponent(`https://www.notion.so${cover}`)}?table=block&id=${block.id}&cache=v2`
      : cover;
  }
  return row;
}

/**
 * Published 계열 열이 있는 스키마에서는 체크된 행만 공개합니다.
 * 체크를 해제한 행은 레거시 레코드맵에서 속성 자체가 빠지므로,
 * "열이 있는데 키가 없음" = 미공개로 간주합니다. (사이트 표시 규칙과 동일)
 */
const isPublished = (row) => {
  const key = Object.keys(row).find((k) => PUBLISHED_KEYS.includes(k.trim().toLowerCase()));
  return key !== undefined && row[key] === true;
};

const hasPublishedColumn = (schema) =>
  Object.values(schema).some((c) => PUBLISHED_KEYS.includes(String(c?.name ?? "").trim().toLowerCase()));

/* ------------------------------ 스냅샷 ------------------------------ */

/** 빈 문자열(설정하지 않은 GitHub Variables 가 공백으로 넘어오는 경우)은 없는 값으로 취급합니다. */
const firstFilled = (...values) => values.find((v) => typeof v === "string" && v.trim() !== "");

export async function buildSnapshot({ pageId, databaseId } = {}) {
  const page = extractId(firstFilled(pageId, process.env.NOTION_PAGE_ID, DEFAULT_PAGE_ID));
  const database = extractId(firstFilled(databaseId, process.env.NOTION_DATABASE_ID, DEFAULT_DATABASE_ID));
  if (!page && !database) throw new Error("NOTION_PAGE_ID 또는 NOTION_DATABASE_ID 가 필요합니다");

  const rootId = page ?? database;
  const blocks = await loadBlockMap(rootId);
  let views = findCollectionViews(blocks);
  let view = pickCollectionView(views, database);

  // 페이지가 아니라 데이터베이스 ID 만 주어진 경우 해당 블록을 직접 조회
  if (!view && database) {
    const dbBlocks = await loadBlockMap(database);
    const dbViews = findCollectionViews(dbBlocks);
    if (dbViews.length) views = dbViews;
    view = pickCollectionView(dbViews, database);
  }
  if (!view) throw new Error("게시된 페이지 안에서 데이터베이스(표)를 찾지 못했습니다");

  const { blockIds, recordMap } = await queryCollection(view);
  const collection = unwrap(recordMap?.collection?.[view.collectionId]) ?? {};
  const schema = isRecord(collection.schema) ? collection.schema : {};
  const requirePublished = hasPublishedColumn(schema);

  console.log(`[Notion Sync] 데이터베이스 컬럼: ${Object.values(schema).map((c) => `${c?.name}(${c?.type})`).join(", ")}`);
  console.log(`[Notion Sync] 조회된 전체 행 수: ${blockIds.length}`);

  const rows = [];
  const included = []; // 요약(Actions Summary)에 쓰는 행 정보
  const excluded = []; // Published 미체크로 제외된 행
  for (const id of blockIds) {
    const block = unwrap(recordMap?.block?.[id]);
    if (!block || block.alive === false) continue;
    const row = rowToObject(block, schema);
    if (!row.id) continue;
    const title = row.Title ?? row.title ?? row["제목"] ?? "(제목 없음)";
    const decision = classifyRow(row);
    // 사이트가 그대로 쓰는 확정 섹션 — 노션 Type/내용으로 판정한 결과를 스냅샷에 함께 기록합니다.
    row.__type = decision.type;
    const link = pickRow(row, ["Link", "URL", "링크"]);
    const info = {
      title,
      type: decision.type,
      rawType: decision.raw,
      source: decision.source,
      reason: decision.reason,
      channel: decision.channel,
      category: String(pickRow(row, ["Category", "카테고리", "분류"]) ?? ""),
      link: typeof link === "string" ? link : "",
    };
    const published = isPublished(row);
    console.log(
      `[Notion Sync] 행 확인: "${title}" | Type=${row.Type ?? "없음"} | Published=${row.Published ?? "없음"} (isPublished=${published}) → ${SECTION_LABELS[decision.type]} (${decision.reason})`
    );
    if (requirePublished && !published) {
      console.log(`  └ [미공개 제외] "${title}" 은(는) Published 가 체크되지 않아 스냅샷에서 제외되었습니다.`);
      excluded.push(info);
      continue;
    }
    included.push(info);
    rows.push(row);
  }

  if (rows.length === 0 && blockIds.length > 0) {
    console.warn(`⚠️ [Notion Sync 경고] ${blockIds.length}개의 행이 있지만 Published 조건으로 인해 0개가 포함되었습니다.`);
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
    /* ↓ 스냅샷 파일에는 저장하지 않고, Actions 요약 리포트에만 쓰는 정보 */
    report: {
      included,
      excluded,
      columns: Object.values(schema).map((c) => `${c?.name ?? "?"}(${c?.type ?? "?"})`),
      // 같은 표를 여러 뷰(표·갤러리 등)로 보여주는 경우가 있으므로 데이터베이스(collection) 기준으로 셉니다.
      viewCount: new Set(views.map((v) => undashed(v.collectionId))).size,
      rowCount: included.length + excluded.length,
      viewBlockId: view.blockId ?? null,
    },
  };
}

/* --------------------------- Actions 요약 리포트 --------------------------- */

const cell = (value, max = 80) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\|/g, "\\|")
    .trim()
    .slice(0, max);

/**
 * "글이 어느 섹션으로 들어갔는지" + "손볼 곳"을 한 장으로 정리합니다.
 * GitHub Actions 실행 화면의 **Summary** 탭에 그대로 표시됩니다.
 * (분류가 이상하다고 느낄 때 로그를 뒤지지 않고 바로 확인할 수 있게 하는 것이 목적)
 */
export function renderSyncSummary({ report, generatedAt, writeReason = null, previousGeneratedAt = null, now = Date.now() } = {}) {
  const included = report?.included ?? [];
  const excluded = report?.excluded ?? [];
  const columns = report?.columns ?? [];
  const viewCount = report?.viewCount ?? 0;
  const rowCount = report?.rowCount ?? included.length + excluded.length;

  const counts = Object.fromEntries(SECTION_ORDER.map((type) => [type, 0]));
  for (const item of included) counts[item.type] = (counts[item.type] ?? 0) + 1;

  const lines = [];
  lines.push("## 📥 Notion 동기화 결과");
  lines.push("");
  lines.push(
    `표에서 읽은 행 **${rowCount}개** · 사이트에 포함 **${included.length}개** · 미공개(제외) **${excluded.length}개**` +
      (writeReason ? ` · 스냅샷 파일: ${writeReason}` : "")
  );
  lines.push("");
  lines.push("### 섹션별 글 수");
  lines.push("");
  lines.push("| 섹션 | 글 수 |");
  lines.push("| --- | --- |");
  for (const type of SECTION_ORDER) lines.push(`| ${SECTION_LABELS[type]} | ${counts[type] ?? 0} |`);
  lines.push("");

  if (included.length) {
    lines.push("### 포함된 글");
    lines.push("");
    lines.push("| 제목 | 노션 Type | → 사이트 섹션 | 분류 근거 | Category |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const item of included) {
      lines.push(
        `| ${cell(item.title)} | ${cell(item.rawType || "(비어 있음)", 20)} | ${SECTION_LABELS[item.type] ?? item.type} | ${cell(item.reason, 40)} | ${cell(item.category, 20)} |`
      );
    }
    lines.push("");
  }

  if (excluded.length) {
    lines.push("### 제외된 글 (Published 미체크)");
    lines.push("");
    lines.push("| 제목 | 노션 Type |");
    lines.push("| --- | --- |");
    for (const item of excluded) lines.push(`| ${cell(item.title)} | ${cell(item.rawType || "(비어 있음)", 20)} |`);
    lines.push("");
  }

  /* ------------------------------ 확인 필요 ------------------------------ */
  const notes = [];
  if (viewCount > 1) {
    notes.push(
      `**표(데이터베이스)가 ${viewCount}개** 있습니다. 지금은 첫 번째 표만 읽습니다 — 글을 다른 표에 추가했다면 사이트에 나타나지 않습니다. 한 표로 합치거나 저장소 Settings → Variables 의 \`NOTION_DATABASE_ID\` 를 원하는 표로 바꾸세요.`
    );
  }
  const unknown = included.filter((item) => item.source === "unknown");
  if (unknown.length) {
    const values = [...new Set(unknown.map((item) => `\`${item.rawType}\``))].join(", ");
    notes.push(
      `**처음 보는 Type 값**: ${values} → 내용으로 추정했습니다. 정확히 분류하려면 노션에서 \`Type\` 을 ${TYPE_CHOICES} 중 하나로 바꾸세요.`
    );
  }
  const blank = included.filter((item) => item.source === "default");
  if (blank.length) {
    notes.push(
      `**Type 칸이 비어 있는 글 ${blank.length}개** — 내용으로 추정했습니다(${blank
        .slice(0, 5)
        .map((item) => `“${cell(item.title, 30)}”`)
        .join(", ")}). 노션에서 \`Type\` 을 지정하는 것이 가장 확실합니다.`
    );
  }
  const linkedNotices = included.filter((item) => item.type === "notice" && item.channel);
  if (linkedNotices.length) {
    notes.push(
      `**SNS 링크가 있는 공지 ${linkedNotices.length}개** — ${linkedNotices
        .slice(0, 5)
        .map((item) => `“${cell(item.title, 30)}”`)
        .join(", ")}. 지금은 **공지사항**에 표시됩니다. 뉴스 섹션에 넣으려면 노션에서 \`Type\` 을 \`뉴스\` 로 바꾸세요. (Type 을 적어 두면 자동 이동하지 않습니다)`
    );
  }
  if (!included.length && rowCount) {
    notes.push(`**게시된 글이 0개**입니다. 노션에서 \`Published\`(또는 \`공개\`) 체크박스를 확인하세요.`);
  }
  if (excluded.length) {
    notes.push(`제외된 ${excluded.length}개 글은 \`Published\` 를 체크하면 다음 동기화부터 사이트에 나타납니다.`);
  }
  const previousAt = Date.parse(previousGeneratedAt ?? "");
  const ageMin = Number.isFinite(previousAt) ? Math.round((now - previousAt) / 60_000) : NaN;
  if (Number.isFinite(ageMin) && ageMin >= 60) {
    notes.push(
      `직전 스냅샷이 **${(ageMin / 60).toFixed(1)}시간 전**입니다. GitHub 기본 스케줄은 수 시간까지 밀립니다 — NOTION_SETUP.md 의 「⏱ 반영 속도 보장하기」(외부 스케줄러, 무료)를 설정하면 약 10분 주기로 반영됩니다.`
    );
  }
  if (!notes.length) notes.push("특별히 확인할 항목이 없습니다. ✅");

  lines.push("### ⚠️ 확인 필요");
  lines.push("");
  for (const note of notes) lines.push(`- ${note}`);
  lines.push("");
  lines.push(
    `_스냅샷 생성: ${generatedAt ?? new Date(now).toISOString()} · 사이트: https://hanahchafilmaker.github.io/XCONDA_info/ · 분류 규칙: src/content/classify.js_`
  );
  return lines.join("\n");
}

/** GitHub Actions 요약(Summary) 탭에 리포트를 씁니다. (로컬 실행에서는 조용히 넘어갑니다) */
export async function appendSyncSummary(markdown) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file || !markdown) return false;
  const { appendFile } = await import("node:fs/promises");
  await appendFile(file, markdown.endsWith("\n") ? markdown : `${markdown}\n`, "utf8");
  return true;
}

/* ------------------------ 변경 감지 (빈 커밋 방지) ------------------------ */

/**
 * 내용이 그대로여도 `generatedAt` 은 매번 달라지므로, 그대로 두면 동기화가 돌 때마다
 * 커밋 + GitHub Pages 빌드가 발생합니다. (실측: 스냅샷 커밋의 83% 가 generatedAt 만 바뀐 빈 커밋)
 * GitHub Pages(브랜치 배포)는 시간당 10회 빌드가 soft limit 이라, 외부 스케줄러로 동기화를
 * 자주 호출하려면 "내용이 바뀔 때만" 파일을 갱신해야 합니다.
 *
 * 단, 사이트의 "n분 전" 표시와 낡음(stale) 판정이 generatedAt 에 의존하므로
 * 내용이 같아도 HEARTBEAT_MS 가 지나면 한 번 갱신(하트비트)합니다.
 */
export const HEARTBEAT_MS = 60 * 60 * 1000;

/** 키 순서와 무관하게 같은 값이면 같은 문자열이 되는 직렬화 (비교 전용) */
export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v ?? null)).join(",")}]`;
  if (isRecord(value)) {
    const body = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${body.join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/** `generatedAt` 을 제외한 "내용" 지문 */
export const snapshotContentKey = (snapshot) =>
  stableStringify({
    source: snapshot?.source ?? null,
    rows: snapshot?.rows ?? [],
    pages: snapshot?.pages ?? {},
  });

/**
 * 새 스냅샷을 파일에 쓸지 결정합니다. 애매하면 항상 "쓴다" 쪽으로 판단합니다.
 *  - 이전 스냅샷이 없거나 형식이 다르면 쓴다
 *  - 내용(source · rows · pages)이 달라졌으면 쓴다
 *  - 내용이 같아도 이전 generatedAt 이 heartbeatMs 이상 지났거나 읽을 수 없으면 쓴다(하트비트)
 */
export function shouldWriteSnapshot(previous, next, { now = Date.now(), heartbeatMs = HEARTBEAT_MS } = {}) {
  if (!isRecord(previous) || !Array.isArray(previous.rows)) return { write: true, reason: "이전 스냅샷 없음" };
  if (snapshotContentKey(previous) !== snapshotContentKey(next)) return { write: true, reason: "내용 변경" };
  const previousAt = Date.parse(previous.generatedAt ?? "");
  if (!Number.isFinite(previousAt) || previousAt > now || now - previousAt >= heartbeatMs) {
    return { write: true, reason: "하트비트 갱신" };
  }
  return { write: false, reason: "변경 없음" };
}

/* ------------------------------ CLI ------------------------------ */

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf("--out");
  const out = outIndex >= 0 ? args[outIndex + 1] : "notion-content.json";
  const print = args.includes("--print");
  const force = args.includes("--force"); // 변경 여부와 관계없이 항상 다시 쓴다
  const heartbeatIndex = args.indexOf("--heartbeat-min");
  const heartbeatMin = heartbeatIndex >= 0 ? Number(args[heartbeatIndex + 1]) : NaN;
  const heartbeatMs = Number.isFinite(heartbeatMin) && heartbeatMin >= 0 ? heartbeatMin * 60_000 : HEARTBEAT_MS;

  buildSnapshot()
    .then(async (snapshot) => {
      // 스냅샷 파일에는 generatedAt · source · rows · pages 만 저장합니다.
      // (report 는 Actions 요약 전용 — 파일 크기와 커밋 노이즈를 늘리지 않습니다)
      const payload = { generatedAt: snapshot.generatedAt, source: snapshot.source, rows: snapshot.rows, pages: snapshot.pages };
      const json = `${JSON.stringify(payload, null, 0)}\n`;
      if (print) console.log(JSON.stringify(payload.rows, null, 2));
      const { readFile, writeFile } = await import("node:fs/promises");

      let previous = null;
      try {
        previous = JSON.parse(await readFile(out, "utf8"));
      } catch {
        /* 첫 생성이거나 읽을 수 없음 → 새로 씁니다 */
      }
      const decision = force ? { write: true, reason: "--force" } : shouldWriteSnapshot(previous, payload, { heartbeatMs });

      let writeReason;
      if (decision.write) {
        await writeFile(out, json, "utf8");
        writeReason = `갱신 (${decision.reason})`;
        console.log(
          `✔ ${out} 갱신 (${decision.reason}) — 글 ${payload.rows.length}개 / 본문 ${Object.keys(payload.pages).length}개 (${(json.length / 1024).toFixed(1)} KB)`
        );
      } else {
        writeReason = `유지 (${decision.reason})`;
        console.log(
          `＝ ${out} 유지 (${decision.reason}) — 글 ${payload.rows.length}개, 내용 동일 · 마지막 갱신 ${previous.generatedAt} (하트비트 ${Math.round(heartbeatMs / 60_000)}분) → 빈 커밋 방지`
        );
      }

      // 어느 글이 어느 섹션으로 들어갔는지 + 노션에서 손볼 곳을 요약으로 남깁니다.
      const summary = renderSyncSummary({
        report: snapshot.report,
        generatedAt: payload.generatedAt,
        writeReason,
        previousGeneratedAt: previous?.generatedAt ?? null,
      });
      if (!(await appendSyncSummary(summary))) console.log(`\n${summary}`);
    })
    .catch(async (error) => {
      console.error(`✖ Notion 스냅샷 생성 실패: ${error?.message ?? error}`);
      const help = [
        "## ✖ Notion 동기화 실패",
        "",
        "```",
        String(error?.message ?? error),
        "```",
        "",
        "**확인 순서**",
        "1. 노션 페이지 공유 → **웹에 게시(Publish)** 상태인지",
        "2. 페이지 안에 표(데이터베이스)가 있고, `Published` 체크된 행이 있는지",
        "3. 저장소 Settings → Variables 의 `NOTION_PAGE_ID` / `NOTION_DATABASE_ID` 가 맞는지",
        "4. 그래도 실패하면 NOTION_SETUP.md 의 「동기화가 안 될 때 확인 순서」",
      ].join("\n");
      if (!(await appendSyncSummary(help))) console.error(help);
      process.exit(1);
    });
}
