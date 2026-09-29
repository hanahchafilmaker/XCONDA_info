/**
 * `src/content/classify.js` (사이트·동기화 스크립트 공용 분류 규칙) 의 타입 선언.
 * 구현은 `.js` 한 곳에만 두고, TypeScript 쪽에는 이 선언만 제공합니다.
 */
import type { EntryType } from "./types";

export type ClassifyInput = {
  /** 노션 `Type` 값 (선택값 · 자유 문자열) */
  type?: unknown;
  category?: unknown;
  link?: unknown;
  changes?: unknown;
  version?: unknown;
  tool?: unknown;
};

export type ClassifySource = "type" | "unknown" | "default";

export type ClassifyResult = {
  type: EntryType;
  /** "type" = 노션 Type 값 그대로 · "unknown" = 처음 보는 값이라 추론 · "default" = Type 칸 비어 있음 */
  source: ClassifySource;
  /** 노션에 적혀 있던 원문 */
  raw: string;
  /** 사람이 읽는 판정 근거 (Actions 요약에 표시) */
  reason: string;
  /** 링크가 알려진 SNS 주소일 때의 채널 id (x · threads · youtube · instagram · linkedin · notion) */
  channel?: string;
};

export type InferredType = { type: EntryType; reason: string };

export const ENTRY_TYPES: EntryType[];
export const SECTION_LABELS: Record<EntryType, string>;
export const TYPE_CHOICES: string;
export const TYPE_ALIASES: Record<string, EntryType>;
export const CHANNEL_NAMES: Record<string, string>;
export const PUBLISHED_KEYS: string[];

export function normalizeTypeKey(raw: unknown): string;
export function resolveTypeAlias(raw: unknown): EntryType | undefined;
export function isEntryType(value: unknown): value is EntryType;
export function channelFromUrl(url: unknown): string | undefined;
export function channelName(id: unknown): string | undefined;
export function inferType(input?: ClassifyInput): InferredType;
export function classifyType(input?: ClassifyInput): ClassifyResult;
export function pickRow(row: unknown, names: string[]): unknown;
export function publishedKey(row: unknown): string | undefined;
export function isPublishedRow(row: unknown): boolean | undefined;
export function hasPublishedColumn(rows: unknown): boolean;
export function includeRow(row: unknown, requirePublished: boolean): boolean;
