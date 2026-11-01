import { absoluteUrl, routePathFor, seoEligibility, textOf } from './seo.js';
const idKey = id => String(id ?? '').replace(/-/g, '').toLowerCase();
// Input rows must be the already-public snapshot. Never derive a public route from referenced Notion blocks.
export function mentionIndex(rows, siteUrl) {
  const index = new Map(), seen = new Set();
  for (const row of rows ?? []) {
    if (row.Published === false || !row.id) continue;
    const eligible = seoEligibility(row, row.__type);
    const route = eligible.eligible && routePathFor(row.__type, eligible.slug);
    if (!route || seen.has(route)) continue;
    seen.add(route);
    index.set(idKey(row.id), { title: textOf(row.Title) || '참조 문서', href: absoluteUrl(siteUrl, route) });
  }
  return index;
}
export const mentionIdKey = idKey;
