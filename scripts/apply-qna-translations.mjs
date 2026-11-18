#!/usr/bin/env node
/**
 * Insert the reviewed-outstanding translation drafts for Q&A No 81-91 into
 * content/i18n/{en,ja,zh}.json.
 *
 * These are *drafts*: no per-entry `review` marker is added, so the files'
 * existing "AI 1차 번역(초안) — 원어민 검수 전" state still applies. Human
 * reviewers can later replace an entry with a `YYYY-MM-DD 검수 완료(검수자)`
 * marker; this script preserves such a marker on reruns.
 *
 *   node scripts/apply-qna-translations.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = path.join(ROOT, "content/notion-qna-81-91.json");
const LANGS = ["en", "ja", "zh"];
const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, "notion-content.json"), "utf8"));

const rowsBySlug = new Map(
  (snapshot.rows ?? [])
    .filter((row) => row.__type === "faq")
    .map((row) => [String(row.Slug ?? ""), row]),
);
for (const page of fixture.pages) {
  const row = rowsBySlug.get(page.slug);
  if (!row) throw new Error(`스냅샷에 없는 Q&A: ${page.slug}`);
  if (String(row.Title) !== page.title || String(row.Summary) !== page.answer) {
    throw new Error(`스냅샷과 번역 초안의 한국어 원문이 다릅니다: ${page.slug}`);
  }
  for (const lang of LANGS) {
    const tr = page.translations?.[lang];
    if (!tr?.title || !tr?.summary) throw new Error(`번역 누락: ${lang}/${page.slug}`);
  }
}

for (const lang of LANGS) {
  const file = path.join(ROOT, "content/i18n", `${lang}.json`);
  const dict = JSON.parse(fs.readFileSync(file, "utf8"));
  dict.updated = "2026-11-18";
  dict.entries ??= {};
  for (const page of fixture.pages) {
    const key = `qna/${page.slug}`;
    const tr = { ...page.translations[lang] };
    const existingReview = dict.entries[key]?.review;
    if (existingReview) tr.review = existingReview;
    dict.entries[key] = tr;
  }
  fs.writeFileSync(file, `${JSON.stringify(dict, null, 2)}\n`);
  console.log(`✔ ${lang}: Q&A 번역 초안 ${fixture.pages.length}건 · 총 ${Object.keys(dict.entries).length}항목 (검수 상태 유지)`);
}
