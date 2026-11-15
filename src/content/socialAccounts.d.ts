export type SocialId = "instagram" | "threads" | "youtube" | "facebook" | "x";
export type SocialAccount = { id: SocialId; handle: string; href: string };
export const SOCIAL_ACCOUNTS: Record<"en" | "ko", SocialAccount[]>;
export function socialAccountsFor(language?: string): SocialAccount[];
export const OFFICIAL_SOCIAL_URLS: string[];
