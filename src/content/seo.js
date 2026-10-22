/* =============================================================================
 * 글별 주소 · 메타 태그 · 사이트맵 규칙 — **사이트(src/)와 빌드 스크립트(scripts/)가 함께** 사용
 * -----------------------------------------------------------------------------
 * ▸ 글 주소(정식 URL)
 *     news · blog  → /post/{slug}/
 *     notice       → /notice/{slug}/
 *     faq (Q&A)    → /qna/{slug}/
 *     guide        → /guide/{slug}/
 *   {slug} 는 노션 `Slug` 속성(영문 소문자 · 숫자 · 하이픈). 비어 있거나 형식이 틀리면 주소를 만들지 않습니다.
 *
 * ▸ 주소를 만들 수 있는 글(= 정적 페이지 · 사이트맵 · 앱 딥링크 대상)의 조건
 *     1) Slug 가 있고 형식이 맞음
 *     2) `SEO 준비됨` 속성이 있는 글이면 켜져 있어야 함 — 속성 자체가 행에 없으면(뉴스 DB 에
 *        그 칸이 없거나, 있어도 공개 수집(recordMap)으로 수식 값이 오지 않으면) Slug 만 봅니다.
 *        2026-10-22 GEO 진단 A0: 실제로 이 칸이 스냅샷 전 행에 없어 블로그·공지·뉴스·가이드
 *        전부가 주소 없이 막혀 있던 것을 확인하고 규칙을 바꿈. 검수 게이트를 다시 쓰려면
 *        노션에 `SEO 준비됨` 체크박스(수식보다 수집이 확실)를 만들고 준비된 글만 체크하세요.
 *     3) 게시 여부(Published · 허브 게시)는 스냅샷 생성 단계에서 이미 걸러져 있음
 *   조건을 못 채운 글은 사이트 목록에는 그대로 나오지만, 주소 페이지 · 사이트맵에서는 빠지고
 *   빌드 로그와 Actions 요약에 이유가 남습니다.
 *
 * ▸ 메타 값 우선순위 (값이 없으면 다음 칸)
 *     title        : SEO 제목 → Title → 사이트 기본 제목
 *     description  : SEO 설명 → Summary(120자 안팎으로 자름) → 사이트 기본 설명
 *     og:image     : OG 이미지 → Cover(썸네일 규칙) → 사이트 기본 이미지
 *     글 주소      : Slug → (없으면 주소 없음)
 *
 * ⚠️ 이 파일을 고치면 빌드 스크립트와 앱이 동시에 바뀝니다. 수정 후 `npm run test:unit` 을 실행하세요.
 * ========================================================================== */

/** 사이트 이름 (페이지 제목 접미사 · og:site_name) */
export const SITE_NAME = "XCONDA허브";

/**
 * 허브의 정식 주소(끝에 / 포함). 허브 전용 도메인입니다 (DNS 설정 요청 중).
 * 빌드 환경 변수 `SITE_URL`(GitHub Actions Variables) 로 덮어쓸 수 있습니다.
 */
export const DEFAULT_SITE_URL = "https://hub.xconda.ai/";

/** 저장소 루트 기준 기본 공유 이미지 (1200×630). 글별 이미지가 없을 때 씁니다. */
export const DEFAULT_OG_IMAGE_PATH = "assets/img/og/xconda-hub-1200x630.png";

/**
 * 언어별 사이트 제목 · 설명. 한국어 값은 이 한 곳에서만 관리합니다
 * (index.html 의 빌드 결과 · 앱 런타임 `META` 가 모두 여기서 가져옵니다).
 */
export const SITE_META = {
  ko: {
    title: "XCONDA허브 — 공지사항 · 뉴스 · 툴 사용법 · 블로그 · Q&A",
    description: "XCONDA허브에서 공지사항, 타 SNS 뉴스, 툴 사용법, 블로그, Q&A를 한곳에 확인하세요.",
  },
  en: {
    title: "XCONDA Hub — Notices, News, Tool Guides, Blog & Q&A",
    description: "XCONDA Hub gathers notices, social news, tool guides, blog posts and Q&A in one place.",
  },
  ja: {
    title: "XCONDAハブ — お知らせ · ニュース · ツール使い方 · ブログ · Q&A",
    description: "XCONDAの通知、SNSニュース、ツールガイド、ブログ、Q&Aを1ページで確認できます。",
  },
  "zh-CN": {
    title: "XCONDA中心 — 公告 · 新闻 · 工具使用指南 · 博客 · Q&A",
    description: "在 XCONDA 中心一站式查看公告、社媒新闻、工具使用指南、博客与 Q&A。",
  },
};

/** 섹션 유형 → 주소 앞부분 (route prefix) */
export const ROUTE_PREFIX = {
  news: "post",
  blog: "post",
  notice: "notice",
  faq: "qna",
  guide: "guide",
};

/** 주소 앞부분 → 그 주소에 들어갈 수 있는 섹션 유형 */
export const ROUTE_TYPES = {
  post: ["news", "blog"],
  notice: ["notice"],
  qna: ["faq"],
  guide: ["guide"],
};

/** 영문 소문자 · 숫자 · 하이픈 (예: flexboard-storyboard) */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SUMMARY_MAX = 120;
/** 검색 결과에서 잘리지 않는 권장 길이 (경고 기준) */
export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 160;

/** 노션 속성 이름 (대소문자 · 앞뒤 공백 무시). 이름을 바꾸면 여기만 고칩니다. */
export const SLUG_KEYS = ["Slug"];
export const SEO_TITLE_KEYS = ["SEO 제목"];
export const SEO_DESCRIPTION_KEYS = ["SEO 설명"];
export const OG_IMAGE_KEYS = ["OG 이미지", "OG Image", "OG Image URL"];
export const SEO_READY_KEYS = ["SEO 준비됨"];

const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

/** 값 → 한 줄 문자열 (배열은 이어 붙이고, 파일 목록 등은 빈 값으로 둡니다) */
export function textOf(value) {
  if (Array.isArray(value)) return value.map((part) => (typeof part === "string" ? part : "")).join("").trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/** 속성 이름 목록 중 행에 있는 첫 값 (대소문자 · 공백 무시) */
export function pickProp(row, names) {
  if (!isRecord(row)) return undefined;
  const keys = Object.keys(row);
  for (const name of names) {
    const hit = keys.find((k) => k.trim().toLowerCase() === name.toLowerCase());
    if (hit !== undefined) return row[hit];
  }
  return undefined;
}

/** 파일 속성 → 이미지 주소 (스냅샷은 `[{ name, url }]`, 공개 프록시는 문자열일 수 있음) */
export function fileUrlOf(value) {
  if (Array.isArray(value)) {
    const first = value[0];
    if (isRecord(first)) return textOf(first.url ?? first.rawUrl ?? "");
    return textOf(first);
  }
  return textOf(value);
}

/**
 * 입력한 Slug 를 정리합니다. 공백 · 밑줄은 하이픈으로, 대문자는 소문자로 바꿉니다.
 * 한글 등 허용되지 않는 문자는 그대로 남기므로 `isValidSlug` 에서 걸립니다.
 */
export function normalizeSlug(raw) {
  return textOf(raw)
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export const isValidSlug = (slug) => SLUG_PATTERN.test(String(slug ?? ""));

/** `SEO 준비됨` 값 해석 — 체크박스(true) 또는 수식이 낸 문자열(Yes/✅ 등) */
export function isSeoReady(value) {
  if (value === true) return true;
  const v = textOf(value).toLowerCase();
  return ["yes", "true", "y", "1", "✓", "✔", "✅", "☑", "준비됨", "체크", "완료"].includes(v);
}

/** 섹션 유형 → 주소 앞부분 (없으면 주소 규칙이 없는 유형) */
export const routePrefixFor = (type) => ROUTE_PREFIX[type] ?? null;

/** 사이트 기준 상대 주소. 예: ("news", "flexboard-storyboard") → "post/flexboard-storyboard/" */
export function routePathFor(type, slug) {
  const prefix = routePrefixFor(type);
  return prefix && slug && isValidSlug(slug) ? `${prefix}/${slug}/` : null;
}

/**
 * 현재 주소(pathname)에서 글 주소를 읽습니다. 하위 경로(예: /XCONDA_info/post/abc/)도 인식합니다.
 * @returns {{ prefix: string, slug: string } | null}
 */
export function parseRoute(pathname) {
  const m = /(?:^|\/)(post|notice|qna|guide)\/([^/?#]+)\/?$/.exec(String(pathname ?? ""));
  if (!m) return null;
  let slug = m[2];
  try {
    slug = decodeURIComponent(slug);
  } catch {
    /* 잘못된 인코딩은 그대로 둡니다 */
  }
  return { prefix: m[1], slug };
}

/**
 * 허브가 놓인 기본 경로(항상 / 로 끝남). 글 주소에서 `post/abc/` 같은 부분을 떼어 냅니다.
 *   "/XCONDA_info/post/abc/" → "/XCONDA_info/"   "/XCONDA_info/dev.html" → "/XCONDA_info/"
 */
export function hubBaseFromPathname(pathname) {
  const p = String(pathname ?? "/");
  const dir = p.endsWith("/") ? p : p.replace(/[^/]*$/, "");
  const base = dir.replace(/(?:^|\/)(?:post|notice|qna|guide)\/[^/]+\/$/, "/");
  return base.startsWith("/") ? base : `/${base}`;
}

/** 사이트 주소 + 상대 경로 → 절대 주소 */
export function absoluteUrl(siteUrl, relativePath = "") {
  const base = String(siteUrl || DEFAULT_SITE_URL);
  const withSlash = base.endsWith("/") ? base : `${base}/`;
  return new URL(String(relativePath).replace(/^\//, ""), withSlash).href;
}

/**
 * 본문 요약을 검색 설명용 길이로 자릅니다. 단어 경계에서 끊고 말줄임표(…)를 붙입니다.
 */
export function summarize(raw, max = SUMMARY_MAX) {
  const s = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const space = cut.lastIndexOf(" ");
  const head = space > max * 0.6 ? cut.slice(0, space) : cut;
  return `${head.replace(/[\s,.;:·\-]+$/, "")}…`;
}

/**
 * 글 한 건의 주소 가능 여부 판정.
 * @param {object} row 스냅샷 행 (노션 속성 이름이 키)
 * @param {string} type 섹션 유형 (news · blog · notice · faq · guide)
 * @returns {{ eligible: boolean, slug: string, reasons: string[] }}
 */
export function seoEligibility(row, type) {
  const reasons = [];
  const slug = normalizeSlug(textOf(pickProp(row, SLUG_KEYS)));
  if (!slug) reasons.push("Slug 없음");
  else if (!isValidSlug(slug)) reasons.push(`Slug 형식 오류 "${slug}" (영문 소문자 · 숫자 · 하이픈만 사용)`);
  if (!routePrefixFor(type)) reasons.push(`섹션 ${type ?? "(없음)"} 은 주소 규칙이 없음`);
  // `SEO 준비됨` 검수 게이트 — 속성이 "있는데 꺼져 있을 때만" 주소를 막습니다.
  // 속성 자체가 없으면 칸이 없는 것으로 보고 Slug 만 확인합니다 (Q&A 표가 원래 이 경우).
  const readyRaw = pickProp(row, SEO_READY_KEYS);
  if (readyRaw !== undefined && !isSeoReady(readyRaw)) {
    reasons.push("SEO 준비됨 꺼짐");
  }
  return { eligible: reasons.length === 0, slug, reasons };
}

/** 행에서 SEO 관련 값만 꺼냅니다. (없는 값은 빈 문자열) */
export function seoFieldsOf(row) {
  return {
    seoTitle: textOf(pickProp(row, SEO_TITLE_KEYS)),
    seoDescription: textOf(pickProp(row, SEO_DESCRIPTION_KEYS)),
    ogImage: fileUrlOf(pickProp(row, OG_IMAGE_KEYS)),
  };
}

/**
 * 글 한 건의 메타 값을 우선순위대로 정합니다. (사이트 빌드 · 앱 공용)
 * @param {{ title?: string, summary?: string, seoTitle?: string, seoDescription?: string,
 *           cover?: string, ogImage?: string, date?: string, type?: string }} entry
 * @param {{ defaultImageUrl?: string }} [options] 기본 공유 이미지 주소(절대)
 */
export function resolveArticleMeta(entry, { defaultImageUrl = "" } = {}) {
  const pageTitle = textOf(entry.seoTitle) || textOf(entry.title) || SITE_NAME;
  const description =
    textOf(entry.seoDescription) || summarize(entry.summary) || SITE_META.ko.description;
  const image = textOf(entry.ogImage) || textOf(entry.cover) || defaultImageUrl;
  const published = /^\d{4}-\d{2}-\d{2}/.test(textOf(entry.date)) ? textOf(entry.date).slice(0, 10) : "";
  return {
    pageTitle,
    /** <title> — 검색 결과 제목 (사이트 이름을 뒤에 붙입니다) */
    title: `${pageTitle} | ${SITE_NAME}`,
    description,
    ogTitle: pageTitle,
    ogDescription: description,
    image,
    publishedTime: published,
  };
}

/** 사이트 홈 메타 (언어별). 글이 없을 때 쓰는 기본값입니다. */
export function siteMetaFor(lang = "ko") {
  const meta = SITE_META[lang] ?? SITE_META.ko;
  return { title: meta.title, description: meta.description, ogTitle: meta.title, ogDescription: meta.description };
}

/** 사이트맵 XML 생성. urls: [{ loc, lastmod? }] */
export function sitemapXml(urls) {
  const body = urls
    .map(({ loc, lastmod }) => `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : ""}\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/** robots.txt — 모든 크롤러 허용 + 사이트맵 위치 */
export function robotsTxt(siteUrl) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl(siteUrl, "sitemap.xml")}\n`;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/* ------------------------------ 구조화 데이터(JSON-LD) ------------------------------ *
 * AI·검색엔진에 "이 사이트·글이 무엇인지"를 기계가 읽는 명찰로 알려줍니다 (보고서 B1·B3).
 * 빌드(scripts/build-seo.mjs)가 홈·글별 페이지의 <head> 에 넣습니다. 앱 런타임은 건드리지
 * 않으므로, 목록에서 연 글(모달)에는 정적 페이지의 명찰이 그대로 기준이 됩니다.
 * 명찰 내용은 화면에 보이는 값과 같아야 합니다 — 아래 함수들은 메타와 같은 값을 받습니다.
 * ----------------------------------------------------------------------------------- */

/** 운영사(큐브베리)의 전역 식별자 — www 에도 같은 @id 를 써서 두 사이트를 한 회사로 묶습니다. */
export const ORG_ID = "https://www.xconda.ai/#org";
/** 메인 사이트(제품) 주소 */
export const WWW_URL = "https://www.xconda.ai";
/** 저장소에 실제로 있는 로고 파일 (Organization logo) */
export const ORG_LOGO_PATH = "assets/img/logo/xconda-mark.svg";

/**
 * 공식 채널 (Organization sameAs) — `src/content/channels.tsx` 의 CHANNELS 와 같은
 * 값을 유지하세요. 이 파일은 빌드 스크립트도 쓰므로 tsx 를 import 할 수 없어 값을 둡니다.
 */
export const OFFICIAL_SAME_AS = [
  "https://x.com/Xconda_official",
  "https://www.threads.com/@xconda_official",
  "https://www.youtube.com/@xconda_korea",
  "https://www.instagram.com/xconda_ai/",
  "https://blog.naver.com/dramajustice",
];

/** 전 페이지 공통 명찰: 운영사(Organization) + 이 사이트(WebSite) */
export function siteJsonLd(siteUrl = DEFAULT_SITE_URL) {
  const site = absoluteUrl(siteUrl, "");
  return [
    {
      "@type": "Organization",
      "@id": ORG_ID,
      name: "Cubeberry Co., Ltd.",
      alternateName: ["큐브베리", "주식회사 큐브베리"],
      url: WWW_URL,
      logo: absoluteUrl(siteUrl, ORG_LOGO_PATH),
      sameAs: [WWW_URL, site.replace(/\/$/, ""), ...OFFICIAL_SAME_AS],
    },
    {
      "@type": "WebSite",
      "@id": `${site}#website`,
      url: site,
      name: SITE_NAME,
      publisher: { "@id": ORG_ID },
      inLanguage: "ko-KR",
    },
  ];
}

/**
 * 글 한 건의 명찰. 블로그 → BlogPosting, 뉴스 → NewsArticle, 공지·가이드 → Article,
 * Q&A → FAQPage(질문=제목, 답변=answerText). 값은 resolveArticleMeta 와 같은 재료로 만듭니다.
 */
export function articleJsonLd({ type, url, headline, description, image, date, author, answerText }) {
  const base = { publisher: { "@id": ORG_ID }, inLanguage: "ko-KR" };
  if (type === "faq") {
    return {
      "@type": "FAQPage",
      ...base,
      mainEntity: [
        {
          "@type": "Question",
          name: textOf(headline),
          acceptedAnswer: { "@type": "Answer", text: textOf(answerText) || textOf(description) },
        },
      ],
    };
  }
  const article = {
    "@type": type === "blog" ? "BlogPosting" : type === "news" ? "NewsArticle" : "Article",
    ...base,
    headline: textOf(headline),
    description: textOf(description),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
  if (textOf(image)) article.image = [textOf(image)];
  if (/^\d{4}-\d{2}-\d{2}/.test(textOf(date))) article.datePublished = textOf(date).slice(0, 10);
  article.author = textOf(author) ? { "@type": "Person", name: textOf(author) } : { "@id": ORG_ID };
  return article;
}

/** 사이트 공통 + 페이지별 명찰을 하나의 @graph 스크립트로 묶습니다. */
export function jsonLdGraph(siteUrl = DEFAULT_SITE_URL, extra = []) {
  return { "@context": "https://schema.org", "@graph": [...siteJsonLd(siteUrl), ...extra.filter(Boolean)] };
}
