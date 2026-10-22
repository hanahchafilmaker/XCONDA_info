/* =============================================================================
 * 앱 런타임 · 페이지 메타(title · description · canonical · OG · 트위터) 갱신
 * -----------------------------------------------------------------------------
 * 글을 열면 그 글의 값으로, 홈에서는 언어별 사이트 기본값으로 맞춥니다.
 * 처음 받는 HTML 의 값은 빌드 스크립트(scripts/build-seo.mjs)가 이미 글마다 넣어 두므로,
 * 여기서는 "사용자가 목록에서 글을 연" 뒤의 값만 같은 규칙으로 맞춥니다.
 * 규칙 자체(우선순위 · 주소 · 기본 이미지)는 src/content/seo.js 에 있습니다.
 * ========================================================================== */

import {
  DEFAULT_OG_IMAGE_PATH,
  hubBaseFromPathname,
  resolveArticleMeta,
  routePathFor,
  siteMetaFor,
} from "./content/seo";
import type { Entry } from "./content/types";

/** 허브가 놓인 기본 경로 (예: "/XCONDA_info/"). 글 주소 부분은 떼어 냅니다. */
export function hubBase(): string {
  return hubBaseFromPathname(window.location.pathname);
}

/** 허브 기준 상대 주소를 현재 출처의 절대 주소로 */
export function hubAbsolute(relative: string): string {
  return new URL(relative, `${window.location.origin}${hubBase()}`).href;
}

/** 글의 정식 주소 (주소가 없는 글은 null) */
export function entryUrl(entry: Pick<Entry, "type" | "slug">): string | null {
  const path = routePathFor(entry.type, entry.slug ?? "");
  return path ? hubAbsolute(path) : null;
}

/** 글 공유 주소 — 주소가 있으면 새 주소, 없으면 기존 #post=ID 형식 */
export function shareUrlFor(entry: Pick<Entry, "id" | "type" | "slug">): string {
  const url = entryUrl(entry);
  return url ?? `${hubAbsolute("")}#post=${encodeURIComponent(entry.id)}`;
}

/** 홈 주소 */
export const homeUrl = (): string => hubAbsolute("");

const defaultImage = (): string => hubAbsolute(DEFAULT_OG_IMAGE_PATH);

function upsert(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

type HeadValues = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogType: "website" | "article";
  image: string;
  url: string;
};

function applyHead(v: HeadValues) {
  document.title = v.title;
  upsert("name", "description", v.description);
  upsert("property", "og:type", v.ogType);
  upsert("property", "og:title", v.ogTitle);
  upsert("property", "og:description", v.ogDescription);
  upsert("property", "og:image", v.image);
  upsert("property", "og:url", v.url);
  upsert("name", "twitter:title", v.ogTitle);
  upsert("name", "twitter:description", v.ogDescription);
  upsert("name", "twitter:image", v.image);
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = v.url;
}

/** 홈 화면 — 언어별 사이트 기본 메타 */
export function applySiteMeta(target: string): void {
  if (typeof document === "undefined") return;
  // 글별 구조화 데이터(JSON-LD)는 정적 페이지가 기준입니다. 홈으로 돌아오면 이전 글의
  // 명찰이 남지 않게 걷어 냅니다(사이트 공통 명찰은 data-article-jsonld 가 없어 유지됨).
  document.head.querySelectorAll("script[data-article-jsonld]").forEach((el) => el.remove());
  const m = siteMetaFor(target);
  applyHead({
    title: m.title,
    description: m.description,
    ogTitle: m.ogTitle,
    ogDescription: m.ogDescription,
    ogType: "website",
    image: defaultImage(),
    url: homeUrl(),
  });
}

/** 글 상세 — 글별 제목 · 설명 · 이미지 · 주소 */
export function applyArticleMeta(entry: Entry): void {
  if (typeof document === "undefined") return;
  const meta = resolveArticleMeta(
    {
      title: entry.title,
      summary: entry.summary,
      seoTitle: entry.seoTitle,
      seoDescription: entry.seoDescription,
      cover: entry.cover,
      ogImage: entry.ogImage,
      date: entry.date,
      type: entry.type,
    },
    { defaultImageUrl: defaultImage() }
  );
  applyHead({
    title: meta.title,
    description: meta.description,
    ogTitle: meta.ogTitle,
    ogDescription: meta.ogDescription,
    ogType: "article",
    image: meta.image,
    url: entryUrl(entry) ?? homeUrl(),
  });
}
