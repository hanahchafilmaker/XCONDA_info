import { hubAssetUrl, hubBaseFromPathname, isProxiedLocalePath } from "./seo";
import type { Target } from "../i18n/google";

/**
 * Absolute URL for a committed static asset under the repository's `assets/` tree.
 *
 * On the canonical hub and GitHub Pages project path we resolve against the site
 * base (`/XCONDA_info/` included). Under the product-site proxy `/hub/*`, the
 * existing `hubAssetUrl()` rule points at the canonical hub origin instead,
 * because `/hub/assets/*` is not proxied.
 */
export function siteAssetUrl(relative: string): string {
  if (typeof window === "undefined") return relative;
  const pathname = window.location.pathname;
  if (isProxiedLocalePath(pathname)) return hubAssetUrl(relative, undefined, pathname) ?? relative;
  return new URL(relative, `${window.location.origin}${hubBaseFromPathname(pathname)}`).href;
}

export const CURRENT_GUIDE_BASE = "assets/guides/current";
export const guideLangOf = (target: Target): "ko" | "en" | "ja" | "zh" =>
  target === "zh-CN" ? "zh" : target;

/** JA/ZH use the English video clip, while their HTML guide keeps its own language. */
export const mediaLangOf = (target: Target): "ko" | "en" => (target === "ko" ? "ko" : "en");

export function currentGuidePath(slug: string, target: Target): string {
  return `${CURRENT_GUIDE_BASE}/${guideLangOf(target)}/${slug}.html`;
}

export function currentGuideIndexPath(target: Target): string {
  return `${CURRENT_GUIDE_BASE}/${guideLangOf(target)}/index.html`;
}

export function currentVideoPath(no: string, target: Target): string {
  return `${CURRENT_GUIDE_BASE}/video/${no}_${mediaLangOf(target)}.mp4`;
}

/** `?embedded=1` hides the standalone guide navigation when shown inside the hub. */
export function embeddedGuideUrl(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}embedded=1`;
}
