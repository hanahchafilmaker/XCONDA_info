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
  ORG_LOGO_PATH,
  SECTION_PAGES,
  ROUTE_PREFIX,
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
  SITE_NAME,
  absoluteUrl,
  appJsonLd,
  articleJsonLd,
  escapeHtml,
  fileUrlOf,
  howToJsonLd,
  jsonLdGraph,
  listJsonLd,
  EXTRA_INDEX_PAGES,
  SITE_LANGS,
  hreflangAlternates,
  langByCode,
  llmsTxt,
  localizedUrl,
  localizedOgImageUrl,
  localOgImageUrl,
  OG_LANG_MANIFEST_PATH,
  relatedArticles,
  ogManifestKey,
  OG_MANIFEST_PATH,
  modifiedDateOf,
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
  // 개발 진입점 전용 meta — dev.html 은 저장소 루트에 커밋되어 /dev.html 로도 열리므로
  // noindex 를 두는데, 빌드 결과(index.html)가 물려받으면 **홈페이지가 검색에서 빠집니다**.
  // `<!-- DEV-ONLY:START --> … <!-- DEV-ONLY:END -->` 블록과 `data-dev-only` meta 를 지웁니다.
  html = html.replace(/[ \t]*<!-- DEV-ONLY:START[\s\S]*?<!-- DEV-ONLY:END -->[ \t]*\r?\n?/g, "");
  html = html.replace(/[ \t]*<meta\b[^>]*\bdata-dev-only\b[^>]*>[ \t]*\r?\n?/gi, "");
  const headEnd = "</head>";
  if (!html.includes(headEnd)) throw new Error("템플릿에 </head> 가 없습니다");
  // 함수형 치환 — 제목·본문에 $ 기호가 있어도 특수 치환 패턴으로 해석되지 않게 합니다.
  return html.replace(headEnd, () => `    <!-- SEO:START -->\n${head}\n    <!-- SEO:END -->\n  ${headEnd}`);
}

/* ------------------------------ 공용 자산 분리 ------------------------------ */

/**
 * 단일 파일 빌드(`vite-plugin-singlefile`)가 index.html 안에 인라인으로 넣은
 * **JS·CSS 를 공용 파일로 분리**합니다.
 *
 * 배경: 인라인 번들은 약 447KB(JS) + 46KB(CSS)이고, 글마다 같은 내용이 복사되어
 * 100개 페이지 × 약 490KB ≈ 49MB 가 저장소·전송에 실렸습니다. 크롤러 입장에서는
 * 페이지마다 같은 바이트를 다시 받는 셈이라 크롤 예산·LCP 에 불리합니다.
 * → `assets/app.js` · `assets/app.css` 한 벌로 빼고, 모든 페이지가 그 주소를 가리킵니다.
 *   (페이지 주소 깊이가 달라도 되도록 사이트 기준 절대 주소를 씁니다)
 *
 * 이미 분리된 템플릿(빌드 결과 index.html)을 다시 넣어도 아무 것도 하지 않습니다(멱등).
 */
export function externalizeAssets(template, siteUrl = DEFAULT_SITE_URL) {
  const base = absoluteUrl(siteUrl, "");
  let html = template;
  let js = null;
  let css = null;

  const script = /<script type="module" crossorigin>([\s\S]*?)<\/script>/.exec(html);
  if (script) {
    js = script[1];
    html = html.replace(script[0], () => `<script type="module" crossorigin src="${base}assets/app.js"></script>`);
  }
  const style = /<style rel="stylesheet" crossorigin>([\s\S]*?)<\/style>/.exec(html);
  if (style) {
    css = style[1];
    html = html.replace(style[0], () => `<link rel="stylesheet" href="${base}assets/app.css" />`);
  }
  return { template: html, js, css };
}

/** 언어별 번역 파일 위치 — 사람이 검수한 번역만 여기에 둡니다. */
export const I18N_DIR = "content/i18n";

/**
 * `content/i18n/*.json` 을 읽어 `{ en: {...}, ja: {...} }` 로 돌려줍니다.
 * 파일이 없거나 깨졌으면 그 언어는 건너뛰고 경고만 남깁니다(빌드는 계속).
 */
export function loadTranslations(root) {
  const dir = path.join(root, I18N_DIR);
  const out = {};
  const warnings = [];
  if (!fs.existsSync(dir)) return { translations: out, warnings };
  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith(".json")) continue;
    const code = name.replace(/\.json$/, "");
    if (!langByCode(code) || code === "ko") continue;
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
      if (!data?.entries || typeof data.entries !== "object") throw new Error("entries 가 없습니다");
      out[code] = { ...data, lang: code };
    } catch (e) {
      warnings.push(`${I18N_DIR}/${name} 를 읽지 못했습니다: ${e?.message ?? e}`);
    }
  }
  return { translations: out, warnings };
}

/* ------------------------------ 번역 본문(blocks) ------------------------------
 * 번역 파일(`content/i18n/<언어>.json`)의 `entries[키].blocks` 는 **사람이 쓰는 최소 형식**입니다.
 * 노션 블록 구조를 그대로 번역하지 않고 아래 6가지만 받습니다(번역가가 다루기 쉬운 형태).
 *   {"type":"p" | "h2" | "h3" | "quote", "text":"..."} · {"type":"ul" | "ol", "items":["...", "..."]}
 * 본문 이미지는 번역하지 않습니다 — 한국어 원문의 이미지를 **같은 위치**에 자동으로 넣습니다.
 * ------------------------------------------------------------------------ */
export const LOCALIZED_BLOCK_TYPES = ["p", "h2", "h3", "ul", "ol", "quote", "table", "callout", "code", "todo"];

/**
 * 번역문의 **굵게** 표기와 줄바꿈을 렌더러가 이해하는 rich text 로 바꿉니다.
 * 번역가에게 마크다운 전체를 요구하지 않고, 원문 강조(「입력」「쓰는 도구」 등)만
 * 잃지 않도록 `**…**` 한 가지만 지원합니다. 줄바꿈은 그대로 두면 `<br>` 이 됩니다.
 */
export function localizedRichText(value) {
  return String(value)
    .split(/(\*\*[^*\n]+\*\*)/g)
    .filter((part) => part !== "")
    .map((part) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4
        ? { text: part.slice(2, -2), bold: true }
        : { text: part },
    );
}

/** 번역 본문 블록의 형식 문제를 문자열 목록으로 돌려줍니다(비어 있으면 정상). */
export function localizedBlockProblems(blocks) {
  if (blocks == null) return [];
  if (!Array.isArray(blocks)) return ["blocks 가 배열이 아닙니다"];
  const problems = [];
  blocks.forEach((block, index) => {
    const at = `blocks[${index}]`;
    if (!block || typeof block !== "object") {
      problems.push(`${at}: 객체가 아닙니다`);
      return;
    }
    if (!LOCALIZED_BLOCK_TYPES.includes(block.type)) {
      problems.push(`${at}: 지원하지 않는 type(${block.type}) — ${LOCALIZED_BLOCK_TYPES.join(" · ")} 만 됩니다`);
      return;
    }
    if (block.type === "ul" || block.type === "ol") {
      if (!Array.isArray(block.items) || block.items.length === 0) {
        problems.push(`${at}: ${block.type} 에 items 배열이 필요합니다`);
        return;
      }
      if (block.items.some((item) => typeof item !== "string" || !item.trim())) {
        problems.push(`${at}: items 원소는 비어 있지 않은 문자열이어야 합니다`);
      }
      return;
    }
    // 체크리스트 — 항목 문자열 배열
    if (block.type === "todo") {
      if (!Array.isArray(block.items) || block.items.length === 0) {
        problems.push(`${at}: todo 에 items 배열이 필요합니다`);
        return;
      }
      if (block.items.some((item) => typeof item !== "string" || !item.trim())) {
        problems.push(`${at}: todo items 원소는 비어 있지 않은 문자열이어야 합니다`);
      }
      return;
    }
    // 코드/도식 — 파이프라인 그림처럼 고정폭으로 보여 줄 글
    if (block.type === "code") {
      if (typeof block.text !== "string" || !block.text.trim()) problems.push(`${at}: code 에 text 가 필요합니다`);
      return;
    }
    // 콜아웃(아이콘 + 한 덩어리 글) — 원문의 📌 · ⚠️ · 💡 안내 상자
    if (block.type === "callout") {
      if (typeof block.text !== "string" || !block.text.trim()) problems.push(`${at}: callout 에 text 가 필요합니다`);
      if (block.icon != null && typeof block.icon !== "string") problems.push(`${at}: callout 의 icon 은 문자열이어야 합니다`);
      return;
    }
    // 표 — 번역가는 `rows: [["칸","칸"], …]` 처럼 문자열 2차원 배열만 씁니다.
    if (block.type === "table") {
      if (!Array.isArray(block.rows) || block.rows.length === 0) {
        problems.push(`${at}: table 에 rows 배열이 필요합니다`);
        return;
      }
      if (!block.rows.every((row) => Array.isArray(row) && row.length > 0)) {
        problems.push(`${at}: table 의 각 행은 문자열 배열이어야 합니다`);
        return;
      }
      // 칸 하나가 비는 것은 정상입니다(표 왼쪽 위 모서리 칸). 형식만 봅니다.
      if (block.rows.some((row) => row.some((cell) => typeof cell !== "string"))) {
        problems.push(`${at}: table 칸은 문자열이어야 합니다`);
        return;
      }
      const width = block.rows[0].length;
      if (block.rows.some((row) => row.length !== width)) {
        problems.push(`${at}: table 의 모든 행은 같은 칸 수여야 합니다(${width}칸)`);
      }
      return;
    }
    if (typeof block.text !== "string" || !block.text.trim()) problems.push(`${at}: text 가 비어 있습니다`);
  });
  return problems;
}

/**
 * 번역 블록 + 한국어 원문 이미지 → 렌더 가능한 블록 배열.
 * `images` 는 `{ after, src, caption }` 이고, `after` 는 그 이미지 **앞에 있던 글 블록 수**입니다.
 * 번역문의 블록 수가 모자라면 마지막에 붙입니다(이미지가 사라지지 않게).
 */
export function mergeLocalizedBlocks(blocks, images = []) {
  const list = (Array.isArray(blocks) ? blocks : []).filter((b) => b && LOCALIZED_BLOCK_TYPES.includes(b.type));
  if (!images.length) return list.map(stripBlockOrder);
  const out = [];
  const buckets = new Map();
  for (const media of images) {
    const at = Math.max(0, Math.min(list.length, Number(media.after) || 0));
    if (!buckets.has(at)) buckets.set(at, []);
    buckets.get(at).push(media);
  }
  list.forEach((block, index) => {
    for (const media of buckets.get(index) ?? []) out.push(mediaBlock(media));
    out.push(stripBlockOrder(block));
  });
  for (const media of buckets.get(list.length) ?? []) out.push(mediaBlock(media));
  return out;
}

/** {after, block} 또는 옛 모양 {after, src, caption} 둘 다 받습니다. */
const mediaBlock = (media) => media.block ?? { type: "img", src: media.src, caption: media.caption || undefined };

/** `{type,text}` / `{type,items}` 만 남깁니다(여분 키가 렌더러로 새지 않게). */
function stripBlockOrder(block) {
  if (block.type === "ul" || block.type === "ol") {
    return { type: block.type, items: block.items.map((i) => localizedRichText(i)) };
  }
  // 표는 렌더러(src/content/body.js)가 쓰는 모양으로 바꿔 넘깁니다 — 칸은 rich text 배열.
  if (block.type === "table") {
    return {
      type: "table",
      rows: block.rows.map((row) => ({ cells: row.map((cell) => localizedRichText(cell)) })),
    };
  }
  if (block.type === "callout") {
    return { type: "callout", icon: String(block.icon ?? ""), color: "default", text: localizedRichText(block.text) };
  }
  if (block.type === "todo") {
    return { type: "todo", items: block.items.map((item) => ({ text: localizedRichText(item), checked: false })) };
  }
  if (block.type === "code") {
    // 언어명은 클래스로 들어가므로 공백이 있으면 넣지 않습니다(plain text 등).
    const lang = String(block.language ?? "");
    return { type: "code", text: String(block.text), language: /^[\w+#.-]+$/.test(lang) ? lang : "" };
  }
  return { type: block.type, text: localizedRichText(block.text) };
}

/**
 * 글이 든 블록인지. 원문(노션) 블록은 rich text 배열이고, 콜아웃은 본문이 children 에 들어 있습니다.
 * 빈 문단·빈 인용은 구조 비교에서 빼기 위해 씁니다.
 */
export function blockHasText(block) {
  if (!block) return false;
  if (["table", "ul", "ol", "code", "todo"].includes(block.type)) return true;
  const text = block.text;
  if (Array.isArray(text)) return text.some((seg) => String(seg?.text ?? "").trim());
  if (String(text ?? "").trim()) return true;
  if (block.type === "callout") {
    return (block.children ?? []).some((c) => {
      const t = c?.text;
      if (Array.isArray(t)) return t.some((seg) => String(seg?.text ?? "").trim());
      return Boolean(String(t ?? "").trim());
    });
  }
  return false;
}

/** 한국어 원문 블록 → 본문 이미지 위치 목록(`after` = 앞에 있는 글 블록 수) */
export function bodyImagesOf(blocks = []) {
  const out = [];
  let textBlocks = 0;
  for (const block of blocks ?? []) {
    if (block?.type === "img" && block.src) out.push({ after: textBlocks, src: block.src, caption: block.caption });
    else if (block?.type !== "video") textBlocks += 1;
  }
  return out;
}

const plainTextOf = (value) =>
  typeof value === "string" ? value : Array.isArray(value) ? value.map((seg) => String(seg?.text ?? "")).join("") : "";

/**
 * 번역이 필요한 블록인가 — 이모지·링크·해시태그만 있는 인용(엑스 게시글 조각)이나
 * 이미지 캡션용 빈 콜아웃은 번역 파일에 넣지 않습니다.
 */
export function needsTranslation(block) {
  if (!block) return false;
  if (block.type === "ul" || block.type === "ol" || block.type === "todo") return (block.items ?? []).length > 0;
  if (block.type === "table") return true;
  const text = block.text;
  let raw = typeof text === "string" ? text : Array.isArray(text) ? text.map((seg) => String(seg?.text ?? "")).join("") : "";
  if (block.type === "callout" && !raw.trim()) raw = (block.children ?? []).map((c) => plainTextOf(c?.text)).join(" ");
  const rest = raw
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#@][\w-]+/g, " ")
    .replace(/xconda\.ai/gi, " ")
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Component}\p{S}\p{P}\s]/gu, "");
  return rest.length > 0;
}

/**
 * 2단 배치(`column_list` · `column`)를 풀어 한 줄로 만듭니다.
 * 번역가는 2단 배치를 다루지 않고, 글은 글대로 옮기고 이미지·영상은 원문 자리에 그대로 넣습니다.
 */
export function flattenBlocks(blocks = []) {
  const out = [];
  for (const block of blocks ?? []) {
    if (!block) continue;
    if (block.type === "column_list" || block.type === "column") out.push(...flattenBlocks(block.children ?? []));
    else out.push(block);
  }
  return out;
}

/** 번역하지 않고 원문 그대로 옮기는 블록(이미지·영상·첨부) */
export const MEDIA_BLOCK_TYPES = ["img", "video", "file", "audio", "pdf"];

/**
 * 한국어 원문 블록 → 원문 그대로 옮길 미디어 위치 목록.
 * `after` = 그 미디어 **앞에 있던 번역 대상 블록 수**(2단 배치는 펼친 뒤 셉니다).
 */
export function bodyMediaOf(blocks = []) {
  const out = [];
  let textBlocks = 0;
  for (const block of flattenBlocks(blocks)) {
    if (MEDIA_BLOCK_TYPES.includes(block.type)) out.push({ after: textBlocks, block });
    // 구분선처럼 글자가 없는 블록은 번역 파일에 없으므로 자리 계산에서도 빼야 합니다.
    else if (blockHasText(block)) textBlocks += 1;
  }
  return out;
}

/**
 * 번역 페이지용 템플릿 — 앱 번들을 **떼어 냅니다**.
 * 영어·일본어·중국어 페이지는 번역문 정적 HTML 만 서빙합니다. 앱을 함께 싣으면
 * React 가 정적 본문을 지우고 한국어 화면을 그려서, /en/ 주소에 한국어가 뜹니다.
 */
export function staticOnlyTemplate(template) {
  return template
    .replace(/\s*<script type="module"[^>]*src="[^"]*assets\/app\.js"[^>]*><\/script>/g, "")
    .replace(/\s*<script type="module" crossorigin>[\s\S]*?<\/script>/g, "");
}

/** `<html lang="ko">` → 원하는 언어 코드로 (없으면 그대로) */
export function applyHtmlLang(html, htmlLang) {
  return html.replace(/<html\s+lang="[^"]*"/i, `<html lang="${htmlLang}"`);
}

/**
 * 언어별 정적 페이지(`/en/`, `/ja/`, `/zh/`)를 만듭니다. 번역이 있는 글만 대상입니다.
 * 반환값의 `urls` 는 사이트맵에, `missing` 은 경고에 씁니다.
 *
 * @param {{ site: string, translations: Record<string, object>, template: string,
 *           pageRecords: object[], defaultImageUrl: string }} input
 */
export function localizedPages({ site, translations = {}, template, pageRecords = [], defaultImageUrl, ogLangManifest = {} }) {
  const files = new Map();
  const urls = [];
  const missing = [];
  /** 언어 → 번역이 있는 경로 목록(앱 언어 전환기가 /en/ 주소로 보낼 때 씁니다) */
  const paths = {};
  /** 언어 → 번역 본문(blocks)이 있는 페이지 수 */
  const bodyCount = {};
  const base = staticOnlyTemplate(template);
  // 한국어 원문 주소를 찾기 위한 색인 — `qna/slug` → 페이지 기록
  const byKey = new Map(pageRecords.map((p) => [`${ROUTE_PREFIX[p.type] ?? p.type}/${p.slug}`, p]));

  /**
   * 키(`qna/slug`) → 그 글의 번역이 있는 언어 코드 목록.
   * hreflang 은 **서로를 가리키는** 링크여야 다국어 묶음으로 인식되므로,
   * 각 언어 페이지는 자기 언어만이 아니라 그 글을 가진 모든 언어를 나열합니다.
   */
  const localesByKey = new Map();
  for (const code of Object.keys(translations)) {
    for (const key of Object.keys(translations[code]?.entries ?? {})) {
      if (!byKey.has(key)) continue;
      if (!localesByKey.has(key)) localesByKey.set(key, []);
      localesByKey.get(key).push(code);
    }
  }
  const codesForKey = (key) => [...new Set(["ko", ...(localesByKey.get(key) ?? [])])];

  /**
   * 언어 전환 링크 — 번역이 있는 언어만, 지금 언어는 굵게(링크 없이) 표시합니다.
   * 크롤러에게도 "이 글은 4개 언어로 있다"는 신호가 되고, 사람은 주소를 직접 고칠 필요가 없습니다.
   */
  const langSwitcher = (path, codes) =>
    [
      `<nav class="seo-langs" aria-label="Language">`,
      ...SITE_LANGS.filter((l) => codes.includes(l.code))
        .map((l) =>
          l.code === currentLangCode
            ? `<strong aria-current="true">${escapeHtml(l.name)}</strong>`
            : `<a href="${escapeHtml(localizedUrl(site, l.code, path))}" hreflang="${escapeHtml(l.hreflang)}">${escapeHtml(l.name)}</a>`,
        ),
      `</nav>`,
    ].join("");

  const langCodes = Object.keys(translations).sort();

  let currentLangCode = "ko";

  for (const code of langCodes) {
    const lang = langByCode(code);
    const t = translations[code];
    if (!lang || !t) continue;
    const ui = t.ui ?? {};
    currentLangCode = code;
    const homeTitle = t.site?.title ?? lang.name;
    const homeDescription = t.site?.description ?? "";
    const homeUrl = localizedUrl(site, code, "");
    const homePath = "";
    const homeAlternates = hreflangAlternates(site, homePath, langCodes);

    // 번역이 실제 글과 맞는지 확인 (원문이 사라졌으면 만들지 않음)
    const items = [];
    for (const key of Object.keys(t.entries ?? {}).sort()) {
      const record = byKey.get(key);
      if (!record) {
        missing.push(`${I18N_DIR}/${code}.json › ${key} (원문 글이 없어 건너뜀)`);
        continue;
      }
      const [prefix] = key.split("/");
      items.push({ key, prefix, record, tr: t.entries[key] });
    }
    if (!items.length) continue;

    // 글 페이지
    for (const it of items) {
      const path = `${it.prefix}/${it.record.slug}/`;
      const url = localizedUrl(site, code, path);
      const koUrl = localizedUrl(site, "ko", path);
      const title = it.tr.title ?? it.record.title;
      const description = it.tr.summary ?? it.record.description;
      const sectionTitle = t.sections?.[it.prefix]?.title ?? it.prefix;
      const siblings = items.filter((x) => x.prefix === it.prefix && x.key !== it.key).slice(0, 4);
      const head = headBlock({
        title: `${title} | ${homeTitle}`,
        description,
        url,
        ogType: "article",
        ogTitle: title,
        ogDescription: description,
        // 언어별 카드(제목을 그 언어로 그린 카드) → 글 커버 → 기본 카드 순서
        image: localizedOgImageUrl(ogLangManifest, code, path, site) || it.record.image || defaultImageUrl,
        publishedTime: it.record.date ?? "",
        ogLocale: lang.ogLocale,
        alternates: hreflangAlternates(site, path, codesForKey(it.key)),
        siteLd: jsonLdGraph(site, [
          {
            "@type": "WebPage",
            "@id": `${url}#webpage`,
            url,
            name: title,
            inLanguage: lang.hreflang,
            isPartOf: { "@id": `${absoluteUrl(site, "")}#website` },
          },
        ]),
      });
      // 본문 번역(blocks)이 있으면 한국어 원문과 같은 구조(h1·메타·본문)로 싣습니다.
      // 이미지는 한국어 원문 위치를 그대로 따릅니다. 요약은 메타 설명으로만 쓰고,
      // 본문이 있으면 첫 문단을 요약으로 중복 출력하지 않습니다(Q&A 는 본문이 없어 요약이 곧 답변).
      const bodyProblems = localizedBlockProblems(it.tr.blocks);
      // 구조 검사 — 번역 블록 수/종류가 원문과 다르면 이미지가 엉뚱한 자리에 들어갑니다.
      if (!it.prefix.startsWith("qna")) {
        const koText = flattenBlocks(it.record.blocks ?? []).filter(
          (b) => !MEDIA_BLOCK_TYPES.includes(b.type) && b.type !== "divider" && needsTranslation(b),
        );
        const trText = (Array.isArray(it.tr.blocks) ? it.tr.blocks : []).filter((b) => needsTranslation(b));
        if (koText.length && trText.length !== koText.length) {
          missing.push(
            `${I18N_DIR}/${code}.json › ${it.key} 블록 구조가 원문과 다릅니다(원문 ${koText.length} · 번역 ${trText.length}) — 이미지·첨부 위치가 어긋날 수 있습니다`,
          );
        }
      }
      for (const problem of bodyProblems) missing.push(`${I18N_DIR}/${code}.json › ${it.key} ${problem}`);
      const carried = it.record.bodyMedia ?? it.record.bodyImages ?? [];
      const bodyBlocks = bodyProblems.length ? [] : mergeLocalizedBlocks(it.tr.blocks, carried);
      const bodyHtml = bodyBlocks.length ? blocksToHtml(bodyBlocks, { alt: title }) : "";
      // 구조 검사 — 번역 블록 수/종류가 원문과 다르면 이미지가 엉뚱한 자리에 들어갑니다.
      // `qna/*` 는 답변(요약)이 본문이고 한국어 본문이 비어 있는 항목이 있어(출처 블록만 번역)
      // 원문과 비교할 수 없습니다 → 위 첫 검사와 같은 기준으로 제외합니다.
      if (!it.prefix.startsWith("qna") && !bodyProblems.length && it.tr.blocks?.length) {
        // 빈 문단·빈 인용은 원문의 줄 간격일 뿐이라 구조 비교에서 뺍니다(번역 파일에는 넣지 않습니다).
        const shape = (blocks) =>
          flattenBlocks(blocks)
            .filter((b) => !["img", "video", "divider"].includes(b.type))
            .filter((b) => blockHasText(b))
            .map((b) => b.type);
        const koShape = shape(it.record.blocks ?? []);
        const trShape = shape(it.tr.blocks);
        if (koShape.join(",") !== trShape.join(",")) {
          missing.push(
            `${I18N_DIR}/${code}.json › ${it.key} 블록 구조가 원문과 다릅니다(원문 ${koShape.length} · 번역 ${trShape.length}) — 이미지 위치가 어긋날 수 있습니다`,
          );
        }
      }
      if (bodyHtml) bodyCount[code] = (bodyCount[code] ?? 0) + 1;
      const body = [
        `<div id="root"><main class="seo-article" data-lang="${code}">`,
        `<nav aria-label="breadcrumb"><a href="../../">${escapeHtml(ui.home ?? homeTitle)}</a> / <a href="../">${escapeHtml(sectionTitle)}</a></nav>`,
        langSwitcher(path, codesForKey(it.key)),
        `<article>`,
        `<h1>${escapeHtml(title)}</h1>`,
        `<p class="seo-meta">${escapeHtml(lang.name)} · ${escapeHtml(ui.brand ?? "XCONDA Hub")}</p>`,
        bodyHtml ? "" : paragraphsHtml(description),
        bodyHtml,
        `<p><a href="${escapeHtml(koUrl)}" hreflang="ko">${escapeHtml(ui.koreanOriginal ?? "한국어 원문")}</a></p>`,
        `</article>`,
        siblings.length
          ? [
              `<nav class="seo-related" aria-label="More">`,
              `<h2>${escapeHtml(sectionTitle)}</h2>`,
              `<ul>`,
              ...siblings.map((x) => `<li><a href="../${escapeHtml(x.record.slug)}/">${escapeHtml(x.tr.title ?? x.record.title)}</a></li>`),
              `</ul>`,
              `</nav>`,
            ].join("")
          : "",
        ui.note ? `<p class="seo-note">${escapeHtml(ui.note)}</p>` : "",
        `</main></div>`,
      ]
        .filter(Boolean)
        .join("\n");
      files.set(`${lang.prefix}${path}index.html`, applyHtmlLang(injectRoot(applyHead(base, head), body), lang.htmlLang));
      urls.push({ loc: url, lastmod: it.record.modified || it.record.date || undefined });
      (paths[code] ??= []).push(path);
    }

    // 섹션 목록 (/en/qna/ 등)
    const prefixes = [...new Set(items.map((i) => i.prefix))].sort();
    for (const prefix of prefixes) {
      const list = items.filter((i) => i.prefix === prefix).sort((a, b) => (a.record.seq ?? 0) - (b.record.seq ?? 0));
      const path = `${prefix}/`;
      const url = localizedUrl(site, code, path);
      const sec = t.sections?.[prefix] ?? {};
      const title = sec.title ?? `${prefix} · ${homeTitle}`;
      const description = sec.description ?? homeDescription;
      const head = headBlock({
        title: `${title} | ${homeTitle}`,
        description,
        url,
        ogType: "website",
        ogTitle: title,
        ogDescription: description,
        image: localizedOgImageUrl(ogLangManifest, code, path, site) || defaultImageUrl,
        publishedTime: "",
        ogLocale: lang.ogLocale,
        alternates: hreflangAlternates(site, path, langCodes),
      });
      const body = [
        `<div id="root"><main class="seo-article" data-lang="${code}">`,
        `<nav aria-label="breadcrumb"><a href="../">${escapeHtml(ui.home ?? homeTitle)}</a> / ${escapeHtml(title)}</nav>`,
        langSwitcher(path, langCodes),
        `<h1>${escapeHtml(title)}</h1>`,
        `<p>${escapeHtml(description)}</p>`,
        `<ul>`,
        ...list.map((it) => `<li><a href="./${escapeHtml(it.record.slug)}/">${escapeHtml(it.tr.title ?? it.record.title)}</a></li>`),
        `</ul>`,
        `<p><a href="${escapeHtml(localizedUrl(site, "ko", path))}" hreflang="ko">${escapeHtml(ui.koreanOriginal ?? "한국어 원문")}</a></p>`,
        `</main></div>`,
      ].join("\n");
      files.set(`${lang.prefix}${path}index.html`, applyHtmlLang(injectRoot(applyHead(base, head), body), lang.htmlLang));
      urls.push({ loc: url });
    }

    // 언어 홈 (/en/)
    const head = headBlock({
      title: homeTitle,
      description: homeDescription,
      url: homeUrl,
      ogType: "website",
      ogTitle: homeTitle,
      ogDescription: homeDescription,
      image: localizedOgImageUrl(ogLangManifest, code, homePath, site) || defaultImageUrl,
      publishedTime: "",
      ogLocale: lang.ogLocale,
      alternates: homeAlternates,
    });
    const body = [
      `<div id="root"><main class="seo-article" data-lang="${code}">`,
      `<nav aria-label="breadcrumb"><a href="${escapeHtml(localizedUrl(site, "ko", ""))}" hreflang="ko">${escapeHtml(ui.brand ?? "XCONDA Hub")}</a> / ${escapeHtml(lang.name)}</nav>`,
      langSwitcher("", langCodes),
      `<h1>${escapeHtml(homeTitle)}</h1>`,
      `<p>${escapeHtml(homeDescription)}</p>`,
      ...prefixes.map((prefix) => {
        const sec = t.sections?.[prefix] ?? {};
        const list = items.filter((i) => i.prefix === prefix);
        return [
          `<h2><a href="./${escapeHtml(prefix)}/">${escapeHtml(sec.title ?? prefix)}</a></h2>`,
          `<ul>`,
          ...list.map((it) => `<li><a href="./${escapeHtml(prefix)}/${escapeHtml(it.record.slug)}/">${escapeHtml(it.tr.title ?? it.record.title)}</a></li>`),
          `</ul>`,
        ].join("\n");
      }),
      ui.note ? `<p class="seo-note">${escapeHtml(ui.note)}</p>` : "",
      `</main></div>`,
    ].join("\n");
    files.set(`${lang.prefix}index.html`, applyHtmlLang(injectRoot(applyHead(base, head), body), lang.htmlLang));
    // 앱의 언어 전환기가 홈에서도 그 언어 주소로 보낼 수 있게 빈 경로를 넣어 둡니다.
    (paths[code] ??= []).unshift("");
    urls.push({ loc: homeUrl });
  }

  return { files, urls, missing, paths, bodyCount };
}

const ROOT_OPEN = '<div id="root">';

/**
 * 템플릿의 #root 를 **빈 상태로 정규화**합니다.
 * 빌드 결과(index.html)를 다시 템플릿으로 넣어도(멱등·재생성) 안전하도록, 이미 들어 있는
 * 정적 본문을 걷어 냅니다. #root 는 </body> 바로 앞의 마지막 요소라는 전제를 씁니다.
 */
export function emptyRoot(input) {
  // 정적 스타일은 #root 바깥에 있으므로, 다시 만들 때 옛 스타일 블록을 먼저 걷어 냅니다.
  // (앞쪽 공백까지만 지우고 뒤쪽 들여쓰기는 남겨, 첫 생성과 완전히 같은 문자열이 되게 합니다)
  const template = input.replace(/\s*<style>\.seo-article\{[\s\S]*?<\/style>/g, "");
  const start = template.indexOf(ROOT_OPEN);
  if (start < 0) throw new Error('템플릿에 <div id="root"> 가 없습니다 — 빌드 결과(index.html)를 넣어 주세요');
  const bodyEnd = template.lastIndexOf("</body>");
  const close = template.lastIndexOf("</div>", bodyEnd > start ? bodyEnd : template.length);
  if (close < start) throw new Error("템플릿의 #root 닫는 태그를 찾지 못했습니다");
  return `${template.slice(0, start)}<div id="root"></div>${template.slice(close + "</div>".length)}`;
}

/** #root 안에 정적 본문(body 는 `<div id="root">…</div>` 형태)을 넣습니다. */
function injectRoot(html, body) {
  return emptyRoot(html).replace('<div id="root"></div>', () => `${STATIC_STYLE}\n    ${body}`);
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
    // 언어 신호 — 기준 언어(ko) + x-default 는 항상 자기 자신을 가리킵니다.
    // 번역 주소가 있는 페이지는 meta.alternates 로 언어 전체를 서로 연결합니다(hreflang 묶음).
    ...(meta.alternates?.length
      ? meta.alternates.map((a) => `<link rel="alternate" hreflang="${e(a.hreflang)}" href="${e(a.href)}" />`)
      : [
          `<link rel="alternate" hreflang="ko" href="${e(meta.url)}" />`,
          `<link rel="alternate" hreflang="x-default" href="${e(meta.url)}" />`,
        ]),
    `<meta property="og:type" content="${meta.ogType}" />`,
    `<meta property="og:site_name" content="${e(SITE_NAME)}" />`,
    `<meta property="og:locale" content="${e(meta.ogLocale ?? "ko_KR")}" />`,
    `<meta property="og:title" content="${e(meta.ogTitle)}" />`,
    `<meta property="og:description" content="${e(meta.ogDescription)}" />`,
    `<meta property="og:image" content="${e(meta.image)}" />`,
    `<meta property="og:url" content="${e(meta.url)}" />`,
    meta.publishedTime ? `<meta property="article:published_time" content="${e(meta.publishedTime)}" />` : "",
    meta.modifiedTime ? `<meta property="article:modified_time" content="${e(meta.modifiedTime)}" />` : "",
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${e(meta.ogTitle)}" />`,
    `<meta name="twitter:description" content="${e(meta.ogDescription)}" />`,
    `<meta name="twitter:image" content="${e(meta.image)}" />`,
    jsonLdScript(meta.siteLd),
    jsonLdScript(meta.articleLd, true),
    jsonLdScript(meta.howToLd, true),
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
export function articleBodyHtml({ prefix, type, title, date, author, summary, cover, blocks, related = [] }) {
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
    // 관련 글 — 글에서 글로 이어지는 크롤 경로(색인·AI 인용에 도움). 후보가 없으면 아무것도 넣지 않습니다.
    related.length
      ? [
          `<nav class="seo-related" aria-label="관련 글">`,
          `<h2>${type === "faq" ? "관련 안내" : "관련 글"}</h2>`,
          `<ul>`,
          ...related.map(
            (r) =>
              `<li><a href="${escapeHtml(relHref(routePathFor(r.type, r.slug), "../../"))}">${escapeHtml(r.title)}</a></li>`,
          ),
          `</ul>`,
          `</nav>`,
        ].join("")
      : "",
    `<p><a href="${hubHref}">${escapeHtml(SITE_NAME)} 메인으로</a></p>`,
    `</main></div>`,
  ]
    .filter(Boolean)
    .join("\n");
}

/* ------------------------------ 목록 · 요약 (서버 렌더 · 크롤러용) ------------------------------ */

/** 요약 → 목록 한 줄 (줄바꿈 제거 + 길이 제한) */
const oneLine = (value, max = 150) => summarize(String(value ?? "").replace(/\s+/g, " ").trim(), max);

const byDateDesc = (a, b) => String(b.date ?? "").localeCompare(String(a.date ?? ""));

/** 노션 `Pinned`(맨 위 고정) 값 → boolean */
const isPinned = (row) =>
  ["true", "yes", "1", "예", "y"].includes(textOf(pickProp(row, ["Pinned", "고정", "Pin"])).toLowerCase());
const byPinnedThenDate = (a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || byDateDesc(a, b);

/** 글 주소 → 페이지 기준 상대 주소 (앞의 / 제거) */
const relHref = (path, prefix = "") => `${prefix}${String(path).replace(/^\/+/, "")}`;

/**
 * 글 목록 → 정적 <ul>. `linkOf` 가 글 주소를 만듭니다(홈은 `post/x/`, 목록 페이지는 `../post/x/`).
 * 자바스크립트 없이도 크롤러가 모든 글을 1~2단계 안에서 볼 수 있게 하는 장치입니다.
 */
export function serverListHtml(items, linkOf) {
  const rows = items.map((it) => {
    const meta = [it.date && `<time datetime="${escapeHtml(it.date)}">${escapeHtml(it.date)}</time>`, it.author && escapeHtml(it.author)]
      .filter(Boolean)
      .join(" · ");
    const summary = it.summary ? ` — ${escapeHtml(it.summary)}` : "";
    return `<li><a href="${escapeHtml(linkOf(it))}">${escapeHtml(it.title)}</a>${meta ? ` <span class="seo-meta">${meta}</span>` : ""}${summary}</li>`;
  });
  return `<ul>${rows.join("")}</ul>`;
}

/** 섹션 하나 (제목 + 목록 + 전체 보기 링크) */
function sectionHtml({ anchor, heading, items, linkOf, moreHref, moreLabel }) {
  if (!items.length) return "";
  return [
    `<section${anchor ? ` id="${escapeHtml(anchor)}"` : ""}>`,
    `<h2>${escapeHtml(heading)} <span class="seo-meta">${items.length}개</span></h2>`,
    serverListHtml(items, linkOf),
    moreHref ? `<p><a href="${escapeHtml(moreHref)}">${escapeHtml(moreLabel ?? `${heading} 전체 보기`)}</a></p>` : "",
    `</section>`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * 홈 요약본 — 공지 · 뉴스 · 툴 사용법 · 블로그 · Q&A 전체 목록.
 * 앱이 뜨면 React 가 #root 를 통째로 바꾸므로 화면에는 영향이 없고,
 * 자바스크립트를 실행하지 않는 AI 크롤러만 이 내용을 읽습니다.
 */
export function homeDigestHtml({ groups, description, total, updated }) {
  const linkOf = (it) => relHref(routePathFor(it.type, it.slug));
  const toc = [
    ["notices", "공지사항"],
    ["news", "뉴스"],
    ["guides", "툴 사용법"],
    ["blog", "블로그"],
    ["faq", "Q&A"],
  ]
    .filter(([id]) => groups[id]?.length)
    .map(([id, label]) => `<a href="#${id}">${escapeHtml(label)} ${groups[id].length}</a>`)
    .join(" · ");

  return [
    `<div id="root"><main class="seo-article seo-home">`,
    `<h1>${escapeHtml(siteMetaFor("ko").title)}</h1>`,
    `<p>${escapeHtml(description)}</p>`,
    `<p class="seo-meta">문서 ${total}개${updated ? ` · 최근 갱신 ${escapeHtml(updated)}` : ""}</p>`,
    toc ? `<nav class="seo-toc" aria-label="섹션 바로가기">${toc}</nav>` : "",
    sectionHtml({
      anchor: "notices",
      heading: SECTION_LABELS.notice,
      items: groups.notices,
      linkOf,
      moreHref: "notice/",
    }),
    sectionHtml({ anchor: "news", heading: SECTION_LABELS.news, items: groups.news, linkOf, moreHref: "post/" }),
    sectionHtml({
      anchor: "guides",
      heading: SECTION_LABELS.guide,
      items: groups.guides,
      linkOf,
      moreHref: "guide/",
    }),
    sectionHtml({ anchor: "blog", heading: SECTION_LABELS.blog, items: groups.blog, linkOf, moreHref: "post/" }),
    sectionHtml({ anchor: "faq", heading: "Q&A", items: groups.faq, linkOf, moreHref: "qna/" }),
    `<p><a href="https://www.xconda.ai/">XCONDA 스튜디오 열기</a></p>`,
    `</main></div>`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** 섹션 인덱스 페이지 본문 (/post/ · /notice/ · /qna/ · /guide/) */
export function sectionPageHtml({ page, items }) {
  const linkOf = (it) => relHref(routePathFor(it.type, it.slug), "../");
  return [
    `<div id="root"><main class="seo-article">`,
    `<nav aria-label="breadcrumb"><a href="../">${escapeHtml(SITE_NAME)}</a> / ${escapeHtml(page.heading)}</nav>`,
    `<h1>${escapeHtml(page.heading)}</h1>`,
    `<p>${escapeHtml(page.description)}</p>`,
    `<p class="seo-meta">${items.length}개</p>`,
    serverListHtml(items, linkOf),
    // 툴 사용법 목록에는 스튜디오 전체 사용자 가이드(정적 페이지)로 가는 길을 둡니다.
    page.types.includes("guide")
      ? `<p class="seo-more"><a href="../user-guide.html">XCONDA 스튜디오 19개 툴 완전 사용자 가이드</a></p>`
      : "",
    `<p><a href="../">${escapeHtml(SITE_NAME)} 메인으로</a></p>`,
    `</main></div>`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** 본문 블록 → HowTo 단계 (소제목 = 단계 이름, 바로 뒤 첫 문단 = 설명) */
export function howToSteps(blocks) {
  const steps = [];
  let current = null;
  for (const b of blocks ?? []) {
    if (b.type === "h2" || b.type === "h3") {
      if (current) steps.push(current);
      current = { name: blocksToText([b]).trim(), text: "" };
    } else if (current && !current.text && ["p", "ul", "ol", "quote", "callout"].includes(b.type)) {
      current.text = blocksToText([b]).slice(0, 320);
    }
  }
  if (current) steps.push(current);
  const all = steps.filter((s) => s.name);
  // "1단계 …" 처럼 순서가 드러난 소제목을 우선 사용합니다.
  const numbered = all.filter((s) => /^(\d+\s*[).]?\s*|step\s*\d|제\s*\d+\s*단계|\d+\s*단계)/i.test(s.name));
  if (numbered.length >= 2) return numbered;
  // 번호가 없으면 안내·마무리 성격의 소제목을 빼고 절차만 남깁니다.
  return all.filter((s) => !/(자주 하는 실수|다음 편|마무리|참고|문의|시작하시는|맺음말)/.test(s.name));
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
const STATIC_STYLE = `<style>.seo-article{box-sizing:border-box;min-height:100vh;max-width:760px;margin:0 auto;padding:40px 22px;background:#0b0b0b;color:#e4e4e7;font:16px/1.8 Pretendard,system-ui,sans-serif}.seo-article h1{font-size:28px;line-height:1.3;color:#fff;margin:12px 0}.seo-article h2{font-size:20px;color:#fff;margin:28px 0 8px}.seo-article h3{font-size:17px;color:#fff;margin:20px 0 6px}.seo-article img{max-width:100%;height:auto}.seo-article a{color:#ffd60a}.seo-meta{color:#a1a1aa;font-size:14px}.seo-article .notion-columns{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:20px}.seo-article .notion-column{min-width:0}.seo-article .notion-table-wrap{max-width:100%;overflow-x:auto}.seo-article table{border-collapse:collapse;width:100%}.seo-article td{border:1px solid #3f3f46;padding:8px 12px}.seo-article .notion-file{display:inline-flex;padding:10px 14px;border:1px solid #3f3f46;border-radius:8px}.seo-article .notion-video{display:block;width:100%;max-height:70vh}.seo-article audio{max-width:100%}.seo-article ul,.seo-article ol{padding-left:22px}.seo-article li{margin:8px 0}.seo-article .seo-toc{display:flex;flex-wrap:wrap;gap:6px 16px;margin:18px 0}.seo-article section{margin-top:34px}.seo-langs{display:flex;flex-wrap:wrap;gap:8px 14px;margin:10px 0 18px;font-size:14px;color:#a1a1aa}.seo-langs strong{color:#fff}.seo-note{color:#a1a1aa;font-size:14px;border-top:1px solid #27272a;margin-top:32px;padding-top:16px}</style>`;

/* ------------------------------ 언어별 공유 카드 ------------------------------ */

/**
 * 언어별 카드 목록(manifest)을 읽습니다. 없으면 빈 객체 — 빌드는 그대로 진행되고
 * 해당 페이지는 기존처럼 커버 이미지/기본 카드를 씁니다.
 * (manifest 는 `npm run og:cards` 가 만듭니다 — scripts/og/build-og-cards.mjs)
 */
export function readOgLangManifest(warnings = []) {
  const file = path.join(REPO_ROOT, OG_LANG_MANIFEST_PATH);
  if (!fs.existsSync(file)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return data && typeof data === "object" ? data : {};
  } catch (e) {
    warnings.push(`언어별 카드 목록(${OG_LANG_MANIFEST_PATH})을 읽지 못했습니다: ${e?.message ?? e}`);
    return {};
  }
}

/* ------------------------------ 생성 (순수 함수) ------------------------------ */

/**
 * 스냅샷 → 파일 목록. 파일을 쓰지 않으므로 테스트에서 그대로 검사할 수 있습니다.
 * @param {{ rows: object[], pages?: object, template: string, siteUrl?: string }} input
 * @returns {{ files: Map<string, string>, pages: object[], skipped: object[], warnings: string[], siteUrl: string }}
 */
export function renderSeoSite({ rows, pages = {}, template: inputTemplate, siteUrl = DEFAULT_SITE_URL, ogManifest: ogManifestInput, ogLangManifest: ogLangManifestInput, translations: translationsInput } = {}) {
  let template = inputTemplate;
  const site = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  // 인라인 번들 → 공용 자산(assets/app.js · app.css). 이미 분리된 템플릿이면 그대로 둡니다.
  const assetSplit = externalizeAssets(template, site);
  template = assetSplit.template;
  const warnings = [];
  const skipped = [];
  const seen = new Set();
  const candidates = [];


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

  // 관련 글 후보 — 본문을 만들기 전에 제목·요약·날짜를 모아 둡니다(A5).
  const relatedPool = candidates.map((c) => ({
    type: c.type,
    slug: c.slug,
    title: c.row.Title ?? c.title,
    summary: seoFieldsOf(c.row).seoDescription || textOf(c.row.Summary),
    date: textOf(c.row.Date),
    // 관련 글 판단에 쓰는 노션 속성 — Category · Tool · Tags
    category: textOf(pickProp(c.row, ["Category", "카테고리"])),
    tool: textOf(pickProp(c.row, ["Tool"])),
    tags: pickProp(c.row, ["Tags"]),
  }));

  // 언어별 번역(사람이 검수한 것만) — 있으면 /en/ 같은 주소를 만듭니다(B).
  let translations = translationsInput;
  if (!translations) {
    const loaded = loadTranslations(REPO_ROOT);
    translations = loaded.translations;
    warnings.push(...loaded.warnings);
  }
  // `qna/refund/` 같은 키에 번역이 있는 언어 목록 — ko 페이지의 hreflang 묶음에 씁니다.
  const translatedKeys = new Map();
  for (const code of Object.keys(translations ?? {})) {
    for (const key of Object.keys(translations[code]?.entries ?? {})) {
      if (!translatedKeys.has(key)) translatedKeys.set(key, []);
      translatedKeys.get(key).push(code);
    }
  }
  // 번역 키는 `qna/slug`(끝 슬래시 없음)이고 페이지 경로는 `qna/slug/` 입니다 — 둘 다 맞춰 조회합니다.
  const langsForPath = (p) => ["ko", ...(translatedKeys.get(String(p).replace(/^\/+|\/+$/g, "")) ?? [])];

  const pageRecords = [];
  const files = new Map();
  if (assetSplit.js) files.set("assets/app.js", assetSplit.js);
  if (assetSplit.css) files.set("assets/app.css", assetSplit.css);

  /* 공유 이미지 · 로고 존재 확인 (없으면 경고만) */
  const defaultImageUrl = absoluteUrl(site, DEFAULT_OG_IMAGE_PATH);
  // 언어별 카드 목록 — 홈/목록/글의 og:image 가 기본 카드 대신 이 카드를 쓰게 합니다.
  // (manifest 는 `npm run og:cards` 가 만듭니다. 없으면 빈 객체 — 기존 동작 그대로)
  const ogLangManifest = ogLangManifestInput ?? readOgLangManifest(warnings);
  if (!fs.existsSync(path.join(REPO_ROOT, DEFAULT_OG_IMAGE_PATH))) {
    warnings.push(`기본 공유 이미지(${DEFAULT_OG_IMAGE_PATH})가 없습니다 — 링크 미리보기에 이미지가 나오지 않습니다.`);
  }
  if (!fs.existsSync(path.join(REPO_ROOT, ORG_LOGO_PATH))) {
    warnings.push(`로고(${ORG_LOGO_PATH})가 없습니다 — 지식 패널의 회사 로고가 비어 보입니다.`);
  }

  const siteLd = jsonLdGraph(site);

  // 글별 공유 이미지 로컬 사본 목록(있으면 로컬 주소를 우선 사용 — 노션 프록시 만료 대비)
  // (테스트에서는 ogManifest 를 직접 주입할 수 있습니다)
  let ogManifest = ogManifestInput;
  if (!ogManifest) {
    ogManifest = {};
    try {
      const manifestPath = path.join(REPO_ROOT, OG_MANIFEST_PATH);
      if (fs.existsSync(manifestPath)) ogManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) ?? {};
    } catch (e) {
      warnings.push(`공유 이미지 목록(${OG_MANIFEST_PATH})을 읽지 못했습니다: ${e?.message ?? e}`);
    }
  }

  for (const c of candidates) {
    const { row, type, slug, title } = c;
    const seo = seoFieldsOf(row);
    const coverRaw = fileUrlOf(pickProp(row, COVER_KEYS)) || textOf(row.__cover) || derivedCover(pages, row.id);
    const summary = textOf(row.Summary);
    const date = DATE_RE.test(textOf(row.Date)) ? textOf(row.Date) : "";
    // 우선순위: 노션 OG 이미지 속성 → **우리 도메인에 복사해 둔 사본** → 커버(노션 프록시) → 기본 이미지
    const localOg = localOgImageUrl(ogManifest, ogManifestKey(type, slug), site);
    // 언어별 카드 — 커버가 없는 글에만 씁니다(커버가 있으면 그 사진이 더 좋은 미리보기).
    const langCard = localizedOgImageUrl(ogLangManifest, "ko", routePathFor(type, slug), site);
    const meta = resolveArticleMeta(
      {
        title,
        summary,
        seoTitle: seo.seoTitle,
        seoDescription: seo.seoDescription,
        cover: coverRaw,
        ogImage: localOg || seo.ogImage || (coverRaw ? "" : langCard),
        date,
        type,
      },
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
    // 수정일 — 노션 `수정일`(또는 동기화가 기록한 `__modified`)만 인정합니다.
    // 작성일과 같으면 dateModified 를 넣지 않습니다(내용 없는 신호를 만들지 않기 위해).
    const modified = modifiedDateOf(row);
    const dateModified = modified && modified !== date ? modified : "";
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
        dateModified,
        author,
        answerText,
      }),
    };
    // 가이드(사용법)는 본문 소제목을 HowTo 단계로도 알려 줍니다 (절차형 인용 대응).
    const howToLd =
      type === "guide"
        ? howToJsonLd({
            url,
            name: meta.pageTitle,
            description: meta.description,
            image: meta.image,
            date,
            author,
            steps: howToSteps(blocks),
          })
        : null;
    const head = headBlock({
      title: meta.title,
      description: meta.description,
      url,
      ogType: "article",
      ogTitle: meta.ogTitle,
      ogDescription: meta.ogDescription,
      image: meta.image,
      publishedTime: meta.publishedTime,
      modifiedTime: dateModified,
      // 번역이 있는 글은 언어 전체를 서로 연결(hreflang 묶음). 없으면 ko + x-default.
      alternates: hreflangAlternates(site, `${c.prefix}/${slug}/`, langsForPath(`${c.prefix}/${slug}/`)),
      siteLd,
      articleLd,
      howToLd,
    });
    const relatedSubject = {
      type,
      slug,
      title,
      summary: seo.seoDescription || summary,
      date,
      category: textOf(pickProp(row, ["Category", "카테고리"])),
      tool: textOf(pickProp(row, ["Tool"])),
      tags: pickProp(row, ["Tags"]),
    };
    // Q&A 는 같은 Q&A 끼리보다 가이드·블로그로 이어 주는 편이 낫습니다(같은 Q&A 는 뒤에서 채움).
    const related =
      type === "faq"
        ? [
            ...relatedArticles(relatedSubject, relatedPool, { skipType: "faq" }),
            ...relatedArticles(relatedSubject, relatedPool, { limit: 2 }),
          ].filter((v, i, arr) => arr.findIndex((w) => w.type === v.type && w.slug === v.slug) === i).slice(0, 4)
        : relatedArticles(relatedSubject, relatedPool);
    // 관련도가 낮아 아무것도 못 고른 글은 **같은 섹션 최신 글**로 채웁니다.
    // (크롤러가 막다른 문서에 도착하지 않도록 — 글 → 글 경로는 항상 하나 이상 둡니다.)
    const byNewest = (a, b) =>
      String(b.date ?? "").localeCompare(String(a.date ?? "")) || String(a.slug).localeCompare(String(b.slug));
    const others = relatedPool.filter((p) => !(p.type === type && p.slug === slug));
    const relatedFinal = related.length
      ? related
      : [...others.filter((p) => p.type === type).sort(byNewest), ...others.filter((p) => p.type !== type).sort(byNewest)].slice(
          0,
          3,
        );
    const body = articleBodyHtml({
      prefix: c.prefix,
      type,
      title,
      date,
      author,
      summary,
      cover: coverRaw,
      blocks,
      related: relatedFinal,
    });
    const html = injectRoot(applyHead(template, head), body);
    files.set(`${c.prefix}/${slug}/index.html`, html);
    pageRecords.push({
      title,
      type,
      slug,
      url,
      description: meta.description,
      image: meta.image,
      pageTitle: meta.pageTitle,
      date,
      modified: dateModified || date,
      summary: oneLine(summary),
      author,
      pinned: isPinned(row),
      seq: pageRecords.length,
      bodyBlocks: blocks.length,
      // 번역 정렬 검사·번역 도구용 — 본문 블록 원형(번역 파일과 구조를 맞춰야 합니다)
      blocks,
      bodyImages: bodyImagesOf(blocks),
      bodyMedia: bodyMediaOf(blocks),
    });
  }

  /* ------------------------------ 홈(요약본) · 섹션 인덱스 ------------------------------ */
  // 홈과 목록 주소 4개(/post/ · /notice/ · /qna/ · /guide/)를 **정적 HTML** 로 만듭니다.
  // 앱(React)은 이 내용을 지우고 화면을 그리므로 사용자 화면은 그대로이고,
  // 자바스크립트를 실행하지 않는 AI 크롤러만 이 목록을 읽습니다.
  const groups = {
    notices: pageRecords.filter((p) => p.type === "notice").sort(byPinnedThenDate),
    news: pageRecords.filter((p) => p.type === "news").sort(byDateDesc),
    guides: pageRecords.filter((p) => p.type === "guide").sort((a, b) => a.seq - b.seq),
    blog: pageRecords.filter((p) => p.type === "blog").sort(byDateDesc),
    faq: pageRecords.filter((p) => p.type === "faq").sort((a, b) => a.seq - b.seq),
  };
  const allItems = [...groups.notices, ...groups.news, ...groups.guides, ...groups.blog, ...groups.faq];
  const newest = pageRecords
    .map((p) => p.modified || p.date)
    .filter(Boolean)
    .sort()
    .pop();

  const home = siteMetaFor("ko");
  const homeHead = headBlock({
    title: home.title,
    description: home.description,
    url: site,
    ogType: "website",
    ogTitle: home.ogTitle,
    ogDescription: home.ogDescription,
    image: localizedOgImageUrl(ogLangManifest, "ko", "", site) || defaultImageUrl,
    publishedTime: "",
    alternates: hreflangAlternates(site, "", [
      "ko",
      // 번역이 한 건이라도 있으면 그 언어의 홈(/en/ 등)이 만들어집니다.
      ...Object.keys(translations ?? {}).filter((code) => Object.keys(translations[code]?.entries ?? {}).length > 0),
    ]),
    siteLd: jsonLdGraph(site, [
      appJsonLd(),
      listJsonLd({
        url: site,
        siteUrl: site,
        name: home.title,
        description: home.description,
        items: allItems.map((p) => ({ url: p.url, name: p.pageTitle })),
      }),
    ]),
  });
  const homeBody = homeDigestHtml({
    groups,
    description: home.description,
    total: pageRecords.length,
    updated: newest,
  });
  files.set("index.html", injectRoot(applyHead(template, homeHead), homeBody));

  /* 섹션 인덱스 페이지 — 홈 → 목록 → 글 로 이어지는 크롤 경로 */
  const sectionRecords = [];
  for (const page of SECTION_PAGES) {
    const items = [
      ...page.types.flatMap((t) => pageRecords.filter((p) => p.type === t)),
    ].sort((a, b) => (a.type === "notice" ? byPinnedThenDate(a, b) : byDateDesc(a, b)));
    if (!items.length) continue; // 해당 섹션이 비어 있으면 목록 주소를 만들지 않습니다.
    const url = absoluteUrl(site, `${page.prefix}/`);
    const lastmod = items.map((p) => p.modified || p.date).filter(Boolean).sort().pop();
    const head = headBlock({
      title: page.title,
      description: page.description,
      url,
      ogType: "website",
      ogTitle: page.title,
      ogDescription: page.description,
      image: localizedOgImageUrl(ogLangManifest, "ko", `${page.prefix}/`, site) || defaultImageUrl,
      publishedTime: "",
      alternates: hreflangAlternates(site, `${page.prefix}/`, [
        "ko",
        ...Object.keys(translations ?? {}).filter((code) =>
          Object.keys(translations[code]?.entries ?? {}).some((k) => k.startsWith(`${page.prefix}/`)),
        ),
      ]),
      siteLd: jsonLdGraph(site, [
        listJsonLd({
          url,
          siteUrl: site,
          name: page.heading,
          description: page.description,
          items: items.map((p) => ({ url: p.url, name: p.pageTitle })),
        }),
      ]),
    });
    files.set(`${page.prefix}/index.html`, injectRoot(applyHead(template, head), sectionPageHtml({ page, items })));
    sectionRecords.push({ prefix: page.prefix, url, lastmod, count: items.length, heading: page.heading, description: page.description });
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
  files.set("404.html", injectRoot(applyHead(template, notFoundHead), notFoundBody));

  // 사이트맵 — 홈(전체 최신 갱신일) → 섹션 인덱스 → 글 순.
  // lastmod 는 "작성일 → 수정일" 순으로 채워, 날짜 속성이 없는 글도 값이 비지 않게 합니다.
  const sitemapUrls = [
    { loc: site, lastmod: newest },
    ...sectionRecords.map((s) => ({ loc: s.url, lastmod: s.lastmod })),
    ...pageRecords.map((p) => ({ loc: p.url, lastmod: p.modified || p.date || undefined })),
    // 노션 밖 정적 페이지(예: 스튜디오 19개 툴 사용자 가이드) — lastmod 는 생략
    ...EXTRA_INDEX_PAGES.map((file) => ({ loc: absoluteUrl(site, file) })),
  ];
  // (언어별 주소는 아래에서 합친 뒤 생성합니다)
  // 언어별 정적 페이지(/en/ 등) — 번역이 있는 글만. 앱 번들을 떼어 낸 정적 HTML 입니다.
  const localized = localizedPages({
    site,
    translations: translations ?? {},
    template, // 인라인 번들을 이미 걷어 낸(외부화된) 템플릿
    pageRecords,
    defaultImageUrl,
    ogLangManifest,
  });
  for (const [file, html] of localized.files) files.set(file, html);
  for (const msg of localized.missing) warnings.push(msg);
  const localizedBodies = localized.bodyCount ?? {};
  for (const u of localized.urls) sitemapUrls.push(u);
  // 앱(React)의 언어 전환기가 "이 경로에 번역 주소가 있나?" 를 확인하는 목록.
  // 있으면 /en/... 으로 이동하고, 없으면 지금처럼 번역 위젯으로 폴백합니다.
  if (Object.keys(localized.paths).length) {
    files.set("assets/i18n-paths.json", `${JSON.stringify(localized.paths, null, 2)}\n`);
  }
  files.set("sitemap.xml", sitemapXml(sitemapUrls));

  files.set("robots.txt", robotsTxt(site));
  // llms.txt — AI 도우미용 사이트 안내문(섹션 + 대표 글). 사이트맵과 같은 목록에서 만들어 항상 일치합니다.
  files.set(
    "llms.txt",
    llmsTxt({
      siteUrl: site,
      title: home.title,
      description: home.description,
      sections: [
        { heading: "XCONDA허브 홈", url: site, description: home.description },
        ...sectionRecords.map((s) => ({ heading: s.heading, url: s.url, description: s.description })),
        { heading: "스튜디오 19개 툴 완전 사용자 가이드", url: absoluteUrl(site, "user-guide.html") },
        // 번역 사이트가 있으면 llms.txt 에도 알려 줍니다(AI 가 영어 페이지를 찾도록).
        ...Object.keys(localized.paths ?? {}).map((code) => ({
          heading: `${langByCode(code)?.name ?? code} hub`,
          url: localizedUrl(site, code, ""),
          description: translations?.[code]?.site?.description ?? "",
        })),
      ],
      pages: pageRecords.map((p) => ({ type: p.type, title: p.pageTitle || p.title, url: p.url, summary: p.summary })),
    }),
  );

  return { files, pages: pageRecords, sections: sectionRecords, skipped, warnings, siteUrl: site, localizedBodies };
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
  const bodies = Object.entries(result.localizedBodies ?? {});
  if (bodies.length) {
    console.log(`  번역 본문(blocks) 있음 — ${bodies.map(([code, n]) => `${code} ${n}편`).join(" · ")}`);
  }
  for (const s of result.skipped) console.warn(`⚠️ [SEO] 주소 없음 — "${s.title}" (${s.type || "-"}): ${s.reasons.join(" / ")}`);
  for (const w of result.warnings) console.warn(`⚠️ [SEO] ${w}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${renderReportMarkdown(result)}\n`);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
