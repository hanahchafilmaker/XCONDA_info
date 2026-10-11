/* 허브 Q&A 표 규칙(src/content/hubQna.js) 의 타입 선언 — 사이트 코드가 쓰는 부분만 노출합니다. */

/** 이 글은 허브 Q&A 표에서 왔다는 표시 (스냅샷 행의 `__source`) */
export declare const HUB_QNA_SOURCE: "hub-qna";

export declare const HUB_TITLE_KEYS: string[];
export declare const HUB_CATEGORY_KEYS: string[];
export declare const HUB_PRIORITY_KEYS: string[];
export declare const HUB_NUMBER_KEYS: string[];
export declare const HUB_STATUS_KEYS: string[];
export declare const HUB_PUBLISH_KEYS: string[];
export declare const HUB_PUBLISH_VALUES: string[];
export declare const HUB_HOLD_VALUES: string[];
export declare const HUB_CHECK_PATTERNS: string[];
export declare const HUB_ANSWER_HEADINGS: RegExp[];
export declare const HUB_SOURCE_HEADINGS: RegExp[];
export declare const HUB_INTERNAL_HEADINGS: RegExp[];

export type HubRow = Record<string, unknown>;

export type HubQnaDecision = {
  /** 사이트에 넣을지 */
  include: boolean;
  /** 왜 그렇게 판단했는지 (Actions 요약 · 스냅샷 `__decision`) */
  reason: string;
  /** `상태` 원문 */
  status: string;
  /** `허브 게시` 원문 */
  publish: string;
  /** 강제 규칙이 적용됐는지 */
  forced: "publish" | "hold" | null;
};

export declare function richPlain(value: unknown): string;
export declare function hubQnaText(row: HubRow, names: string[]): string;
export declare function hubQnaNumberValue(row: HubRow, names: string[]): number | undefined;
export declare function normalizeHubValue(value: unknown): string;
export declare function hubQnaTitle(row: HubRow): string;
export declare function hubQnaCategory(row: HubRow): string;
export declare function hubQnaStatus(row: HubRow): string;
export declare function hubQnaPublishValue(row: HubRow): string;
export declare function hubQnaPriority(row: HubRow): number | undefined;
export declare function hubQnaNumber(row: HubRow): number | undefined;
export declare function hubQnaNeedsCheck(row: HubRow): boolean;
export declare function hubQnaDecision(row: HubRow): HubQnaDecision;
export declare function includeHubQnaRow(row: HubRow): boolean;
export declare function hubQnaOrder(row: HubRow): number;

export type HubSection = { mode: string; heading: string; ids: string[] };

export declare function toBlockMap(pageMap: unknown): Map<string, Record<string, any>>;
export declare function blockRich(block: unknown): unknown;
export declare function blockText(block: unknown): string;
export declare function isHeadingBlock(block: unknown): boolean;
export declare function hubHeadingKind(heading: string): "answer" | "source" | "internal" | undefined;
export declare function isInternalNoteText(text: string): boolean;
export declare function splitHubSections(pageMap: unknown, rootId: string): HubSection[];
export declare function hubAnswerFromPage(
  pageMap: unknown,
  rootId: string
): { text: string; from: "answer" | "preamble" | "none"; sections: Array<{ mode: string; heading: string }> };
export declare function hubPublicPageMap(
  pageMap: unknown,
  rootId: string
): { map: Record<string, unknown>; note: string | null; keptModes: string[] };
export declare function hubQnaSiteRow(
  row: HubRow,
  options?: { summary?: string; dateFallback?: string }
): Record<string, unknown>;
