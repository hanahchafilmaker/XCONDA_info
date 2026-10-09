/**
 * 사이트 섹션과 1:1로 대응하는 콘텐츠 유형.
 *  notice → 공지사항 · news → 뉴스(타 SNS 정보) · guide → 툴 사용법 · blog → 블로그 · faq → Q&A
 *  (기존 "update" 유형은 "news"로 통합되었습니다.)
 */
export type EntryType = "notice" | "news" | "guide" | "blog" | "faq";

/** 인라인 서식이 있는 텍스트 조각 (Notion rich_text 호환) */
export type RichSeg = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strike?: boolean;
  href?: string;
};
export type Rich = string | RichSeg[];

export type Block =
  | { type: "p"; text: Rich }
  | { type: "h2"; text: Rich }
  | { type: "h3"; text: Rich }
  | { type: "ul"; items: Rich[] }
  | { type: "ol"; items: Rich[] }
  | { type: "todo"; items: { text: Rich; checked: boolean }[] }
  | { type: "quote"; text: Rich }
  | { type: "callout"; text: Rich; icon?: string }
  | { type: "code"; text: string; language?: string }
  | { type: "img"; src: string; caption?: string }
  | { type: "video"; src: string; caption?: string }
  | { type: "link"; href: string; caption?: string }
  | { type: "toggle"; text: Rich; children?: Block[] }
  | { type: "divider" };

export type ChangeKind = "New" | "Improved" | "Fixed";
export type Change = { kind: ChangeKind; text: string };

export type EntryTranslation = {
  title?: string;
  summary?: string;
  category?: string;
  changes?: Change[];
  blocks?: Block[];
  /** 작성자 표기 (예: `Author EN` 속성) */
  author?: string;
};

export type Entry = {
  id: string;
  type: EntryType;
  title: string;
  summary: string;
  category: string;
  date: string; // ISO
  tags: string[];
  /**
   * 썸네일. `Cover` 속성 → 노션 페이지 커버 → 본문 첫 이미지 순서로 채워집니다.
   * (규칙: `src/content/fields.js` — 사이트와 동기화 스크립트가 함께 사용)
   */
  cover?: string;
  /** `cover` 가 열리지 않을 때 이어서 시도할 같은 이미지의 다른 공개 주소 (노션 첨부용) */
  coverFallback?: string;
  /** 작성자 — 노션 `Author`(또는 `작성자`) 속성. 블로그 카드 · 상세 모달에 표시됩니다. */
  author?: string;
  url?: string;
  pinned?: boolean;
  important?: boolean;
  version?: string;
  tool?: string;
  order?: number;
  changes?: Change[];
  /** 샘플/정적 콘텐츠의 본문. Notion 항목은 모달을 열 때 블록을 불러옵니다. */
  blocks?: Block[];
  /** 본문을 Notion에서 지연 로딩해야 하는지 */
  remote?: boolean;
  /** 정적 콘텐츠 또는 Notion의 언어별 보조 필드 */
  translations?: Partial<Record<"ko" | "en", EntryTranslation>>;
};

export type ToolTranslation = {
  tagline: string;
  desc: string;
  steps: string[];
  tips?: string[];
};

export type Tool = {
  slug: string;
  name: string;
  group: "핵심 스튜디오" | "스토리보드" | "카메라 · 앵글" | "이미지 편집" | "생성 · 보정";
  tagline: string;
  desc: string;
  href: string;
  image?: string;
  badge?: string;
  steps: string[];
  tips?: string[];
  translations?: Partial<Record<"ko" | "en", ToolTranslation>>;
};
