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
import vm from "node:vm";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  siteJsonLd,
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_GLOBAL,
  SUPPORT_EMAIL_KR,
  SUPPORT_EMAIL_US,
  supportEmailFor,
  isEndedTitle,
  DEFAULT_SITE_URL,
  OG_LANG_DIR,
  OG_LANG_MANIFEST_PATH,
  OG_LOCAL_DIR,
  hreflangAlternates,
  langFromPathname,
  pathLanguage,
  SITE_LANGS,
  PRIMARY_LANG,
  setPrimaryLang,
  localOgImageUrl,
  localizedOgImageUrl,
  localizedUrl,
  localeBaseUrl,
  LOCALE_BASE_URLS,
  setLocaleBaseUrls,
  ogLangManifestKey,
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
  hubAssetUrl,
  isProxiedLocalePath,
  summarize,
} from "../src/content/seo.js";
import { blocksToHtml, cleanFaqBlocks, parseLegacyRecordMap } from "../src/content/body.js";
import { AI_CRAWLERS } from "../src/content/seo.js";
import {
  localizedDate,
  promoteSubheadings,
  applyHead,
  renderSeoSite,
  localizedBlockProblems,
  mergeLocalizedBlocks,
  skipInSitemap,
  SITEMAP_SKIP_LOCALIZED_SECTIONS,
  staleLocalizedPages,
  writeSite,
  mirrorLocalizedAssets,
  LOCALIZED_ASSET_GROUPS,
  LOCALIZED_SNAPSHOT_FILE,
  absoluteAssetRefs,
  bodyImagesOf,
  bodyMediaOf,
  flattenBlocks,
  needsTranslation,
  LOCALIZED_BLOCK_TYPES,
} from "./build-seo.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, "..");
const TEMPLATE = fs.readFileSync(path.join(here, "../index.html"), "utf8");
const SITE = "https://example.test/XCONDA_info/";

/**
 * 공개 주소 스위치(LOCALE_BASE_URLS)를 끈 상태에서 검사합니다.
 *
 * 2026-11-17 에 영어 허브의 공개 주소가 `https://www.xconda.ai/hub/` 로 켜졌습니다
 * (`src/content/seo.js`). 스위치가 켜지면 영어 페이지의 canonical·hreflang·사이트맵·
 * 언어 전환 주소가 전부 제품 사이트 주소가 되므로, 아래의 **구조** 검사(페이지 내용·
 * 링크 모양·사이트맵 규칙)는 스위치를 끈 상태에서 해야 예전과 같은 것을 봅니다.
 * 스위치가 켜진 상태의 동작은 아래 「공개 주소 스위치」 테스트가 따로 검사합니다.
 */
const withSwitchOff = (fn, map = { en: "" }) => {
  const previous = setLocaleBaseUrls(map);
  try {
    return fn();
  } finally {
    setLocaleBaseUrls(previous);
  }
};

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
  // `/reports/` 는 색인에서 제외합니다 — 사고 대응·피해액 문서가 Markdown/Word 로 들어 있어
  // GitHub Pages 가 그대로 공개 서빙합니다(robots.txt 는 색인만 막고 다운로드는 못 막습니다).
  assert.match(pageOf("robots.txt"), /Disallow: \/reports\//);
  assert.match(pageOf("robots.txt"), /Allow: \//);
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
    assert.equal(org["@id"], "https://www.cuberry.kr/#organization");
    assert.ok(org.sameAs.includes("https://www.xconda.ai"), rel);
    // 회사와 제품을 분리 — AI 가 "XCONDA" 를 제품 엔터티로 인식하게 합니다
    assert.equal(org.brand["@type"], "Brand");
    assert.equal(org.brand.name, "Xconda");
    // 구글 로고 규격은 래스터 112px 이상입니다 (SVG 는 표시되지 않음)
    assert.equal(org.logo, "https://www.cuberry.kr/images/logo-512.png");
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
  assert.doesNotMatch(faq.mainEntity[0].acceptedAnswer.text, /답변 본문입니다/);

  // 단위: 작성자가 없으면 운영사를 저자로 둔다
  const bare = articleJsonLd({ type: "notice", url: "https://example.test/notice/x/", headline: "공지" });
  assert.deepEqual(bare.author, { "@id": "https://www.cuberry.kr/#organization" });
});

test("404.html 이 함께 만들어지고 noindex 와 메인·최근 글 링크를 담는다 (A7)", () => {
  const notFound = pageOf("404.html");
  assert.ok(notFound);
  assert.match(notFound, /<meta name="robots" content="noindex" \/>/);
  assert.match(notFound, /없는 주소입니다|페이지를 찾을 수 없습니다/);
  // 임의의 깊이에서 서빙되므로 링크는 절대 주소여야 한다
  assert.match(notFound, /href="https:\/\/example\.test\/XCONDA_info\/post\/deepseek-official-harness\//);
});

test("404.html 은 앱 번들을 실행하지 않는다 — 없는 JSON 경로가 홈 화면으로 보이던 문제(2026-11-26)", () => {
  const notFound = pageOf("404.html");
  // 앱이 실행되면 없는 주소에도 홈(공지·뉴스·Q&A 목록)이 그려져, 에이전트가
  // /.well-known/mcp.json · /openapi.json · /agent.json 응답을 홈 HTML 로 오해했습니다.
  assert.doesNotMatch(notFound, /assets\/app\.js/);
  assert.doesNotMatch(notFound, /assets\/app\.css/);
  assert.doesNotMatch(notFound, /<script[^>]*\bsrc="[^"]*app\.js"/);
  // 대신 이 응답이 HTML · 404 라는 사실을 본문에서 바로 밝힙니다.
  assert.match(notFound, /본문은 HTML/);
  assert.match(notFound, /do not parse it as JSON/);
  // 정적 안내문과 언어 전환 스크립트는 그대로 남습니다(브라우저 방문자용).
  assert.match(notFound, /data-404-ko/);
  assert.match(notFound, /llms\.txt/);
  // 다른 페이지(홈·글)는 앱을 계속 실행해야 합니다 — 정적 본문만으로는 언어 전환이 안 됩니다.
  assert.match(pageOf("index.html"), /assets\/app\.js/);
});

test("robots.txt 는 AI 검색 크롤러만 이름으로 허용하고, 학습 크롤러는 차단한다 (2026-11-26 결정)", () => {
  const txt = pageOf("robots.txt");

  /** `User-agent: 이름` 다음 첫 지시(`Allow`/`Disallow`)를 그 그룹의 판정으로 봅니다. */
  const ruleFor = (agent) => {
    // 이름 줄은 여러 개가 묶일 수 있으므로, 같은 그룹의 첫 지시까지 넘어가며 찾습니다.
    const re = new RegExp(
      `User-agent: ${agent.replace(/[-.]/g, "\\$&")}\\n(?:User-agent: [^\\n]+\\n)*(Allow|Disallow): (\\S+)`,
    );
    const m = re.exec(txt);
    return m ? `${m[1]}: ${m[2]}` : null;
  };

  // 검색용 — 허용 (AI 검색 결과 인용)
  for (const name of AI_CRAWLERS.search) {
    assert.equal(ruleFor(name), "Allow: /", name);
  }
  // 학습용 — 차단. 2026-11-26 결정: 모델 학습 이용 불허.
  assert.ok(AI_CRAWLERS.training.length > 0, "차단할 학습 크롤러 목록이 비었습니다");
  for (const name of AI_CRAWLERS.training) {
    assert.equal(ruleFor(name), "Disallow: /", name);
  }

  // 이름은 한 번만 나와야 합니다(중복 그룹은 크롤러마다 해석이 갈립니다).
  const named = txt.match(/^User-agent: (?!\*$).+$/gm) ?? [];
  assert.equal(new Set(named).size, named.length);
  // 검색용 그룹이 학습용 그룹보다 앞에 옵니다(읽는 사람이 정책 순서대로 보게).
  assert.ok(txt.indexOf("User-agent: PerplexityBot") < txt.indexOf("User-agent: GPTBot"));
  // 학습 목적만 밝힌 크롤러는 막고, 검색 겸용 크롤러(Googlebot 등)는 막지 않습니다.
  assert.match(txt, /겸하는 크롤러\(Googlebot 등\)는 검색 노출을 위해 막지 않습니다/);
  // 민감한 보고서는 검색 크롤러도 색인하지 않습니다.
  assert.match(txt, /^Allow: \/$\nDisallow: \/reports\/$/m);
});

test("robots.txt 는 학습 크롤러를 막아도 검색·브라우저 크롤러는 계속 허용한다", () => {
  const txt = pageOf("robots.txt");
  // `User-agent: *` 그룹은 계속 허용입니다 — 학습 크롤러만 이름으로 따로 막습니다.
  const star = txt.slice(txt.indexOf("User-agent: *"));
  assert.match(star, /^Allow: \/$/m);
  assert.doesNotMatch(star.split("Sitemap:")[0], /^Disallow: \/$/m);
  // 사이트맵·llms.txt 안내는 그대로 남습니다.
  assert.match(txt, /Sitemap: https:\/\/example\.test\/XCONDA_info\/sitemap\.xml/);
  assert.match(txt, /llms\.txt/);
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

/* ---------------------------------------------------------------------------
 * 개발 진입점 noindex — dev.html 은 저장소 루트에 커밋되어 /dev.html 로도 열립니다.
 *   검색에 "개발 껍데기"가 노출되지 않게 noindex 를 두되, 빌드 결과 index.html 이
 *   물려받으면 홈페이지가 검색에서 빠지므로 applyHead 가 지웁니다.
 * ------------------------------------------------------------------------ */
test("dev.html 의 noindex 는 빌드 결과(index.html)로 넘어가지 않는다", () => {
  const dev = fs.readFileSync(path.join(REPO_ROOT, "dev.html"), "utf8");
  assert.match(dev, /DEV-ONLY:START/);
  assert.match(dev, /<meta name="robots" content="noindex, nofollow" \/>/);
  const out = renderSeoSite({
    rows: fixtureRows,
    pages: pagesFixture,
    template: dev, // 개발 진입점을 그대로 템플릿으로 씁니다(빌드가 하는 일과 같음)
    siteUrl: SITE,
    ogManifest: {},
    translations: {},
  });
  const home = out.files.get("index.html");
  assert.ok(home, "index.html 이 만들어져야 합니다");
  assert.equal(/name="robots"/.test(home), false, "홈이 noindex 를 물려받았습니다");
  assert.equal(home.includes("DEV-ONLY"), false, "DEV-ONLY 주석이 배포본에 남았습니다");
  assert.equal(home.includes("data-dev-only"), false);
  // 제목·canonical 등 일반 head 는 정상적으로 들어갑니다.
  assert.match(home, /<title>XCONDA허브/);
  assert.match(home, /<link rel="canonical"/);
});

/* ---------------------------------------------------------------------------
 * 언어별 공유 카드 — 2026-10-26 ①-5
 *   커버가 없는 글 · 언어 홈 · 언어 목록은 같은 기본 카드를 써서 공유 미리보기에
 *   언어도 제목도 없었습니다. 카드 목록(manifest)에 있으면 그 카드를 먼저 씁니다.
 * ------------------------------------------------------------------------ */
test("언어별 카드 키는 언어 코드 + 슬래시 없는 경로다", () => {
  assert.equal(ogLangManifestKey("en", ""), "en");
  assert.equal(ogLangManifestKey("ja", "/"), "ja");
  assert.equal(ogLangManifestKey("ja", "qna/"), "ja/qna");
  assert.equal(ogLangManifestKey("zh", "/post/some-slug/"), "zh/post/some-slug");
  assert.equal(ogLangManifestKey("", "qna/"), "");
});

test("언어별 카드가 있으면 그 주소를, 없으면 빈 문자열을 돌려준다", () => {
  const manifest = { "ja/qna": "ja-qna.png", ko: "ko-home.png" };
  assert.equal(
    localizedOgImageUrl(manifest, "ja", "qna/", "https://hub.example.test"),
    "https://hub.example.test/assets/img/og/lang/ja-qna.png",
  );
  assert.equal(
    localizedOgImageUrl(manifest, "ko", "", "https://hub.example.test/"),
    "https://hub.example.test/assets/img/og/lang/ko-home.png",
  );
  assert.equal(localizedOgImageUrl(manifest, "ja", "guide/", "https://hub.example.test"), "");
  assert.equal(localizedOgImageUrl(null, "ja", "qna/", "https://hub.example.test"), "");
});

test("커밋된 언어별 카드 manifest 는 실제 PNG(1200×630)와 짝이 맞는다", () => {
  const dir = path.join(REPO_ROOT, OG_LANG_DIR);
  const manifestPath = path.join(REPO_ROOT, OG_LANG_MANIFEST_PATH);
  if (!fs.existsSync(manifestPath)) return; // 카드가 아직 없으면 검사하지 않습니다.
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const keys = Object.keys(manifest);
  assert.ok(keys.length > 0, "manifest 가 비어 있습니다");
  // 언어 홈(ko·en·ja·zh)은 반드시 있어야 합니다 — 없으면 기본 카드로 되돌아갑니다.
  for (const code of ["ko", "en", "ja", "zh"]) assert.ok(keys.includes(code), `${code} 홈 카드가 없습니다`);
  for (const [key, file] of Object.entries(manifest)) {
    assert.match(key, /^[a-z]{2}(\/[a-z0-9-]+)*$/, `키 형식이 이상합니다: ${key}`);
    assert.match(file, /^[a-z]{2}-[a-z0-9-]+\.png$/, `파일 이름이 이상합니다: ${file}`);
    const png = fs.readFileSync(path.join(dir, file));
    // PNG 시그니처 + IHDR(가로·세로) — 미리보기 카드는 1200×630 이어야 합니다.
    assert.equal(png.subarray(1, 4).toString(), "PNG", `${file} 이 PNG 가 아닙니다`);
    assert.equal(png.readUInt32BE(16), 1200, `${file} 가로 길이`);
    assert.equal(png.readUInt32BE(20), 630, `${file} 세로 길이`);
  }
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

test("동기가 받아 둔 뉴스 링크 이미지(__linkImage)는 절대 주소로 공유 메타에 쓰인다", () => {
  // scripts/link-preview.mjs 가 원문 og:image 를 내려받아 남기는 필드 — 루트 상대 경로로 저장되므로
  // SEO 페이지에서는 SITE 기준 절대 주소로 바꿔야 크롤러가 읽습니다.
  const base = {
    id: "99999999-0000-4000-8000-000000000003",
    Title: "링크 이미지만 있는 뉴스",
    __type: "news",
    Published: true,
    Date: "2026-10-07",
    Slug: "link-preview-news",
    Summary: "요약",
    Link: "https://news.example.test/article/1",
    __linkImage: "/assets/img/og/link/0123456789abcdef.jpg",
  };
  const out = renderSeoSite({ rows: [base], pages: {}, template: TEMPLATE, siteUrl: SITE, ogManifest: {} });
  const page = out.files.get("post/link-preview-news/index.html");
  const expected = `${SITE}assets/img/og/link/0123456789abcdef.jpg`;
  assert.match(page, new RegExp(`<meta property="og:image" content="${expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" />`));
  assert.match(page, new RegExp(`<meta name="twitter:image" content="${expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}" />`));
  assert.equal([].concat(ldJsonOf(page, true).image)[0], expected);
  // 링크 이미지가 있으면 "공유 이미지 없음" 경고가 나면 안 된다
  const rowWarnings = out.warnings.filter((w) => w.includes("링크 이미지만 있는 뉴스"));
  assert.match(rowWarnings.join("\n"), /공유 이미지 대체: 커버·링크·본문 이미지/);
  // 없는 필드일 때는 기존 우선순위 그대로
  const noField = renderSeoSite({ rows: [{ ...base, __linkImage: undefined }], pages: {}, template: TEMPLATE, siteUrl: SITE, ogManifest: {} });
  assert.doesNotMatch(noField.files.get("post/link-preview-news/index.html"), /og\/link\//);
});

/* ---------------------------------------------------------------------------
 * 색인 정책 — 2026-10-25 A4
 *   관리자 매뉴얼은 noindex, 공개 사용자 가이드는 canonical + 사이트맵.
 * ------------------------------------------------------------------------ */
test("관리자 매뉴얼은 noindex, 사용자 가이드는 canonical + 사이트맵에 들어간다", () => {
  const read = (f) => fs.readFileSync(path.join(here, "..", f), "utf8");
  // 정본(admin-guide.html)과 분리된 운영 문서 조각도 같은 정책 — 하나라도 빠지면 색인됩니다.
  for (const file of [
    "admin-guide.html",
    "admin-guide-fields.html",
    "admin-guide-simple.html",
    "admin-guide-sns.html",
  ]) {
    assert.match(read(file), /<meta name="robots" content="noindex, nofollow">/, file);
  }
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

test("llms.txt — 사이트 요약 · 섹션 · 대표 글 링크를 절대 주소로 담는다", () => withSwitchOff(() => {
  const out = renderSeoSite({ rows: fixtureRows, pages: pagesFixture, template: TEMPLATE, siteUrl: SITE, ogManifest: {} });
  const txt = out.files.get("llms.txt");
  assert.ok(txt, "llms.txt 가 생성되지 않았습니다");
  assert.match(txt, /^# XCONDA허브/);
  assert.match(txt, /^> /m);
  // 모든 링크는 절대 주소
  for (const m of txt.matchAll(/\]\(([^)]+)\)/g)) assert.match(m[1], /^https:\/\/example\.test\//);
  assert.match(txt, /\[뉴스 · 블로그\]\(https:\/\/example\.test\/XCONDA_info\/post\/\)/);
  // 데이터 신뢰 규칙(2026-11-26) — 기준일·출처를 머리말에 적고, 모르는 값은 0 이 아니라 "확인 불가" 로 다루라고 밝힙니다.
  assert.match(txt, /^기준일: \d{4}-\d{2}-\d{2} · 출처: https:\/\/example\.test\/XCONDA_info\/sitemap\.xml$/m);
  assert.match(txt, /확인할 수 없는 값은 0 이 아니라 "확인 불가"/);
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
}));

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

test("언어별 주소·hreflang — 기준 언어는 접두사 없이, 나머지는 /en/ 처럼 붙는다", () => withSwitchOff(() => {
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
}));

test("언어 목록은 영어가 먼저, 한국어가 두 번째다 (2026-11-15 대표 결정)", () => {
  assert.deepEqual(SITE_LANGS.map((l) => l.code), ["en", "ko", "ja", "zh"]);
  // 한국어는 계속 접두사 없는 원문 주소를 씁니다(순서만 바뀌었습니다).
  assert.equal(SITE_LANGS.find((l) => l.code === "ko").prefix, "");
});

test("대표 언어 스위치 — 기본은 한국어 원문, 켜면 번역이 있는 글만 영어가 x-default", () => withSwitchOff(() => {
  const site = "https://hub.example.test/";
  assert.equal(PRIMARY_LANG, "ko", "지금은 한국어 원문이 대표 언어여야 합니다");
  // 영어 번역이 있어도 스위치가 꺼져 있으면 x-default 는 한국어 원문
  const off = hreflangAlternates(site, "qna/a/", ["en"]);
  assert.equal(off.at(-1).hreflang, "x-default");
  assert.equal(off.at(-1).href, `${site}qna/a/`);
  const previous = setPrimaryLang("en");
  try {
    // 영어 번역이 있는 글 → 영어가 대표 주소
    assert.equal(hreflangAlternates(site, "qna/a/", ["en"]).at(-1).href, `${site}en/qna/a/`);
    // 영어 번역이 없는 글 → 계속 한국어 원문(없는 주소를 대표로 선언하지 않음)
    assert.equal(hreflangAlternates(site, "qna/b/", []).at(-1).href, `${site}qna/b/`);
  } finally {
    setPrimaryLang(previous);
  }
  assert.equal(PRIMARY_LANG, "ko");
}));

test("번역이 있으면 /en/ 페이지가 만들어지고, ko 쪽과 hreflang 으로 서로를 가리킨다", () => withSwitchOff(() => {
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
  // 정적 언어 전환 목록도 영어가 먼저, 한국어가 두 번째입니다(2026-11-15 대표 결정).
  const langNav = en.match(/<nav class="seo-langs"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
  assert.ok(langNav.includes("English") && langNav.includes("한국어"), langNav);
  assert.ok(langNav.indexOf("English") < langNav.indexOf("한국어"), `언어 순서가 영어→한국어가 아닙니다: ${langNav}`);
  // 영어 홈 · 섹션 목록
  assert.ok(out.files.get("en/index.html"));
  assert.ok(out.files.get("en/qna/index.html"));
  // ko 쪽에서도 영어 주소를 알려 줍니다
  const ko = out.files.get("qna/refund-policy/index.html");
  assert.match(ko, /hreflang="en" href="https:\/\/example\.test\/XCONDA_info\/en\/qna\/refund-policy\/"/);
  // 번역이 없는 글에는 영어 주소를 만들지 않습니다(중복 방지)
  assert.equal([...out.files.keys()].filter((f) => f.startsWith("en/") && f.includes("deepseek")).length, 0);
  // 영어 Q&A 는 2026-11-17 부터 사이트맵에 포함합니다 — 페이지도 그대로 있습니다.
  assert.match(out.files.get("sitemap.xml"), /<loc>https:\/\/example\.test\/XCONDA_info\/en\/qna\/refund-policy\/<\/loc>/);
}));

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
          "post/deepseek-official-harness": {
            title: "DeepSeek released an official harness",
            summary: "The harness is MIT licensed.",
            blocks: [{ type: "p", text: "It is MIT licensed." }, { type: "p", text: "Everything is a plugin." }],
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

test("Q&A 번역 블록은 구조 검사에서 빠진다 — 답변은 요약이고 출처 블록만 번역한다", () => {
  // 한국어 Q&A 본문이 비어 있는 항목(출처 블록만 번역)이 있어 원문과 비교할 수 없습니다.
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
            blocks: [{ type: "h2", text: "Source" }, { type: "p", text: "Source: Refund Policy (https://example.test)" }],
          },
        },
      },
    },
  });
  assert.equal(
    out.warnings.filter((w) => w.includes("블록 구조가 원문과 다릅니다")).length,
    0,
    "Q&A 는 구조 검사 대상이 아닙니다",
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

test("번역 본문이 있어도 요약(도입·답변)을 싣고, 본문 첫 글과 같은 말일 때만 생략한다", () => {
  const render = (blocks) =>
    renderSeoSite({
      rows: fixtureRows,
      pages: pagesFixture,
      template: TEMPLATE,
      siteUrl: SITE,
      ogManifest: {},
      translations: {
        en: {
          ...EN_FIXTURE.en,
          entries: {
            "qna/refund-policy": { title: "How do refunds work?", summary: "Ask within 7 days\n\nfor unused credits.", blocks },
          },
        },
      },
    }).files.get("en/qna/refund-policy/index.html");
  const articleOf = (html) => html.slice(html.indexOf("<article>"), html.indexOf("</article>"));

  // Q&A 는 요약이 곧 답변입니다 — 본문(출처 블록)만 있고 답변이 빠지던 문제(2026-11-14)
  const en = render([{ type: "h2", text: "Source" }, { type: "p", text: "Terms 4.2." }]);
  assert.match(articleOf(en), /<p>Ask within 7 days<\/p><p>for unused credits\.<\/p>/);
  assert.match(articleOf(en), /Terms 4\.2\./);
  // 메타 설명은 줄바꿈 없는 한 줄
  assert.match(en, /<meta name="description" content="Ask within 7 days for unused credits\."/);

  // 본문 첫 글이 요약과 같은 말이면 두 번 싣지 않는다
  const same = render([{ type: "p", text: "Ask within 7 days for unused credits. More detail follows." }]);
  assert.equal(articleOf(same).split("Ask within 7 days").length - 1, 1);
});

test("번역 페이지 — 날짜·글쓴이·소제목·제품 링크·문의 문구 (MHW 검토 1~3순위)", () => withSwitchOff(() => {
  const out = renderSeoSite({
    rows: fixtureRows,
    pages: pagesFixture,
    template: TEMPLATE,
    siteUrl: SITE,
    ogManifest: {},
    translations: {
      en: {
        ...EN_FIXTURE.en,
        ui: { ...EN_FIXTURE.en.ui, note: "Questions about XCONDA? Contact the developer and operator, Cubeberry Co., Ltd. (Korea): info@cubeberry.ai" },
        entries: {
          "qna/refund-policy": {
            title: "How do refunds work?",
            summary: "Ask within 7 days for unused credits.",
            blocks: [{ type: "p", text: "What you need" }, { type: "ul", items: ["Order number"] }, { type: "p", text: "**How to ask**" }, { type: "p", text: "Email us." }],
          },
        },
      },
    },
  });
  const en = out.files.get("en/qna/refund-policy/index.html");
  // 소제목 구실을 하는 문단은 h2
  assert.match(en, /<h2>What you need<\/h2>/);
  assert.match(en, /<h2>How to ask<\/h2>/);
  assert.match(en, /<p class="notion-default">Email us\.<\/p>/);
  // 글 위·아래 제품 링크 + UTM
  for (const placement of ["top", "bottom"]) {
    assert.match(en, new RegExp(`data-cta="${placement}"[^>]*><a href="https://www\\.xconda\\.ai/\\?utm_source=hub&amp;utm_medium=referral&amp;utm_campaign=hub_cta_202611&amp;utm_content=cb_${placement}"`));
  }
  // 한글 글쓴이를 그대로 내보내지 않는다 — 표기가 없으면 팀 이름
  const meta = en.match(/<p class="seo-meta">(.*?)<\/p>/)[1];
  assert.doesNotMatch(meta, /[가-힣]/);
  assert.match(meta, /XCONDA Team$/);
  // 하단 문구 — "primary source" 표현 없음, 문의처는 mailto
  assert.doesNotMatch(en, /primary source/i);
  assert.match(en, /<a href="mailto:info@cubeberry\.ai">info@cubeberry\.ai<\/a>/);
  // 한국어 글에도 제품 링크가 붙는다
  assert.match(out.files.get("qna/refund-policy/index.html"), /data-cta="top"[^>]*><a href="https:\/\/www\.xconda\.ai\/ko\?utm_source=hub/);
}));

test("번역 페이지 보조 함수 — 날짜 표기 · 소제목 승격 · 끝난 행사 판정", () => {
  assert.equal(localizedDate("en", "2026-10-07"), "October 7, 2026");
  assert.equal(localizedDate("ja", "2026-10-07"), "2026年10月7日");
  assert.equal(localizedDate("en", ""), "");
  // 문장으로 끝나는 문단·긴 문단은 그대로 둔다
  const kept = promoteSubheadings([{ type: "p", text: "This is a sentence." }, { type: "ul", items: [] }]);
  assert.equal(kept[0].type, "p");
  // h2 가 없고 h3 만 있으면 h3 → h2
  assert.deepEqual(promoteSubheadings([{ type: "h3", text: "Step 1" }, { type: "p", text: "Do it." }]).map((b) => b.type), ["h2", "p"]);
  assert.ok(isEndedTitle("Seedance 2.5 프로모션 — 최대 30% 할인 (10/7~11/6, 종료)"));
  assert.ok(isEndedTitle("제목", "패키지별 제작 가능 수량 (종료)"));
  assert.ok(!isEndedTitle("서비스 종료 안내가 아닌 일반 글"));
});

test("회사 명찰 — Cubeberry 표기, 한국 법인 = 개발·운영사, 미국 법인 = 공인 리셀러", () => {
  const [org, reseller] = siteJsonLd("https://hub.example.test/");
  assert.equal(org["@id"], "https://www.cuberry.kr/#organization"); // 회사 번호는 cuberry.kr 유지
  assert.equal(org.name, "Cubeberry");
  assert.match(org.description, /Developer and operator of XCONDA/);
  assert.equal(org.contactPoint.email, "cubeberry@cuberry.kr"); // 기본(한국어) = 한국 법인(cuberry.kr)
  assert.equal(org.email, SUPPORT_EMAIL_KR, "한국 법인의 공개 메일은 cuberry.kr 주소입니다");
  assert.equal(siteJsonLd("https://hub.example.test/", "en")[0].contactPoint.email, "product@cubeberry.ai"); // 영어 = 글로벌(cubeberry.ai, 2026-11-27)
  assert.ok(org.sameAs.includes("https://www.xconda.ai"));
  assert.ok(org.sameAs.some((u) => u.includes("youtube.com")));
  assert.match(reseller.description, /Authorized reseller/);
  assert.equal(reseller.email, "info@cubeberry.ai");
  assert.equal(reseller.url, undefined, "cubeberry.ai 는 개선 전까지 공식 주소로 연결하지 않습니다");
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
    // 원문 삭제·비공개는 정상적인 편집 작업이며 동기화를 막지 않습니다.
    // 누락·고아 번역은 i18n:progress 에서 보고합니다.
    if (dead.length) console.warn(`${lang}: 원문 없는 번역 ${dead.length}건`);
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
    if (missingKeys.length) console.warn(`${lang}: 번역 없는 Q&A ${missingKeys.length}건`);
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

test("번역 페이지는 흰색 editorial 스타일을 독립적으로 사용한다", () => {
  const out = renderSeoSite({ rows: fixtureRows, pages: pagesFixture, template: TEMPLATE, siteUrl: SITE, ogManifest: {}, translations: EN_FIXTURE });
  for (const file of ["en/qna/index.html", "en/qna/refund-policy/index.html"]) {
    const html = out.files.get(file);
    assert.ok(html, file);
    assert.match(html, /html\{background:#fff;color:#000/);
    assert.doesNotMatch(html, /background:#0b0b0b|color:#ffd60a/);
    assert.doesNotMatch(html, /assets\/app\.(?:css|js)/);
    assert.match(html, /class="seo-langs"/);
  }
  // 홈만 앱 화면으로 띄웁니다(2026-11-17 하이브리드) — 정적 목록은 그대로 남아 무JS 에서도 읽힙니다.
  const home = out.files.get("en/index.html");
  assert.match(home, /html\{background:#fff;color:#000/, "홈에도 정적 스타일은 남습니다(무JS 대비)");
  assert.match(home, /assets\/app\.(?:css|js)/, "홈은 앱 화면이어야 합니다");
  assert.match(home, /class="seo-langs"/);
});


test("언어 홈·목록 직접 방문은 같은 출처의 인터랙티브 허브로 연결된다 (원본 주소일 때)", () => withSwitchOff(() => {
  const translations = Object.fromEntries(["en", "ja", "zh"].map(code => [code, { ...EN_FIXTURE.en, lang: code }]));
  const out = renderSeoSite({ rows: fixtureRows, pages: pagesFixture, template: TEMPLATE, siteUrl: SITE, ogManifest: {}, translations });
  for (const code of ["en", "ja", "zh"]) {
    for (const [path, hash] of [["", ""], ["qna/", "#faq"]]) {
      const html = out.files.get(`${code}/${path}index.html`);
      assert.ok(html);
      const script = html.match(/<script data-hub-entry>([\s\S]*?)<\/script>/)?.[1];
      assert.ok(script, `${code}/${path}: browser must not stay on static text index`);
      let destination;
      const location = { href: `https://preview.test/XCONDA_info/${code}/${path}?campaign=test`, replace: value => { destination = new URL(value); } };
      vm.runInNewContext(script, { location, URL });
      assert.equal(destination.origin, "https://preview.test");
      assert.equal(destination.pathname, "/XCONDA_info/");
      assert.equal(destination.searchParams.get("lang"), code === "zh" ? "zh-CN" : code);
      assert.equal(destination.searchParams.get("campaign"), "test");
      assert.equal(destination.hash, hash);
      assert.match(html, /hreflang="ko"/);
      // No-JS visitors and crawlers still receive translated document links.
      assert.match(html, /How do refunds work/);
    }
    assert.doesNotMatch(out.files.get(`${code}/qna/refund-policy/index.html`), /data-hub-entry/);
  }
}));


test("Q&A 편집용 제목과 앞 구분선을 숨기고 공개 출처는 유지하며 내부 섹션은 제거한다", () => {
  const blocks = [
    { type: "p", text: "---" }, { type: "h2", text: "게시용 출처" },
    { type: "p", text: "공개 출처" }, { type: "h2", text: "내부 근거" },
    { type: "p", text: "비공개" }, { type: "h2", text: "출처" }, { type: "p", text: "두 번째 출처" },
  ];
  assert.deepEqual(cleanFaqBlocks(blocks).map((b) => b.text), ["공개 출처", "두 번째 출처"]);
});


test("SEO 설명과 요약이 없으면 첫 본문 문단을 메타 설명으로 쓴다", () => {
  const id = "11111111-2222-3333-4444-555555555555";
  const rows = [{ id, Title: "본문 테스트", __type: "blog", Published: true, Slug: "paragraph-test" }];
  const pages = { [id]: { [id]: { value: { id, type: "page", content: ["p"] } }, p: { value: { id: "p", type: "text", properties: { title: [["첫 본문 문단입니다."]] } } } } };
  const out = renderSeoSite({ rows, pages, template: TEMPLATE, siteUrl: SITE, translations: {} });
  assert.match(out.files.get("post/paragraph-test/index.html"), /<meta name="description" content="첫 본문 문단입니다\."/);
  assert.ok(out.warnings.some(w => w.includes("SEO 설명 대체: 본문 첫 문단")));
});


/* ------------------- 8) 낡은 번역 페이지 정리 (원문이 사라진 글) ------------------- */

/**
 * 노션에서 글이 내려가면 한국어 폴더는 통째로 다시 만들어지지만,
 * 언어 폴더(`en/ ja/ zh/`)는 번역 항목이 남아 있으면 예전 파일이 그대로 살아남습니다.
 * 그런 파일은 존재하지 않는 한국어 주소를 hreflang 으로 가리키고 사이트맵에도 없어서
 * Search Console 에 "색인 생성" 오류로 잡힙니다. 빌드가 이런 파일을 걷어내는지 봅니다.
 */
function tempSite() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "xconda-seo-cleanup-"));
}

test("빌드 결과에 없는 언어 폴더 페이지만 낡은 페이지로 잡는다", () => {
  const root = tempSite();
  const write = (rel) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), "x", "utf8");
  };
  write("post/live/index.html"); // 한국어: 통째로 다시 만들므로 대상 아님
  write("en/index.html");
  write("en/post/live/index.html");
  write("en/post/gone/index.html"); // ← 원문이 사라진 번역 페이지
  write("ja/post/gone/index.html");
  write("zh/post/gone/index.html");
  write("en/assets/keep.css"); // index.html 이 아니면 건드리지 않음

  const files = new Map([
    ["post/live/index.html", "ko"],
    ["en/index.html", "home"],
    ["en/post/live/index.html", "en"],
  ]);
  assert.deepEqual(staleLocalizedPages(root, files), [
    "en/post/gone/index.html",
    "ja/post/gone/index.html",
    "zh/post/gone/index.html",
  ]);
  fs.rmSync(root, { recursive: true, force: true });
});

test("낡은 번역 페이지는 지우지 않고 같은 언어 목록으로 보내는 안내 페이지로 바꾼다", () => withSwitchOff(() => {
  const root = tempSite();
  const write = (rel, body = "x") => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), body, "utf8");
  };
  write("post/gone/index.html", "옛 한국어 글"); // 한국어는 통째로 지워져야 함
  write("en/post/gone/index.html", "옛 번역 글");

  const files = new Map([
    ["post/live/index.html", "<html>ko live</html>"],
    ["en/index.html", "<html>en home</html>"],
    ["en/post/index.html", "<html>en list</html>"],
    ["en/post/live/index.html", "<html>en live</html>"],
  ]);
  const cleaned = writeSite({ files, siteUrl: "https://example.test/" }, root);

  assert.deepEqual(cleaned, ["en/post/gone/index.html"]);
  // 한국어 폴더는 통째로 새로 만들어짐
  assert.equal(fs.existsSync(path.join(root, "post/gone")), false);
  assert.equal(fs.readFileSync(path.join(root, "post/live/index.html"), "utf8"), "<html>ko live</html>");
  // 번역 페이지는 404 대신 안내(리디렉션) 페이지 → 색인 제외 + 같은 언어 목록으로 이동
  const stub = fs.readFileSync(path.join(root, "en/post/gone/index.html"), "utf8");
  assert.match(stub, /http-equiv="refresh" content="0; url=https:\/\/example\.test\/en\/post\/"/);
  assert.match(stub, /rel="canonical" href="https:\/\/example\.test\/en\/post\/"/);
  assert.match(stub, /name="robots" content="noindex"/);
  assert.match(stub, /<html lang="en">/);
  fs.rmSync(root, { recursive: true, force: true });
}));

/* ------------------------------------------------------------------------------------------
 * 프록시 아래 언어 폴더의 자산 사본 (2026-11-17)
 *   /hub/* → hub.xconda.ai/en/* 프록시에서 이미지가 404 → catch-all 앱 셸(HTML)로 떨어져
 *   로고가 깨지던 문제. 스위치가 켜진 언어 폴더에 가벼운 자산만 복사해 둡니다.
 * ------------------------------------------------------------------------------------------ */
/* ------------------------------------------------------------------------------------------
 * 사이트 자산의 절대 주소 해석 (2026-11-17)
 *   프록시는 /hub/* → hub.xconda.ai/en/* 로 보내지만 /hub/assets/* 는 넘겨주지 않습니다.
 *   그래서 앱이 사이트 상대 주소로 둔 커버·도구 이미지가 깨졌습니다(이미지 자리에 앱 셸 HTML).
 * ------------------------------------------------------------------------------------------ */
test("프록시(/hub/) 아래에서만 같은 저장소 자산이 원본 도메인 절대 주소가 된다", () => {
  // 프록시 판정 — /hub/ 아래(영어 기본)만 해당. 원본 도메인·Pages 프로젝트 경로·개발 서버는 제외.
  for (const p of ["/hub/", "/hub", "/hub/qna/", "/hub/qna/commercial-use/", "/hub/en/qna/"]) {
    assert.equal(isProxiedLocalePath(p), true, p);
  }
  for (const p of ["/", "/dev.html", "/XCONDA_info/", "/XCONDA_info/qna/x/", "/en/", "/qna/x/", "/hubx/", "/hub/ja/x/"]) {
    assert.equal(isProxiedLocalePath(p), false, p);
  }

  const B = "https://hub.xconda.ai/";
  const onProxy = "/hub/qna/commercial-use/";
  // 프록시 아래: 커버·도구 이미지가 원본 도메인으로 (이미지 자리에 앱 셸 HTML 이 들어오던 문제)
  assert.equal(hubAssetUrl("assets/img/covers/a.png", B, onProxy), "https://hub.xconda.ai/assets/img/covers/a.png");
  assert.equal(hubAssetUrl("./assets/img/tools/t.jpg", B, onProxy), "https://hub.xconda.ai/assets/img/tools/t.jpg");
  assert.equal(hubAssetUrl("/assets/img/og/x.png", B, onProxy), "https://hub.xconda.ai/assets/img/og/x.png");
  // 프록시가 아니면 상대 주소 그대로 — 원본·Pages·개발 서버는 이게 정상이고, 외부 요청을 만들지 않습니다
  for (const p of ["/", "/XCONDA_info/", "/dev.html"]) {
    assert.equal(hubAssetUrl("assets/img/covers/a.png", B, p), "assets/img/covers/a.png", p);
  }
  // 이미 절대 주소인 것은 손대지 않는다 (노션·미디어 서버·데이터 URI)
  for (const url of [
    "https://media.toolgov.com/media/land/flow-01.gif",
    "https://www.notion.so/image/abc",
    "data:image/png;base64,AAAA",
    "blob:https://www.xconda.ai/1234",
  ]) {
    assert.equal(hubAssetUrl(url, B, onProxy), url);
  }
  // assets/ 가 아닌 사이트 경로도 그대로 (매뉴얼은 HUB_MANUALS_BASE_URL 규칙을 따로 씁니다)
  assert.equal(hubAssetUrl("manuals/en/index.html", B, onProxy), "manuals/en/index.html");
  assert.equal(hubAssetUrl("", B, onProxy), "");
  assert.equal(hubAssetUrl(undefined, B, onProxy), undefined);
  // 기준 주소를 바꾸면 따라간다
  assert.equal(hubAssetUrl("assets/a.png", "https://example.test/", onProxy), "https://example.test/assets/a.png");
  assert.equal(hubAssetUrl("assets/a.png", "https://example.test", onProxy), "https://example.test/assets/a.png");
});

test("공개 주소 스위치가 켜진 언어 폴더에만 가벼운 자산 사본이 생긴다", () => {
  const root = tempSite();
  const put = (rel) => {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), "x", "utf8");
  };
  for (const group of LOCALIZED_ASSET_GROUPS) {
    put(`${group}/sample.txt`);
  }
  put("assets/img/covers/big.jpg"); // 무거운 자산은 복사 대상이 아님

  const copied = mirrorLocalizedAssets({}, root); // 커밋된 스위치 값(en 켜짐)을 따름
  assert.deepEqual(copied, ["en/assets/img/logo", "en/assets/img/tools"]);
  for (const group of LOCALIZED_ASSET_GROUPS) {
    assert.ok(fs.existsSync(path.join(root, "en", group, "sample.txt")), `en/${group} 사본이 없습니다`);
  }
  // og·covers 는 복사하지 않습니다 (프록시가 원본을 넘겨 주는 몫)
  assert.equal(fs.existsSync(path.join(root, "en/assets/img/covers")), false);
  // 일본어·중국어는 스위치가 꺼져 있어 사본을 만들지 않습니다
  assert.equal(fs.existsSync(path.join(root, "ja/assets")), false);
  assert.equal(fs.existsSync(path.join(root, "zh/assets")), false);

  // 자산 폴더는 "낡은 번역 페이지" 검사에서 빠져야 합니다 (index.html 이 없어도 리디렉션 금지)
  assert.deepEqual(staleLocalizedPages(root, new Map([["en/index.html", "x"]])), []);
  fs.rmSync(root, { recursive: true, force: true });
});

test("공개 주소 스위치가 켜진 언어 폴더에 스냅샷 사본도 생긴다", () => {
  const root = tempSite();
  // 원본 스냅샷이 없으면 사본을 만들지 않습니다 (그리고 낡은 사본은 지웁니다).
  fs.mkdirSync(path.join(root, "en"), { recursive: true });
  fs.writeFileSync(path.join(root, "en", LOCALIZED_SNAPSHOT_FILE), '{"stale":true}', "utf8");
  assert.deepEqual(mirrorLocalizedAssets({}, root), []);
  assert.equal(fs.existsSync(path.join(root, "en", LOCALIZED_SNAPSHOT_FILE)), false, "원본이 없으면 낡은 사본은 지워야 합니다");

  // 원본이 있으면 켜진 언어 폴더로 그대로 복사됩니다 — 프록시가 /hub/notion-content.json 을 여기서 찾습니다.
  const snapshot = JSON.stringify({ generatedAt: "2026-11-17T00:00:00.000Z", source: { pageId: "abc" }, rows: [], pages: {} });
  fs.writeFileSync(path.join(root, LOCALIZED_SNAPSHOT_FILE), snapshot, "utf8");
  const copied = mirrorLocalizedAssets({}, root);
  assert.ok(copied.includes(`en/${LOCALIZED_SNAPSHOT_FILE}`), `스냅샷 사본이 복사 목록에 없습니다: ${copied.join(", ")}`);
  assert.equal(fs.readFileSync(path.join(root, "en", LOCALIZED_SNAPSHOT_FILE), "utf8"), snapshot);
  // 스위치가 꺼진 언어 폴더로는 복사하지 않습니다.
  assert.equal(fs.existsSync(path.join(root, "ja", LOCALIZED_SNAPSHOT_FILE)), false);
  assert.equal(fs.existsSync(path.join(root, "zh", LOCALIZED_SNAPSHOT_FILE)), false);
  fs.rmSync(root, { recursive: true, force: true });
});

test("언어 폴더 템플릿은 앱 번들을 원본 도메인 절대 주소로 부른다", () => {
  // 프록시는 /hub/assets/* 를 넘겨주지 않습니다(404 → 제품 사이트 catch-all 이 200 HTML 을 반환).
  // 앱 번들까지 그 404 를 타면 스크립트가 실행되지 않아 화면이 아예 비므로, 절대 주소여야 합니다.
  const relative = '<script type="module" crossorigin src="/assets/app.js"></script>\n<link rel="stylesheet" href="/assets/app.css" />';
  const out = absoluteAssetRefs(relative, "https://hub.xconda.ai/");
  assert.match(out, /src="https:\/\/hub\.xconda\.ai\/assets\/app\.js"/);
  assert.match(out, /href="https:\/\/hub\.xconda\.ai\/assets\/app\.css"/);
  // 이미 절대 주소면 건드리지 않습니다 (멱등 — 여러 번 돌려도 같아야 함).
  assert.equal(absoluteAssetRefs(out, "https://hub.xconda.ai/"), out);
  // 다른 호스트의 상대 경로도 같은 사이트 기준으로 풉니다.
  assert.match(
    absoluteAssetRefs('<link rel="preload" href="/assets/app.js" as="script" />', "https://example.test/base/"),
    /href="https:\/\/example\.test\/base\/assets\/app\.js"/
  );
});


test("섹션 목록이 없으면 같은 언어 홈으로, 그것도 없으면 한국어 홈으로 보낸다", () => withSwitchOff(() => {
  const root = tempSite();
  const enOnlyHome = new Map([["en/index.html", "home"]]);
  fs.mkdirSync(path.join(root, "en/post/gone"), { recursive: true });
  fs.writeFileSync(path.join(root, "en/post/gone/index.html"), "옛 번역 글", "utf8");
  writeSite({ files: enOnlyHome, siteUrl: "https://example.test/" }, root);
  assert.match(
    fs.readFileSync(path.join(root, "en/post/gone/index.html"), "utf8"),
    /url=https:\/\/example\.test\/en\//,
  );

  const empty = new Map();
  fs.mkdirSync(path.join(root, "ja/post/gone"), { recursive: true });
  fs.writeFileSync(path.join(root, "ja/post/gone/index.html"), "옛 번역 글", "utf8");
  writeSite({ files: empty, siteUrl: "https://example.test/" }, root);
  assert.match(
    fs.readFileSync(path.join(root, "ja/post/gone/index.html"), "utf8"),
    /url=https:\/\/example\.test\/"/,
  );
  fs.rmSync(root, { recursive: true, force: true });
}));


/* ------------- 9) 크롤 예산 — 번역 Q&A 사이트맵 제외 · 한국어 글 → 번역본 링크 ------------- */

/**
 * Search Console 2026-11-10: "발견됨 - 현재 색인이 생성되지 않음" 324건.
 * 사이트맵 407개 중 288개가 번역 페이지였고 그중 222개가 얇은 Q&A 번역이었습니다.
 * → 번역 Q&A 는 **사이트맵에서만** 빼고(페이지는 유지), 한국어 글에서는 번역본으로
 *    실제 <a> 링크를 걸어 발견 경로를 남깁니다.
 */
/**
 * 2026-11-17 정책 변경 — 영어 Q&A 를 사이트맵에 포함합니다.
 *   영어 허브가 www.xconda.ai/hub/ 로 옮겨져 영어가 제품 사이트의 주 언어가 됐고,
 *   영어 Q&A 73개는 평균 151단어(최소 106단어)로 얇지 않으며 FAQPage·hreflang·내부 링크가
 *   모두 갖춰져 있습니다. 검수·품질 확인이 안 된 일본어·중국어 Q&A 는 계속 뺍니다.
 */
test("사이트맵에서 빼는 번역 주소는 일본어·중국어 Q&A 뿐이다 (영어는 포함)", () => {
  const s = "https://hub.example.test/";
  // 영어 Q&A — 2026-11-17 부터 포함
  assert.equal(skipInSitemap("https://hub.example.test/en/qna/", s), false);
  assert.equal(skipInSitemap("https://hub.example.test/en/qna/refund/", s), false);
  // 일본어·중국어 Q&A — 계속 제외
  assert.equal(skipInSitemap("https://hub.example.test/ja/qna/refund/", s), true);
  assert.equal(skipInSitemap("https://hub.example.test/ja/qna/", s), true);
  assert.equal(skipInSitemap("https://hub.example.test/zh/qna/", s), true);
  assert.equal(skipInSitemap("https://hub.example.test/zh/qna/refund/", s), true);
  // 번역 글·공지·가이드·홈과 한국어 주소는 그대로 둡니다.
  for (const loc of ["en/post/a/", "en/notice/a/", "en/guide/a/", "en/"]) {
    assert.equal(skipInSitemap(`https://hub.example.test/${loc}`, s), false, loc);
  }
  assert.equal(skipInSitemap("https://hub.example.test/qna/refund/", s), false);
  assert.equal(skipInSitemap("https://hub.example.test/qna/", s), false);
  // 호출 쪽이 언어 코드를 넘겨도 같은 판정입니다(주소에서 읽은 값과 일치).
  assert.equal(skipInSitemap("https://hub.example.test/en/qna/refund/", s, "en"), false);
  assert.equal(skipInSitemap("https://hub.example.test/ja/qna/refund/", s, "ja"), true);
  // 정책 값 자체 — 영어는 빈 배열(아무 섹션도 빼지 않음)
  assert.deepEqual(SITEMAP_SKIP_LOCALIZED_SECTIONS.en, []);
  assert.deepEqual(SITEMAP_SKIP_LOCALIZED_SECTIONS.ja, ["qna"]);
  assert.deepEqual(SITEMAP_SKIP_LOCALIZED_SECTIONS.zh, ["qna"]);
});

const BILINGUAL_FIXTURE = {
  en: {
    ...EN_FIXTURE.en,
    sections: { qna: { title: "XCONDA Q&A (English)" }, post: { title: "Blog (English)" } },
    entries: {
      "qna/refund-policy": { title: "How do refunds work?", summary: "Ask within 7 days for unused credits." },
      "post/deepseek-official-harness": { title: "DeepSeek official harness", summary: "A plugin-first harness." },
    },
  },
};

test("영어 Q&A 는 사이트맵에 포함하고, 페이지도 그대로 만든다 (2026-11-17 정책 변경)", () => withSwitchOff(() => {
  const out = renderSeoSite({
    rows: fixtureRows,
    pages: pagesFixture,
    template: TEMPLATE,
    siteUrl: SITE,
    ogManifest: {},
    translations: BILINGUAL_FIXTURE,
  });
  const sitemap = out.files.get("sitemap.xml");
  assert.ok(out.files.get("en/qna/refund-policy/index.html"), "번역 Q&A 페이지는 그대로 있어야 합니다");
  // 영어 Q&A — 포함
  assert.match(sitemap, /<loc>https:\/\/example\.test\/XCONDA_info\/en\/qna\/refund-policy\/<\/loc>/);
  // 영어 목록 주소도 포함
  assert.match(sitemap, /<loc>https:\/\/example\.test\/XCONDA_info\/en\/qna\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/example\.test\/XCONDA_info\/en\/post\/deepseek-official-harness\/<\/loc>/);
  // 한국어 Q&A 주소도 그대로(원문은 색인 대상).
  assert.match(sitemap, /<loc>https:\/\/example\.test\/XCONDA_info\/qna\/refund-policy\/<\/loc>/);
}));

test("한국어 글에는 번역본으로 가는 실제 링크가 붙고, Q&A 에는 붙지 않는다", () => withSwitchOff(() => {
  const out = renderSeoSite({
    rows: fixtureRows,
    pages: pagesFixture,
    template: TEMPLATE,
    siteUrl: SITE,
    ogManifest: {},
    translations: BILINGUAL_FIXTURE,
  });
  const koPost = out.files.get("post/deepseek-official-harness/index.html");
  assert.match(
    koPost,
    /<nav class="seo-langs" aria-label="다른 언어로 읽기">[\s\S]*?<a href="https:\/\/example\.test\/XCONDA_info\/en\/post\/deepseek-official-harness\/" hreflang="en" lang="en">English<\/a>/,
  );
  // 번역이 없는 글에는 언어 링크가 없습니다.
  assert.doesNotMatch(koPost, /hreflang="ja"/);
  // Q&A 는 번역이 있어도 링크를 달지 않습니다(사이트맵 제외 정책과 같은 이유).
  assert.doesNotMatch(out.files.get("qna/refund-policy/index.html"), /class="seo-langs"/);
}));

/* ------------------------------------------------------------------------------------------
 * 영어 허브를 제품 사이트 하위 폴더로 — 공개 주소 스위치 (2026-11-14 · MHW 검토 B안)
 * ------------------------------------------------------------------------------------------ */
test("공개 주소 스위치 — 켜져 있다: 영어 주소는 www.xconda.ai/hub/ (2026-11-17 프록시 확인 후)", () => {
  // 켠 근거: www.xconda.ai/hub/ 가 200 으로 열리고, /hub → /hub/ 301 · 글 주소도 301 ·
  // 응답에 x-robots-tag(noindex) 가 없음을 확인했습니다. 재확인: npm run proxy:check
  assert.equal(LOCALE_BASE_URLS.en, "https://www.xconda.ai/hub/");
  assert.equal(localeBaseUrl("en"), "https://www.xconda.ai/hub/");
  assert.equal(localizedUrl(SITE, "en", "qna/a/"), "https://www.xconda.ai/hub/qna/a/");
});

test("공개 주소 스위치 — 끄면 영어 주소는 다시 허브의 /en/ 이다 (되돌리기 경로)", () => withSwitchOff(() => {
  assert.equal(localeBaseUrl("en"), "");
  assert.equal(localizedUrl("https://hub.example.test/", "en", "qna/a/"), "https://hub.example.test/en/qna/a/");
  const out = renderSeoSite({ rows: fixtureRows, pages: pagesFixture, template: TEMPLATE, siteUrl: SITE, ogManifest: {}, translations: EN_FIXTURE });
  assert.ok(!out.files.has("en/sitemap.xml"));
  assert.doesNotMatch(out.files.get("en/qna/refund-policy/index.html"), /data-hub-moved/);
  assert.match(out.files.get("en/index.html"), /data-hub-entry/);
}));

test("pathLanguage — 번역 홈 주소에서만 앱이 그 언어로 시작한다", () => {
  assert.equal(pathLanguage("/en/"), "en");
  assert.equal(pathLanguage("/en"), "en");
  assert.equal(pathLanguage("/hub/en/"), "en", "Worker 프록시 접두사(/hub)를 건너뜁니다");
  assert.equal(pathLanguage("/XCONDA_info/en/"), "en", "GitHub Pages 미리보기");
  assert.equal(pathLanguage("/ja/"), "ja");
  assert.equal(pathLanguage("/zh/"), "zh-CN", "앱의 목표 언어 표기로 맞춥니다");
  // 번역 홈이 아닌 주소는 언어를 주장하지 않습니다(KO 가 기본, 저장값·브라우저 언어를 그대로 씁니다).
  for (const p of ["/", "/hub/", "/hub/qna/commercial-use/", "/XCONDA_info/", "/dev.html", "/hub/notice/en/"]) {
    assert.equal(pathLanguage(p), null, p);
  }
});

test("하이브리드 — www 프록시 아래에서는 홈만 앱 화면이고 글·목록은 정적 문서로 남는다", () => {
  const out = renderSeoSite({ rows: fixtureRows, pages: pagesFixture, template: TEMPLATE, siteUrl: SITE, ogManifest: {}, translations: EN_FIXTURE });

  // ① 홈 = 앱 셸. 앱 스크립트·스타일이 붙고, 자동 리다이렉트(data-hub-entry)는 없습니다.
  const home = out.files.get("en/index.html");
  assert.ok(home, "en/index.html 이 없습니다");
  assert.match(home, /assets\/app\.js/, "홈은 앱 스크립트를 불러와야 합니다");
  assert.match(home, /assets\/app\.css/, "홈은 앱 스타일을 써야 합니다");
  assert.doesNotMatch(home, /data-hub-entry/, "홈은 스스로 앱이므로 리다이렉트가 없어야 합니다");
  // 무JS·크롤러용 정적 목록은 그대로 남습니다.
  assert.match(home, /How do refunds work/);
  assert.match(home, /<html lang="en"/);

  // ② 글·목록 = 정적 문서. 앱 번들을 싣지 않습니다.
  for (const file of ["en/qna/index.html", "en/qna/refund-policy/index.html", "en/post/index.html"]) {
    const html = out.files.get(file);
    if (!html) continue;
    assert.ok(!/assets\/app\.js/.test(html), `${file}: 글 페이지에 앱 번들이 들어가면 안 됩니다`);
    assert.match(html, /class="seo-langs"/, `${file}: 언어 전환 링크는 남아야 합니다`);
  }
});

test("공개 주소 스위치 — 켜면 영어 페이지가 www.xconda.ai/hub/ 아래로 선언된다", () => {
  const BASE = "https://www.xconda.ai/hub/";
  const out = renderSeoSite({
    rows: fixtureRows, pages: pagesFixture, template: TEMPLATE, siteUrl: SITE, ogManifest: {}, translations: EN_FIXTURE,
    localeBases: { en: BASE },
  });
  // 파일 위치는 그대로(en/…) — 프록시가 /hub/* → /en/* 로 연결합니다
  const en = out.files.get("en/qna/refund-policy/index.html");
  const ko = out.files.get("qna/refund-policy/index.html");
  const newUrl = `${BASE}qna/refund-policy/`;
  assert.match(en, new RegExp(`<link rel="canonical" href="${newUrl}" />`));
  assert.match(en, new RegExp(`<meta property="og:url" content="${newUrl}" />`));
  // hreflang 은 서로를 주소 전체로 가리킨다 (영어 = 새 주소, 한국어 = 허브)
  for (const html of [en, ko]) {
    assert.match(html, new RegExp(`hreflang="en" href="${newUrl}"`));
    assert.match(html, new RegExp(`hreflang="ko" href="${SITE}qna/refund-policy/"`));
    assert.match(html, new RegExp(`hreflang="x-default" href="${SITE}qna/refund-policy/"`));
  }
  assert.doesNotMatch(en, new RegExp(`${SITE}en/`), "영어 페이지에 예전 /en/ 주소가 남아 있습니다");
  // 예전 주소로 직접 온 방문자만 새 주소로 (쿼리·해시 유지)
  assert.match(en, /<script data-hub-moved>.*location\.hostname===c\.host.*location\.search\+location\.hash/);
  assert.ok(en.includes(`"to":"${newUrl}"`));
  // 영어 홈·목록은 허브 앱으로 넘기지 않는다 (프록시 아래에서 /?lang=en 은 제품 사이트 첫 화면)
  for (const file of ["en/index.html", "en/qna/index.html"]) {
    assert.doesNotMatch(out.files.get(file), /data-hub-entry/);
    assert.match(out.files.get(file), /data-hub-moved/);
  }
  // 제품 사이트 안의 페이지가 되므로 제품 링크에 UTM 을 붙이지 않는다 (한국어 허브는 그대로)
  assert.doesNotMatch(en, /www\.xconda\.ai\/[^"]*utm_/);
  assert.match(ko, /www\.xconda\.ai\/ko\?utm_source=hub/);
  // 프록시 아래에서 깨지는 상대 자산 주소가 없어야 한다 (이동 링크 ../ 와 같은 폴더 ./ 만 허용)
  const rel = [...en.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^(https?:|data:|mailto:|#|\.\.?\/)/.test(u));
  assert.deepEqual(rel, []);
  // localeBases 는 그 빌드에만 적용되고, 끝나면 커밋된 값(켜짐)으로 되돌아온다
  assert.equal(localizedUrl(SITE, "en", ""), "https://www.xconda.ai/hub/");
});

test("공개 주소 스위치 — 영어 주소는 허브 사이트맵에서 빠지고 en/sitemap.xml 로 간다", () => {
  const rows = fixtureRows;
  const key = "post/opus-5-5-trending";
  const translations = { en: { ...EN_FIXTURE.en, entries: { ...EN_FIXTURE.en.entries, [key]: { title: "First post", summary: "English summary." } } } };
  const out = renderSeoSite({
    rows, pages: pagesFixture, template: TEMPLATE, siteUrl: SITE, ogManifest: {}, translations,
    localeBases: { en: "https://www.xconda.ai/hub" }, // 끝 슬래시 없어도 됨
  });
  const hubMap = out.files.get("sitemap.xml");
  assert.doesNotMatch(hubMap, /www\.xconda\.ai/);
  assert.doesNotMatch(hubMap, new RegExp(`${SITE}en/`));
  const enMap = out.files.get("en/sitemap.xml");
  assert.ok(enMap, "en/sitemap.xml 이 만들어져야 합니다");
  assert.match(enMap, /<loc>https:\/\/www\.xconda\.ai\/hub\/<\/loc>/);
  const locs = [...enMap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.every((l) => l.startsWith("https://www.xconda.ai/hub/")));
  // 영어 Q&A 는 2026-11-17 부터 포함한다 (일본어·중국어 Q&A 는 계속 제외 — 위 정책 테스트).
  assert.ok(locs.some((l) => l.includes("/qna/")), "영어 Q&A 주소가 en/sitemap.xml 에 없습니다");
});

/* ------------------------------------------------------------------------------------------
 * 목록·홈의 제품 링크 + 노션 원본 주소 경고 (2026-11-14 · MHW 검토 2순위 잔여 구멍)
 *   글 페이지에만 제품 링크가 있고 홈·목록에는 없어서, 검색으로 목록에 들어온 방문자가
 *   제품 사이트로 갈 길이 없었습니다. 이미지 프록시를 경고로 오인하던 것도 함께 고정합니다.
 * ------------------------------------------------------------------------------------------ */
test("홈·목록 페이지에도 제품 사이트 링크가 붙는다 (글 페이지와 같은 UTM)", () => {
  const out = renderSeoSite({ rows: fixtureRows, pages: pagesFixture, template: TEMPLATE, siteUrl: SITE, ogManifest: {}, translations: EN_FIXTURE });
  for (const file of ["index.html", "post/index.html", "qna/index.html"]) {
    const html = out.files.get(file);
    assert.ok(html, `${file} 이 생성되지 않았습니다`);
    assert.match(html, /data-cta="bottom" data-cta-scope="listing"/, `${file} 에 목록용 제품 링크가 없습니다`);
    assert.match(
      html,
      /<a href="https:\/\/www\.xconda\.ai\/ko\?utm_source=hub&amp;utm_medium=referral&amp;utm_campaign=hub_cta_202611&amp;utm_content=cb_bottom" data-cta-kind="start">/,
      `${file} 의 시작 링크가 규칙(§6-1)과 다릅니다`,
    );
  }
  // (fixture 의 공지·가이드는 주소 조건을 통과하지 못해 목록이 만들어지지 않습니다.)
  // 언어별 홈·목록에도 그 언어 문구로 붙는다
  const enList = out.files.get("en/index.html");
  assert.match(enList, /data-cta-scope="listing"/);
  assert.match(enList, />Start free</);
  // 글 페이지는 기존 상단·하단 링크 그대로 (목록용이 섞이면 두 번 붙습니다)
  const enArticle = out.files.get("en/qna/refund-policy/index.html") ?? "";
  assert.doesNotMatch(enArticle, /data-cta-scope="listing"/);
});

test("본문 이미지의 노션 프록시 주소는 경고하지 않고, 다운로드 링크·원본 주소만 경고한다", () => {
  const id = "11111111-2222-3333-4444-666666666666";
  const rows = [{ id, Title: "이미지 경고 테스트", __type: "blog", Published: true, Slug: "image-warning-test", Summary: "요약" }];
  const page = (children) => ({
    [id]: { [id]: { value: { id, type: "page", content: children.map((c) => c.id) } }, ...Object.fromEntries(children.map((c) => [c.id, { value: c }])) },
  });
  // ① 이미지 프록시 주소만 있으면 경고 없음
  const imageOnly = renderSeoSite({
    rows, template: TEMPLATE, siteUrl: SITE, translations: {}, ogManifest: {},
    pages: page([{ id: "c1", type: "image", properties: { source: [["attachment:abc:image.png"]], caption: [] } }]),
  });
  const imageHtml = imageOnly.files.get("post/image-warning-test/index.html");
  assert.match(imageHtml, /<img src="https:\/\/www\.notion\.so\/image\//, "이미지가 노션 프록시 주소로 바뀌지 않았습니다");
  assert.ok(
    !imageOnly.warnings.some((w) => w.includes("노션 원본 파일 주소")),
    `이미지 프록시를 경고하면 안 됩니다: ${imageOnly.warnings.join(" / ")}`,
  );
  // ② 다운로드(PDF) 링크가 노션 주소면 경고
  const withPdf = renderSeoSite({
    rows, template: TEMPLATE, siteUrl: SITE, translations: {}, ogManifest: {},
    pages: page([{ id: "c2", type: "pdf", properties: { source: [["https://prod-files-secure.s3.us-west-2.amazonaws.com/x.pdf"]] } }]),
  });
  assert.ok(withPdf.warnings.some((w) => w.includes("노션 원본 파일 주소")), "노션 파일 링크는 계속 경고해야 합니다");
});

/* ------------------------------------------------------------------------------------------
 * 글쓴이 영문 표기 · 일·중 하단 문구 (2026-11-14 · 대표 확정 표기)
 *   - 영문 표기는 content/i18n/en.json 의 `authors` 표가 유일한 출처입니다.
 *     한글 이름이 영어 페이지에 새어 나가지 않는지, 확정 표기가 그대로 나오는지 봅니다.
 *   - 일·중 하단 문구는 영어 교체 문구를 그 언어로 옮긴 것 — "한국어 허브가 원문" 표현이
 *     남아 있으면 안 됩니다(MHW 지적의 원인).
 * ------------------------------------------------------------------------------------------ */
test("글쓴이 영문 표기 — 확정 표기가 그대로 나오고, 표에 없으면 한글 대신 팀 이름", () => {
  const dict = JSON.parse(fs.readFileSync(path.join(here, "..", "content/i18n/en.json"), "utf8"));
  // 대표 확정(2026-11-14)
  assert.deepEqual(dict.authors, {
    "이진서 대표": "Jinseo Lee, CEO",
    "박찬혁 감독": "Park Chan-hyeok",
    "나서영 기획": "Na Seo-yeong",
    "김재환 PD": "Kim Jae-hwan",
    "차하나 PD": "Cha Hana",
    "황보민혁 PD": "Hwangbo Min-hyeok",
  });
  // 차하나 PD 만 하이픈 없이 `Cha Hana` — 대표 확인(11/14). Ha-na 로 "고치지" 않도록 고정합니다.
  assert.equal(dict.authors["차하나 PD"], "Cha Hana");
  // 확정 표기는 로마자만 — 한글이 섞이면 영어 페이지에 그대로 나갑니다
  for (const [ko, en] of Object.entries(dict.authors)) {
    assert.ok(!/[가-힣]/.test(en), `${ko} → ${en} 에 한글이 있습니다`);
  }
  // 번역 본문(entries)에도 한글 이름이 남아 있지 않아야 합니다.
  // `authors` 표의 **키**는 한국어 원문 표기라 한글이 맞습니다 — 본문만 봅니다.
  for (const lang of ["en", "ja", "zh"]) {
    const dict = JSON.parse(fs.readFileSync(path.join(here, "..", `content/i18n/${lang}.json`), "utf8"));
    const body = JSON.stringify({ entries: dict.entries, ui: dict.ui });
    for (const ko of ["박찬혁", "나서영", "김재환", "차하나", "황보민혁"]) {
      assert.ok(!body.includes(ko), `${lang}.json 본문에 한글 이름이 남아 있습니다: ${ko}`);
    }
  }
});

test("일·중 하단 문구 — 한국어 허브가 원문이라는 표현 없이 문의처만 안내한다", () => {
  for (const [lang, banned] of [
    ["ja", ["原文", "韓国語ハブ"]],
    ["zh", ["原始版本", "韩语 Hub"]],
  ]) {
    const dict = JSON.parse(fs.readFileSync(path.join(here, "..", `content/i18n/${lang}.json`), "utf8"));
    const note = dict.ui.note;
    for (const word of banned) {
      assert.ok(!note.includes(word), `${lang}: "${word}" 표현이 남아 있습니다 — ${note}`);
    }
    assert.match(note, /Cubeberry Co\., Ltd\./, `${lang}: 운영사 이름이 없습니다`);
    // ja·zh 는 글로벌(cubeberry.ai) 화면 — 제품 문의·결제/계약 창구를 안내합니다(2026-11-27).
    assert.match(note, /product@cubeberry\.ai/, `${lang}: 제품 문의 메일이 없습니다`);
    assert.match(note, /info@cubeberry\.ai/, `${lang}: 결제·계약 메일이 없습니다`);
  }
});

test("문의 메일은 시장(도메인)을 따른다 — ko=cuberry.kr, en·ja·zh=cubeberry.ai (2026-11-27)", () => {
  // 2026-11-27 대표 승인 · 태윤 님 셋업(Slack #all-cuberry-mhw): 도메인·메일 분리.
  //   글로벌·미국(cubeberry.ai) → 제품 문의 product@cubeberry.ai, 결제·계약 info@cubeberry.ai
  //   한국(cuberry.kr)          → cubeberry@cuberry.kr
  assert.equal(SUPPORT_EMAIL_KR, "cubeberry@cuberry.kr");
  assert.equal(SUPPORT_EMAIL_GLOBAL, "product@cubeberry.ai");
  assert.equal(SUPPORT_EMAIL_US, "info@cubeberry.ai");
  for (const lang of ["ko", undefined, ""]) {
    assert.equal(supportEmailFor(lang), SUPPORT_EMAIL_KR, `${lang}: 한국어 화면은 한국(cuberry.kr)입니다`);
  }
  for (const lang of ["en", "ja", "zh", "zh-CN", "EN"]) {
    assert.equal(supportEmailFor(lang), SUPPORT_EMAIL_GLOBAL, `${lang}: 글로벌·미국(cubeberry.ai) 제품 문의입니다`);
  }
  assert.equal(SUPPORT_EMAIL, SUPPORT_EMAIL_KR, "기본값은 한국어(한국)");

  // 구조화 데이터 contactPoint 도 화면 언어의 시장을 따릅니다.
  assert.equal(siteJsonLd("https://hub.example.test/", "ko")[0].contactPoint.email, SUPPORT_EMAIL_KR);
  assert.equal(siteJsonLd("https://hub.example.test/", "en")[0].contactPoint.email, SUPPORT_EMAIL_GLOBAL);
  assert.equal(siteJsonLd("https://hub.example.test/", "ja")[0].contactPoint.email, SUPPORT_EMAIL_GLOBAL);
  assert.equal(jsonLdGraph("https://hub.example.test/", [], "en")["@graph"][0].contactPoint.email, SUPPORT_EMAIL_GLOBAL);

  // 정적 하단 문구 — 번역 페이지(글로벌)는 cubeberry.ai 주소를 안내합니다.
  const noteOf = (lang) =>
    JSON.parse(fs.readFileSync(path.join(here, "..", `content/i18n/${lang}.json`), "utf8")).ui.note;
  for (const lang of ["en", "ja", "zh"]) {
    assert.equal(noteOf(lang).includes(SUPPORT_EMAIL_GLOBAL), true, `${lang} 하단 문구에 글로벌 제품 문의 메일이 없습니다`);
    assert.equal(noteOf(lang).includes(SUPPORT_EMAIL_US), true, `${lang} 하단 문구에 결제·계약 메일이 없습니다`);
    assert.equal(noteOf(lang).includes(SUPPORT_EMAIL_KR), false, `${lang} 하단 문구에 한국 주소가 남았습니다`);
  }

  // 앱 화면 — Q&A 함수가 화면 언어를 보고 시장을 고릅니다(푸터는 이 함수를 그대로 import).
  const qna = fs.readFileSync(path.join(here, "..", "src/components/Qna.tsx"), "utf8");
  assert.match(
    qna,
    /function supportEmailFor\(lang\?: string\): string \{\s*\n\s*return lang && !String\(lang\)\.toLowerCase\(\)\.startsWith\("ko"\) \? SUPPORT_EMAIL_GLOBAL : SUPPORT_EMAIL_KO;/,
    "Q&A 가 화면 언어별 분기를 갖고 있지 않습니다",
  );
  assert.match(fs.readFileSync(path.join(here, "..", "src/components/Closing.tsx"), "utf8"), /supportEmailFor\(lang\)/, "푸터가 Q&A 의 함수를 쓰지 않습니다");
  assert.match(fs.readFileSync(path.join(here, "..", "src/components/ChatBot.tsx"), "utf8"), /supportEmailFor\(target\)/, "챗봇 폴백이 화면 언어를 따르지 않습니다");

  // 미국 법인 노드는 결제·계약 창구로 유지 — Stripe 판매사 표기용
  assert.equal(siteJsonLd("https://hub.example.test/")[1].email, SUPPORT_EMAIL_US);
});

test("한국 도메인 표기는 cuberry.kr 뿐이다 — 비슷한 오타가 소스·번역에 없다", () => {
  // 2026-11-27 태윤 님 정정: 한국 도메인은 cuberry.kr. 소스·번역 문구에 다른 표기가 섞이면 안 됩니다.
  const roots = ["src", "content/i18n"];
  const bad = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|jsx|ts|tsx|json|md|html|css)$/.test(entry.name)) {
        const text = fs.readFileSync(full, "utf8");
        if (/cubeberry\.kr/i.test(text)) bad.push(path.relative(path.join(here, ".."), full));
      }
    }
  };
  for (const root of roots) walk(path.join(here, "..", root));
  assert.deepEqual(bad, [], `한국 도메인을 잘못 쓴 파일: ${bad.join(", ")}`);
});

test("영어 글 본문은 시장별 창구를 지킨다 (다른 글에 미국 법인 메일·전화가 남지 않는다)", () => {
  // 2026-11-27 도메인·메일 분리: 문의처 안내 글은 세 창구(글로벌 제품·결제/계약·한국)를 함께 적고,
  // 그 밖의 영어 글에는 미국 법인 메일·전화를 넣지 않습니다(푸터 공인 리셀러 연락처는 별개).
  const dict = JSON.parse(fs.readFileSync(path.join(here, "..", "content/i18n/en.json"), "utf8"));
  for (const [slug, e] of Object.entries(dict.entries)) {
    const body = JSON.stringify(e);
    // 문의처 안내 글은 세 창구를 함께 적습니다.
    if (slug === "qna/contact-inquiry") {
      assert.match(body, /cubeberry@cuberry\.kr/);
      assert.match(body, /product@cubeberry\.ai/);
      assert.match(body, /info@cubeberry\.ai/);
      assert.match(body, /\+82-70-8095-2302/);
      continue;
    }
    assert.equal(body.includes("info@cubeberry.ai"), false, `${slug}: 영어 글에 미국 법인 메일이 남았습니다`);
    assert.equal(body.includes("+1-888-202-1989"), false, `${slug}: 영어 글에 미국 법인 전화가 남았습니다`);
  }
  // 일·중도 같은 기준 — contact-inquiry 는 세 창구를 함께 안내하므로 예외
  for (const lang of ["ja", "zh"]) {
    const d = JSON.parse(fs.readFileSync(path.join(here, "..", `content/i18n/${lang}.json`), "utf8"));
    assert.match(JSON.stringify(d.entries["qna/contact-inquiry"]), /product@cubeberry\.ai/, `${lang}: 글로벌 제품 문의 창구가 없습니다`);
    for (const [slug, e] of Object.entries(d.entries)) {
      if (slug === "qna/contact-inquiry") continue;
      assert.equal(JSON.stringify(e).includes("info@cubeberry.ai"), false, `${lang} ${slug}: 미국 법인 메일이 들어갔습니다`);
    }
  }
});
