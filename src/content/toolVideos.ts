import type { Lang } from "../i18n/dict";
import { DRIVE_GUIDE_VIDEOS, driveVideoUrl } from "./driveGuides";

/**
 * 툴별 공식 영상 가이드 (2026-11-18 현재판 · Google Drive).
 * Drive는 CSP를 직접 통제하므로 새 탭 링크로만 엽니다.
 * 구버전 ID(1a9mw… / 1uVP…)는 제거했습니다.
 */
export const TOOL_VIDEOS: Partial<Record<string, Record<Lang, string>>> = {};

for (const video of DRIVE_GUIDE_VIDEOS) {
  if (!video.slug) continue;
  const ko = driveVideoUrl(video.slug, "ko");
  const en = driveVideoUrl(video.slug, "en");
  if (ko && en) TOOL_VIDEOS[video.slug] = { ko, en };
}

export function getToolVideo(slug: string, lang: Lang): string | undefined {
  return driveVideoUrl(slug, lang);
}
