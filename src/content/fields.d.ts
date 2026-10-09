/**
 * `src/content/fields.js` (사이트·동기화 스크립트 공용 노션 속성 규칙) 의 타입 선언.
 * 구현은 `.js` 한 곳에만 두고, TypeScript 쪽에는 이 선언만 제공합니다.
 */

export const COVER_KEYS: string[];
export const AUTHOR_KEYS: string[];
export const AUTHOR_EN_KEYS: string[];

export const COVER_SOURCE_LABELS: Record<string, string>;

export type CoverSource = "page_cover" | "body_image";

export type DerivedCover = {
  /** 브라우저에서 바로 열 수 있는 공개 이미지 주소 */
  url: string;
  /** 어디에서 가져왔는지 — 페이지 커버인지 본문 첫 이미지인지 */
  source: CoverSource;
  /** 첫 주소가 열리지 않을 때 이어서 시도할 같은 이미지의 다른 공개 주소 */
  fallback?: string;
};

export function personNames(value: unknown): string;
export function signNotionImage(src: string, blockId: string): string;
export function coverFromPageMap(pageMap: unknown, pageId: string): DerivedCover | null;
