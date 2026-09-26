import type { Entry, Tool } from "../content/types";
import type { Lang } from "./dict";

/**
 * Keep the source object intact so another language can be selected without
 * fetching or rebuilding the content again.
 */
export function localizeEntry(entry: Entry, lang: Lang): Entry {
  const translated = entry.translations?.[lang];
  return translated ? { ...entry, ...translated } : entry;
}

export function localizeTool(tool: Tool, lang: Lang): Tool {
  const translated = tool.translations?.[lang];
  return translated ? { ...tool, ...translated } : tool;
}
