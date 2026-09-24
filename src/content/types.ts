export type EntryType = "notice" | "update" | "guide" | "faq";

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

export type Entry = {
  id: string;
  type: EntryType;
  title: string;
  summary: string;
  category: string;
  date: string; // ISO
  tags: string[];
  cover?: string;
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
};
