/* =============================================================================
 * scripts/link-preview.mjs 단위 테스트 — 네트워크 없이 실행됩니다.
 *   npm run test:unit        (node --test)
 * · og:image 추출(따옴표 · 속성 순서 · 상대 경로 · twitter 폴백)
 * · 뉴스 행만 · 이미지가 없는 행만 수집, manifest 멱등(재다운로드 없음)
 * · 스냅샷은 행이 바뀐 경우에만 다시 씁니다(형식 · 필드 정리)
 * · 실패해도 예외가 밖으로 새지 않습니다(빌드 계속 보장)
 * ========================================================================== */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { collectLinkPreviews, extractOgImage, LINK_IMAGE_DIR, LINK_MANIFEST_PATH } from "./link-preview.mjs";

/* ------------------------------ og:image 추출 ------------------------------ */

test("extractOgImage: og:image 를 절대 주소로 찾습니다", () => {
  const html = `<html><head><meta property="og:image" content="https://cdn.example.com/a.jpg"></head></html>`;
  assert.equal(extractOgImage(html, "https://example.com/x"), "https://cdn.example.com/a.jpg");
});

test("extractOgImage: content 가 앞으로 와도 · 작은따옴표여도 찾습니다", () => {
  const html = `<meta content='/img/b.png' property='og:image'>`;
  assert.equal(extractOgImage(html, "https://example.com/post/1"), "https://example.com/img/b.png");
});

test("extractOgImage: 상대 주소 · 프로토콜 상대 주소를 기본 주소에 맞춰 풀이합니다", () => {
  assert.equal(
    extractOgImage(`<meta property="og:image" content="/og.png">`, "https://example.com/a/b"),
    "https://example.com/og.png",
  );
  assert.equal(
    extractOgImage(`<meta property="og:image" content="//cdn.example.com/og.png">`, "https://example.com/a/b"),
    "https://cdn.example.com/og.png",
  );
});

test("extractOgImage: og:image 가 없으면 twitter:image 를 씁니다", () => {
  const html = `
    <meta name="twitter:image" content="https://cdn.example.com/tw.jpg">
    <meta name="twitter:image:src" content="https://cdn.example.com/tw2.jpg">
  `;
  assert.equal(extractOgImage(html, "https://example.com/"), "https://cdn.example.com/tw.jpg");
});

test("extractOgImage: 없으면 빈 문자열, 깨진 주소는 건너뜁니다", () => {
  assert.equal(extractOgImage("<p>no meta</p>", "https://example.com/"), "");
  assert.equal(extractOgImage(`<meta property="og:image" content="data:image/png;base64,AAA">`, "https://e.com/"), "");
});

/* ------------------------------ 수집 · 캐시 · 정리 ------------------------------ */

const newsRow = (over = {}) => ({
  id: "11111111-1111-4111-8111-111111111111",
  __type: "news",
  Title: "링크 뉴스",
  Link: "https://news.example.com/article/1",
  Published: true,
  Date: "2026-10-30",
  ...over,
});

/** 페이지 HTML + 이미지 응답을 돌려주는 스텁 */
function stubFetch({ og = "https://cdn.example.com/og.jpg", calls = [] } = {}) {
  return async (url) => {
    calls.push(String(url));
    if (String(url).includes("news.example.com")) {
      return {
        ok: true,
        status: 200,
        url: String(url),
        headers: { get: (h) => (h.toLowerCase() === "content-type" ? "text/html; charset=utf-8" : null) },
        arrayBuffer: async () => new TextEncoder().encode(`<meta property="og:image" content="${og}">`).buffer,
      };
    }
    return {
      ok: true,
      status: 200,
      url: String(url),
      headers: { get: (h) => (h.toLowerCase() === "content-type" ? "image/jpeg" : null) },
      arrayBuffer: async () => new Uint8Array([0xff, 0xd8, 0xff, 0xd9]).buffer,
    };
  };
}

const tmpRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), "link-preview-"));

test("수집: 이미지가 없는 뉴스 행은 og:image 를 내려받아 __linkImage 를 적습니다", async () => {
  const root = tmpRoot();
  const rows = [newsRow()];
  const calls = [];
  const result = await collectLinkPreviews({ rows, pages: {}, root, fetchImpl: stubFetch({ calls }), log: () => {} });

  assert.equal(result.saved.length, 1);
  assert.equal(result.mutated, true);
  assert.match(rows[0].__linkImage, /^\/assets\/img\/og\/link\/[0-9a-f]{16}\.jpg$/);
  const file = path.join(root, LINK_IMAGE_DIR, path.basename(rows[0].__linkImage));
  assert.ok(fs.existsSync(file), "이미지 파일이 저장되어 있어야 합니다");

  const manifest = JSON.parse(fs.readFileSync(path.join(root, LINK_MANIFEST_PATH), "utf8"));
  assert.equal(manifest[rows[0].Link], path.basename(rows[0].__linkImage));
  // 키 정렬(멱등 저장)
  assert.deepEqual(Object.keys(manifest), [...Object.keys(manifest)].sort());
  fs.rmSync(root, { recursive: true, force: true });
});

test("수집: 두 번째 실행은 manifest 캐시로 재다운로드하지 않습니다", async () => {
  const root = tmpRoot();
  const rows = [newsRow()];
  const calls = [];
  await collectLinkPreviews({ rows, pages: {}, root, fetchImpl: stubFetch({ calls }), log: () => {} });
  assert.equal(calls.length, 2, "1회차: 페이지 + 이미지");

  // 스냅샷이 재생성되어 __linkImage 가 사라진 상태(실제 동기화와 동일)
  const fresh = [newsRow()];
  const calls2 = [];
  const second = await collectLinkPreviews({ rows: fresh, pages: {}, root, fetchImpl: stubFetch({ calls: calls2 }), log: () => {} });
  assert.equal(calls2.length, 0, "2회차: 캐시_hit 이면 네트워크 없음");
  assert.equal(second.mutated, true, "__linkImage 를 다시 적어야 합니다");
  assert.match(fresh[0].__linkImage, /^\/assets\/img\/og\/link\//);
  fs.rmSync(root, { recursive: true, force: true });
});

test("수집: 뉴스가 아니거나 · 링크가 없거나 · 이미지가 있는 행은 건너뜁니다", async () => {
  const root = tmpRoot();
  const rows = [
    newsRow({ __type: "notice", id: "22222222-2222-4222-8222-222222222222" }),
    newsRow({ id: "33333333-3333-4333-8333-333333333333", Link: undefined }),
    newsRow({ id: "44444444-4444-4444-8444-444444444444", __cover: "https://www.notion.so/image/cover" }),
    newsRow({ id: "55555555-5555-4555-8555-555555555555", "OG 이미지": "https://cdn.example.com/og.png" }),
    // 본문 이미지만 있어도 건너뜁니다
    newsRow({ id: "66666666-6666-4666-8666-666666666666" }),
  ];
  const pages = {
    "66666666-6666-4666-8666-666666666666": {
      "66666666-6666-4666-8666-666666666666": { value: { id: "66666666-6666-4666-8666-666666666666", type: "page", content: ["a"] } },
      a: {
        value: {
          id: "a",
          type: "image",
          properties: { source: [["attachment:deadbeef:image.png"]] },
        },
      },
    },
  };
  const calls = [];
  const result = await collectLinkPreviews({ rows, pages, root, fetchImpl: stubFetch({ calls }), log: () => {} });
  assert.equal(result.saved.length, 0);
  assert.equal(calls.length, 0, "건너뛴 행은 네트워크를 부르지 않습니다");
  for (const row of rows) assert.equal(row.__linkImage, undefined);
  fs.rmSync(root, { recursive: true, force: true });
});

test("수집: 네트워크 실패도 예외가 밖으로 새지 않고, 남았던 필드는 정리합니다", async () => {
  const root = tmpRoot();
  const rows = [newsRow({ __linkImage: "/assets/img/og/link/stale.jpg" })];
  const failingFetch = async () => {
    throw new Error("network down");
  };
  const result = await collectLinkPreviews({ rows, pages: {}, root, fetchImpl: failingFetch, log: () => {} });
  assert.equal(result.failed.length, 1);
  assert.equal(rows[0].__linkImage, undefined, "못 받은 링크의 이전 필드는 남기지 않습니다");
  fs.rmSync(root, { recursive: true, force: true });
});

test("수집: 이미지를 못 받으면 스냅샷을 다시 쓰지 않습니다(mutated=false)", async () => {
  const root = tmpRoot();
  const rows = [newsRow()]; // __linkImage 없음 · 실패 → 필드 추가X · 삭제X
  const result = await collectLinkPreviews({
    rows,
    pages: {},
    root,
    fetchImpl: async () => {
      throw new Error("blocked");
    },
    log: () => {},
  });
  assert.equal(result.mutated, false, "바뀐 것이 없으면 스냅샷 파일을 만지지 않습니다");
  fs.rmSync(root, { recursive: true, force: true });
});

test("수집: --force 는 캐시 파일이 있어도 다시 받습니다", async () => {
  const root = tmpRoot();
  const rows = [newsRow()];
  await collectLinkPreviews({ rows, pages: {}, root, fetchImpl: stubFetch(), log: () => {} });

  const fresh = [newsRow()];
  const calls = [];
  const result = await collectLinkPreviews({
    rows: fresh,
    pages: {},
    root,
    force: true,
    fetchImpl: stubFetch({ calls }),
    log: () => {},
  });
  assert.equal(calls.length, 2, "force 면 페이지 + 이미지를 다시 받습니다");
  assert.equal(result.saved.length, 1);
  fs.rmSync(root, { recursive: true, force: true });
});

test("수집: Link 가 이미지 파일을 바로 가리키면 그 응답을 그대로 씁니다", async () => {
  const root = tmpRoot();
  const rows = [newsRow({ Link: "https://news.example.com/photo.png" })];
  const imageFetch = async (url) => ({
    ok: true,
    status: 200,
    url: String(url),
    headers: { get: (h) => (h.toLowerCase() === "content-type" ? "image/png" : null) },
    arrayBuffer: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer,
  });
  const result = await collectLinkPreviews({ rows, pages: {}, root, fetchImpl: imageFetch, log: () => {} });
  assert.equal(result.saved.length, 1);
  assert.match(rows[0].__linkImage, /\.png$/);
  fs.rmSync(root, { recursive: true, force: true });
});
