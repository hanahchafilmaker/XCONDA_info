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
