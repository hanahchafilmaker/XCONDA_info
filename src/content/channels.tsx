/** Channel icons/labels. Official locale-specific URLs live in socialAccounts.js.
 * Historical channel metadata is retained for classifying existing news only.
 */

import type { ComponentType, SVGProps } from "react";
import { STUDIO_URL } from "./tools";
import { socialAccountsFor, type SocialId } from "./socialAccounts";

/** 게시된 Notion 페이지 — 뉴스/공지 원본 DB */
export const NOTION_NEWS_URL =
  "https://silicon-mascara-c7d.notion.site/XCONDA_NEWs-3e72ebc017ad8024a3f5ef8fb9f8c6dd";

type IconProps = SVGProps<SVGSVGElement>;

const brand = (p: IconProps) => ({ viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true, ...p });

/** X (구 Twitter) */
export const IconX = (p: IconProps) => (
  <svg {...brand(p)}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

/** Threads */
export const IconThreads = (p: IconProps) => (
  <svg {...brand(p)}>
    <path d="M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z" />
  </svg>
);

/** YouTube */
export const IconYouTube = (p: IconProps) => (
  <svg {...brand(p)}>
    <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12z" />
  </svg>
);

/** Instagram */
export const IconInstagram = (p: IconProps) => (
  <svg {...brand(p)}>
    <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.88 5.88 0 0 0-2.13 1.38A5.88 5.88 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.8.73 1.48 1.38 2.13a5.88 5.88 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.88 5.88 0 0 0 2.13-1.38 5.88 5.88 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.88 5.88 0 0 0-1.38-2.13A5.88 5.88 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4zm6.41-11.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z" />
  </svg>
);

/** Facebook */
export const IconFacebook = (p: IconProps) => (
  <svg {...brand(p)}>
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.026 4.388 11.021 10.125 11.927v-8.437H7.078v-3.49h3.047V9.413c0-3.026 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.931-1.956 1.887v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
  </svg>
);

/** Naver (네이버 블로그) */
export const IconNaver = (p: IconProps) => (
  <svg {...brand(p)}>
    <path d="M16.273 12.845 7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845Z" />
  </svg>
);

/** Notion */
export const IconNotion = (p: IconProps) => (
  <svg {...brand(p)}>
    <path d="M4.46 4.2c.75.6 1.03.56 2.44.46l13.28-.8c.28 0 .05-.28-.05-.33l-2.2-1.6c-.43-.33-1-.7-2.1-.61L2.97 2.28c-.47.04-.56.28-.38.47zm.8 3.1v13.97c0 .75.37 1.03 1.22.98l14.6-.84c.84-.05.94-.56.94-1.17V6.36c0-.6-.24-.94-.75-.89l-15.26.89c-.56.05-.75.33-.75.94zm14.41.75c.1.42 0 .84-.42.89l-.7.14v10.3c-.61.33-1.17.52-1.64.52-.75 0-.94-.24-1.5-.94l-4.6-7.2v6.97l1.46.33s0 .84-1.17.84l-3.22.19c-.1-.19 0-.66.33-.75l.84-.23V9.84L7.88 9.75c-.1-.42.14-1.03.8-1.08l3.46-.23 4.77 7.3V9.28l-1.22-.14c-.1-.52.28-.89.75-.94l3.23-.14z" />
  </svg>
);

/** 공식 홈페이지 */
export const IconGlobe = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3.5 9h17M3.5 15h17M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
  </svg>
);

export type Channel = {
  /** 뉴스 글의 Category 값과 일치시키면 채널 필터로 동작합니다 */
  id: string;
  name: string;
  handle: string;
  href: string;
  descKey: string;
  Icon: ComponentType<IconProps>;
};

const SOCIAL_META: Record<SocialId, Pick<Channel, "name" | "descKey" | "Icon">> = {
  instagram: { name: "Instagram", descKey: "v.news.ch.instagram", Icon: IconInstagram },
  threads: { name: "Threads", descKey: "v.news.ch.threads", Icon: IconThreads },
  youtube: { name: "YouTube", descKey: "v.news.ch.youtube", Icon: IconYouTube },
  facebook: { name: "Facebook", descKey: "v.news.ch.facebook", Icon: IconFacebook },
  x: { name: "X", descKey: "v.news.ch.x", Icon: IconX },
};

export function socialChannelsFor(language: string): Channel[] {
  return socialAccountsFor(language).map((account) => ({ ...account, ...SOCIAL_META[account.id] }));
}

const WEB_CHANNEL: Channel = {
  id: "web", name: "xconda.ai", handle: "Official", href: STUDIO_URL,
  descKey: "v.news.ch.web", Icon: IconGlobe,
};

/** Only the approved social accounts and the product site are public shortcuts. */
export function newsChannelsFor(language: string): Channel[] {
  return [...socialChannelsFor(language), WEB_CHANNEL];
}

/** Classification metadata, not the list of public account shortcuts. */
export const CHANNELS: Channel[] = [
  ...socialChannelsFor("ko"),
  { id: "naver", name: "Naver Blog", handle: "", href: "", descKey: "v.news.ch.naver", Icon: IconNaver },
  { id: "notion", name: "Notion", handle: "XCONDA_NEWs", href: NOTION_NEWS_URL, descKey: "v.news.ch.notion", Icon: IconNotion },
  WEB_CHANNEL,
];
