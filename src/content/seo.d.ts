/**
 * `src/content/seo.js` (글별 주소 · 메타 · 사이트맵 규칙) 의 타입 선언.
 * 구현은 `.js` 한 곳에만 두고, TypeScript 쪽에는 이 선언만 제공합니다.
 */
import type { EntryType } from "./types";

export const SITE_NAME: string;
export const DEFAULT_SITE_URL: string;
export const DEFAULT_OG_IMAGE_PATH: string;
export const SITE_META: Record<"ko" | "en" | "ja" | "zh-CN", { title: string; description: string }>;
export type SiteLang = {
  code: string;
  htmlLang: string;
  prefix: string;
  hreflang: string;
  ogLocale: string;
  name: string;
};
export const SITE_LANGS: SiteLang[];
export const langByCode: (code: string) => SiteLang | null;
export function localizedUrl(siteUrl: string, code: string, path?: string): string;
export function hreflangAlternates(
  siteUrl: string,
  path: string,
  codes?: string[]
): { hreflang: string; href: string }[];
export function langFromPathname(pathname: string): string;

export const ROUTE_PREFIX: Record<EntryType, string>;
export const ROUTE_TYPES: Record<string, EntryType[]>;
/** 비교용 2-gram 토큰 집합 (관련 글 점수 계산용) */
export function linkTokens(text: unknown): Set<string>;
/** `Tags` 값에서 해시태그만 뽑은 소문자 집합 */
export function tagSetOf(value: unknown): Set<string>;

export type RelatedCandidate = {
  type: string;
  slug: string;
  title: string;
  summary?: string;
  date?: string;
  category?: string;
  tool?: string;
  tags?: unknown;
  [key: string]: unknown;
};
/** 관련 글 고르기 — 같은 카테고리·툴·해시태그 + 제목 2-gram 겹침 */
export function relatedArticles(
  current: RelatedCandidate,
  pool: RelatedCandidate[],
  opts?: { limit?: number; minScore?: number; skipType?: string }
): RelatedCandidate[];

/** 노션 글이 아닌 정적 페이지 중 색인할 것 (사이트맵 포함 · lastmod 없음) */
export const EXTRA_INDEX_PAGES: string[];

export const SLUG_PATTERN: RegExp;
export const SUMMARY_MAX: number;
export const SEO_TITLE_MAX: number;
export const SEO_DESCRIPTION_MAX: number;
export const SLUG_KEYS: string[];
export const SEO_TITLE_KEYS: string[];
export const SEO_DESCRIPTION_KEYS: string[];
export const OG_IMAGE_KEYS: string[];
export const SEO_READY_KEYS: string[];

export function textOf(value: unknown): string;
export function pickProp(row: unknown, names: string[]): unknown;
export function fileUrlOf(value: unknown): string;
export function normalizeSlug(raw: unknown): string;
export function isValidSlug(slug: unknown): boolean;
export function isSeoReady(value: unknown): boolean;
export function routePrefixFor(type: string | null | undefined): string | null;
export function routePathFor(type: string, slug: string): string | null;
export function parseRoute(pathname: string): { prefix: string; slug: string } | null;
export function hubBaseFromPathname(pathname: string): string;
export function absoluteUrl(siteUrl: string, relativePath?: string): string;
export function summarize(raw: unknown, max?: number): string;

export type SeoEligibility = { eligible: boolean; slug: string; reasons: string[] };
export function seoEligibility(row: unknown, type: string): SeoEligibility;

export type SeoFields = { seoTitle: string; seoDescription: string; ogImage: string };
export function seoFieldsOf(row: unknown): SeoFields;

export type ArticleMetaInput = {
  title?: string;
  summary?: string;
  seoTitle?: string;
  seoDescription?: string;
  cover?: string;
  ogImage?: string;
  date?: string;
  type?: string;
};
export type ArticleMeta = {
  pageTitle: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  image: string;
  publishedTime: string;
};
export function resolveArticleMeta(entry: ArticleMetaInput, options?: { defaultImageUrl?: string }): ArticleMeta;

export type SiteMeta = { title: string; description: string; ogTitle: string; ogDescription: string };
export function siteMetaFor(lang?: string): SiteMeta;

export function sitemapXml(urls: { loc: string; lastmod?: string }[]): string;
export function robotsTxt(siteUrl: string): string;
export function escapeHtml(value: unknown): string;
export function escapeXml(value: unknown): string;

/** 구조화 데이터(JSON-LD) — 빌드 스크립트(scripts/build-seo.mjs)가 <head> 에 넣습니다. */
export const ORG_ID: string;
export const WWW_URL: string;
export const ORG_LOGO_PATH: string;
export const OFFICIAL_SAME_AS: string[];
export function siteJsonLd(siteUrl?: string): Record<string, unknown>[];
export const BRAND_NAME: string;
export const APP_ID: string;
export type ArticleJsonLdInput = {
  type: string;
  url: string;
  headline?: string;
  description?: string;
  image?: string;
  date?: string;
  dateModified?: string;
  author?: string;
  answerText?: string;
  siteUrl?: string;
};
export function articleJsonLd(input: ArticleJsonLdInput): Record<string, unknown>;

/** 제품 명찰 — 허브 홈에만 넣습니다(가격 Offer 는 가격이 적힌 www 페이지 몫). */
export function appJsonLd(): Record<string, unknown>;

/** 목록형 페이지 명찰 (홈 · 섹션 인덱스) — ItemList 로 글 목록을 기계에 알립니다. */
export function listJsonLd(input: {
  url: string;
  name?: string;
  description?: string;
  items?: { url: string; name?: string }[];
  siteUrl?: string;
}): Record<string, unknown>;

/** 사용법 글의 절차 명찰 (Article 과 나란히 넣습니다). 단계가 2개 미만이면 null. */
export function howToJsonLd(input: {
  url: string;
  name: string;
  description?: string;
  image?: string;
  date?: string;
  author?: string;
  steps: { name: string; text?: string }[];
}): Record<string, unknown> | null;

/** 수정일 속성 이름 · 값 추출 (없으면 빈 문자열) */
export const MODIFIED_KEYS: string[];
export function modifiedDateOf(row: Record<string, unknown>, fallback?: string): string;

/** 글별 공유 이미지 로컬 사본 (노션 프록시 의존 제거) */
export const OG_LOCAL_DIR: string;
export const OG_MANIFEST_PATH: string;
/** manifest 키 — 주소 규칙과 1:1. 만들 수 없으면 `""` (throw 하지 않음) */
export function ogManifestKey(type: string, slug: string): string;
export function localOgImageUrl(
  manifest: Record<string, string> | null | undefined,
  key: string,
  siteUrl?: string
): string;

/** 섹션 인덱스 페이지(/post/ · /notice/ · /qna/ · /guide/) 정보 */
export type SectionPage = {
  prefix: "post" | "notice" | "qna" | "guide";
  anchor: string;
  types: string[];
  heading: string;
  title: string;
  description: string;
};
export const SECTION_PAGES: SectionPage[];
export function sectionPageForPrefix(prefix: string): SectionPage | null;
export function sectionPageFromPathname(pathname: string): SectionPage | null;
export function jsonLdGraph(
  siteUrl?: string,
  extra?: Record<string, unknown>[]
): { "@context": string; "@graph": Record<string, unknown>[] };
