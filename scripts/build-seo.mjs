#!/usr/bin/env node
/* =============================================================================
 * XCONDA허브 · 글별 정적 페이지 · 사이트맵 · robots.txt 생성기
 * -----------------------------------------------------------------------------
 * GitHub Pages 는 글 주소(/post/{slug}/)마다 서버 처리를 할 수 없으므로,
 * 노션 스냅샷(notion-content.json)을 읽어 **글마다 HTML 파일을 미리 만듭니다**.
 *
 *   post/{slug}/index.html     뉴스 · 블로그   (<title> · 메타 · canonical · OG · 트위터 카드 + 제목 · 요약 · 본문 HTML)
 *   notice/{slug}/index.html   공지
 *   qna/{slug}/index.html      Q&A
 *   guide/{slug}/index.html    툴 사용법 (노션 가이드)
 *   sitemap.xml                주소 조건을 통과한 글만 (게시 해제된 글은 다음 생성 때 빠집니다)
 *   robots.txt                 사이트맵 위치 안내
 *   index.html                 홈 — 기본 메타 (한국어 문구는 src/content/seo.js 한 곳)
 *
 * 각 글 파일은 빌드된 앱 HTML(index.html)을 그대로 쓰고 <head> 와 #root 만 바꿉니다.
 * 앱이 로드되면 주소를 보고 그 글을 바로 엽니다 (src/content/ContentContext.tsx).
 *
 * 사용법
 *   node scripts/build-seo.mjs [--snapshot notion-content.json] [--root .] [--template index.html]
 * 환경 변수
 *   SITE_URL              허브 정식 주소 (끝 / 포함). 기본: src/content/seo.js 의 DEFAULT_SITE_URL
 *   GITHUB_STEP_SUMMARY   설정되어 있으면 Actions 요약 탭에도 결과를 남깁니다.
 * ========================================================================== */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SECTION_LABELS } from "../src/content/classify.js";
import { AUTHOR_KEYS, COVER_KEYS, coverFromPageMap } from "../src/content/fields.js";
import { blocksToHtml, parseLegacyRecordMap } from "../src/content/body.js";
import {
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_SITE_URL,
  ROUTE_PREFIX,
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
  SITE_NAME,
  absoluteUrl,
  articleJsonLd,
  escapeHtml,
  fileUrlOf,
  jsonLdGraph,
  pickProp,
  resolveArticleMeta,
  robotsTxt,
  routePathFor,
  seoEligibility,
  seoFieldsOf,
  siteMetaFor,
  sitemapXml,
  summarize,
  textOf,
} from "../src/content/seo.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, "..");

/** 생성물로 소유하는 폴더 (빌드 때마다 통째로 다시 만듭니다) */
export const GENERATED_DIRS = ["post", "notice", "qna", "guide"];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ------------------------------ <head> 처리 ------------------------------ */

/**
 * 빌드된 HTML 의 <head> 에서 SEO 가 관리하는 태그를 걷어 내고 새 값을 넣습니다.
 * 여러 번 실행해도 결과가 같습니다(멱등). 앱 스크립트·스타일 등 나머지는 건드리지 않습니다.
 */
export function applyHead(template, head) {
  let html = template;
  html = html.replace(/[ \t]*<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->[ \t]*\r?\n?/g, "");
  html = html.replace(/[ \t]*<title>[\s\S]*?<\/title>[ \t]*\r?\n?/i, "");
  html = html.replace(/[ \t]*<meta\s+name="description"[^>]*>[ \t]*\r?\n?/gi, "");
  html = html.replace(/[ \t]*<link\s+rel="canonical"[^>]*>[ \t]*\r?\n?/gi, "");
  html = html.replace(/[ \t]*<meta\s+(?:property|name)="(?:og|twitter|article):[^"]*"[^>]*>[ \t]*\r?\n?/gi, "");
  const headEnd = "</head>";
  if (!html.includes(headEnd)) throw new Error("템플릿에 </head> 가 없습니다");
  // 함수형 치환 — 제목·본문에 $ 기호가 있어도 특수 치환 패턴으로 해석되지 않게 합니다.
  return html.replace(headEnd, () => `    <!-- SEO:START -->\n${head}\n    <!-- SEO:END -->\n  ${headEnd}`);
}

/** 구조화 데이터 객체 → <script type="application/ld+json"> (</script> 가 값을 깨지 않게 < 를 이스케이프) */
const jsonLdScript = (data, article = false) =>
  data
    ? `<script type="application/ld+json"${article ? " data-article-jsonld" : ""}>${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`
    : "";

/** 페이지별 메타 → <head> 조각. meta.siteLd(공통 명찰) · meta.articleLd(글 명찰) · meta.robots 선택 */
export function headBlock(meta) {
  const e = escapeHtml;
  const lines = [
    `<title>${e(meta.title)}</title>`,
    `<meta name="description" content="${e(meta.description)}" />`,
    meta.robots ? `<meta name="robots" content="${e(meta.robots)}" />` : "",
    `<link rel="canonical" href="${e(meta.url)}" />`,
    `<meta property="og:type" content="${meta.ogType}" />`,
    `<meta property="og:site_name" content="${e(SITE_NAME)}" />`,
    `<meta property="og:locale" content="ko_KR" />`,
    `<meta property="og:title" content="${e(meta.ogTitle)}" />`,
    `<meta property="og:description" content="${e(meta.ogDescription)}" />`,
    `<meta property="og:image" content="${e(meta.image)}" />`,
    `<meta property="og:url" content="${e(meta.url)}" />`,
    meta.publishedTime ? `<meta property="article:published_time" content="${e(meta.publishedTime)}" />` : "",
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${e(meta.ogTitle)}" />`,
    `<meta name="twitter:description" content="${e(meta.ogDescription)}" />`,
    `<meta name="twitter:image" content="${e(meta.image)}" />`,
    jsonLdScript(meta.siteLd),
    jsonLdScript(meta.articleLd, true),
  ].filter(Boolean);
  return lines.map((line) => `    ${line}`).join("\n");
}

/* ------------------------------ 본문 HTML ------------------------------ */

/** 요약 텍스트 → 문단 <p> 목록 */
const paragraphsHtml = (text) =>
  String(text ?? "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("");

/**
 * 글 한 건의 #root 내용. 앱이 로드되면 React 가 이 내용을 지우고 상세 화면으로 바꿉니다.
 * 자바스크립트를 실행하지 않는 크롤러와 공유 미리보기 확인용으로도 쓰입니다.
 */
export function articleBodyHtml({ prefix, type, title, date, author, summary, cover, blocks }) {
  // 허브 메인으로 가는 상대 경로 (post/{slug}/ 기준 두 단계 위)
  const hubHref = "../../";
  const section = SECTION_LABELS[type] ?? "";
  const hasBody = blocks.length > 0;
  // 요약은 항상 싣습니다. Q&A 의 답변(요약)은 본문에서 빠지므로(hubPublicPageMap) 본문이 있어도 빼면 답변이 사라집니다.
  // 앱 모달도 요약 → 본문 순서로 똑같이 보여 줍니다.
  const showSummary = summary;
  const coverHtml = cover ? `<figure class="seo-cover"><img src="${escapeHtml(cover)}" alt="${escapeHtml(title)}" loading="eager"></figure>` : "";
  const byline = [date && `<time datetime="${escapeHtml(date)}">${escapeHtml(date)}</time>`, author && escapeHtml(author)]
    .filter(Boolean)
    .join(" · ");
  return [
    `<div id="root"><main class="seo-article" data-prefix="${prefix}">`,
    `<nav aria-label="breadcrumb"><a href="${hubHref}">${escapeHtml(SITE_NAME)}</a> / ${escapeHtml(section)}</nav>`,
    `<article>`,
    `<h1>${escapeHtml(title)}</h1>`,
    byline ? `<p class="seo-meta">${byline}</p>` : "",
    coverHtml,
    showSummary ? paragraphsHtml(summary) : "",
    hasBody ? blocksToHtml(blocks, { alt: title }) : "",
    `</article>`,
    `<p><a href="${hubHref}">${escapeHtml(SITE_NAME)} 메인으로</a></p>`,
    `</main></div>`,
  ]
    .filter(Boolean)
    .join("\n");
}

const richText = (value) =>
  Array.isArray(value)
    ? value.map((seg) => (typeof seg === "string" ? seg : seg?.text ?? "")).join("")
    : String(value ?? "");

/** 본문 블록 → 순수 텍스트 (FAQPage 답변처럼 기계가 읽는 텍스트가 필요한 곳) */
function blocksToText(blocks) {
  const parts = [];
  const walk = (list) => {
    for (const b of list ?? []) {
      switch (b.type) {
        case "p":
        case "h2":
        case "h3":
        case "quote":
        case "code":
          parts.push(richText(b.text));
          break;
        case "ul":
        case "ol":
          parts.push((b.items ?? []).map(richText).join(" "));
          break;
        case "todo":
          parts.push((b.items ?? []).map((it) => richText(it.text)).join(" "));
          break;
        case "table":
          parts.push((b.rows ?? []).map((r) => (r.cells ?? []).map(richText).join(" ")).join(" "));
          break;
        case "callout":
        case "toggle":
          parts.push(richText(b.text));
          walk(b.children);
          break;
        case "column_list":
        case "column":
          walk(b.children);
          break;
        default:
          break;
      }
    }
  };
  walk(blocks);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** 정적 페이지가 로드되기 전에만 보이는 최소 스타일 (앱이 뜨면 #root 와 함께 사라집니다) */
const STATIC_STYLE = `<style>.seo-article{box-sizing:border-box;min-height:100vh;max-width:760px;margin:0 auto;padding:40px 22px;background:#0b0b0b;color:#e4e4e7;font:16px/1.8 Pretendard,system-ui,sans-serif}.seo-article h1{font-size:28px;line-height:1.3;color:#fff;margin:12px 0}.seo-article h2{font-size:20px;color:#fff;margin:28px 0 8px}.seo-article h3{font-size:17px;color:#fff;margin:20px 0 6px}.seo-article img{max-width:100%;height:auto}.seo-article a{color:#ffd60a}.seo-meta{color:#a1a1aa;font-size:14px}.seo-article .notion-columns{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:20px}.seo-article .notion-column{min-width:0}.seo-article .notion-table-wrap{max-width:100%;overflow-x:auto}.seo-article table{border-collapse:collapse;width:100%}.seo-article td{border:1px solid #3f3f46;padding:8px 12px}.seo-article .notion-file{display:inline-flex;padding:10px 14px;border:1px solid #3f3f46;border-radius:8px}.seo-article .notion-video{display:block;width:100%;max-height:70vh}.seo-article audio{max-width:100%}</style>`;

/* ------------------------------ 생성 (순수 함수) ------------------------------ */

/**
 * 스냅샷 → 파일 목록. 파일을 쓰지 않으므로 테스트에서 그대로 검사할 수 있습니다.
 * @param {{ rows: object[], pages?: object, template: string, siteUrl?: string }} input
 * @returns {{ files: Map<string, string>, pages: object[], skipped: object[], warnings: string[], siteUrl: string }}
 */
export function renderSeoSite({ rows, pages = {}, template, siteUrl = DEFAULT_SITE_URL }) {
  const site = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  const warnings = [];
  const skipped = [];
  const seen = new Set();
  const candidates = [];

  if (!template.includes('<div id="root"></div>')) {
    throw new Error('템플릿에 <div id="root"></div> 가 없습니다 — 빌드 결과(index.html)를 넣어 주세요');
  }

  for (const row of rows ?? []) {
    const title = textOf(row.Title) || textOf(row.title) || "(제목 없음)";
    const type = row.__type;
    if (row.Published === false) continue; // 스냅샷에는 공개 글만 들어오지만 한 번 더 막습니다.
    if (!ROUTE_PREFIX[type]) {
      skipped.push({ title, type: type ?? "", reasons: ["섹션을 알 수 없음 (스냅샷 __type 없음)"] });
      continue;
    }
    const eligibility = seoEligibility(row, type);
    if (!eligibility.eligible) {
      skipped.push({ title, type, reasons: eligibility.reasons });
      continue;
    }
    const key = `${ROUTE_PREFIX[type]}/${eligibility.slug}`;
    if (seen.has(key)) {
      skipped.push({ title, type, reasons: [`Slug 중복 "${eligibility.slug}" — 같은 주소의 다른 글이 먼저 채택됨`] });
      continue;
    }
    seen.add(key);
    candidates.push({ row, type, slug: eligibility.slug, title, prefix: ROUTE_PREFIX[type] });
  }

  const pageRecords = [];
  const files = new Map();

  // 홈 — 기본 메타 + 공유 이미지
  const defaultImageUrl = absoluteUrl(site, DEFAULT_OG_IMAGE_PATH);
  if (!fs.existsSync(path.join(REPO_ROOT, DEFAULT_OG_IMAGE_PATH))) {
    warnings.push(`기본 공유 이미지(${DEFAULT_OG_IMAGE_PATH})가 없습니다 — 링크 미리보기에 이미지가 나오지 않습니다.`);
  }
  const siteLd = jsonLdGraph(site);
  const home = siteMetaFor("ko");
  const homeHead = headBlock({
    title: home.title,
    description: home.description,
    url: site,
    ogType: "website",
    ogTitle: home.ogTitle,
    ogDescription: home.ogDescription,
    image: defaultImageUrl,
    publishedTime: "",
    siteLd,
  });
  files.set("index.html", applyHead(template, homeHead));

  for (const c of candidates) {
    const { row, type, slug, title } = c;
    const seo = seoFieldsOf(row);
    const coverRaw = fileUrlOf(pickProp(row, COVER_KEYS)) || textOf(row.__cover) || derivedCover(pages, row.id);
    const summary = textOf(row.Summary);
    const date = DATE_RE.test(textOf(row.Date)) ? textOf(row.Date) : "";
    const meta = resolveArticleMeta(
      { title, summary, seoTitle: seo.seoTitle, seoDescription: seo.seoDescription, cover: coverRaw, ogImage: seo.ogImage, date, type },
      { defaultImageUrl }
    );
    const url = absoluteUrl(site, routePathFor(type, slug));

    if (meta.pageTitle.length > SEO_TITLE_MAX) {
      warnings.push(`[${title}] SEO 제목이 ${meta.pageTitle.length}자입니다 (검색 결과에서 잘릴 수 있음, 권장 ${SEO_TITLE_MAX}자 이하).`);
    }
    if (meta.description.length > SEO_DESCRIPTION_MAX) {
      warnings.push(`[${title}] 설명이 ${meta.description.length}자입니다 (권장 ${SEO_DESCRIPTION_MAX}자 이하). SEO 설명 칸을 줄여 주세요.`);
    }
    if (!seo.seoTitle) warnings.push(`[${title}] SEO 제목이 비어 있어 제목(Title)을 씁니다.`);
    if (!seo.seoDescription) warnings.push(`[${title}] SEO 설명이 비어 있어 요약(Summary)을 ${summarize(summary).length}자로 줄여 씁니다.`);
    if (!seo.ogImage && !coverRaw) warnings.push(`[${title}] 공유 이미지(OG 이미지·Cover)가 없어 기본 이미지를 씁니다.`);

    const blocks = pages[row.id] ? parseLegacyRecordMap(pages[row.id], row.id) : [];
    const author = textOf(pickProp(row, AUTHOR_KEYS));
    // Q&A 답변 텍스트: 요약(답변) + 본문. 본문만 길게 싣지 않고 적당한 길이로 자릅니다.
    const answerText =
      type === "faq" ? [summary, blocksToText(blocks)].filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 2000) : "";
    const articleLd = {
      "@context": "https://schema.org",
      ...articleJsonLd({
        type,
        url,
        headline: meta.pageTitle,
        description: meta.description,
        image: meta.image,
        date,
        author,
        answerText,
      }),
    };
    const head = headBlock({
      title: meta.title,
      description: meta.description,
      url,
      ogType: "article",
      ogTitle: meta.ogTitle,
      ogDescription: meta.ogDescription,
      image: meta.image,
      publishedTime: meta.publishedTime,
      siteLd,
      articleLd,
    });
    const body = articleBodyHtml({
      prefix: c.prefix,
      type,
      title,
      date,
      author,
      summary,
      cover: coverRaw,
      blocks,
    });
    const html = applyHead(template, head).replace('<div id="root"></div>', () => `${STATIC_STYLE}\n    ${body}`);
    files.set(`${c.prefix}/${slug}/index.html`, html);
    pageRecords.push({ title, type, slug, url, description: meta.description, image: meta.image, pageTitle: meta.pageTitle, date, bodyBlocks: blocks.length });
  }

  // 404 페이지 (GitHub Pages 가 없는 주소에 이 파일을 404 상태로 냅니다 — 보고서 A7)
  // 임의의 깊이에서 서빙되므로 링크는 상대 경로가 아닌 사이트 기준 절대 주소를 씁니다.
  const recent = [...pageRecords].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 5);
  const notFoundHead = headBlock({
    title: `페이지를 찾을 수 없습니다 | ${SITE_NAME}`,
    description: "주소가 바뀌었거나 삭제된 페이지입니다. XCONDA허브 메인에서 공지사항, 뉴스, 툴 사용법, 블로그, Q&A를 확인하세요.",
    url: site,
    ogType: "website",
    ogTitle: `페이지를 찾을 수 없습니다 | ${SITE_NAME}`,
    ogDescription: "주소가 바뀌었거나 삭제된 페이지입니다.",
    image: defaultImageUrl,
    publishedTime: "",
    robots: "noindex",
    siteLd,
  });
  const notFoundBody = [
    `<div id="root"><main class="seo-article">`,
    `<h1>페이지를 찾을 수 없습니다</h1>`,
    `<p>주소가 바뀌었거나 삭제된 페이지입니다. 아래에서 찾으시는 내용을 확인해 보세요.</p>`,
    `<p><a href="${escapeHtml(site)}">${escapeHtml(SITE_NAME)} 메인으로 가기</a></p>`,
    recent.length
      ? `<h2>최근 글</h2><ul>${recent.map((p) => `<li><a href="${escapeHtml(p.url)}">${escapeHtml(p.title)}</a></li>`).join("")}</ul>`
      : "",
    `</main></div>`,
  ]
    .filter(Boolean)
    .join("\n");
  files.set(
    "404.html",
    applyHead(template, notFoundHead).replace('<div id="root"></div>', () => `${STATIC_STYLE}\n    ${notFoundBody}`)
  );

  const sitemapUrls = [
    { loc: site },
    ...pageRecords.map((p) => ({ loc: p.url, lastmod: p.date || undefined })),
  ];
  files.set("sitemap.xml", sitemapXml(sitemapUrls));
  files.set("robots.txt", robotsTxt(site));

  return { files, pages: pageRecords, skipped, warnings, siteUrl: site };
}

/** 페이지 커버가 있으면 그 이미지를, 없으면 본문 첫 이미지를 씁니다 (스냅샷 __cover 가 없을 때의 보조) */
function derivedCover(pages, rowId) {
  if (!pages?.[rowId]) return "";
  try {
    return coverFromPageMap(pages[rowId], rowId)?.url ?? "";
  } catch {
    return "";
  }
}

/* ------------------------------ 요약 리포트 ------------------------------ */

export function renderReportMarkdown(result) {
  const lines = [];
  lines.push("## 글별 주소 · SEO 생성 결과");
  lines.push("");
  lines.push(`- 사이트 주소: \`${result.siteUrl}\``);
  lines.push(`- 주소가 만들어진 글: **${result.pages.length}개** (사이트맵 포함)`);
  lines.push(`- 주소를 만들지 않은 글: **${result.skipped.length}개**`);
  lines.push("");
  if (result.pages.length) {
    lines.push("| 제목 | 섹션 | 주소 | 본문 블록 | 공유 이미지 |");
    lines.push("|---|---|---|---|---|");
    for (const p of result.pages) {
      lines.push(
        `| ${cell(p.title)} | ${SECTION_LABELS[p.type] ?? p.type} | \`/${ROUTE_PREFIX[p.type]}/${p.slug}/\` | ${p.bodyBlocks} | ${p.image ? "있음" : "없음"} |`
      );
    }
    lines.push("");
  }
  if (result.skipped.length) {
    lines.push("### ⚠️ 주소를 만들지 않은 글 (노션에서 확인)");
    lines.push("");
    lines.push("| 제목 | 섹션 | 이유 |");
    lines.push("|---|---|---|");
    for (const s of result.skipped) {
      lines.push(`| ${cell(s.title)} | ${SECTION_LABELS[s.type] ?? s.type ?? "-"} | ${cell(s.reasons.join(" / "))} |`);
    }
    lines.push("");
  }
  if (result.warnings.length) {
    lines.push("### 권장 사항");
    lines.push("");
    for (const w of result.warnings) lines.push(`- ${w}`);
    lines.push("");
  }
  return lines.join("\n");
}

const cell = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");

/* ------------------------------ CLI ------------------------------ */

function parseArgs(argv) {
  const opts = {
    snapshot: path.join(REPO_ROOT, "notion-content.json"),
    root: REPO_ROOT,
    template: path.join(REPO_ROOT, "index.html"),
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--snapshot") opts.snapshot = path.resolve(argv[++i]);
    else if (arg === "--root") opts.root = path.resolve(argv[++i]);
    else if (arg === "--template") opts.template = path.resolve(argv[++i]);
  }
  return opts;
}

export function writeSite(result, root) {
  for (const dir of GENERATED_DIRS) fs.rmSync(path.join(root, dir), { recursive: true, force: true });
  for (const [rel, content] of result.files) {
    const target = path.join(root, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const snapshot = JSON.parse(fs.readFileSync(opts.snapshot, "utf8"));
  const template = fs.readFileSync(opts.template, "utf8");
  const siteUrl = (process.env.SITE_URL || "").trim() || DEFAULT_SITE_URL;

  const result = renderSeoSite({ rows: snapshot.rows ?? [], pages: snapshot.pages ?? {}, template, siteUrl });
  writeSite(result, opts.root);

  console.log(`✔ 글별 주소 ${result.pages.length}개 · 제외 ${result.skipped.length}개 · 사이트맵·robots.txt 갱신 (${result.siteUrl})`);
  for (const s of result.skipped) console.warn(`⚠️ [SEO] 주소 없음 — "${s.title}" (${s.type || "-"}): ${s.reasons.join(" / ")}`);
  for (const w of result.warnings) console.warn(`⚠️ [SEO] ${w}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${renderReportMarkdown(result)}\n`);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
