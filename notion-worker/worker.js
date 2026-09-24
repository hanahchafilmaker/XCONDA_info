/**
 * XCONDA 가이드 센터 · Notion 프록시 (Cloudflare Worker)
 * ---------------------------------------------------------------
 * 환경 변수 (wrangler secret / Dashboard → Settings → Variables)
 *   NOTION_TOKEN   : Notion Internal Integration Secret (secret_xxx / ntn_xxx)
 *   NOTION_DB_ID   : 가이드 센터 데이터베이스 ID (32자리)
 *   ALLOW_ORIGIN   : (선택) 허용할 사이트 주소. 기본 "*"
 *
 * 라우트
 *   GET /                → 게시(Published=true)된 전체 글 (Date 내림차순)
 *   GET /blocks/:pageId  → 페이지 본문 블록 (토글 1단계 하위 블록 포함)
 *
 * 캐시: 60초 엣지 캐시 → 노션에서 글을 올리면 최대 1분 안에 사이트에 반영
 */

const NOTION = "https://api.notion.com/v1";
const VERSION = "2022-06-28";
const CACHE_SECONDS = 60;

export default {
  async fetch(request, env, ctx) {
    const origin = env.ALLOW_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405, headers: cors });

    const url = new URL(request.url);
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    const headers = {
      Authorization: `Bearer ${env.NOTION_TOKEN}`,
      "Notion-Version": VERSION,
      "Content-Type": "application/json",
    };

    try {
      let body;
      const m = url.pathname.match(/^\/blocks\/([\w-]+)\/?$/);

      if (m) {
        body = { results: await listBlocks(m[1], headers, true) };
      } else if (url.pathname === "/" || url.pathname === "") {
        body = { results: await queryDatabase(env.NOTION_DB_ID, headers) };
      } else {
        return new Response("Not Found", { status: 404, headers: cors });
      }

      const res = new Response(JSON.stringify(body), {
        headers: {
          ...cors,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
        },
      });
      ctx.waitUntil(cache.put(cacheKey, res.clone()));
      return res;
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  },
};

async function queryDatabase(dbId, headers) {
  const results = [];
  let cursor;
  do {
    const r = await fetch(`${NOTION}/databases/${dbId}/query`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        filter: { property: "Published", checkbox: { equals: true } },
        sorts: [{ property: "Date", direction: "descending" }],
        page_size: 100,
        start_cursor: cursor,
      }),
    });
    if (!r.ok) throw new Error(`Notion query ${r.status}: ${await r.text()}`);
    const data = await r.json();
    results.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return results;
}

async function listBlocks(id, headers, expandToggles) {
  const results = [];
  let cursor;
  do {
    const qs = new URLSearchParams({ page_size: "100" });
    if (cursor) qs.set("start_cursor", cursor);
    const r = await fetch(`${NOTION}/blocks/${id}/children?${qs}`, { headers });
    if (!r.ok) throw new Error(`Notion blocks ${r.status}: ${await r.text()}`);
    const data = await r.json();
    results.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  if (expandToggles) {
    await Promise.all(
      results
        .filter((b) => b.type === "toggle" && b.has_children)
        .map(async (b) => {
          b.children = await listBlocks(b.id, headers, false);
        })
    );
  }
  return results;
}
