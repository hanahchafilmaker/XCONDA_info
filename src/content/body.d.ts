/**
 * `src/content/body.js` (노션 본문 record map → Block[] · Block[] → HTML) 의 타입 선언.
 * 구현은 `.js` 한 곳에만 두고, TypeScript 쪽에는 이 선언만 제공합니다.
 */
import type { Block, Rich } from "./types";

export function dashed(id: string): string;
export function extractPageId(input: unknown): string | undefined;

/** 레거시 레코드맵(`{ id: { value } }`) → 블록 목록 */
export function parseLegacyRecordMap(data: unknown, pageId: string): Block[];

/** Rich 텍스트 → HTML */
export function richToHtml(rich: Rich | undefined): string;

/** 블록 목록 → HTML. alt: 캡션이 없는 이미지의 기본 설명(보통 글 제목) */
export function blocksToHtml(blocks: Block[] | undefined, options?: { alt?: string }): string;
