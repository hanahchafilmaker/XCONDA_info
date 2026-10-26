/**
 * 글별 주소 · SEO 메타 · 정적 페이지 · 사이트맵 회귀 테스트 — 네트워크 없이 실행됩니다.
 *
 *   npm run test:unit        (node --test)
 *
 * 검증하는 것
 *   1) Slug 규칙 — 정리(소문자 · 하이픈) · 형식 검사 · 주소 만들기 · 주소 읽기(하위 경로 포함)
 *   2) 주소 조건 — Slug 없음 · 형식 오류 · SEO 준비됨 꺼짐 은 주소를 만들지 않고 이유를 남김
 *      (SEO 준비됨 칸 자체가 없으면 Slug 만 봄 — 2026-10-22 A0)
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
  OG_LOCAL_DIR,
  hreflangAlternates,
  langFromPathname,
  localOgImageUrl,
  localizedUrl,
  ogManifestKey,
  relatedArticles,
  tagSetOf,
  articleJsonLd,
  hubBaseFromPathname,
  isSeoReady,
  isValidSlug,
  jsonLdGraph,
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
import {
  applyHead,
  renderSeoSite,
  localizedBlockProblems,
  mergeLocalizedBlocks,
  bodyImagesOf,
  bodyMediaOf,
  flattenBlocks,
  needsTranslation,
  LOCALIZED_BLOCK_TYPES,
} from "./build-seo.mjs";

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
  // 허브 전용 도메인(루트 배포): 기본 경로가 / 여야 합니다
  assert.equal(hubBaseFromPathname("/post/abc/"), "/");
  assert.equal(hubBaseFromPathname("/dev.html"), "/");
  assert.deepEqual(parseRoute("/post/flexboard-storyboard/"), { prefix: "post", slug: "flexboard-storyboard" });
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

test("SEO 준비됨 칸 자체가 없으면 모든 섹션이 Slug 만으로 주소를 만든다 (A0 — 스냅샷에 칸이 없어 전 글이 막히던 문제)", () => {
  for (const type of ["news", "blog", "notice", "guide", "faq"]) {
    assert.equal(seoEligibility({ Slug: "flex-story" }, type).eligible, true, type);
  }
  // 칸이 있는데 꺼져 있으면(빈 값 포함) 검수 게이트가 그대로 작동한다
  assert.equal(seoEligibility({ Slug: "flex-story", "SEO 준비됨": "" }, "blog").eligible, false);
  assert.equal(seoEligibility({ Slug: "flex-story", "SEO 준비됨": false }, "notice").eligible, false);
  assert.equal(seoEligibility({ Slug: "flex-story", "SEO 준비됨": "✅" }, "guide").eligible, true);
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

test("레거시 record map 의 header_4~6 은 버리지 않고 h3 으로 내린다", () => {
  const map = {
    "11111111-1111-1111-1111-111111111111": {
      value: { id: "11111111-1111-1111-1111-111111111111", type: "page", content: ["22222222-2222-2222-2222-222222222222"] },
    },
    "22222222-2222-2222-2222-222222222222": {
      value: { id: "22222222-2222-2222-2222-222222222222", type: "header_4", properties: { title: [["작은 제목"]] } },
    },
  };
  const blocks = parseLegacyRecordMap(map, "11111111111111111111111111111111");
  assert.deepEqual(blocks, [{ type: "h3", text: [{ text: "작은 제목" }] }]);
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

// 번역은 일부러 빈 값을 넘깁니다 — 실제 content/i18n/*.json 은 번역이 늘어나는 파일이라,
// 이 파일 목록·사이트맵 테스트가 번역 진행 상황에 흔들리면 안 됩니다.
// 번역 페이지 자체는 아래의 localizedPages 테스트가 따로 확인합니다.
const result = renderSeoSite({
  rows: fixtureRows,
  pages: pagesFixture,
  template: TEMPLATE,
  siteUrl: SITE,
  translations: {},
});
const pageOf = (rel) => result.files.get(rel);

test("주소 조건을 통과한 글만 파일이 만들어지고, 나머지는 사유와 함께 제외된다", () => {
  const written = [...result.files.keys()].sort();
  assert.deepEqual(written, [
    "404.html",
    "index.html",
    "llms.txt",
    "post/deepseek-official-harness/index.html",
    "post/index.html",
    "post/opus-5-5-trending/index.html",
    "qna/index.html",
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
  // 언어 신호 — 자기 참조 hreflang(ko · x-default)
  assert.match(a, /<link rel="alternate" hreflang="ko" href="https:\/\/example\.test\/XCONDA_info\/post\/deepseek-official-harness\/" \/>/);
  assert.match(a, /<link rel="alternate" hreflang="x-default" href="https:\/\/example\.test\/XCONDA_info\/post\/deepseek-official-harness\/" \/>/);
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

test("Q&A 는 요약(답변)을 본문 유무와 관계없이 싣는다 (본문에는 답변이 빠져 있으므로)", () => {
  const q = pageOf("qna/refund-policy/index.html");
  assert.match(q, /<title>환불은 어떻게 하나요\? \| XCONDA허브<\/title>/);
  assert.match(q, /<meta name="description" content="환불 요청 방법과 기간을 안내합니다\." \/>/);
  assert.match(q, /답변 본문입니다\./);
  assert.match(q, /마이페이지에서 요청할 수 있습니다/);
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
  // 홈 + 섹션 목록 2개(글 있는 섹션만) + 글 3개 + 정적 공개 페이지 1개(user-guide.html)
  assert.equal((sitemap.match(/<url>/g) ?? []).length, 7);
  // 표준 네임스페이스(복수형 sitemaps.org) — 단수형은 도구에 따라 사이트맵을 통째로 무시합니다
  assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.doesNotMatch(sitemap, /www\.sitemap\.org\//);
  assert.match(sitemap, /<loc>https:\/\/example\.test\/XCONDA_info\/post\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/example\.test\/XCONDA_info\/qna\/<\/loc>/);
  // 홈도 lastmod 를 갖습니다(전에는 비어 있었습니다)
  assert.match(sitemap, /<loc>https:\/\/example\.test\/XCONDA_info\/<\/loc>\n    <lastmod>/);
  assert.match(pageOf("robots.txt"), /Sitemap: https:\/\/example\.test\/XCONDA_info\/sitemap\.xml/);
});

test("홈 index.html 은 한국어 기본 메타를 한 번만 갖고, 크롤러용 글 목록을 정적 HTML 로 담는다", () => {
  const home = pageOf("index.html");
  assert.equal((home.match(/<title>/g) ?? []).length, 1);
  assert.match(home, /<meta name="description" content="XCONDA허브에서 공지사항, 타 SNS 뉴스, 툴 사용법, 블로그, Q&amp;A를 한곳에 확인하세요\." \/>/);
  assert.match(home, /<link rel="canonical" href="https:\/\/example\.test\/XCONDA_info\/" \/>/);
  // 자바스크립트 없이도 목록이 보여야 합니다(빈 껍데기 금지)
  assert.doesNotMatch(home, /<div id="root"><\/div>/);
  assert.match(home, /<div id="root"><main class="seo-article seo-home">/);
  assert.match(home, /<h1>XCONDA허브/);
  assert.match(home, /<h2>뉴스 /);
  assert.match(home, /href="post\/deepseek-official-harness\/"/);
  assert.match(home, /href="qna\/refund-policy\/"/);
  // 섹션 목록으로 가는 링크
  assert.match(home, /href="post\/">/);
});

test("같은 입력으로 다시 만들어도 결과가 같다 (멱등)", () => {
  const again = renderSeoSite({
    rows: fixtureRows,
    pages: pagesFixture,
    template: result.files.get("index.html"),
    siteUrl: SITE,
    translations: {},
  });
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
  assert.equal(DEFAULT_SITE_URL, "https://hub.xconda.ai/");
});

/* ------------------------------ 8) 구조화 데이터(JSON-LD) · 404 ------------------------------ */

const ldJsonOf = (html, article = false) => {
  const re = article
    ? /<script type="application\/ld\+json" data-article-jsonld>([\s\S]*?)<\/script>/
    : /<script type="application\/ld\+json">([\s\S]*?)<\/script>/;
  const m = html.match(re);
  assert.ok(m, article ? "글 JSON-LD 스크립트 없음" : "공통 JSON-LD 스크립트 없음");
  return JSON.parse(m[1]);
};

test("구조화 데이터: 전 페이지에 운영사·사이트 명찰이 들어가고 공식 채널이 sameAs 로 연결된다 (B1)", () => {
  for (const rel of ["index.html", "post/deepseek-official-harness/index.html", "qna/refund-policy/index.html", "404.html"]) {
    const graph = ldJsonOf(pageOf(rel));
    const org = graph["@graph"].find((n) => n["@type"] === "Organization");
    assert.ok(org, rel);
    assert.equal(org["@id"], "https://www.xconda.ai/#org");
    assert.ok(org.sameAs.includes("https://www.youtube.com/@xconda_korea"), rel);
    assert.ok(org.sameAs.includes("https://blog.naver.com/dramajustice"), rel);
    // 회사와 제품을 분리 — AI 가 "XCONDA" 를 제품 엔터티로 인식하게 합니다
    assert.equal(org.brand["@type"], "Brand");
    assert.equal(org.brand.name, "XCONDA");
    // 구글 로고 규격은 래스터 112px 이상입니다 (SVG 는 표시되지 않음)
    assert.match(org.logo, /xconda-logo-512\.png$/);
    assert.ok(graph["@graph"].some((n) => n["@type"] === "WebSite"), rel);
  }
  // 단위: 사이트 주소를 바꾸면 WebSite @id 와 sameAs 의 허브 주소도 따라간다
  const g = jsonLdGraph("https://example.test/XCONDA_info/");
  assert.equal(g["@graph"].find((n) => n["@type"] === "WebSite")["@id"], "https://example.test/XCONDA_info/#website");
});

test("구조화 데이터: 글 종류별 명찰 — 뉴스 NewsArticle · 블로그 BlogPosting · Q&A FAQPage (B3)", () => {
  const news = ldJsonOf(pageOf("post/deepseek-official-harness/index.html"), true);
  assert.equal(news["@type"], "NewsArticle");
  assert.equal(news.headline, "DeepSeek 공식 하네스 공개, 모든 것이 플러그인");
  assert.equal(news.datePublished, "2026-10-02");
  assert.deepEqual(news.author, { "@type": "Person", name: "박찬혁 감독" });

  const blog = ldJsonOf(pageOf("post/opus-5-5-trending/index.html"), true);
  assert.equal(blog["@type"], "BlogPosting");

  const faq = ldJsonOf(pageOf("qna/refund-policy/index.html"), true);
  assert.equal(faq["@type"], "FAQPage");
  assert.equal(faq.mainEntity[0].name, "환불은 어떻게 하나요?");
  assert.match(faq.mainEntity[0].acceptedAnswer.text, /마이페이지에서 요청할 수 있습니다/);
  assert.match(faq.mainEntity[0].acceptedAnswer.text, /답변 본문입니다/);

  // 단위: 작성자가 없으면 운영사를 저자로 둔다
  const bare = articleJsonLd({ type: "notice", url: "https://example.test/notice/x/", headline: "공지" });
  assert.deepEqual(bare.author, { "@id": "https://www.xconda.ai/#org" });
});

test("404.html 이 함께 만들어지고 noindex 와 메인·최근 글 링크를 담는다 (A7)", () => {
  const notFound = pageOf("404.html");
  assert.ok(notFound);
  assert.match(notFound, /<meta name="robots" content="noindex" \/>/);
  assert.match(notFound, /페이지를 찾을 수 없습니다/);
  // 임의의 깊이에서 서빙되므로 링크는 절대 주소여야 한다
  assert.match(notFound, /href="https:\/\/example\.test\/XCONDA_info\/post\/deepseek-official-harness\/"/);
});

/* ------------------------------ 9) GEO 보강 (2026-10-25) ------------------------------ */

test("목록 주소(/post/ 등)는 정적 목록 페이지가 되고, 홈·목록에 ItemList 명찰이 붙는다", () => {
  const post = pageOf("post/index.html");
  assert.match(post, /<link rel="canonical" href="https:\/\/example\.test\/XCONDA_info\/post\/" \/>/);
  assert.match(post, /<h1>뉴스 · 블로그<\/h1>/);
  // 목록에서 글 주소로 바로 갈 수 있어야 합니다(홈 → 목록 → 글)
  assert.match(post, /href="\.\.\/post\/deepseek-official-harness\/"/);
  assert.match(post, /href="\.\.\/post\/opus-5-5-trending\/"/);
  assert.match(post, /href="\.\.\/">XCONDA허브<\/a>/);

  const postLd = ldJsonOf(post)["@graph"];
  const collection = postLd.find((n) => n["@type"] === "CollectionPage");
  assert.ok(collection, "섹션 목록에 CollectionPage 명찰이 없습니다");
  assert.equal(collection.mainEntity["@type"], "ItemList");
  assert.equal(collection.mainEntity.numberOfItems, 2);
  assert.ok(collection.mainEntity.itemListElement.every((el) => el.url && el.name));
  // 사이트(@graph)와 같은 개체 묶음으로 연결
  assert.equal(collection.isPartOf["@id"], "https://example.test/XCONDA_info/#website");

  const homeLd = ldJsonOf(pageOf("index.html"))["@graph"];
  assert.ok(homeLd.some((n) => n["@type"] === "SoftwareApplication"), "제품 명찰이 없습니다");
  const homeList = homeLd.find((n) => n["@type"] === "CollectionPage");
  assert.equal(homeList.mainEntity.numberOfItems, 3);
});

test("가이드 글은 Article 과 함께 HowTo(단계) 명찰을 갖는다", () => {
  const guideRows = [
    {
      id: "99999999-0000-4000-8000-000000000001",
      Title: "FLEXBOARD 스토리보드 만들기 7단계",
      __type: "guide",
      Published: true,
      Date: "2026-10-19",
      Slug: "flexboard-guide",
      Summary: "컷별 스토리보드를 만드는 순서입니다.",
      Author: "김재환 PD",
    },
  ];
  const guidePages = {
    "99999999-0000-4000-8000-000000000001": {
      "99999999-0000-4000-8000-000000000001": {
        value: { id: "99999999-0000-4000-8000-000000000001", type: "page", content: ["c1", "c2", "c3", "c4", "c5", "c6"] },
      },
      c1: { value: { id: "c1", type: "sub_header", properties: { title: [["1단계: 프로젝트 설정"]] } } },
      c2: { value: { id: "c2", type: "text", properties: { title: [["새 프로젝트를 만들고 이름을 정합니다."]] } } },
      c3: { value: { id: "c3", type: "sub_header", properties: { title: [["2단계: 컷 수 정하기"]] } } },
      c4: { value: { id: "c4", type: "text", properties: { title: [["9컷을 기준으로 시작합니다."]] } } },
      c5: { value: { id: "c5", type: "sub_header", properties: { title: [["자주 하는 실수"]] } } },
      c6: { value: { id: "c6", type: "text", properties: { title: [["컷을 너무 많이 잡는 것입니다."]] } } },
    },
  };
  const guide = renderSeoSite({ rows: guideRows, pages: guidePages, template: TEMPLATE, siteUrl: SITE });
  const html = guide.files.get("guide/flexboard-guide/index.html");
  const nodes = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) =>
    JSON.parse(m[1])
  );
  const howTo = nodes.find((n) => n["@type"] === "HowTo");
  assert.ok(howTo, "HowTo 명찰이 없습니다");
  assert.equal(howTo["@type"], "HowTo");
  assert.equal(howTo["@id"], "https://example.test/XCONDA_info/guide/flexboard-guide/#howto");
  assert.deepEqual(
    howTo.step.map((s) => s.name),
    ["1단계: 프로젝트 설정", "2단계: 컷 수 정하기"]
  );
  assert.match(howTo.step[0].text, /새 프로젝트를 만들고/);
  // 번호 없는 안내성 소제목은 단계에서 빠집니다
  assert.ok(!howTo.step.some((s) => s.name === "자주 하는 실수"));
  // 같은 페이지에 Article 명찰도 함께 남습니다
  const article = nodes.find((n) => n["@type"] === "Article");
  assert.ok(article, "Article 명찰이 사라졌습니다");
  assert.equal(article["@id"], "https://example.test/XCONDA_info/guide/flexboard-guide/#article");
  assert.equal(howTo.isPartOf["@id"], article["@id"]);
});

test("수정일이 작성일과 다를 때만 dateModified 를 넣는다", () => {
  const rows = [
    {
      id: "88888888-0000-4000-8000-000000000001",
      Title: "고친 글",
      __type: "blog",
      Published: true,
      Date: "2026-10-01",
      __modified: "2026-10-20",
      Slug: "edited-post",
      Summary: "요약",
    },
    {
      id: "88888888-0000-4000-8000-000000000002",
      Title: "안 고친 글",
      __type: "blog",
      Published: true,
      Date: "2026-10-02",
      Slug: "untouched-post",
      Summary: "요약",
      수정일: "2026-10-02",
    },
  ];
  const out = renderSeoSite({ rows, pages: {}, template: TEMPLATE, siteUrl: SITE });
  const edited = out.files.get("post/edited-post/index.html");
  assert.equal(ldJsonOf(edited, true).dateModified, "2026-10-20");
  assert.match(edited, /<meta property="article:modified_time" content="2026-10-20" \/>/);
  // 작성일과 같으면 신호를 만들지 않습니다
  const untouched = out.files.get("post/untouched-post/index.html");
  assert.equal(ldJsonOf(untouched, true).dateModified, undefined);
  assert.doesNotMatch(untouched, /article:modified_time/);
  // 사이트맵 lastmod 는 수정일을 우선합니다
  assert.match(out.files.get("sitemap.xml"), /post\/edited-post\/<\/loc>\n    <lastmod>2026-10-20<\/lastmod>/);
});

/* ---------------------------------------------------------------------------
 * 공유 이미지(OG) 자체 호스팅 — 2026-10-25 A3
 *   노션 프록시(www.notion.so/image/...)는 만료·정책 변경 위험이 있어,
 *   복사본이 있으면 우리 도메인 주소를 씁니다.
 * ------------------------------------------------------------------------ */
test("OG 목록 키는 type/slug 이고, 없는 키는 빈 문자열이다", () => {
  assert.equal(ogManifestKey("blog", "my-post"), "post/my-post");
  assert.equal(ogManifestKey("guide", "my-guide"), "guide/my-guide");
  assert.equal(ogManifestKey("blog", ""), "");
  assert.equal(OG_LOCAL_DIR, "assets/img/og/posts");
});

test("OG 목록에 있으면 우리 도메인 주소를, 없으면 null 을 돌려준다", () => {
  const manifest = { "post/my-post": "post-my-post.png" };
  assert.equal(
    localOgImageUrl(manifest, "post/my-post", "https://hub.example.test"),
    "https://hub.example.test/assets/img/og/posts/post-my-post.png",
  );
  assert.equal(localOgImageUrl(manifest, "post/unknown", "https://hub.example.test"), "");
  assert.equal(localOgImageUrl(null, "post/my-post", "https://hub.example.test"), "");
  // 사이트 주소 끝의 슬래시가 겹치지 않습니다
  assert.equal(
    localOgImageUrl(manifest, "post/my-post", "https://hub.example.test/"),
    "https://hub.example.test/assets/img/og/posts/post-my-post.png",
  );
});

test("복사본이 있으면 og:image · twitter:image · JSON-LD image 가 모두 우리 주소를 쓴다", () => {
  const rows = [
    {
      id: "99999999-0000-4000-8000-000000000001",
      Title: "노션 커버를 쓰는 글",
      __type: "blog",
      Published: true,
      Date: "2026-10-05",
      Slug: "notion-cover-post",
      Summary: "요약",
      __cover: "https://www.notion.so/image/abc123?table=block&id=xyz",
    },
  ];
  const ogManifest = { "post/notion-cover-post": "post-notion-cover-post.png" };
  const out = renderSeoSite({ rows, pages: {}, template: TEMPLATE, siteUrl: SITE, ogManifest });
  const page = out.files.get("post/notion-cover-post/index.html");
  const expected = `${SITE}assets/img/og/posts/post-notion-cover-post.png`;
  assert.match(page, new RegExp(`<meta property="og:image" content="${expected}" />`));
  assert.match(page, new RegExp(`<meta name="twitter:image" content="${expected}" />`));
  const ldImage = ldJsonOf(page, true).image;
  assert.equal([].concat(ldImage)[0], expected);
  // <head> 안에는 노션 프록시 주소가 남아 있으면 안 됩니다
  // (본문 <figure> 는 실제 커버 사진이므로 그대로 둡니다 — OG 카드와 다른 이미지일 수 있음)
  const headOnly = page.slice(page.indexOf("<head>"), page.indexOf("</head>"));
  assert.doesNotMatch(headOnly, /www\.notion\.so\/image/);
});

test("OG 이미지 속성이 있으면 커버보다 우선하고, 복사본이 있으면 그보다 로컬이 우선한다", () => {
  const base = {
    id: "99999999-0000-4000-8000-000000000002",
    Title: "우선순위 글",
    __type: "blog",
    Published: true,
    Date: "2026-10-06",
    Slug: "og-priority",
    Summary: "요약",
    __cover: "https://www.notion.so/image/cover",
    "OG 이미지": "https://cdn.example.test/designed-og.png",
  };
  // 복사본이 없으면 → 직접 지정한 OG 이미지
  const noLocal = renderSeoSite({ rows: [base], pages: {}, template: TEMPLATE, siteUrl: SITE, ogManifest: {} });
  assert.match(
    noLocal.files.get("post/og-priority/index.html"),
    /<meta property="og:image" content="https:\/\/cdn\.example\.test\/designed-og\.png" \/>/,
  );
  // 복사본이 있으면 → 로컬 사본 (노션·외부 CDN 의존 제거)
  const withLocal = renderSeoSite({
    rows: [base],
    pages: {},
    template: TEMPLATE,
    siteUrl: SITE,
    ogManifest: { "post/og-priority": "post-og-priority.webp" },
  });
  assert.match(
    withLocal.files.get("post/og-priority/index.html"),
    new RegExp(`<meta property="og:image" content="${SITE}assets/img/og/posts/post-og-priority.webp" />`),
  );
});

/* ---------------------------------------------------------------------------
 * 색인 정책 — 2026-10-25 A4
 *   관리자 매뉴얼은 noindex, 공개 사용자 가이드는 canonical + 사이트맵.
 * ------------------------------------------------------------------------ */
test("관리자 매뉴얼은 noindex, 사용자 가이드는 canonical + 사이트맵에 들어간다", () => {
  const read = (f) => fs.readFileSync(path.join(here, "..", f), "utf8");
  assert.match(read("admin-guide.html"), /<meta name="robots" content="noindex, nofollow">/);
  assert.match(read("user-guide.html"), /<link rel="canonical" href="https:\/\/hub\.xconda\.ai\/user-guide\.html" \/>/);
  // noindex 페이지는 사이트맵에 없고, 공개 가이드는 있습니다.
  const out = renderSeoSite({ rows: fixtureRows, pages: pagesFixture, template: TEMPLATE, siteUrl: SITE, ogManifest: {} });
  const sitemap = out.files.get("sitemap.xml");
  assert.match(sitemap, /<loc>https:\/\/example\.test\/XCONDA_info\/user-guide\.html<\/loc>/);
  assert.doesNotMatch(sitemap, /admin-guide/);
  // 정적 페이지에는 lastmod 를 넣지 않습니다(체크아웃마다 값이 달라지면 빌드가 흔들림).
  const block = sitemap.split("<url>").find((b) => b.includes("user-guide.html"));
  assert.doesNotMatch(block, /lastmod/);
});

/* ---------------------------------------------------------------------------
 * 관련 글 · llms.txt — 2026-10-25 A5 · A6
 * ------------------------------------------------------------------------ */
test("관련 글은 카테고리 · 툴 · 태그를 먼저 보고 자기 자신은 빼며 결과가 항상 같다", () => {
  const pool = [
    { type: "blog", slug: "me", title: "시드댄스 스토리보드", date: "2026-10-09", category: "제작 가이드" },
    { type: "blog", slug: "same-cat", title: "컷 연결", date: "2026-10-01", category: "제작 가이드" },
    { type: "guide", slug: "same-tool", title: "툴 설명", date: "2026-10-02", tool: "FLEXBOARD" },
    { type: "blog", slug: "same-tag", title: "태그 글", date: "2026-10-03", tags: "['#FLEXBOARD #AI영상']" },
    { type: "blog", slug: "unrelated", title: "환불 정책", date: "2026-10-04", category: "저작권·이용 정책" },
  ];
  const me = { ...pool[0], tool: "FLEXBOARD", tags: ["#FLEXBOARD"] };
  const got = relatedArticles(me, pool, { limit: 3 });
  assert.ok(!got.some((x) => x.slug === "me"), "자기 자신이 들어갔습니다");
  assert.equal(got[0].slug, "same-cat", "같은 카테고리가 1순위여야 합니다");
  assert.ok(got.some((x) => x.slug === "same-tag"), "같은 태그 글도 후보여야 합니다");
  assert.ok(!got.some((x) => x.slug === "unrelated"), "관련 없는 글이 들어갔습니다");
  // 같은 입력 → 같은 결과(멱등)
  const again = relatedArticles(me, pool, { limit: 3 });
  assert.deepEqual(again.map((x) => x.slug), got.map((x) => x.slug));
  // Q&A 에서는 같은 Q&A 를 뺄 수 있습니다
  const skip = relatedArticles({ ...me, type: "faq" }, [{ type: "faq", slug: "other", title: "다른 질문", category: "제작 가이드" }, ...pool], { skipType: "faq" });
  assert.ok(!skip.some((x) => x.type === "faq"));
});

test("태그 문자열에서 해시태그만 뽑는다", () => {
  assert.deepEqual([...tagSetOf("['#FLEXBOARD #시댄스2.5']")], ["flexboard", "시댄스2"]);
  assert.deepEqual([...tagSetOf(["#AI영상", "기타"])], ["ai영상"]);
  assert.equal(tagSetOf(undefined).size, 0);
});

test("모든 글 페이지는 관련 글 링크를 1개 이상 갖고, 자기 자신을 링크하지 않는다", () => {
  const out = renderSeoSite({ rows: fixtureRows, pages: pagesFixture, template: TEMPLATE, siteUrl: SITE, ogManifest: {} });
  let checked = 0;
  for (const [file, html] of out.files) {
    if (!/^(post|notice|qna|guide)\/[^/]+\/index\.html$/.test(file)) continue;
    checked += 1;
    const block = /aria-label="관련 글".*?<\/nav>/s.exec(html)?.[0] ?? "";
    assert.ok(block, `${file} 에 관련 글 블록이 없습니다`);
    assert.match(block, /<li><a href="\.\.\/\.\.\/[^"]+">/, `${file} 관련 글이 비어 있습니다`);
    const selfHref = `href="../../${file.replace("/index.html", "/")}"`;
    assert.ok(!block.includes(selfHref), `${file} 가 자기 자신을 링크합니다`);
  }
  assert.ok(checked >= 3, `검사한 글 페이지가 너무 적습니다: ${checked}`);
});

test("llms.txt — 사이트 요약 · 섹션 · 대표 글 링크를 절대 주소로 담는다", () => {
  const out = renderSeoSite({ rows: fixtureRows, pages: pagesFixture, template: TEMPLATE, siteUrl: SITE, ogManifest: {} });
  const txt = out.files.get("llms.txt");
  assert.ok(txt, "llms.txt 가 생성되지 않았습니다");
  assert.match(txt, /^# XCONDA허브/);
  assert.match(txt, /^> /m);
  // 모든 링크는 절대 주소
  for (const m of txt.matchAll(/\]\(([^)]+)\)/g)) assert.match(m[1], /^https:\/\/example\.test\//);
  assert.match(txt, /\[뉴스 · 블로그\]\(https:\/\/example\.test\/XCONDA_info\/post\/\)/);
  // 섹션별 상한(20건)을 넘으면 사이트맵으로 안내합니다
  const many = Array.from({ length: 25 }, (_, i) => ({
    id: `77777777-0000-4000-8000-${String(i).padStart(12, "0")}`,
    Title: `블로그 글 ${i}`,
    __type: "blog",
    Published: true,
    Date: `2026-09-${String((i % 28) + 1).padStart(2, "0")}`,
    Slug: `many-post-${i}`,
    Summary: "요약",
  }));
  const big = renderSeoSite({ rows: many, pages: {}, template: TEMPLATE, siteUrl: SITE, ogManifest: {} });
  assert.match(big.files.get("llms.txt"), /- … 외 5건은 https:\/\/example\.test\/XCONDA_info\/sitemap\.xml 참고/);
  // 사이트맵에 있는 글 주소가 llms.txt 에도 있어야 합니다(두 목록이 어긋나지 않게)
  const sitemapLocs = [...out.files.get("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const firstArticle = sitemapLocs.find((u) => /\/post\/[^/]+\/$/.test(u)) ?? sitemapLocs[0];
  assert.ok(txt.includes(firstArticle), `llms.txt 에 ${firstArticle} 가 없습니다`);
  // 같은 입력이면 같은 파일(멱등)
  const again = renderSeoSite({ rows: fixtureRows, pages: pagesFixture, template: TEMPLATE, siteUrl: SITE, ogManifest: {} });
  assert.equal(again.files.get("llms.txt"), txt);
});

/* ---------------------------------------------------------------------------
 * 언어별 주소 — 2026-10-25 B
 *   번역이 있는 글만 /en/ 주소를 만들고, ko ↔ en 을 hreflang 으로 묶습니다.
 * ------------------------------------------------------------------------ */
const EN_FIXTURE = {
  en: {
    lang: "en",
    site: { title: "XCONDA Hub", description: "English answers." },
    ui: { home: "Home", brand: "XCONDA Hub" },
    sections: { qna: { title: "XCONDA Q&A (English)", description: "Reviewed English answers." } },
    entries: {
      "qna/refund-policy": { title: "How do refunds work?", summary: "Ask within 7 days for unused credits." },
    },
  },
};

test("언어별 주소·hreflang — 기준 언어는 접두사 없이, 나머지는 /en/ 처럼 붙는다", () => {
  assert.equal(localizedUrl("https://hub.example.test/", "ko", "qna/a/"), "https://hub.example.test/qna/a/");
  assert.equal(localizedUrl("https://hub.example.test/", "en", "qna/a/"), "https://hub.example.test/en/qna/a/");
  assert.equal(localizedUrl("https://hub.example.test/", "zh", ""), "https://hub.example.test/zh/");
  const alt = hreflangAlternates("https://hub.example.test/", "qna/a/", ["ko", "en"]);
  assert.deepEqual(alt.map((a) => a.hreflang), ["ko", "en", "x-default"]);
  assert.equal(alt.at(-1).href, "https://hub.example.test/qna/a/"); // x-default = 한국어 원문
  // 중복 코드는 한 번만
  assert.equal(hreflangAlternates("https://hub.example.test/", "", ["ko", "ko"]).length, 2);
  assert.equal(langFromPathname("/en/qna/a/"), "en");
  assert.equal(langFromPathname("/qna/a/"), "ko");
  assert.equal(langFromPathname("/english/"), "ko"); // /en/ 접두사만 인정
});

test("번역이 있으면 /en/ 페이지가 만들어지고, ko 쪽과 hreflang 으로 서로를 가리킨다", () => {
  const out = renderSeoSite({
    rows: fixtureRows,
    pages: pagesFixture,
    template: TEMPLATE,
    siteUrl: SITE,
    ogManifest: {},
    translations: EN_FIXTURE,
  });
  const en = out.files.get("en/qna/refund-policy/index.html");
  assert.ok(en, "영어 글 페이지가 없습니다");
  assert.match(en, /<html lang="en"/);
  assert.match(en, /<link rel="canonical" href="https:\/\/example\.test\/XCONDA_info\/en\/qna\/refund-policy\/" \/>/);
  assert.match(en, /hreflang="ko" href="https:\/\/example\.test\/XCONDA_info\/qna\/refund-policy\/"/);
  assert.match(en, /hreflang="en" href="https:\/\/example\.test\/XCONDA_info\/en\/qna\/refund-policy\/"/);
  assert.match(en, /How do refunds work\?/);
  // 앱 번들은 영어 페이지에 넣지 않습니다(React 가 정적 번역문을 지우고 한국어 화면을 그리는 것 방지)
  assert.doesNotMatch(en, /assets\/app\.js/);
  // 영어 홈 · 섹션 목록
  assert.ok(out.files.get("en/index.html"));
  assert.ok(out.files.get("en/qna/index.html"));
  // ko 쪽에서도 영어 주소를 알려 줍니다
  const ko = out.files.get("qna/refund-policy/index.html");
  assert.match(ko, /hreflang="en" href="https:\/\/example\.test\/XCONDA_info\/en\/qna\/refund-policy\/"/);
  // 번역이 없는 글에는 영어 주소를 만들지 않습니다(중복 방지)
  assert.equal([...out.files.keys()].filter((f) => f.startsWith("en/") && f.includes("deepseek")).length, 0);
  // 사이트맵에도 들어갑니다
  assert.match(out.files.get("sitemap.xml"), /<loc>https:\/\/example\.test\/XCONDA_info\/en\/qna\/refund-policy\/<\/loc>/);
});

test("번역 파일에 원문이 없는 글이 있으면 경고만 남기고 건너뛴다", () => {
  const out = renderSeoSite({
    rows: fixtureRows,
    pages: pagesFixture,
    template: TEMPLATE,
    siteUrl: SITE,
    ogManifest: {},
    translations: { en: { ...EN_FIXTURE.en, entries: { "qna/does-not-exist": { title: "x", summary: "y" } } } },
  });
  assert.equal(out.files.has("en/qna/does-not-exist/index.html"), false);
  assert.ok(out.warnings.some((w) => w.includes("qna/does-not-exist")));
});

test("번역이 하나도 없으면 언어별 페이지를 만들지 않는다(기존 동작 유지)", () => {
  const out = renderSeoSite({ rows: fixtureRows, pages: pagesFixture, template: TEMPLATE, siteUrl: SITE, ogManifest: {}, translations: {} });
  assert.equal([...out.files.keys()].filter((f) => /^(en|ja|zh)\//.test(f)).length, 0);
  assert.doesNotMatch(out.files.get("index.html"), /hreflang="en"/);
});

/* ---------------------------------------------------------------------------
 * 번역 본문(blocks) — 2026-10-25 (①-1)
 *   Q&A 는 summary 가 곧 답변이지만, 블로그·가이드·공지는 **본문**이 있어야
 *   번역 주소를 만들 가치가 있습니다. 번역가는 6가지 블록만 쓰고,
 *   본문 이미지는 한국어 원문 위치를 그대로 따라갑니다.
 * ------------------------------------------------------------------------ */
test("번역 본문 블록 — 지원 타입만 통과하고 형식 오류는 이유를 알려 준다", () => {
  assert.deepEqual(localizedBlockProblems(undefined), []);
  assert.deepEqual(localizedBlockProblems([{ type: "p", text: "본문" }]), []);
  assert.deepEqual(localizedBlockProblems([{ type: "ul", items: ["하나", "둘"] }]), []);
  assert.equal(localizedBlockProblems([{ type: "table", rows: [["가", "나"]] }]).length, 0);
  const bad = localizedBlockProblems([
    { type: "image", src: "x" }, // 번역가는 이미지를 직접 넣지 않습니다
    { type: "p", text: "  " },
    { type: "ol", items: [] },
    { type: "h2" },
  ]);
  assert.equal(bad.length, 4);
  // 지원 타입이 늘면(표 등) 위 목록이 4개가 아니게 되므로, 개수 대신 내용을 확인합니다.
  assert.match(bad[0], /지원하지 않는 type\(image\)/);
  assert.match(bad[1], /text 가 비어/);
  assert.match(bad[2], /items 배열/);
  assert.match(bad[3], /text 가 비어/);
  assert.deepEqual(LOCALIZED_BLOCK_TYPES, ["p", "h2", "h3", "ul", "ol", "quote", "table", "callout", "code", "todo"]);
});

test("본문 이미지 위치는 '앞에 있던 글 블록 수'로 계산한다", () => {
  const images = bodyImagesOf([
    { type: "p", text: "a" },
    { type: "img", src: "s1.png" },
    { type: "h2", text: "b" },
    { type: "p", text: "c" },
    { type: "img", src: "s2.png", caption: "캡션" },
    { type: "img", src: "" }, // 주소 없는 이미지는 무시
  ]);
  assert.deepEqual(images, [
    { after: 1, src: "s1.png", caption: undefined },
    { after: 3, src: "s2.png", caption: "캡션" },
  ]);
});

test("번역 블록과 원문 이미지를 합치면 이미지가 같은 자리에 들어간다", () => {
  const merged = mergeLocalizedBlocks(
    [{ type: "p", text: "one" }, { type: "h2", text: "two" }, { type: "p", text: "three" }],
    [{ after: 1, src: "s1.png" }, { after: 99, src: "s2.png" }],
  );
  assert.deepEqual(
    merged.map((b) => b.type),
    ["p", "img", "h2", "p", "img"],
  );
  assert.equal(merged.at(-1).src, "s2.png"); // 범위를 넘는 위치는 마지막에 붙습니다
  // 이미지가 없으면 번역 블록만 그대로
  assert.deepEqual(mergeLocalizedBlocks([{ type: "p", text: "x" }]).map((b) => b.type), ["p"]);
});

test("번역 본문이 있으면 번역 페이지에 본문·이미지가 렌더된다", () => {
  const out = renderSeoSite({
    rows: fixtureRows,
    pages: pagesFixture,
    template: TEMPLATE,
    siteUrl: SITE,
    ogManifest: {},
    translations: {
      en: {
        ...EN_FIXTURE.en,
        entries: {
          "qna/refund-policy": {
            title: "How do refunds work?",
            summary: "Ask within 7 days for unused credits.",
            blocks: [{ type: "h2", text: "Refund window" }, { type: "p", text: "Seven days from payment." }],
          },
        },
      },
    },
  });
  const en = out.files.get("en/qna/refund-policy/index.html");
  assert.match(en, /<h2>Refund window<\/h2>/);
  assert.match(en, /<p[^>]*>Seven days from payment\.<\/p>/);
});

test("표 블록은 문자열 2차원 배열로 쓰고, 칸 수가 다르면 거부한다", () => {
  const table = { type: "table", rows: [["플랜", "가격"], ["Starter", "10,450원"]] };
  assert.deepEqual(localizedBlockProblems([table]), []);
  const html = blocksToHtml(mergeLocalizedBlocks([table]), { alt: "" });
  assert.match(html, /<table>/, "표가 렌더되지 않았습니다");
  assert.match(html, /<td>플랜<\/td>/);

  const ragged = { type: "table", rows: [["플랜", "가격"], ["Starter"]] };
  assert.match(localizedBlockProblems([ragged])[0], /같은 칸 수/);

  const empty = { type: "table", rows: [] };
  assert.match(localizedBlockProblems([empty])[0], /rows 배열이 필요/);

  // 모서리 칸이 비는 것은 정상 — 오류로 보지 않습니다
  assert.deepEqual(localizedBlockProblems([{ type: "table", rows: [["", "가격"], ["Starter", "10,450원"]] }]), []);
  const notString = { type: "table", rows: [["플랜", 3]] };
  assert.match(localizedBlockProblems([notString])[0], /문자열/);
});

test("콜아웃 블록과 **굵게** 표기가 원문 강조를 잃지 않고 렌더된다", () => {
  const blocks = [
    { type: "callout", icon: "📌", text: "**Key summary**: seven steps in total." },
    { type: "ul", items: ["**Input**: the scenario", "Deliverable: a locked scenario"] },
  ];
  assert.deepEqual(localizedBlockProblems(blocks), []);
  const html = blocksToHtml(mergeLocalizedBlocks(blocks), { alt: "" });
  assert.match(html, /<aside class="callout notion-default"><p>📌 <strong>Key summary<\/strong>/);
  assert.match(html, /<li><strong>Input<\/strong>: the scenario<\/li>/);
  assert.match(localizedBlockProblems([{ type: "callout", icon: "📌", text: " " }])[0] || "", /callout 에 text/);
  // 코드/도식 블록 — 파이프라인 그림은 고정폭으로 그대로 보여 줍니다
  const codeHtml = blocksToHtml(mergeLocalizedBlocks([{ type: "code", text: "TURN ➔ FLEXBOARD" }]), { alt: "" });
  assert.match(codeHtml, /<pre><code>TURN ➔ FLEXBOARD<\/code><\/pre>/);
});

test("번역 블록 구조가 원문과 다르면 빌드 경고를 남긴다", () => {
  const out = renderSeoSite({
    rows: fixtureRows,
    pages: pagesFixture,
    template: TEMPLATE,
    siteUrl: SITE,
    ogManifest: {},
    translations: {
      en: {
        ...EN_FIXTURE.en,
        entries: {
          "qna/refund-policy": {
            title: "How do refunds work?",
            summary: "Ask within 7 days for unused credits.",
            blocks: [{ type: "p", text: "Seven days from payment." }, { type: "p", text: "Unused credits only." }],
          },
        },
      },
    },
  });
  assert.ok(
    out.warnings.some((w) => w.includes("블록 구조가 원문과 다릅니다")),
    "구조 경고가 없습니다 — 이미지 위치가 조용히 어긋날 수 있습니다",
  );
});

test("2단 배치는 펼쳐서 글만 번역하고 이미지·영상은 원문 자리에 그대로 넣는다", () => {
  const ko = [
    { type: "p", text: [{ text: "앞 문단" }] },
    { type: "divider" }, // 글자가 없는 블록은 번역 파일에 없으므로 이미지 자리 계산에서 빠집니다
    {
      type: "column_list",
      children: [
        { type: "column", ratio: 0.5, children: [{ type: "img", src: "a.png" }] },
        { type: "column", ratio: 0.5, children: [{ type: "p", text: [{ text: "설명" }] }] },
      ],
    },
    { type: "video", src: "https://cdn.example/v.mp4" },
    { type: "p", text: [{ text: "뒤 문단" }] },
  ];
  const flat = flattenBlocks(ko);
  assert.deepEqual(flat.map((b) => b.type), ["p", "divider", "img", "p", "video", "p"]);
  const media = bodyMediaOf(ko);
  assert.deepEqual(media.map((m) => [m.after, m.block.type]), [[1, "img"], [2, "video"]]);

  const merged = mergeLocalizedBlocks(
    [{ type: "p", text: "First" }, { type: "p", text: "Second" }, { type: "p", text: "Third" }],
    media,
  );
  assert.deepEqual(merged.map((b) => b.type), ["p", "img", "p", "video", "p"]);
  assert.match(blocksToHtml(merged, { alt: "" }), /<video[^>]*src="https:\/\/cdn\.example\/v\.mp4"/);
});

test("이모지·링크·해시태그만 있는 블록은 번역 대상에서 뺀다", () => {
  assert.equal(needsTranslation({ type: "callout", icon: "📷", text: "" }), false);
  assert.equal(needsTranslation({ type: "quote", text: "📷" }), false);
  assert.equal(needsTranslation({ type: "quote", text: "🔗 xconda.ai" }), false);
  assert.equal(needsTranslation({ type: "quote", text: "#ai #seedance #aivideo" }), false);
  assert.equal(needsTranslation({ type: "quote", text: "🍿" }), false);
  assert.equal(needsTranslation({ type: "p", text: [{ text: "컷이 튀는 이유" }] }), true);
  assert.equal(needsTranslation({ type: "p", text: "🔗 xconda.ai 바로가기" }), true);
  assert.equal(needsTranslation({ type: "ul", items: [{ text: "…" }] }), true);
  assert.equal(needsTranslation({ type: "table", rows: [["A"]] }), true);
});

test("표(table) 블록은 번역 문자열 2차원 배열로 받고 칸 수가 다르면 알려 준다", () => {
  const blocks = [
    { type: "table", rows: [["Step", "What you do"], ["1", "Prepare the scenario"]] },
    { type: "table", rows: [["Item", "Detail"], ["Korea", "30% usage discount + 10% price discount"]] },
  ];
  assert.deepEqual(localizedBlockProblems(blocks), []);
  const html = blocksToHtml(mergeLocalizedBlocks(blocks), { alt: "" });
  assert.match(html, /<table><tbody><tr><td>Step<\/td><td>What you do<\/td><\/tr>/);
  assert.match(html, /30% usage discount/);
  const bad = localizedBlockProblems([{ type: "table", rows: [["A", "B"], ["one"]] }]);
  assert.equal(bad.length, 1);
  assert.match(bad[0], /칸|열/);
});

test("체크리스트(todo) 블록은 항목 배열로 번역한다", () => {
  const blocks = [{ type: "todo", items: ["Did the cuts connect in Sheet view?", "Any missing cuts?"] }];
  assert.deepEqual(localizedBlockProblems(blocks), []);
  const html = blocksToHtml(mergeLocalizedBlocks(blocks), { alt: "" });
  assert.match(html, /<ul class="todo">/);
  assert.match(html, /Did the cuts connect/);
  assert.match(localizedBlockProblems([{ type: "todo", items: [] }])[0], /items 배열/);
});

test("본문이 있으면 요약을 첫 문단으로 중복 출력하지 않는다", () => {
  const out = renderSeoSite({
    rows: fixtureRows,
    pages: pagesFixture,
    template: TEMPLATE,
    siteUrl: SITE,
    ogManifest: {},
    translations: {
      en: {
        ...EN_FIXTURE.en,
        entries: {
          "qna/refund-policy": {
            title: "How do refunds work?",
            summary: "Ask within 7 days for unused credits.",
            blocks: [{ type: "p", text: "Seven days from payment." }],
          },
        },
      },
    },
  });
  const en = out.files.get("en/qna/refund-policy/index.html");
  const body = en.slice(en.indexOf("<article>"), en.indexOf("</article>"));
  const summaryHits = body.split("Ask within 7 days for unused credits.").length - 1;
  assert.equal(summaryHits, 0, "본문이 있으면 요약은 메타 설명으로만 씁니다");
  assert.match(body, /Seven days from payment\./);
  // 메타 설명에는 남아 있어야 합니다
  assert.match(en, /<meta name="description" content="Ask within 7 days for unused credits\."/);
});

test("번역 본문 형식이 틀리면 페이지에 넣지 않고 경고를 남긴다", () => {
  const out = renderSeoSite({
    rows: fixtureRows,
    pages: pagesFixture,
    template: TEMPLATE,
    siteUrl: SITE,
    ogManifest: {},
    translations: {
      en: {
        ...EN_FIXTURE.en,
        entries: {
          "qna/refund-policy": {
            title: "How do refunds work?",
            summary: "Ask within 7 days for unused credits.",
            blocks: [{ type: "image", src: "x.png" }],
          },
        },
      },
    },
  });
  assert.ok(out.warnings.some((w) => w.includes("지원하지 않는 type(image)")), "형식 경고가 없습니다");
  const en = out.files.get("en/qna/refund-policy/index.html");
  assert.doesNotMatch(en, /<img /, "이미지 블록이 새어 들어가면 안 됩니다");
  // 요약(답변)은 그대로 남습니다
  assert.match(en, /Ask within 7 days for unused credits\./);
});

/* ---------------------------------------------------------------------------
 * 번역 커버리지 — 2026-10-25 (B 확장 · ja/zh 추가)
 *   content/i18n/*.json 이 실제 글과 1:1 로 맞는지, 빈 번역이 없는지 **모든 언어**에 대해
 *   검사합니다. 언어를 추가하면 이 테스트가 자동으로 함께 늘어납니다.
 * ------------------------------------------------------------------------ */
const I18N_LANGS = ["en", "ja", "zh"];

for (const lang of I18N_LANGS) {
  test(`${lang} 번역 파일의 모든 키가 실제 글과 연결되고, 빈 번역이 없다`, () => {
    const dict = JSON.parse(fs.readFileSync(path.join(here, "..", `content/i18n/${lang}.json`), "utf8"));
    const snapshot = JSON.parse(fs.readFileSync(path.join(here, "..", "notion-content.json"), "utf8"));
    const prefixOf = { faq: "qna", blog: "post", news: "post", notice: "notice", guide: "guide" };
    const slugs = new Set(
      (snapshot.rows ?? [])
        .map((r) => `${prefixOf[r.__type] ?? r.__type}/${String(r.Slug ?? "").trim()}`)
        .filter((k) => !k.endsWith("/")),
    );
    const entries = dict.entries ?? {};
    const keys = Object.keys(entries);
    assert.ok(keys.length >= 70, `${lang}: 번역 항목이 ${keys.length}개뿐입니다`);
    const dead = keys.filter((k) => !slugs.has(k));
    assert.deepEqual(dead, [], `${lang}: 원문이 없는 번역 키: ${dead.slice(0, 5).join(", ")}`);
    for (const key of keys) {
      const e = entries[key];
      // 중국어는 한 글자가 담는 정보가 많아 제목이 짧습니다(예: 如何安装技能？).
      const minTitle = lang === "zh" ? 5 : 8;
      assert.ok(e.title && e.title.length >= minTitle, `${lang}/${key}: 제목이 없거나 너무 짧습니다`);
      assert.ok(e.summary && e.summary.length >= 40, `${lang}/${key}: 본문이 없거나 너무 짧습니다`);
      // 번역 누락 검사 — 한글 비중이 20% 를 넘으면 번역이 안 된 것으로 봅니다.
      // (법인명 "주식회사 큐브베리", 사업자등록번호 "2026-광주동구-0289" 같은 고유표기는 남는 게 정상)
      const hangul = (e.summary.match(/[가-힣]/g) ?? []).length;
      assert.ok(hangul / e.summary.length < 0.2, `${lang}/${key}: 본문의 한글 비중이 ${Math.round((hangul / e.summary.length) * 100)}% 입니다`);
      // 제목에 원문 노트가 붙은 경우("…?답변") 방지
      assert.doesNotMatch(e.title, /답변$/, `${lang}/${key}: 제목 끝에 "답변" 이 붙어 있습니다`);
    }
    // Q&A 는 전부 번역되어 있어야 합니다
    const faqSlugs = new Set((snapshot.rows ?? []).filter((r) => r.__type === "faq").map((r) => `qna/${String(r.Slug ?? "").trim()}`));
    const missingKeys = [...faqSlugs].filter((k) => !keys.includes(k));
    assert.deepEqual(missingKeys, [], `${lang}: 번역이 없는 Q&A: ${missingKeys.slice(0, 5).join(", ")}`);
  });
}

test("언어 파일은 같은 키 구조를 쓴다(사이트 정보 · UI 문구 · 섹션)", () => {
  const read = (lang) => JSON.parse(fs.readFileSync(path.join(here, "..", `content/i18n/${lang}.json`), "utf8"));
  const base = read("en");
  for (const lang of I18N_LANGS) {
    const dict = read(lang);
    assert.equal(dict.lang, lang, `${lang}: lang 값이 파일 이름과 다릅니다`);
    for (const key of ["site", "ui", "sections", "entries"]) {
      assert.equal(typeof dict[key], "object", `${lang}: ${key} 가 없습니다`);
    }
    assert.deepEqual(Object.keys(dict.site).sort(), Object.keys(base.site).sort(), `${lang}: site 키 불일치`);
    assert.deepEqual(Object.keys(dict.ui).sort(), Object.keys(base.ui).sort(), `${lang}: ui 키 불일치`);
    assert.deepEqual(Object.keys(dict.sections).sort(), Object.keys(base.sections).sort(), `${lang}: sections 키 불일치`);
    assert.ok(dict.site.description.length >= 40, `${lang}: 사이트 설명이 너무 짧습니다`);
  }
});

test("번역 언어의 UI 문구는 한국어를 그대로 두지 않는다", () => {
  for (const lang of I18N_LANGS) {
    const dict = JSON.parse(fs.readFileSync(path.join(here, "..", `content/i18n/${lang}.json`), "utf8"));
    for (const [key, value] of Object.entries(dict.ui)) {
      if (typeof value !== "string") continue;
      const hangul = (value.match(/[가-힣]/g) ?? []).length;
      assert.ok(hangul === 0, `${lang}: ui.${key} 에 한국어가 남아 있습니다 — ${value}`);
    }
    // 사이트 제목·설명도 번역문이어야 합니다.
    assert.ok(!/[가-힣]/.test(dict.site.title), `${lang}: site.title 에 한국어가 남아 있습니다`);
    assert.ok(!/[가-힣]/.test(dict.site.description), `${lang}: site.description 에 한국어가 남아 있습니다`);
  }
});

test("여러 언어 번역이 있으면 hreflang 이 서로를 모두 가리킨다", () => {
  const out = renderSeoSite({
    rows: fixtureRows,
    pages: pagesFixture,
    template: TEMPLATE,
    siteUrl: SITE,
    ogManifest: {},
    translations: {
      en: EN_FIXTURE.en,
      ja: { ...EN_FIXTURE.en, lang: "ja", entries: { "qna/refund-policy": { title: "返金の仕組みは？", summary: "7日以内に未使用なら全額返金。" } } },
      zh: { ...EN_FIXTURE.en, lang: "zh", entries: { "qna/refund-policy": { title: "退款流程是怎样的？", summary: "7 天内且点数未使用可全额退款。" } } },
    },
  });
  for (const lang of ["en", "ja", "zh"]) {
    const html = out.files.get(`${lang}/qna/refund-policy/index.html`);
    assert.ok(html, `${lang} 페이지가 없습니다`);
    for (const code of ["ko", "en", "ja", "zh-Hans"]) {
      assert.match(html, new RegExp(`hreflang="${code}"`), `${lang} 페이지에 hreflang ${code} 가 없습니다`);
    }
    assert.match(html, /hreflang="x-default"/, `${lang} 페이지에 x-default 가 없습니다`);
  }
  // 한국어 원문도 세 언어를 모두 알려 줍니다
  const ko = out.files.get("qna/refund-policy/index.html");
  for (const code of ["en", "ja", "zh-Hans"]) assert.match(ko, new RegExp(`hreflang="${code}"`));
  // 언어별 홈도 만들어집니다
  for (const lang of ["en", "ja", "zh"]) assert.ok(out.files.get(`${lang}/index.html`), `${lang} 홈이 없습니다`);
});