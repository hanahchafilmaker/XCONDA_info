import raw from "./driveGuides.json";
import type { Lang } from "../i18n/dict";
import type { Target } from "../i18n/google";

/**
 * 2026-11-18 공유 Drive 폴더의 "현재판" 가이드·영상 링크.
 *
 * - 문서 KO/EN: 00_XCONDA_가이드_통합관리.html 의 「현재판 · 한영 대조 결과」
 * - 문서 JA/ZH: 00_Guide_Index.html (2026-11-17 다국어 인덱스)
 * - 영상 KO/EN: xconda_video_guide 의 8개 현재 폴더 (구버전 보관 제외)
 *
 * Drive는 자체 frame-ancestors 정책을 통제하므로 /preview 대신 /view 링크로 엽니다.
 * 이전 버전·구버전 보관·내부 대장 ID는 이 레지스트리에 넣지 않습니다.
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

const view = (id: string) => `https://drive.google.com/file/d/${id}/view?usp=drive_link`;
const folder = (id: string) => `https://drive.google.com/drive/folders/${id}?usp=drive_link`;
const targetToGuideLang = (target: Target): GuideLang => (target === "zh-CN" ? "zh" : target);

export const DRIVE_GUIDE_UPDATED = catalog.updated;
export const DRIVE_SOURCE_FOLDER_URL = catalog.sourceFolder;
export const DRIVE_GUIDE_MASTER_URL = view(catalog.indexes.master);
export const DRIVE_GUIDE_TEXT_INDEX_URL = view(catalog.indexes.textIndex);
export const DRIVE_TEXT_FOLDER_URL = folder(catalog.indexes.textFolder);
export const DRIVE_VIDEO_FOLDER_URL = folder(catalog.indexes.videoFolder);
export const DRIVE_VIDEO_ZIP_URL = view(catalog.indexes.videoZip);

export const DRIVE_GUIDE_DOCS = catalog.docs;
export const DRIVE_GUIDE_VIDEOS = catalog.videos;
export const DRIVE_GUIDE_EXTRA_VIDEOS = catalog.extraVideos;

/** 24주제 × 4개 언어 = 96개 문서 링크 */
export function driveGuideUrlByNo(no: string, lang: GuideLang): string | undefined {
  const id = catalog.docs.find((doc) => doc.no === no)?.files[lang];
  return id ? view(id) : undefined;
}

export function driveGuideUrl(slug: string, target: Target): string | undefined {
  const doc = catalog.docs.find((item) => item.slug === slug);
  if (!doc) return undefined;
  const id = doc.files[targetToGuideLang(target)];
  return id ? view(id) : undefined;
}

/** 21개 툴 영상 + 23/24/25 추가 영상 = KO 32 / EN 33 = 65개 링크 */
export function driveVideoUrlByNo(no: string, lang: Lang): string | undefined {
  const video = [...catalog.videos, ...catalog.extraVideos].find((item) => item.no === no);
  const id = video?.files[lang];
  return id ? view(id) : undefined;
}

export function driveVideoUrl(slug: string, lang: Lang): string | undefined {
  const video = catalog.videos.find((item) => item.slug === slug);
  const id = video?.files[lang];
  return id ? view(id) : undefined;
}

export type DriveVideoLink = { no: string; name: string; lang: Lang; url: string };

export const ALL_DRIVE_VIDEO_LINKS: DriveVideoLink[] = [
  ...catalog.videos,
  ...catalog.extraVideos,
].flatMap((video) =>
  (["ko", "en"] as const).map((lang) => {
    const id = video.files[lang];
    return id ? { no: video.no, name: video.name, lang, url: view(id) } : null;
  }),
).filter((item): item is DriveVideoLink => item !== null);
