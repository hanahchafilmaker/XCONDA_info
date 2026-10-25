/**
 * www.xconda.ai 사이트맵 — `app/sitemap.ts` (Next.js metadata route)
 *
 * 지금 `/sitemap.xml` 은 10개 주소뿐이고, 한국어(/ko) 페이지와 기능 페이지가 빠져 있습니다.
 * 이 파일은 (1) 기존 공개 주소 + (2) 기능 페이지 20×2 언어 를 넣고,
 * (3) 각 주소에 **언어 대체 링크(xhtml:link)** 를 붙입니다.
 */
import type { MetadataRoute } from "next";
import featureData from "@/content/feature-pages.json";
import { SITE, localeUrl } from "@/lib/seo";

/** 기존 공개 주소(2026-10-25 sitemap.xml 확인분) — 언어별로 확장합니다. */
const STATIC_PATHS = ["", "images", "video", "storyboards", "guides", "pricing", "support/qna", "legal/terms", "legal/privacy", "legal/refund"];

const LAST_MODIFIED = "2026-10-25";

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const p of STATIC_PATHS) {
    for (const lang of ["en", "ko"] as const) {
      entries.push({
        url: localeUrl(lang, p),
        lastModified: LAST_MODIFIED,
        changeFrequency: p === "" ? "weekly" : "monthly",
        priority: p === "" ? 1 : 0.6,
        alternates: { languages: { en: localeUrl("en", p), ko: localeUrl("ko", p) } },
      });
    }
  }

  for (const page of featureData.pages) {
    const path = `${featureData.basePath}/${page.slug}/`;
    for (const lang of ["en", "ko"] as const) {
      entries.push({
        url: localeUrl(lang, path),
        lastModified: LAST_MODIFIED,
        changeFrequency: "monthly",
        priority: 0.8,
        alternates: { languages: { en: localeUrl("en", path), ko: localeUrl("ko", path) } },
      });
    }
  }

  return entries;
}
