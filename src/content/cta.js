/**
 * 허브 글 → 제품 사이트(www.xconda.ai) 링크.
 *
 * 허브 글에는 제품 사이트로 가는 길이 없었습니다(2026-11-14 MHW 이의 제기 검토 · 개발 2순위).
 * 글 상단·하단에 「관련 툴 · 무료 시작 · 요금」 링크를 넣습니다.
 * 정적 페이지(scripts/build-seo.mjs)와 앱(ArticleModal)이 **같은 함수**를 써서 주소가 어긋나지 않게 합니다.
 *
 * ⚠️ 이 링크에는 **UTM 을 붙이지 않습니다.** UTM 규칙 v1.0(2026-11-13 대표 승인)은 외부 채널
 * (SNS·뉴스레터·광고)에서 들어오는 링크의 규칙이고, 허용된 source·medium·등록 캠페인 가운데
 * 「허브 → 제품 사이트」에 맞는 값이 없습니다. 규칙에 없는 값을 만들어 붙이면 규칙 위반이고,
 * 방문자의 원래 유입(예: 인스타 → 허브 글 → 제품 사이트)을 덮어쓸 수도 있습니다.
 * 어느 글·어느 위치에서 눌렀는지는 링크의 `data-cta`(top·bottom) · `data-cta-kind`(tool·start·pricing)
 * 속성과 GA4 의 페이지 리퍼러로 구분합니다. UTM 이 필요해지면 규칙에 값을 먼저 등록한 뒤 붙이세요.
 */
export const WWW_ORIGIN = "https://www.xconda.ai";

/**
 * 툴 → 제품 사이트 주소. 지금 공개된 주소만 적습니다.
 * 스튜디오 주소는 로그인 뒤 화면이라 비로그인 방문자는 로그인으로 넘어갑니다.
 * www 기능 소개 페이지(`/features/<slug>`, 개발 9순위)가 열리면 `path` 를 그 주소로 바꾸세요.
 * 블로킹 보드는 아직 전용 주소가 없어 넣지 않았습니다(「무료로 시작하기」가 대신합니다).
 */
export const TOOL_LINKS = [
  { name: "FLEXBOARD", path: "/studio/directors-cut", match: /flex\s?board|플렉스\s?보드/i },
  { name: "Turn", path: "/studio/turn", match: /\bTurn\b|\(턴\)/ },
];

const LABELS = {
  ko: { start: "무료로 시작하기", pricing: "요금 보기", tool: (n) => `${n} 써 보기`, aria: "XCONDA 바로가기" },
  en: { start: "Start free", pricing: "See pricing", tool: (n) => `Try ${n}`, aria: "Go to XCONDA" },
  ja: { start: "無料で始める", pricing: "料金を見る", tool: (n) => `${n} を試す`, aria: "XCONDA へ" },
  zh: { start: "免费开始", pricing: "查看价格", tool: (n) => `试用 ${n}`, aria: "前往 XCONDA" },
};

/** 언어별 랜딩. 한국어 랜딩(`/ko`)만 확인돼 있어 다른 언어는 기본(영어) 랜딩으로 보냅니다. */
const HOME_PATH = { ko: "/ko", en: "/", ja: "/", zh: "/" };

/** 제품 사이트 경로 → 절대 주소 (UTM 없음 — 파일 머리말 참고) */
export function wwwUrl(path = "/") {
  return new URL(path, WWW_ORIGIN).href;
}

/** 글의 툴 속성·제목에서 관련 툴을 찾습니다(없으면 null). */
export function toolLinkFor({ tool = "", title = "" } = {}) {
  const hay = `${tool} ${title}`;
  return TOOL_LINKS.find((t) => t.match.test(hay)) ?? null;
}

/**
 * 글 하나에 붙일 제품 링크 목록.
 * @param {{ lang?: string, tool?: string, title?: string }} input
 * @returns {{ label: string, links: Array<{ kind: "tool"|"start"|"pricing", label: string, href: string }> }}
 */
export function productLinks({ lang = "ko", tool = "", title = "" } = {}) {
  const l = LABELS[lang] ?? LABELS.en;
  const toolLink = toolLinkFor({ tool, title });
  const links = [];
  if (toolLink) links.push({ kind: "tool", label: l.tool(toolLink.name), href: wwwUrl(toolLink.path) });
  links.push({ kind: "start", label: l.start, href: wwwUrl(HOME_PATH[lang] ?? "/") });
  links.push({ kind: "pricing", label: l.pricing, href: wwwUrl("/pricing") });
  return { label: l.aria, links };
}
