#!/usr/bin/env node
/**
 * Record the intentional `length-long` QC exceptions for Q&A No 81-91.
 *
 * The approved Korean answers are deliberately terse, while the static localized
 * pages require a summary of at least 40 characters. The translations add the
 * minimum context needed to be understandable without changing the approved
 * facts. Existing review markers remain untouched; these entries are drafts.
 *
 *   node scripts/apply-qna-qc-allow.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LANGS, koSources, loadAllowlist, qcLanguage } from "./i18n-qc.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = path.join(ROOT, "content/notion-qna-81-91.json");
const ALLOW = path.join(ROOT, "content/i18n/qc-allow.json");
const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, "notion-content.json"), "utf8"));
const sources = koSources(snapshot);
const allow = loadAllowlist(ROOT);
allow._notes ??= {};
const keys = new Set(fixture.pages.map((page) => `qna/${page.slug}`));
const note = " 승인된 한국어 답변이 매우 짧아, 정적 번역 페이지의 최소 본문 길이(40자)를 맞추고 문맥·용어를 보충한 의도된 length-long 경고입니다. 숫자·정책·브랜드 표기는 원문과 일치합니다.";

for (const lang of LANGS) {
  const dict = JSON.parse(fs.readFileSync(path.join(ROOT, "content/i18n", `${lang}.json`), "utf8"));
  const result = qcLanguage(lang, dict, sources, allow);
  const intentional = result.warnings.filter((w) => keys.has(w.key) && w.kind === "length-long");
  if (!intentional.length) continue;
  allow[lang] ??= {};
  for (const warning of intentional) {
    const kinds = [...new Set([...(allow[lang][warning.key] ?? []), warning.kind])];
    allow[lang][warning.key] = kinds;
  }
  allow._notes[`${lang}:qna-81-91`] = `${lang}${note}`;
  console.log(`✔ ${lang}: 의도된 길이 경고 ${intentional.length}건 허용 목록에 기록`);
}
fs.writeFileSync(ALLOW, `${JSON.stringify(allow, null, 2)}\n`);
