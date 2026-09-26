import type { Lang } from "../i18n/dict";

/**
 * 툴별 공식 영상 가이드 (Google Drive · xconda_video_guide / 공식 공유 폴더).
 * 가이드 모달 최상단에 공식 영상이 임베드됩니다.
 */
const drive = (id: string) => `https://drive.google.com/file/d/${id}/preview`;

export const TOOL_VIDEOS: Partial<Record<string, Record<Lang, string>>> = {
  turn: {
    ko: drive("1a9mwJiB5NJPEu70l3UWaNNE-Y-kKr_Nm"),
    en: drive("1a9mwJiB5NJPEu70l3UWaNNE-Y-kKr_Nm"),
  },
  video: {
    ko: drive("1uVP4Ih6kKHxb0uUHsntCR7UsepMJ2djG"),
    en: drive("1uVP4Ih6kKHxb0uUHsntCR7UsepMJ2djG"),
  },
};

export function getToolVideo(slug: string, lang: Lang): string | undefined {
  return TOOL_VIDEOS[slug]?.[lang];
}
