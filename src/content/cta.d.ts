export const WWW_ORIGIN: string;
export const TOOL_LINKS: Array<{ name: string; path: string; match: RegExp }>;
export function wwwUrl(path?: string): string;
export function toolLinkFor(input?: { tool?: string; title?: string }): { name: string; path: string; match: RegExp } | null;
export interface ProductLink {
  kind: "tool" | "start" | "pricing";
  label: string;
  href: string;
}
export function productLinks(input?: {
  lang?: string;
  tool?: string;
  title?: string;
}): { label: string; links: ProductLink[] };
