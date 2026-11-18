import raw from "./driveGuides.json";
import type { Lang } from "../i18n/dict";

/**
 * Single catalogue for the 2026-11-18 current Drive set.
 *
 * The JSON keeps the source file IDs for provenance. Public pages use the
 * sanitized HTML and playable MP4s in `assets/guides/current/` instead of
 * opening Drive /view or /preview URLs. JA/ZH documents exist; videos are KO/EN.
 */
type GuideLang = "ko" | "en" | "ja" | "zh";
type Files<T extends string> = Partial<Record<T, string | null>>;

type DriveDoc = {
  no: string;
  slug: string;
  name: string;
  group: "image" | "video" | "storyboard" | "assets";
  files: Record<GuideLang, string>;
};
type DriveVideo = {
  no: string;
  slug?: string;
  name: string;
  group?: string;
  files: Files<Lang>;
};

type Catalog = {
  updated: string;
  sourceFolder: string;
  note: string;
  indexes: Record<string, string>;
  docs: DriveDoc[];
  videos: DriveVideo[];
  extraVideos: DriveVideo[];
};

const catalog = raw as Catalog;

export const DRIVE_GUIDE_UPDATED = catalog.updated;
export const DRIVE_SOURCE_FOLDER_URL = catalog.sourceFolder;
export const DRIVE_GUIDE_INDEX_IDS = { ...catalog.indexes };
export const DRIVE_GUIDE_DOCS = catalog.docs;
export const DRIVE_GUIDE_VIDEOS = catalog.videos;
export const DRIVE_GUIDE_EXTRA_VIDEOS = catalog.extraVideos;
export const CURRENT_GUIDE_DOCUMENT_COUNT = catalog.docs.length * 4;
export const CURRENT_GUIDE_VIDEO_COUNT = [...catalog.videos, ...catalog.extraVideos]
  .reduce((count, video) => count + (video.files.ko ? 1 : 0) + (video.files.en ? 1 : 0), 0);
