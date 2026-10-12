/**
 * 글별 주소 · SEO 메타 · 정적 페이지 · 사이트맵 회귀 테스트 — 네트워크 없이 실행됩니다.
 *
 *   npm run test:unit        (node --test)
 *
 * 검증하는 것
 *   1) Slug 규칙 — 정리(소문자 · 하이픈) · 형식 검사 · 주소 만들기 · 주소 읽기(하위 경로 포함)
 *   2) 주소 조건 — Slug 없음 · 형식 오류 · SEO 준비됨 꺼짐 은 주소를 만들지 않고 이유를 남김 (Q&A 는 Slug 만 봄)
 *   3) 메타 우선순위 — SEO 제목 → Title, SEO 설명 → Summary(120자 안팎) → 기본값, OG 이미지 → Cover → 기본 이미지
 *   4) 본문 HTML — H2/H3 그대로, <h1> 미출력, 이미지 alt = 캡션 → 글 제목, 이스케이프 · $ 기호 보존
 *   5) 생성 결과 — 글마다 title · canonical · og · twitter 가 다르고, 글 파일은 <title> 이 하나뿐
 *   6) 사이트맵 — 조건을 통과한 글만 포함, robots.txt 에 사이트맵 주소, 다시 만들어도 같은 결과(멱등)
 *   7) 기존 #post=ID 와 새 주소 경로 해석 (src/content/seo.js 의 parseRoute · hubBaseFromPathname)
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_SITE_URL,
  hubBaseFromPathname,
  isSeoReady,
  isValidSlug,
  normalizeSlug,
  parseRoute,
  resolveArticleMeta,
  routePathFor,
  seoEligibility,
  seoFieldsOf,
  siteMetaFor,
  summarize,
} from "../src/content/seo.js";
import { blocksToHtml, parseLegacyRecordMap } from "../src/content/body.js";
import { applyHead, renderSeoSite } from "./build-seo.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = fs.readFileSync(path.join(here, "../index.html"), "utf8");
const SITE = "https://example.test/XCONDA_info/";

/* ------------------------------ 1) Slug · 주소 ------------------------------ */

test("Slug 는 소문자·하이픈으로 정리되고, 영문 소문자·숫자·하이픈만 통과한다", () => {
  assert.equal(normalizeSlug("  FLEXBOARD Storyboard "), "flexboard-storyboard");
  assert.equal(normalizeSlug("a__b  c"), "a-b-c");
  assert.equal(isValidSlug("flexboard-storyboard"), true);
  assert.equal(isValidSlug("v2-release"), true);
  assert.equal(isValidSlug("플렉스보드"), false);
  assert.equal(isValidSlug("-leading"), false);
  assert.equal(isValidSlug("double--dash"), false);
});

test("글 종류별 주소: 뉴스·블로그는 /post, 공지는 /notice, Q&A는 /qna, 가이드는 /guide", () => {
  assert.equal(routePathFor("news", "abc"), "post/abc/");
  assert.equal(routePathFor("blog", "abc"), "post/abc/");
  assert.equal(routePathFor("notice", "abc"), "notice/abc/");
  assert.equal(routePathFor("faq", "abc"), "qna/abc/");
  assert.equal(routePathFor("guide", "abc"), "guide/abc/");
  assert.equal(routePathFor("news", ""), null);
  assert.equal(routePathFor("news", "Bad Slug"), null);
});

test("현재 주소에서 글 주소를 읽고, 하위 경로에서도 기본 경로를 바르게 찾는다", () => {
  assert.deepEqual(parseRoute("/XCONDA_info/post/flexboard-storyboard/"), { prefix: "post", slug: "flexboard-storyboard" });
  assert.deepEqual(parseRoute("/qna/a-b"), { prefix: "qna", slug: "a-b" });
  assert.equal(parseRoute("/XCONDA_info/"), null);
  assert.equal(parseRoute("/XCONDA_info/dev.html#post=abc"), null);
  assert.equal(hubBaseFromPathname("/XCONDA_info/post/abc/"), "/XCONDA_info/");
  assert.equal(hubBaseFromPathname("/XCONDA_info/dev.html"), "/XCONDA_info/");
  assert.equal(hubBaseFromPathname("/post/abc/"), "/");
  assert.equal(hubBaseFromPathname("/"), "/");
});

/* ------------------------------ 2) 주소 조건 ------------------------------ */

test("SEO 준비됨 체크(또는 수식의 Yes 류 값)만 준비됨으로 본다", () => {
  assert.equal(isSeoReady(true), true);
  assert.equal(isSeoReady("Yes"), true);
  assert.equal(isSeoReady("✅"), true);
  assert.equal(isSeoReady(false), false);
  assert.equal(isSeoReady(""), false);
  assert.equal(isSeoReady(undefined), false);
});

test("Slug 가 없거나 형식이 틀리거나 SEO 준비됨이 꺼져 있으면 주소를 만들지 않고 이유를 남긴다", () => {
  const ok = { Slug: "flex-story", "SEO 준비됨": "Yes" };
  assert.deepEqual(seoEligibility(ok, "news"), { eligible: true, slug: "flex-story", reasons: [] });

  const noSlug = seoEligibility({ "SEO 준비됨": true }, "news");
  assert.equal(noSlug.eligible, false);
  assert.match(noSlug.reasons.join(" "), /Slug 없음/);

  const badSlug = seoEligibility({ Slug: "플렉스", "SEO 준비됨": true }, "news");
  assert.equal(badSlug.eligible, false);
  assert.match(badSlug.reasons.join(" "), /형식 오류/);

  const notReady = seoEligibility({ Slug: "flex-story", "SEO 준비됨": false }, "blog");
  assert.equal(notReady.eligible, false);
  assert.match(notReady.reasons.join(" "), /SEO 준비됨 꺼짐/);
});

test("Q&A 는 SEO 준비됨 칸이 없으므로 Slug 만 있으면 주소를 만든다", () => {
  assert.equal(seoEligibility({ Slug: "refund-policy" }, "faq").eligible, true);
  assert.equal(seoEligibility({ Slug: "" }, "faq").eligible, false);
});

/* ------------------------------ 3) 메타 우선순위 ------------------------------ */

test("제목: SEO 제목이 우선, 없으면 Title, 그래도 없으면 사이트 이름", () => {
  const a = resolveArticleMeta({ title: "원래 제목", seoTitle: "검색용 제목" });
  assert.equal(a.title, "검색용 제목 | XCONDA허브");
  assert.equal(a.ogTitle, "검색용 제목");
  assert.equal(resolveArticleMeta({ title: "원래 제목" }).pageTitle, "원래 제목");
  assert.equal(resolveArticleMeta({}).pageTitle, "XCONDA허브");
});

test("설명: SEO 설명 → Summary(120자 안팎) → 사이트 기본 설명", () => {
  const long = "가".repeat(10) + " " + "나다라마바사아자차카타파하".repeat(20);
  const fromSummary = resolveArticleMeta({ summary: long }).description;
  assert.ok(fromSummary.length <= 121, `길이 ${fromSummary.length}`);
  assert.ok(fromSummary.endsWith("…"));
  assert.equal(resolveArticleMeta({ summary: long, seoDescription: "직접 쓴 설명" }).description, "직접 쓴 설명");
  assert.equal(resolveArticleMeta({}).description, siteMetaFor("ko").description);
});

test("요약 자르기는 단어 경계에서 끊는다", () => {
  const text = "XCONDA의 FLEXBOARD로 AI 영상 스토리보드를 만드는 과정을 단계별로 설명합니다 ".repeat(3);
  const cut = summarize(text, 40);
  assert.ok(cut.endsWith("…"));
  assert.ok(!cut.slice(0, -1).endsWith(" "));
  assert.equal(summarize("짧은 글"), "짧은 글");
});

test("이미지: OG 이미지 → Cover → 사이트 기본 이미지", () => {
  const def = `${SITE}assets/img/og/xconda-hub-1200x630.png`;
  assert.equal(resolveArticleMeta({ ogImage: "https://img/og.png", cover: "https://img/c.png" }, { defaultImageUrl: def }).image, "https://img/og.png");
  assert.equal(resolveArticleMeta({ cover: "https://img/c.png" }, { defaultImageUrl: def }).image, "https://img/c.png");
  assert.equal(resolveArticleMeta({}, { defaultImageUrl: def }).image, def);
});

test("노션 속성 → SEO 값 (이름은 Slug · SEO 제목 · SEO 설명 · OG 이미지)", () => {
  const fields = seoFieldsOf({
    "SEO 제목": "제목",
    "SEO 설명": "설명",
    "OG 이미지": [{ name: "a.png", url: "https://www.notion.so/image/x" }],
  });
  assert.deepEqual(fields, { seoTitle: "제목", seoDescription: "설명", ogImage: "https://www.notion.so/image/x" });
});

/* ------------------------------ 4) 본문 HTML ------------------------------ */

test("본문: H2·H3 는 그대로, H1 은 h2 로 내리고, 이미지 alt 는 캡션 → 글 제목 순서", () => {
  const blocks = [
    { type: "h2", text: "1단계" },
    { type: "h3", text: "세부 항목" },
    { type: "img", src: "https://img/a.png", caption: "" },
    { type: "img", src: "https://img/b.png", caption: "화면 설명" },
    { type: "p", text: [{ text: "굵게", bold: true }, { text: " <script>" }] },
  ];
  const html = blocksToHtml(blocks, { alt: "글 제목" });
  assert.match(html, /<h2>1단계<\/h2>/);
  assert.match(html, /<h3>세부 항목<\/h3>/);
  assert.match(html, /alt="글 제목"/);
  assert.match(html, /alt="화면 설명"/);
  assert.doesNotMatch(html, /<h1/);
  assert.match(html, /<strong>굵게<\/strong> &lt;script&gt;/);
});

test("레거시 record map 의 heading_1 은 h2 로 내려간다", () => {
  const map = {
    "11111111-1111-1111-1111-111111111111": {
      value: { id: "11111111-1111-1111-1111-111111111111", type: "page", content: ["22222222-2222-2222-2222-222222222222"] },
    },
    "22222222-2222-2222-2222-222222222222": {
      value: { id: "22222222-2222-2222-2222-222222222222", type: "header", properties: { title: [["큰 제목"]] } },
    },
  };
  const blocks = parseLegacyRecordMap(map, "11111111111111111111111111111111");
  assert.deepEqual(blocks, [{ type: "h2", text: [{ text: "큰 제목" }] }]);
});

/* ------------------------------ 5·6) 생성 결과 ------------------------------ */

const fixtureRows = [
  {
    id: "3ed2ebc0-17ad-810d-9a48-e1f3860cfccf",
    Title: "DeepSeek의 공식 하네스가 발표됐습니다! MIT ...",
    __type: "news",
    Published: true,
    Date: "2026-10-02",
    Slug: "deepseek-official-harness",
    "SEO 준비됨": true,
    "SEO 제목": "DeepSeek 공식 하네스 공개, 모든 것이 플러그인",
    "SEO 설명": "DeepSeek의 공식 하네스가 MIT 라이선스로 공개됐습니다.",
    Summary: "DeepSeek의 공식 하네스가 발표됐습니다! 가격은 $5 입니다.",
    Author: "박찬혁 감독",
  },
  {
    id: "3ec2ebc0-17ad-8151-bd25-de1dd726037a",
    Title: "Opus 5.5 공개 일주일, GitHub 트렌딩",
    __type: "blog",
    Published: true,
    Date: "2026-10-01",
    Slug: "opus-5-5-trending",
    "SEO 준비됨": true,
    Summary: "Opus 5.5 공개 일주일 만에 GitHub 인기 레포가 영상·애니메이션으로 쏠렸습니다.",
    __cover: "https://www.notion.so/image/cover.png",
  },
  {
    id: "3f42ebc0-17ad-800d-9a2e-d8f99d8e26de",
    Title: "점검 안내",
    __type: "notice",
    Published: true,
    Date: "2026-10-03",
    Slug: "maintenance",
    "SEO 준비됨": false,
    Summary: "점검 안내입니다.",
  },
  {
    id: "15d20857-0000-4000-8000-000000000001",
    Title: "환불은 어떻게 하나요?",
    __type: "faq",
    __source: "hub-qna",
    Published: true,
    Date: "2026-10-04",
    Slug: "refund-policy",
    "SEO 설명": "환불 요청 방법과 기간을 안내합니다.",
    Summary: "마이페이지에서 요청할 수 있습니다.",
  },
  {
    id: "3f42ebc0-17ad-800d-9a2e-000000000002",
    Title: "슬러그 없는 글",
    __type: "news",
    Published: true,
    Date: "2026-10-05",
    "SEO 준비됨": true,
    Summary: "요약",
  },
];

const pagesFixture = {
  "3ed2ebc0-17ad-810d-9a48-e1f3860cfccf": {
    "3ed2ebc0-17ad-810d-9a48-e1f3860cfccf": {
      value: {
        id: "3ed2ebc0-17ad-810d-9a48-e1f3860cfccf",
        type: "page",
        content: ["aaaaaaaa-0000-4000-8000-000000000001", "aaaaaaaa-0000-4000-8000-000000000002"],
      },
    },
    "aaaaaaaa-0000-4000-8000-000000000001": {
      value: { id: "aaaaaaaa-0000-4000-8000-000000000001", type: "sub_header", properties: { title: [["1단계 설명"]] } },
    },
    "aaaaaaaa-0000-4000-8000-000000000002": {
      value: {
        id: "aaaaaaaa-0000-4000-8000-000000000002",
        type: "image",
        properties: { source: [["https://img.example/x.png"]], caption: [] },
      },
    },
  },
};

// Q&A 본문(답변 섹션) — 있으면 요약은 싣지 않는다
pagesFixture["15d20857-0000-4000-8000-000000000001"] = {
  "15d20857-0000-4000-8000-000000000001": {
    value: {
      id: "15d20857-0000-4000-8000-000000000001",
      type: "page",
      content: ["bbbbbbbb-0000-4000-8000-000000000001"],
    },
  },
  "bbbbbbbb-0000-4000-8000-000000000001": {
    value: { id: "bbbbbbbb-0000-4000-8000-000000000001", type: "text", properties: { title: [["답변 본문입니다."]] } },
  },
};

const result = renderSeoSite({ rows: fixtureRows, pages: pagesFixture, template: TEMPLATE, siteUrl: SITE });
const pageOf = (rel) => result.files.get(rel);

test("주소 조건을 통과한 글만 파일이 만들어지고, 나머지는 사유와 함께 제외된다", () => {
  const written = [...result.files.keys()].sort();
  assert.deepEqual(written, [
    "index.html",
    "post/deepseek-official-harness/index.html",
    "post/opus-5-5-trending/index.html",
    "qna/refund-policy/index.html",
    "robots.txt",
    "sitemap.xml",
  ]);
  const skippedTitles = result.skipped.map((s) => s.title).sort();
  assert.deepEqual(skippedTitles, ["슬러그 없는 글", "점검 안내"]);
  assert.match(result.skipped.find((s) => s.title === "점검 안내").reasons.join(" "), /SEO 준비됨/);
  assert.match(result.skipped.find((s) => s.title === "슬러그 없는 글").reasons.join(" "), /Slug 없음/);
});

test("글 파일의 head 는 글별 값이고, <title> 은 한 번만 나온다", () => {
  const a = pageOf("post/deepseek-official-harness/index.html");
  const b = pageOf("post/opus-5-5-trending/index.html");
  assert.equal((a.match(/<title>/g) ?? []).length, 1);
  assert.equal((b.match(/<title>/g) ?? []).length, 1);
  assert.match(a, /<title>DeepSeek 공식 하네스 공개, 모든 것이 플러그인 \| XCONDA허브<\/title>/);
  assert.match(a, /<link rel="canonical" href="https:\/\/example\.test\/XCONDA_info\/post\/deepseek-official-harness\/" \/>/);
  assert.match(a, /<meta property="og:type" content="article" \/>/);
  assert.match(a, /<meta property="og:url" content="https:\/\/example\.test\/XCONDA_info\/post\/deepseek-official-harness\/" \/>/);
  assert.match(a, /<meta name="twitter:card" content="summary_large_image" \/>/);
  assert.match(a, /<meta property="og:site_name" content="XCONDA허브" \/>/);
  assert.match(b, /<title>Opus 5\.5 공개 일주일, GitHub 트렌딩 \| XCONDA허브<\/title>/);
  assert.match(b, /<meta property="og:image" content="https:\/\/www\.notion\.so\/image\/cover\.png" \/>/);
  assert.notEqual(a.match(/<link rel="canonical"[^>]*>/)[0], b.match(/<link rel="canonical"[^>]*>/)[0]);
});

test("글 본문이 HTML 에 들어 있고, $ 기호와 HTML 특수문자는 안전하게 출력된다", () => {
  const a = pageOf("post/deepseek-official-harness/index.html");
  assert.match(a, /<h1>DeepSeek의 공식 하네스가 발표됐습니다! MIT \.\.\.<\/h1>/);
  assert.match(a, /가격은 \$5 입니다\./);
  assert.match(a, /<h2>1단계 설명<\/h2>/);
  assert.match(a, /<img src="https:\/\/img\.example\/x\.png" alt="DeepSeek의 공식 하네스가 발표됐습니다! MIT \.\.\." /);
  assert.equal((a.match(/<h1/g) ?? []).length, 1);
  assert.match(a, /<div id="root"><main class="seo-article"/);
});

test("Q&A 는 본문이 있으면 요약을 중복으로 싣지 않고, 본문이 없으면 요약을 싣는다", () => {
  const q = pageOf("qna/refund-policy/index.html");
  assert.match(q, /<title>환불은 어떻게 하나요\? \| XCONDA허브<\/title>/);
  assert.match(q, /<meta name="description" content="환불 요청 방법과 기간을 안내합니다\." \/>/);
  assert.match(q, /답변 본문입니다\./);
  assert.doesNotMatch(q, /마이페이지에서 요청할 수 있습니다/);
  const noBody = renderSeoSite({ rows: [fixtureRows[3]], pages: {}, template: TEMPLATE, siteUrl: SITE });
  assert.match(noBody.files.get("qna/refund-policy/index.html"), /마이페이지에서 요청할 수 있습니다/);
});

test("사이트맵은 조건을 통과한 글과 홈만 담고, robots.txt 는 사이트맵 주소를 적는다", () => {
  const sitemap = pageOf("sitemap.xml");
  assert.match(sitemap, /<loc>https:\/\/example\.test\/XCONDA_info\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/example\.test\/XCONDA_info\/post\/deepseek-official-harness\/<\/loc>/);
  assert.match(sitemap, /<lastmod>2026-10-02<\/lastmod>/);
  assert.doesNotMatch(sitemap, /maintenance/);
  assert.doesNotMatch(sitemap, /slug-없는|슬러그/);
  assert.equal((sitemap.match(/<url>/g) ?? []).length, 4);
  assert.match(pageOf("robots.txt"), /Sitemap: https:\/\/example\.test\/XCONDA_info\/sitemap\.xml/);
});

test("홈 index.html 은 한국어 기본 메타를 한 번만 갖고, 본문 영역은 비어 있다", () => {
  const home = pageOf("index.html");
  assert.equal((home.match(/<title>/g) ?? []).length, 1);
  assert.match(home, /<meta name="description" content="XCONDA허브에서 공지사항, 타 SNS 뉴스, 툴 사용법, 블로그, Q&amp;A를 한곳에 확인하세요\." \/>/);
  assert.match(home, /<div id="root"><\/div>/);
  assert.match(home, /<link rel="canonical" href="https:\/\/example\.test\/XCONDA_info\/" \/>/);
});

test("같은 입력으로 다시 만들어도 결과가 같다 (멱등)", () => {
  const again = renderSeoSite({ rows: fixtureRows, pages: pagesFixture, template: result.files.get("index.html"), siteUrl: SITE });
  assert.equal(again.files.get("index.html"), result.files.get("index.html"));
  assert.equal(again.files.get("post/opus-5-5-trending/index.html"), result.files.get("post/opus-5-5-trending/index.html"));
  assert.equal(again.files.get("sitemap.xml"), result.files.get("sitemap.xml"));
});

test("applyHead 는 기존 SEO 태그를 걷어 내고 앱 스크립트는 그대로 둔다", () => {
  const tpl = `<html><head><title>old</title><meta name="description" content="x"><meta property="og:title" content="y"><script>var a=1;</script></head><body><div id="root"></div></body></html>`;
  const out = applyHead(tpl, "    <title>new</title>");
  assert.equal((out.match(/<title>/g) ?? []).length, 1);
  assert.doesNotMatch(out, /og:title|content="x"/);
  assert.match(out, /<script>var a=1;<\/script>/);
});

test("글 주소 경로 — 홈 기본 주소는 사이트 주소와 같다", () => {
  assert.equal(new URL(DEFAULT_SITE_URL).pathname.endsWith("/"), true);
});
