/**
 * 허브 글 → 제품 사이트(www.xconda.ai) 링크.
 *
 * 허브 글에는 제품 사이트로 가는 길이 없었습니다(2026-11-14 MHW 이의 제기 검토 · 개발 2순위).
 * 글 상단·하단에 「관련 툴 · 무료 시작 · 요금」 링크를 넣고, 유입을 구분할 수 있게 UTM 을 붙입니다.
 * 정적 페이지(scripts/build-seo.mjs)와 앱(ArticleModal)이 **같은 함수**를 써서 주소가 어긋나지 않게 합니다.
 *
 * UTM 값은 `reports/utm-rules-20261109.md` §6-1(허브 → 제품 사이트)를 따릅니다.
 *   source=hub · medium=referral · campaign=hub_cta_202611 · content=cb_top | cb_bottom
 * 값을 바꾸려면 규칙 문서와 `scripts/utm-check.mjs` 를 먼저 고친 뒤 여기 한 곳만 바꾸세요.
 * ⚠️ 허브 **안에서** 다른 글로 가는 링크에는 UTM 을 붙이지 않습니다(규칙 §6).
 */
export const WWW_ORIGIN = "https://www.xconda.ai";

export const HUB_UTM = {
  utm_source: "hub",
  utm_medium: "referral",
  utm_campaign: "hub_cta_202611",
};

/** 링크 위치 → utm_content (`팀_게시물` 형식) */
const PLACEMENT = { top: "cb_top", bottom: "cb_bottom" };

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

/** 제품 사이트 경로 + UTM → 절대 주소 */
export function wwwUrl(path = "/", placement = "bottom", utm = true) {
  const url = new URL(path, WWW_ORIGIN);
  // 제품 사이트 하위 폴더(www.xconda.ai/hub/)에서 보이는 페이지의 링크는 **같은 사이트 안 이동**입니다.
  // 내부 링크에는 UTM 을 붙이지 않습니다(UTM 규칙) — 붙이면 방문자의 원래 유입이 덮어써집니다.
  if (!utm) return url.href;
  for (const [k, v] of Object.entries(HUB_UTM)) url.searchParams.set(k, v);
  url.searchParams.set("utm_content", PLACEMENT[placement] ?? PLACEMENT.bottom);
  return url.href;
}

/** 글의 툴 속성·제목에서 관련 툴을 찾습니다(없으면 null). */
export function toolLinkFor({ tool = "", title = "" } = {}) {
  const hay = `${tool} ${title}`;
  return TOOL_LINKS.find((t) => t.match.test(hay)) ?? null;
}

/**
 * 글 하나에 붙일 제품 링크 목록.
 * @param {{ lang?: string, tool?: string, title?: string, placement?: "top"|"bottom", utm?: boolean }} input
 * @returns {{ label: string, links: Array<{ kind: "tool"|"start"|"pricing", label: string, href: string }> }}
 */
export function productLinks({ lang = "ko", tool = "", title = "", placement = "bottom", utm = true } = {}) {
  const l = LABELS[lang] ?? LABELS.en;
  const toolLink = toolLinkFor({ tool, title });
  const links = [];
  if (toolLink) links.push({ kind: "tool", label: l.tool(toolLink.name), href: wwwUrl(toolLink.path, placement, utm) });
  links.push({ kind: "start", label: l.start, href: wwwUrl(HOME_PATH[lang] ?? "/", placement, utm) });
  links.push({ kind: "pricing", label: l.pricing, href: wwwUrl("/pricing", placement, utm) });
  return { label: l.aria, links };
}
