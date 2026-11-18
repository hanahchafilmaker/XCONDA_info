import type { Target } from "../i18n/google";
import { DRIVE_GUIDE_DOCS, DRIVE_GUIDE_VIDEOS } from "./driveGuides";
import { currentVideoPath, mediaLangOf, siteAssetUrl } from "./siteAssets";

/**
 * Playable same-origin MP4s copied from the 2026-11-18 current Drive set.
 * KO uses the Korean clip; EN/JA/ZH use the English clip (there are no JA/ZH videos).
 */
const VIDEO_NO_BY_SLUG = new Map(DRIVE_GUIDE_VIDEOS.filter((video) => video.slug).map((video) => [video.slug!, video.no]));

export const TOOL_VIDEOS: Partial<Record<string, Record<"ko" | "en", string>>> = {};
for (const video of DRIVE_GUIDE_VIDEOS) {
  if (!video.slug || !video.files.ko || !video.files.en) continue;
  TOOL_VIDEOS[video.slug] = {
    ko: currentVideoPath(video.no, "ko"),
    en: currentVideoPath(video.no, "en"),
  };
}

export function getToolVideo(slug: string, target: Target): string | undefined {
  const no = VIDEO_NO_BY_SLUG.get(slug) ?? DRIVE_GUIDE_DOCS.find((doc) => doc.no === slug)?.no;
  const video = [...DRIVE_GUIDE_VIDEOS].find((item) => item.no === no);
  if (!no || !video?.files[mediaLangOf(target)]) return undefined;
  return siteAssetUrl(currentVideoPath(no, target));
}
