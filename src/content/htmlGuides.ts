import catalog from "./htmlGuides.json";
import type { Target } from "../i18n/google";

const guideSlugs = new Set(catalog.map((guide) => guide.slug));

/** 파일 경로는 허브의 루트 기준 상대 경로입니다. 호출 쪽에서 hubBase()를 붙입니다. */
export function htmlGuidePath(slug: string, target: Target): string | undefined {
  if (!guideSlugs.has(slug)) return undefined;
  const lang = target === "zh-CN" ? "zh" : target;
  return `manuals/${lang}/${slug}.html`;
}

export function htmlGuideIndexPath(target: Target): string {
  const lang = target === "zh-CN" ? "zh" : target;
  return `manuals/${lang}/index.html`;
}

/** JA/ZH는 사이트 크롬이 기계 번역되지만, HTML 가이드는 제공받은 해당 언어 원본을 엽니다. */
export const htmlGuideLabels: Record<Target, { read: string; all: string }> = {
  ko: { read: "화면으로 보는 상세 가이드 (새 탭)", all: "전체 화면 가이드 보기 (새 탭)" },
  en: { read: "Illustrated guide (opens in a new tab)", all: "All illustrated guides (opens in a new tab)" },
  ja: { read: "画面付きの詳細ガイド（新しいタブ）", all: "画面付きガイド一覧（新しいタブ）" },
  "zh-CN": { read: "图文详细指南（新标签页）", all: "全部图文指南（新标签页）" },
};
