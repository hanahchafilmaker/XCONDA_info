import { DRIVE_GUIDE_TEXT_INDEX_URL, driveGuideUrl } from "./driveGuides";
import type { Target } from "../i18n/google";

/**
 * 허브의 가이드 링크는 2026-11-18 공유 Drive "현재판"을 가리킵니다.
 * 로컬 `manuals/{ko,en,ja,zh}/{slug}.html` 은 2026-11-03 이전 정적 사본이라
 * 더 이상 사이트 링크로 사용하지 않습니다. Drive는 iframe 대신 새 탭 링크로 엽니다.
 */
export function htmlGuideUrl(slug: string, target: Target): string | undefined {
  return driveGuideUrl(slug, target);
}

export function htmlGuideIndexUrl(_target: Target): string {
  return DRIVE_GUIDE_TEXT_INDEX_URL;
}

/** JA/ZH는 사이트 크롬이 기계 번역되지만, HTML 가이드는 제공받은 해당 언어 원본을 엽니다. */
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
    read: "최신 상세 가이드 (Google Drive에서 열기)", all: "전체 최신 가이드 보기 (새 탭)",
    illustrated: "최신 가이드", original: "기존 안내 · 영상", print: "인쇄 / PDF 저장",
    loading: "상세 가이드를 불러오는 중입니다.", failed: "상세 가이드를 불러오지 못했습니다.", openNew: "새 탭에서 열기",
  },
  en: {
    read: "Latest guide (opens in Google Drive)", all: "All current guides (opens in a new tab)",
    illustrated: "Latest guide", original: "Original guide & video", print: "Print / save PDF",
    loading: "Loading the illustrated guide.", failed: "The illustrated guide could not be loaded.", openNew: "Open in a new tab",
  },
  ja: {
    read: "最新ガイド（Google Driveで開く）", all: "最新ガイド一覧（新しいタブ）",
    illustrated: "最新ガイド", original: "従来のガイド・動画", print: "印刷 / PDF 保存",
    loading: "ガイドを読み込んでいます。", failed: "ガイドを読み込めませんでした。", openNew: "新しいタブで開く",
  },
  "zh-CN": {
    read: "最新指南（在 Google Drive 中打开）", all: "全部最新指南（新标签页）",
    illustrated: "最新指南", original: "原有指南和视频", print: "打印 / 保存 PDF",
    loading: "正在加载图文指南。", failed: "无法加载图文指南。", openNew: "在新标签页中打开",
  },
};
