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
 * 글별 공유 이미지를 **우리 도메인에 복사해 두는 폴더**와 그 목록(manifest) 파일.
 *
 * 배경: 노션 커버는 `www.notion.so/image/...` 프록시 주소입니다. 서명 파라미터가 만료되거나
 * 노션이 정책을 바꾸면 **모든 글의 og:image · JSON-LD image 가 한꺼번에 깨집니다**
 * (링크 미리보기·AI 인용 카드가 빈칸이 됨). 그래서 빌드가 아니라 별도 스크립트
 * (`scripts/localize-og-images.mjs`)가 이미지를 내려받아 이 폴더에 두고,
 * manifest 에 있는 글은 **로컬 파일 주소를 우선** 씁니다.
 */
/* ---------------------------------------------------------------------------
 * 관련 글 연결 (2026-10-25 A5)
 *   크롤러가 "글 → 글"로 이동할 길이 없으면 각 글은 막다른 문서가 됩니다.
 *   제목·요약의 글자 2-gram 이 겹치는 정도로 관련도를 재고, 같은 섹션이면 가산합니다.
 *   입력이 같으면 결과도 항상 같도록(멱등) 정렬 기준을 고정합니다.
 * ------------------------------------------------------------------------ */

/** 비교용 토큰 — 공백·문장부호를 지우고 소문자로 만든 뒤 2글자씩 쪼갭니다(한국어 조사 변화에 강함). */
export function linkTokens(text) {
  const s = String(text ?? "")
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]+/g, "");
  const out = new Set();
  if (s.length < 2) {
    if (s) out.add(s);
    return out;
  }
  for (let i = 0; i < s.length - 1; i += 1) out.add(s.slice(i, i + 2));
  return out;
}

/** `Tags` 값(문자열·배열·"['#A #B']" 형태)에서 해시태그만 뽑아 소문자 집합으로 만듭니다. */
export function tagSetOf(value) {
  const raw = Array.isArray(value) ? value.flat().join(" ") : String(value ?? "");
  const out = new Set();
  for (const m of raw.matchAll(/#([0-9a-z가-힣]+)/gi)) out.add(m[1].toLowerCase());
  return out;
}

/**
 * 관련 글 고르기 — 노션의 `Category` · `Tool` · `Tags` 를 1순위 신호로 쓰고,
 * 제목·요약의 2-gram 겹침을 보조로 씁니다.
 *   같은 카테고리 +6 · 같은 툴 +4 · 같은 해시태그 +4 · 제목 2-gram +1(개당, 최대 4)
 * 점수가 같으면 최신 글 → slug 순으로 고정해, 같은 입력이면 항상 같은 결과가 나옵니다.
 *
 * @param {{ type: string, slug: string, title: string, summary?: string, date?: string,
 *           category?: string, tool?: string, tags?: unknown }} current
 * @param {Array<object>} pool 같은 모양의 후보 전체
 * @param {{ limit?: number, minScore?: number, skipType?: string }} [opts]
 *   `skipType` 은 그 섹션 글을 후보에서 뺍니다 — Q&A 에서는 같은 Q&A 보다
 *   가이드·블로그로 보내는 편이 읽는 사람과 크롤러 모두에게 낫습니다.
 */
export function relatedArticles(current, pool, { limit = 4, minScore = 4, skipType = "" } = {}) {
  if (!current || !Array.isArray(pool)) return [];
  const baseTokens = linkTokens(current.title);
  const baseTags = tagSetOf(current.tags);
  const baseCategory = String(current.category ?? "").trim().toLowerCase();
  const baseTool = String(current.tool ?? "").trim().toLowerCase();
  const scored = [];
  for (const item of pool) {
    if (!item) continue;
    if (item.type === current.type && item.slug === current.slug) continue; // 자기 자신 제외
    if (skipType && item.type === skipType) continue;

    let score = 0;
    const category = String(item.category ?? "").trim().toLowerCase();
    if (baseCategory && category && category === baseCategory) score += 6;
    const tool = String(item.tool ?? "").trim().toLowerCase();
    if (baseTool && tool && tool === baseTool) score += 4;
    const tags = tagSetOf(item.tags);
    for (const t of tags) if (baseTags.has(t)) score += 4;
    if (score === 0) {
      let grams = 0;
      for (const t of linkTokens(item.title)) if (baseTokens.has(t)) grams += 1;
      score += Math.min(grams, 4);
    }
    if (score < minScore) continue;
    if (item.type === current.type) score += 1; // 그래도 같은 섹션이 조금 유리
    scored.push({ item, score });
  }
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      String(b.item.date ?? "").localeCompare(String(a.item.date ?? "")) ||
      String(a.item.slug ?? "").localeCompare(String(b.item.slug ?? "")),
  );
  return scored.slice(0, limit).map((s) => s.item);
}

/**
 * 노션 글이 아니지만 검색에 노출할 정적 페이지(저장소 루트의 html 파일).
 *  - `user-guide.html`: XCONDA 스튜디오 19개 툴 완전 가이드 — 공개용이라 색인 대상입니다.
 *  - `admin-guide.html`: 노션 운영 매뉴얼 — 내부용이라 색인하지 않습니다(noindex). 그래서 여기 없습니다.
 * 사이트맵 lastmod 는 넣지 않습니다: 파일 수정 시각은 체크아웃마다 달라져 빌드가 흔들립니다.
 */
export const EXTRA_INDEX_PAGES = ["user-guide.html"];

export const OG_LOCAL_DIR = "assets/img/og/posts";
export const OG_MANIFEST_PATH = `${OG_LOCAL_DIR}/manifest.json`;

/** manifest 키 — 주소 규칙(`post/…`)과 1:1로 맞춥니다. */
export function ogManifestKey(type, slug) {
  const prefix = routePrefixFor(type);
  return prefix && slug ? `${prefix}/${slug}` : "";
}

/**
 * manifest 에 있으면 로컬(우리 도메인) 이미지 주소를, 없으면 빈 문자열을 돌려줍니다.
 * @param {Record<string, string>} manifest `{ "post/slug": "file.png" }`
 * @param {string} key `ogManifestKey()` 결과
 * @param {string} siteUrl 사이트 주소 (끝 / 허용)
 */
export function localOgImageUrl(manifest, key, siteUrl = DEFAULT_SITE_URL) {
  const file = isRecord(manifest) ? manifest[key] : "";
  if (typeof file !== "string" || !file.trim()) return "";
  return absoluteUrl(siteUrl, `${OG_LOCAL_DIR}/${file.trim()}`);
}

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

/**
 * 섹션 인덱스 페이지 — `/post/` 처럼 **목록 주소**를 정적으로 만듭니다.
 * -----------------------------------------------------------------------------
 * 전에는 글 95개가 사이트맵에만 있고 서로를 가리키지 않아, 크롤러가 홈에서 1단계 더
 * 들어갈 곳이 없었습니다. 이 4개 페이지가 그 다리 역할을 합니다(홈 → 목록 → 글).
 * `anchor` 는 앱에서 같은 주소로 들어왔을 때 스크롤할 섹션 id 입니다.
 */
export const SECTION_PAGES = [
  {
    prefix: "post",
    anchor: "news",
    types: ["news", "blog"],
    heading: "뉴스 · 블로그",
    title: "뉴스 · 블로그 | XCONDA허브",
    description:
      "XCONDA(엑스콘다)의 새 AI 모델 소식, 영상 제작 워크플로우, 컷 연결·캐릭터 일관성 같은 제작 심화 글을 모았습니다.",
  },
  {
    prefix: "notice",
    anchor: "notices",
    types: ["notice"],
    heading: "공지사항",
    title: "공지사항 | XCONDA허브",
    description: "XCONDA(엑스콘다)의 서비스 변경, 점검, 요금·정책 업데이트와 프로모션 소식을 모았습니다.",
  },
  {
    prefix: "qna",
    anchor: "faq",
    types: ["faq"],
    heading: "Q&A",
    title: "Q&A | XCONDA허브",
    description:
      "XCONDA(엑스콘다) 사용 중 자주 묻는 질문과 답변 — 요금·크레딧·환불, FLEXBOARD·Turn·블로킹 보드 사용법, 저작권·개인정보까지 정리했습니다.",
  },
  {
    prefix: "guide",
    anchor: "guides",
    types: ["guide"],
    heading: "툴 사용법",
    title: "툴 사용법 | XCONDA허브",
    description: "XCONDA(엑스콘다)의 FLEXBOARD·Turn·블로킹 보드를 실제 화면 순서대로 따라 하는 사용 가이드입니다.",
  },
];

/** 주소 앞부분으로 섹션 인덱스 정보 찾기 (없으면 null) */
export function sectionPageForPrefix(prefix) {
  return SECTION_PAGES.find((page) => page.prefix === prefix) ?? null;
}

/**
 * 현재 주소가 섹션 인덱스(`/post/` 등, 하위 경로 포함)면 그 정보를 돌려줍니다.
 * 글 주소(`/post/{slug}/`)는 해당되지 않습니다.
 */
export function sectionPageFromPathname(pathname) {
  const m = /(?:^|\/)(post|notice|qna|guide)\/?$/.exec(String(pathname ?? ""));
  return m ? sectionPageForPrefix(m[1]) : null;
}

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
/**
 * 수정일 속성 이름. 우선순위: `수정일` → `Modified` → 스냅샷이 기록한 `__modified`(노션
 * last_edited_time) → 작성일(`Date`). 값이 없으면 dateModified 자체를 넣지 않습니다.
 */
export const MODIFIED_KEYS = ["수정일", "Modified", "최종 수정일"];

/** 행에서 "마지막으로 고친 날짜"를 고릅니다 (YYYY-MM-DD). 없으면 빈 문자열. */
export function modifiedDateOf(row, fallback = "") {
  const raw = [textOf(pickProp(row, MODIFIED_KEYS)), textOf(row?.__modified), textOf(fallback)].find((v) =>
    /^\d{4}-\d{2}-\d{2}/.test(v)
  );
  return raw ? raw.slice(0, 10) : "";
}

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
  // 표준 네임스페이스는 `http://www.sitemaps.org/schemas/sitemap/0.9` 입니다(복수형).
  // 한동안 `sitemap.org`(단수)로 나가 있었습니다 — Google 은 너그럽게 넘기지만
  // 일부 검증 도구 · AI 크롤러는 스키마 불일치로 사이트맵을 통째로 무시합니다.
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/** robots.txt — 모든 크롤러 허용 + 사이트맵 위치 */
export function robotsTxt(siteUrl) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl(siteUrl, "sitemap.xml")}\n`;
}

/**
 * llms.txt — AI 도우미가 사이트 구조를 한 번에 파악하도록 만드는 짧은 안내문.
 * 형식: llmstxt.org (H1 제목 · 인용 요약 · 섹션별 링크 목록).
 *   - 링크는 **절대 주소**로 적습니다(AI 가 인용할 때 그대로 쓰기 때문).
 *   - 순서는 입력 순서를 고정(섹션 정의 순 → 최신순)해 같은 입력이면 같은 파일이 됩니다.
 * @param {{ siteUrl: string, title: string, description: string,
 *           sections: Array<{heading: string, url: string, description?: string}>,
 *           pages: Array<{type: string, title: string, url: string, summary?: string}>,
 *           perSection?: number }} input
 */
export function llmsTxt({ siteUrl, title, description, sections = [], pages = [], perSection = 20 }) {
  const bySection = new Map();
  for (const p of pages) {
    if (!bySection.has(p.type)) bySection.set(p.type, []);
    bySection.get(p.type).push(p);
  }
  const LABEL = { guide: "툴 사용법", notice: "공지사항", news: "뉴스", blog: "블로그", faq: "Q&A" };
  const ORDER = ["guide", "notice", "news", "blog", "faq"];
  const lines = [`# ${title}`, "", `> ${description}`, ""];
  if (sections.length) {
    lines.push("## 섹션", "");
    for (const s of sections) {
      lines.push(`- [${s.heading}](${s.url})${s.description ? `: ${s.description}` : ""}`);
    }
    lines.push("");
  }
  for (const type of ORDER) {
    const items = bySection.get(type);
    if (!items?.length) continue;
    lines.push(`## ${LABEL[type] ?? type}`, "");
    for (const p of items.slice(0, perSection)) {
      // 한 줄 160자 안팎 — AI 가 통째로 읽기 좋은 길이로 자릅니다.
      const full = String(p.summary ?? "").replace(/\s+/g, " ").trim();
      const desc = full.length > 160 ? `${full.slice(0, 158).trimEnd()}…` : full;
      lines.push(`- [${p.title}](${p.url})${desc ? `: ${desc}` : ""}`);
    }
    if (items.length > perSection) lines.push(`- … 외 ${items.length - perSection}건은 ${absoluteUrl(siteUrl, "sitemap.xml")} 참고`);
    lines.push("");
  }
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
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
/**
 * 저장소에 실제로 있는 로고 파일 (Organization logo).
 * 구글 로고 규격은 **래스터(PNG·JPG) 112×112 이상**입니다 — SVG 는 지식 패널·리치 결과에서
 * 표시되지 않아, 같은 도안을 512×512 PNG 로 렌더해 둔 파일을 씁니다
 * (`assets/img/logo/xconda-logo-512.png`, 원본 SVG 는 `xconda-mark.svg`).
 */
export const ORG_LOGO_PATH = "assets/img/logo/xconda-logo-512.png";
/** 제품(서비스) 이름 — 회사(큐브베리)와 구분해 Brand 로 선언합니다. */
export const BRAND_NAME = "XCONDA";
/** 제품(SoftwareApplication)의 전역 식별자 — www 에서 같은 @id 를 쓰면 하나로 합쳐집니다. */
export const APP_ID = "https://www.xconda.ai/#app";

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
      // 회사(큐브베리)와 제품(XCONDA)을 분리해 선언합니다. 이게 없으면 AI 는
      // "XCONDA" 라는 이름을 회사 별칭으로만 보고, 제품 엔터티로 인식하지 못합니다.
      brand: { "@type": "Brand", name: BRAND_NAME, alternateName: ["엑스콘다"] },
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
 * 제품 명찰 (SoftwareApplication). 가격(Offer)은 **가격이 실제로 적힌 페이지**(www 요금·패키지)에
 * 선언해야 합니다 — 허브에서 숫자를 따로 적으면 화면 값과 어긋나 검색엔진이 불일치로 봅니다.
 * 그래서 여기서는 제품 정체성만 선언하고 `offers` 는 넣지 않습니다.
 */
export function appJsonLd() {
  return {
    "@type": "SoftwareApplication",
    "@id": APP_ID,
    name: BRAND_NAME,
    alternateName: ["엑스콘다"],
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    url: WWW_URL,
    inLanguage: "ko-KR",
    publisher: { "@id": ORG_ID },
    description:
      "광고·드라마용 AI 스토리보드와 영상을 만드는 SaaS 플랫폼. 시나리오 한 편으로 컷별 스토리보드(FLEXBOARD)를 만들고, 360도 가상 세트(Turn)와 블로킹 보드로 인물·공간·구도를 고정한 뒤 영상으로 넘깁니다.",
  };
}

/**
 * 목록형 페이지 명찰 (홈·섹션 인덱스). `ItemList` 로 "이 페이지에 어떤 글이 있는지"를
 * 기계가 순서대로 읽게 합니다 — AI 가 "XCONDA 허브에 무슨 자료가 있나"를 한 번에 파악합니다.
 */
export function listJsonLd({ url, name, description, items = [], siteUrl = DEFAULT_SITE_URL }) {
  return {
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    url,
    name: textOf(name),
    description: textOf(description),
    inLanguage: "ko-KR",
    isPartOf: { "@id": `${absoluteUrl(siteUrl, "")}#website` },
    publisher: { "@id": ORG_ID },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: item.url,
        name: textOf(item.name),
      })),
    },
  };
}


/**
 * 글 한 건의 명찰. 블로그 → BlogPosting, 뉴스 → NewsArticle, 공지·가이드 → Article,
 * Q&A → FAQPage(질문=제목, 답변=answerText). 값은 resolveArticleMeta 와 같은 재료로 만듭니다.
 */
export function articleJsonLd({ type, url, headline, description, image, date, dateModified, author, answerText, siteUrl = DEFAULT_SITE_URL }) {
  const base = { publisher: { "@id": ORG_ID }, inLanguage: "ko-KR" };
  if (type === "faq") {
    return {
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      url,
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
    "@id": `${url}#article`,
    ...base,
    headline: textOf(headline),
    description: textOf(description),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    // 사이트(@graph)와 글을 같은 개체 묶음으로 연결 — 다른 스크립트에 있어도 @id 로 이어집니다.
    isPartOf: { "@id": `${absoluteUrl(siteUrl, "")}#website` },
  };
  if (textOf(image)) article.image = [textOf(image)];
  if (/^\d{4}-\d{2}-\d{2}/.test(textOf(date))) article.datePublished = textOf(date).slice(0, 10);
  // 최신성 신호 — 없으면 AI 가 "이 글이 언제 고쳐졌는지" 판단하지 못합니다.
  if (/^\d{4}-\d{2}-\d{2}/.test(textOf(dateModified))) article.dateModified = textOf(dateModified).slice(0, 10);
  article.author = textOf(author) ? { "@type": "Person", name: textOf(author) } : { "@id": ORG_ID };
  return article;
}

/**
 * 사용법(가이드) 글의 절차 명찰. 본문 소제목을 단계로 삼아 "무엇을 어떤 순서로 하는지"를
 * 기계가 읽게 합니다. Article 명찰과 나란히 넣습니다(같은 페이지에 둘 다 두는 구성은 허용됩니다).
 * @param {{ url: string, name: string, description?: string, image?: string, date?: string,
 *           author?: string, steps: {name: string, text?: string}[] }} input
 */
export function howToJsonLd({ url, name, description, image, date, author, steps = [] }) {
  const clean = steps
    .map((s) => ({ name: textOf(s.name), text: textOf(s.text) }))
    .filter((s) => s.name);
  if (clean.length < 2) return null; // 단계가 2개 미만이면 HowTo 로 보기 어렵습니다.
  const howTo = {
    "@type": "HowTo",
    "@id": `${url}#howto`,
    name: textOf(name),
    inLanguage: "ko-KR",
    isPartOf: { "@id": `${url}#article` },
    publisher: { "@id": ORG_ID },
    step: clean.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      ...(s.text ? { text: s.text } : {}),
    })),
  };
  if (textOf(description)) howTo.description = textOf(description);
  if (textOf(image)) howTo.image = textOf(image);
  if (/^\d{4}-\d{2}-\d{2}/.test(textOf(date))) howTo.datePublished = textOf(date).slice(0, 10);
  if (textOf(author)) howTo.author = { "@type": "Person", name: textOf(author) };
  return howTo;
}


/** 사이트 공통 + 페이지별 명찰을 하나의 @graph 스크립트로 묶습니다. */
export function jsonLdGraph(siteUrl = DEFAULT_SITE_URL, extra = []) {
  return { "@context": "https://schema.org", "@graph": [...siteJsonLd(siteUrl), ...extra.filter(Boolean)] };
}
