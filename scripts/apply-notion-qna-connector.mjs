#!/usr/bin/env node
/**
 * Regenerate notion-content.json from the current snapshot plus the read-only
 * Notion connector fixture for Q&A No 81-91.
 *
 * The public Notion snapshot generator uses the private `www.notion.so/api/v3`
 * endpoints. Those endpoints are not reachable from this sandbox, so this
 * script feeds the exact connector data through `loadHubQna()`'s fetch layer.
 * It still uses the repository's canonical Q&A rules (`hubQna.js`) and never
 * edits the snapshot by hand.
 *
 *   node scripts/apply-notion-qna-connector.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadHubQna } from "./notion-snapshot.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = path.join(ROOT, "content/notion-qna-81-91.json");
const SNAPSHOT = path.join(ROOT, "notion-content.json");
const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const previous = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));
const dashed = (id) => {
  const raw = String(id).replace(/-/g, "").toLowerCase();
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
};

const FAQ_PAGE_ID = dashed(fixture.databaseId);
const FAQ_VIEW_ID = dashed(fixture.viewId);
const COLLECTION_ID = dashed(fixture.dataSourceId);
const SPACE_ID = "0a0a0a0a-0a0a-0a0a-0a0a-0a0a0a0a0a0a";
const PROP = {
  title: "p-title",
  no: "p-no",
  status: "p-status",
  publish: "p-publish",
  priority: "p-priority",
  category: "p-category",
  slug: "p-slug",
  seo: "p-seo",
  check: "p-check",
};
const SCHEMA = {
  [PROP.title]: { name: "질문", type: "title" },
  [PROP.no]: { name: "No", type: "number" },
  [PROP.status]: { name: "상태", type: "select" },
  [PROP.publish]: { name: "허브 게시", type: "select" },
  [PROP.priority]: { name: "우선순위", type: "number" },
  [PROP.category]: { name: "카테고리", type: "select" },
  [PROP.slug]: { name: "Slug", type: "text" },
  [PROP.seo]: { name: "SEO 설명", type: "text" },
  [PROP.check]: { name: "확인 필요", type: "checkbox" },
};

const legacyCell = (value) => [[String(value)]];
const legacyRow = (page) => ({
  id: dashed(page.id),
  type: "page",
  created_time: Date.parse(page.createdTime),
  last_edited_time: Date.parse(page.lastEditedTime),
  properties: {
    [PROP.title]: legacyCell(page.title),
    [PROP.no]: legacyCell(page.no),
    [PROP.status]: legacyCell(page.status),
    [PROP.publish]: legacyCell(page.publish),
    [PROP.priority]: legacyCell(page.priority),
    [PROP.category]: legacyCell(page.category),
    [PROP.slug]: legacyCell(page.slug),
    [PROP.seo]: legacyCell(page.seoDescription),
    [PROP.check]: legacyCell(page.needsCheck ? "Yes" : "No"),
  },
});

const legacyText = (id, type, text) => ({
  value: { id, type, properties: { title: legacyCell(text) }, content: [] },
});
function legacyBody(page) {
  const rootId = dashed(page.id);
  const ids = {
    answerHeading: `${rootId}-h-answer`,
    answer: `${rootId}-p-answer`,
    sourceHeading: `${rootId}-h-source`,
    source: `${rootId}-p-source`,
    internalHeading: `${rootId}-h-internal`,
    internal: `${rootId}-p-internal`,
  };
  const content = [ids.answerHeading, ids.answer];
  const blocks = {
    [ids.answerHeading]: legacyText(ids.answerHeading, "header", "답변"),
    [ids.answer]: legacyText(ids.answer, "text", page.answer),
  };
  if (page.source) {
    content.push(ids.sourceHeading, ids.source);
    blocks[ids.sourceHeading] = legacyText(ids.sourceHeading, "header", "게시용 출처");
    blocks[ids.source] = legacyText(ids.source, "text", page.source);
  }
  content.push(ids.internalHeading, ids.internal);
  blocks[ids.internalHeading] = legacyText(ids.internalHeading, "header", "내부 근거");
  blocks[ids.internal] = legacyText(ids.internal, "text", page.internalNote);
  blocks[rootId] = {
    value: {
      id: rootId,
      type: "page",
      properties: { title: legacyCell(page.title) },
      content,
    },
  };
  return blocks;
}

const pageById = new Map(fixture.pages.map((page) => [dashed(page.id), page]));
const bodyByPageId = new Map(fixture.pages.map((page) => [dashed(page.id), legacyBody(page)]));
const collectionViewChunk = () => ({
  recordMap: {
    block: {
      [FAQ_PAGE_ID]: {
        value: {
          id: FAQ_PAGE_ID,
          type: "collection_view_page",
          collection_id: COLLECTION_ID,
          view_ids: [FAQ_VIEW_ID],
          space_id: SPACE_ID,
          properties: { title: [["XCONDA 허브 Q&A"]] },
          content: [],
        },
      },
    },
  },
  cursor: { stack: [] },
});
const collectionQuery = () => {
  const blockIds = fixture.pages.map((page) => dashed(page.id));
  return {
    result: { reducerResults: { collection_group_results: { blockIds } } },
    recordMap: {
      collection: { [COLLECTION_ID]: { value: { id: COLLECTION_ID, schema: SCHEMA } } },
      block: Object.fromEntries(fixture.pages.map((page) => [dashed(page.id), { value: legacyRow(page) }])),
    },
  };
};

const originalFetch = globalThis.fetch;
const originalLog = console.log;
globalThis.fetch = async (url, init) => {
  const pathname = String(url).replace("https://www.notion.so/api/v3/", "");
  const body = JSON.parse(init?.body ?? "{}");
  let data;
  if (pathname.startsWith("loadPageChunk")) {
    data = body.pageId === FAQ_PAGE_ID
      ? collectionViewChunk()
      : bodyByPageId.has(body.pageId)
        ? { recordMap: { block: bodyByPageId.get(body.pageId) }, cursor: { stack: [] } }
        : { recordMap: { block: {} }, cursor: { stack: [] } };
  } else if (pathname.startsWith("queryCollection")) {
    data = collectionQuery();
  } else {
    throw new Error(`예상하지 못한 Notion 요청: ${pathname}`);
  }
  return { ok: true, status: 200, text: async () => JSON.stringify(data) };
};
console.log = () => {};
try {
  const qna = await loadHubQna({
    pageId: FAQ_PAGE_ID,
    databaseId: FAQ_VIEW_ID,
    previous,
  });
  if (qna.report.skipped) throw new Error(`Q&A 동기화를 건너뛰었습니다: ${qna.report.skipped}`);
  if (qna.rows.length !== fixture.pages.length) throw new Error(`Q&A ${fixture.pages.length}건 중 ${qna.rows.length}건만 생성되었습니다`);
  if (qna.report.missingAnswer.length || qna.report.unsectioned.length) throw new Error(`답변/본문_section 규칙 오류: ${JSON.stringify({ missing: qna.report.missingAnswer, unsectioned: qna.report.unsectioned })}`);
  for (const page of fixture.pages) {
    const row = qna.rows.find((item) => item.id === dashed(page.id));
    if (!row) throw new Error(`스냅샷 행 누락: No ${page.no}`);
    for (const [field, value] of Object.entries({ No: page.no, Slug: page.slug, Category: page.category, "SEO 설명": page.seoDescription, Summary: page.answer })) {
      if (String(row[field] ?? "") !== String(value)) throw new Error(`No ${page.no} ${field} 불일치: ${row[field]}`);
    }
    if (!row.Published || row.__type !== "faq" || row.__source !== "hub-qna") throw new Error(`No ${page.no} 발행/분류 오류`);
    if (!qna.pages[row.id]) throw new Error(`No ${page.no} 공개 본문 누락`);
  }

  const newIds = new Set(qna.rows.map((row) => row.id));
  const rows = previous.rows.filter((row) => !newIds.has(row.id)).concat(qna.rows);
  const pages = { ...previous.pages };
  for (const [id, body] of Object.entries(qna.pages)) pages[id] = body;
  const source = {
    ...previous.source,
    faqPageId: FAQ_PAGE_ID,
    faqViewId: qna.report.viewBlockId ?? FAQ_VIEW_ID,
    faqCollectionId: qna.report.collectionId ?? COLLECTION_ID,
    faqDataSourceId: COLLECTION_ID,
  };
  const snapshot = {
    generatedAt: new Date().toISOString(),
    source,
    rows,
    pages,
  };
  fs.writeFileSync(SNAPSHOT, `${JSON.stringify(snapshot)}\n`);
} finally {
  globalThis.fetch = originalFetch;
  console.log = originalLog;
}
console.log(`✔ notion-content.json: Q&A No 81-91 ${fixture.pages.length}건 반영 (전체 ${previous.rows.length + fixture.pages.length}행)`);
