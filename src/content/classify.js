/* =============================================================================
 * 글 분류 규칙 — 노션 `Type` 값 → 사이트 섹션** 한 곳에서만 관리**
 * -----------------------------------------------------------------------------
 * 이 파일은 **사이트(src/)와 동기화 스크립트(scripts/)가 함께** 사용합니다.
 *   ▸ 사이트  : src/notionPublic.ts (정적 스냅샷·공개 프록시), src/notion.ts (Worker)
 *   ▸ 동기화  : scripts/notion-snapshot.mjs (Actions 요약 리포트 · `__type` 기록)
 * 규칙을 한 곳에서 관리하지 않으면 "노션엔 뉴스라고 썼는데 사이트는 공지사항에
 * 나온다" 같은 불일치가 생깁니다. 판정 로직을 바꿀 때는 이 파일만 고치면 됩니다.
 *
 * 분류 순서 (위가 이김)
 *   1) `Type` 이 아는 표현이면 그대로 사용
 *      — 공지 / 뉴스 / 가이드 / 블로그 / FAQ + 영문·동의어·띄어쓰기·대괄호·오타 흡수
 *   2) 그 외에는 내용으로 추론 (Type 칸이 비었거나 처음 보는 값일 때만)
 *      Tool(툴) 지정 → 툴 사용법
 *      Category 가 SNS·릴리스 계열 → 뉴스
 *      Version · Changes(변경사항) 있음 → 뉴스 (릴리스 노트)
 *      Link 가 X · Threads · YouTube · Instagram · LinkedIn · Notion 주소 → 뉴스
 *   3) 그래도 모르면 → 공지사항 (가장 안전한 기본값, 스크립트가 경고로 알려줍니다)
 *
 * ⚠️ `__type` : 동기화 스크립트가 스냅샷의 각 행에 기록해 두는 확정 섹션입니다.
 *    사이트는 `__type` 이 있으면 그 값을 우선 사용합니다(서버·브라우저 판정 일치).
 * ========================================================================== */

/** 사이트 섹션 — `src/content/types.ts` 의 EntryType 과 값이 같아야 합니다. */
export const ENTRY_TYPES = ["notice", "news", "guide", "blog", "faq"];

/** 사람이 읽는 섹션 이름 (Actions 요약 · 경고 문구) */
export const SECTION_LABELS = {
  notice: "공지사항",
  news: "뉴스",
  guide: "툴 사용법",
  blog: "블로그",
  faq: "Q&A",
};

/** 노션 `Type` 칸에 그대로 쓰면 되는 값 (요약 리포트 안내용) */
export const TYPE_CHOICES = "공지 · 뉴스 · 가이드 · 블로그 · FAQ";

/**
 * 정규화된 값 → 섹션.
 * 키는 `normalizeTypeKey()` 를 통과한 형태라 공백·대소문자·기호는 신경 쓰지 않아도 됩니다.
 */
export const TYPE_ALIASES = {
  /* 공지사항 */
  공지: "notice",
  공지사항: "notice",
  공지글: "notice",
  공지안내: "notice",
  긴급공지: "notice",
  알림: "notice",
  알림글: "notice",
  안내: "notice",
  안내문: "notice",
  안내사항: "notice",
  notice: "notice",
  notices: "notice",
  announcement: "notice",
  announcements: "notice",

  /* 뉴스 = 타 SNS 소식 + 릴리스 노트(업데이트) */
  뉴스: "news",
  소식: "news",
  새소식: "news",
  새로운소식: "news",
  소식지: "news",
  업데이트: "news",
  업데이트소식: "news",
  업데이트내역: "news",
  릴리스: "news",
  릴리즈: "news",
  릴리스노트: "news",
  릴리즈노트: "news",
  패치: "news",
  패치노트: "news",
  보도: "news",
  보도자료: "news",
  타sns: "news",
  sns: "news",
  sns소식: "news",
  sns정보: "news",
  news: "news",
  update: "news",
  updates: "news",
  release: "news",
  releases: "news",
  changelog: "news",
  patch: "news",
  patchnotes: "news",
  press: "news",
  whatsnew: "news",
  snsnews: "news",

  /* 툴 사용법(가이드) */
  가이드: "guide",
  사용법: "guide",
  사용방법: "guide",
  툴사용법: "guide",
  툴가이드: "guide",
  툴설명: "guide",
  매뉴얼: "guide",
  설명서: "guide",
  튜토리얼: "guide",
  강좌: "guide",
  레퍼런스: "guide",
  guide: "guide",
  guides: "guide",
  tutorial: "guide",
  tutorials: "guide",
  manual: "guide",
  manuals: "guide",
  howto: "guide",
  walkthrough: "guide",
  usage: "guide",
  docs: "guide",
  doc: "guide",

  /* 블로그 */
  블로그: "blog",
  블로그글: "blog",
  포스트: "blog",
  포스팅: "blog",
  아티클: "blog",
  칼럼: "blog",
  컬럼: "blog",
  인사이트: "blog",
  blog: "blog",
  blogs: "blog",
  post: "blog",
  posts: "blog",
  article: "blog",
  articles: "blog",
  column: "blog",
  insight: "blog",
  insights: "blog",
  magazine: "blog",

  /* Q&A(FAQ) */
  faq: "faq",
  faqs: "faq",
  "q&a": "faq",
  qa: "faq",
  큐앤에이: "faq",
  자주묻는질문: "faq",
  자주하는질문: "faq",
  질문: "faq",
  질문과답변: "faq",
  문의: "faq",
  문의사항: "faq",
  도움말: "faq",
  help: "faq",
  support: "faq",
};

/** SNS 채널 id → 화면에 쓰는 이름 (`News.tsx` 의 채널 카드 이름과 동일) */
export const CHANNEL_NAMES = {
  x: "X",
  threads: "Threads",
  youtube: "YouTube",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  notion: "Notion",
};

/** 링크 주소(호스트) → SNS 채널 id */
const SNS_HOSTS = {
  "x.com": "x",
  "twitter.com": "x",
  "t.co": "x",
  "threads.net": "threads",
  "threads.com": "threads",
  "youtube.com": "youtube",
  "youtu.be": "youtube",
  "instagram.com": "instagram",
  "linkedin.com": "linkedin",
  "lnkd.in": "linkedin",
  "notion.so": "notion",
  "notion.site": "notion",
};

/** Category 값이 이 중 하나면 "타 SNS 소식 / 릴리스" 로 보고 뉴스로 분류합니다. */
const NEWS_CATEGORY_KEYS = new Set([
  ...Object.keys(CHANNEL_NAMES),
  "twitter",
  "sns",
  "release",
  "릴리스",
  "릴리즈",
  "뉴스",
  "소식",
  "업데이트",
  "news",
  "update",
  "changelog",
]);

/** Published 계열 속성 이름 (대소문자 무시) */
export const PUBLISHED_KEYS = ["published", "공개", "게시"];

/* ------------------------------ 문자열 유틸 ------------------------------ */

const isBlank = (value) =>
  value == null || (typeof value === "string" && value.trim() === "") || (Array.isArray(value) && value.length === 0);

/**
 * `Type` 값을 비교 가능한 형태로 정규화합니다.
 *   "  뉴스 "  · "News"  · "[뉴스]"  · "공지 사항"  · "Ｑ＆Ａ"  → 모두 인식
 * 전각/합자는 NFKC 로 펴고, 앞뒤 괄호·따옴표와 구분 기호(공백 · _ - . / , : ; 등)를 제거합니다.
 */
export function normalizeTypeKey(raw) {
  return String(raw ?? "")
    .normalize("NFKC")
    .replace(/[\u200b\u200c\u200d\ufeff]/g, "")
    .trim()
    .toLowerCase()
    .replace(/^[\s[({<「『"'“”]+/, "")
    .replace(/[\s\]})>」』"'“”]+$/, "")
    .replace(/[\s_\-–—.·・\\|,:;!*~^]+/g, "");
}

/** 정규화한 값이 아는 표현이면 섹션을 돌려줍니다. (모르면 undefined) */
export function resolveTypeAlias(raw) {
  if (isBlank(raw)) return undefined;
  const text = String(raw);
  const key = normalizeTypeKey(text);
  if (!key) return undefined;
  if (TYPE_ALIASES[key]) return TYPE_ALIASES[key];

  // "공지(Notice)" · "뉴스[News]" 처럼 괄호 설명이 붙은 경우
  // (괄호 안을 먼저 지운 뒤 정규화 — 정규화가 끝난 문자열은 닫는 괄호가 이미 지워져 있습니다)
  const withoutParens = normalizeTypeKey(text.replace(/[([{（【][^)\]}）】]*[)\]}）】]/g, ""));
  if (withoutParens && TYPE_ALIASES[withoutParens]) return TYPE_ALIASES[withoutParens];

  // "뉴스, 공지" · "뉴스/블로그" · "뉴스 및 소식" 처럼 여러 값을 적은 경우 → 먼저 알아보는 값
  for (const part of text.split(/[,+/|·ㆍ、]|\s*(?:및|and)\s*/i)) {
    const token = normalizeTypeKey(part);
    if (token && TYPE_ALIASES[token]) return TYPE_ALIASES[token];
  }
  // 띄어쓰기로만 나열한 경우 ("뉴스 공지")
  for (const part of text.split(/\s+/)) {
    const token = normalizeTypeKey(part);
    if (token && TYPE_ALIASES[token]) return TYPE_ALIASES[token];
  }
  return undefined;
}

/** 값이 사이트가 아는 섹션 이름인지 (`__type` 검증용) */
export function isEntryType(value) {
  return typeof value === "string" && ENTRY_TYPES.includes(value);
}

/** 링크 주소가 알려진 SNS 채널이면 채널 id(x · threads · youtube …)를 돌려줍니다. */
export function channelFromUrl(url) {
  const raw = typeof url === "string" ? url.trim() : "";
  if (!raw) return undefined;
  let host = "";
  try {
    host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.toLowerCase();
  } catch {
    return undefined;
  }
  host = host.replace(/^(?:www|m|mobile)\./, "");
  if (SNS_HOSTS[host]) return SNS_HOSTS[host];
  // business.linkedin.com · silicon-mascara-c7d.notion.site 같은 하위 도메인
  const tail = host.split(".").slice(-2).join(".");
  return SNS_HOSTS[tail];
}

/** 채널 id → 화면 이름 (없으면 undefined) */
export function channelName(id) {
  return id ? CHANNEL_NAMES[id] : undefined;
}

/* ------------------------------ 분류 판정 ------------------------------ */

/**
 * `Type` 칸이 비었거나 처음 보는 값일 때 내용으로 섹션을 추정합니다.
 * @returns {{ type: string, reason: string }}
 */
export function inferType({ category, link, changes, version, tool } = {}) {
  if (!isBlank(tool)) return { type: "guide", reason: "Tool(툴) 속성 지정" };

  const categoryKey = normalizeTypeKey(category);
  if (categoryKey && NEWS_CATEGORY_KEYS.has(categoryKey)) {
    return { type: "news", reason: `Category '${String(category).trim()}'` };
  }

  if (!isBlank(changes) || !isBlank(version)) {
    return { type: "news", reason: isBlank(version) ? "Changes(변경사항) 있음" : `Version '${String(version).trim()}'` };
  }

  const channel = channelFromUrl(link);
  if (channel) {
    return { type: "news", reason: `SNS 링크(${CHANNEL_NAMES[channel] ?? channel})` };
  }

  return { type: "notice", reason: "Type 이 비어 있어 기본값(공지사항)" };
}

/**
 * 한 행/페이지의 최종 섹션을 결정합니다.
 * @returns {{ type: string, source: "type"|"unknown"|"default", raw: string, reason: string, channel?: string }}
 *   source ▸ "type"    : 노션 `Type` 값이 그대로 반영됨
 *            "unknown" : `Type` 값이 아는 표현이 아니라 내용으로 추론함 (노션에서 고치는 게 좋음)
 *            "default" : `Type` 칸이 비어 있어 추론함
 */
export function classifyType({ type, category, link, changes, version, tool } = {}) {
  const raw = isBlank(type) ? "" : String(type).trim();
  const channel = channelFromUrl(link);
  const alias = resolveTypeAlias(raw);
  if (alias) {
    return { type: alias, source: "type", raw, reason: `Type '${raw}'`, channel };
  }
  const inferred = inferType({ category, link, changes, version, tool });
  return { type: inferred.type, source: raw ? "unknown" : "default", raw, reason: inferred.reason, channel };
}

/* ------------------------------ 행(row) 유틸 ------------------------------ */

/** 객체에서 이름이 일치하는(대소문자·앞뒤 공백 무시) 첫 값을 꺼냅니다. */
export function pickRow(row, names) {
  if (!row || typeof row !== "object") return undefined;
  const keys = Object.keys(row);
  for (const name of names) {
    const hit = keys.find((key) => key.trim().toLowerCase() === name.toLowerCase());
    if (hit !== undefined) return row[hit];
  }
  return undefined;
}

/** 이 행에 Published 계열 속성이 있는지 (있으면 그 키 이름) */
export function publishedKey(row) {
  if (!row || typeof row !== "object") return undefined;
  return Object.keys(row).find((key) => PUBLISHED_KEYS.includes(key.trim().toLowerCase()));
}

const isChecked = (value) => value === true || value === "Yes" || value === "true" || value === "TRUE" || value === 1;

/**
 * 행의 공개 여부. Published 속성이 아예 없으면 `undefined` (= 판단 불가).
 * (노션 공개 표는 체크 해제된 행의 속성 자체를 빼고 주기 때문에,
 *  "열이 있는데 값이 없음" = 미공개로 보아야 합니다 → isRowPublished 참고)
 */
export function isPublishedRow(row) {
  const key = publishedKey(row);
  if (key === undefined) return undefined;
  return isChecked(row[key]);
}

/** 표에 Published 계열 열이 하나라도 있으면 체크된 행만 노출합니다. */
export function hasPublishedColumn(rows) {
  return Array.isArray(rows) ? rows.some((row) => publishedKey(row) !== undefined) : false;
}

/**
 * 행을 목록에 넣을지 결정합니다.
 * @param {object} row
 * @param {boolean} requirePublished 표에 Published 열이 있으면 true
 */
export function includeRow(row, requirePublished) {
  if (!requirePublished) return true;
  // Published 열 자체가 없는 행(미체크로 속성이 빠진 경우)은 제외합니다.
  return isPublishedRow(row) === true;
}
