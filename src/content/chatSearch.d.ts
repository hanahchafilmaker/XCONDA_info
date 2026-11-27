export type ChatDoc = { title: string; text: string; slug?: string; kind: string };
export type ChatIndex = { docs: ChatDoc[] };
export const HINTS: Record<string, string>;
export const SCORE_GOOD: number;
export const SCORE_MAYBE: number;
export function buildChatIndex<T extends ChatDoc>(docs: T[]): ChatIndex & { docs: T[] };
export function searchChat(ix: ChatIndex, question: string): { index: number; score: number }[];
