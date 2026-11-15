/** Official accounts supplied by the operator (2026-11-15).
 * Shared by the UI and static JSON-LD builder; do not duplicate URLs elsewhere.
 * English uses the English accounts; Korean/Japanese/Chinese use Korean accounts
 * to match the hub's existing locale/support policy. X is Korean-only.
 */
export const SOCIAL_ACCOUNTS = {
  en: [
    { id: "instagram", handle: "xconda_official", href: "https://www.instagram.com/xconda_official/" },
    { id: "threads", handle: "xconda_official", href: "https://www.threads.com/@xconda_official" },
    { id: "youtube", handle: "Xconda_official", href: "https://www.youtube.com/@xconda_official" },
    { id: "facebook", handle: "xconda", href: "https://www.facebook.com/profile.php?id=61584980414012" },
  ],
  ko: [
    { id: "instagram", handle: "xconda_korea", href: "https://www.instagram.com/xconda_korea/" },
    { id: "threads", handle: "xconda_korea", href: "https://www.threads.com/@xconda_korea" },
    { id: "youtube", handle: "xconda_korea", href: "https://www.youtube.com/@xconda_korea" },
    { id: "facebook", handle: "엑스콘다", href: "https://www.facebook.com/profile.php?id=61587791698809" },
    { id: "x", handle: "xconda", href: "https://x.com/Xconda_official/" },
  ],
};

export function socialAccountsFor(language = "ko") {
  return SOCIAL_ACCOUNTS[String(language).toLowerCase().split(/[-_]/)[0] === "en" ? "en" : "ko"];
}

// Both locale profiles identify the same organization/product in structured data.
export const OFFICIAL_SOCIAL_URLS = [...new Set(Object.values(SOCIAL_ACCOUNTS).flat().map((account) => account.href))];
