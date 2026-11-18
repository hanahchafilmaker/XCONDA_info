import { DRIVE_GUIDE_DOCS } from "./driveGuides";
import { currentGuideIndexPath, currentGuidePath, embeddedGuideUrl, siteAssetUrl } from "./siteAssets";
import type { Target } from "../i18n/google";

/**
 * The 2026-11-18 current Drive HTML is sanitized into this repository and served
 * from `assets/guides/current/`. The hub embeds those same-origin pages; it never
 * opens Drive /view or /preview URLs.
 */
export function htmlGuideUrl(slug: string, target: Target): string | undefined {
  if (!DRIVE_GUIDE_DOCS.some((doc) => doc.slug === slug)) return undefined;
  return embeddedGuideUrl(siteAssetUrl(currentGuidePath(slug, target)));
}

export function htmlGuideIndexUrl(target: Target): string {
  return siteAssetUrl(currentGuideIndexPath(target));
}

/** The modal and standalone pages share compact labels for the current guide. */
export const htmlGuideLabels: Record<Target, {
  read: string;
  all: string;
  illustrated: string;
  original: string;
  print: string;
  loading: string;
  failed: string;
  openNew: string;
}> = {
  ko: {
    read: "현재 상세 가이드 보기", all: "현재 가이드 목록",
    illustrated: "현재 가이드", original: "기존 안내 · 영상", print: "인쇄 / PDF 저장",
    loading: "현재 가이드를 불러오는 중입니다.", failed: "현재 가이드를 불러오지 못했습니다.", openNew: "새 탭에서 열기",
  },
  en: {
    read: "Open the current guide", all: "Current guide index",
    illustrated: "Current guide", original: "Original guide & video", print: "Print / save PDF",
    loading: "Loading the current guide.", failed: "The current guide could not be loaded.", openNew: "Open in a new tab",
  },
  ja: {
    read: "現在のガイドを開く", all: "現在のガイド一覧",
    illustrated: "現在のガイド", original: "従来のガイド・動画", print: "印刷 / PDF 保存",
    loading: "ガイドを読み込んでいます。", failed: "ガイドを読み込めませんでした。", openNew: "新しいタブで開く",
  },
  "zh-CN": {
    read: "打开当前指南", all: "当前指南目录",
    illustrated: "当前指南", original: "原有指南和视频", print: "打印 / 保存 PDF",
    loading: "正在加载当前指南。", failed: "无法加载当前指南。", openNew: "在新标签页中打开",
  },
};
