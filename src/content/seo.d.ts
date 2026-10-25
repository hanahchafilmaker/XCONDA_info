/**
 * `src/content/seo.js` (글별 주소 · 메타 · 사이트맵 규칙) 의 타입 선언.
 * 구현은 `.js` 한 곳에만 두고, TypeScript 쪽에는 이 선언만 제공합니다.
 */
import type { EntryType } from "./types";

export const SITE_NAME: string;
export const DEFAULT_SITE_URL: string;
export const DEFAULT_OG_IMAGE_PATH: string;
export const SITE_META: Record<"ko" | "en" | "ja" | "zh-CN", { title: string; description: string }>;
export const ROUTE_PREFIX: Record<EntryType, string>;
export const ROUTE_TYPES: Record<string, EntryType[]>;
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
