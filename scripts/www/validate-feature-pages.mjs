#!/usr/bin/env node
/**
 * www 기능 페이지 원고 검사 — `npm run www:check` (node scripts/www/validate-feature-pages.mjs)
 *
 * 검사하는 것
 *   1) 20개 페이지 · slug 중복 없음 · kebab-case
 *   2) 제목·설명 길이 (검색 결과에서 잘리지 않는 범위)
 *   3) 본문 구성 (h1 · intro · features 3~6 · faq 2~5)
 *   4) `hub` 값이 실제 허브 글 슬러그인지 (notion-content.json 대조)
 *
 * 실패하면 exit 1 — www 저장소에 옮기기 전에 여기서 먼저 막습니다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "../..");
const DATA = path.join(ROOT, "www/feature-pages.json");
const SNAPSHOT = path.join(ROOT, "notion-content.json");

const LIMITS = {
  koTitleMax: 60,
  enTitleMax: 60,
  descMin: 70,
  descMax: 155,
  introMin: 80,
  h1Max: 40,
  faqMax: 6,
};

const errors = [];
const warns = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warns.push(msg);

const data = JSON.parse(fs.readFileSync(DATA, "utf8"));
const pages = data?.pages ?? [];
const basePath = data?.basePath ?? "features";

if (pages.length !== 20) fail(`기능 페이지가 ${pages.length}개입니다 — 20개여야 합니다.`);

const hubSlugs = new Set(
  (JSON.parse(fs.readFileSync(SNAPSHOT, "utf8")).rows ?? []).map((r) => String(r.Slug ?? "").trim()).filter(Boolean),
);

const seen = new Set();
const rows = [];
for (const p of pages) {
  const id = p?.slug ?? "(slug 없음)";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) fail(`${id}: slug 는 소문자·숫자·하이픈만 씁니다.`);
  if (seen.has(id)) fail(`${id}: slug 가 중복입니다.`);
  seen.add(id);

  if (!p?.name) fail(`${id}: name 이 없습니다.`);
  if (!p?.studio) warn(`${id}: studio 경로가 없습니다(스튜디오 연결 없음).`);
  if (!p?.hub) fail(`${id}: hub(허브 가이드 슬러그)가 없습니다.`);
  else if (!hubSlugs.has(p.hub)) fail(`${id}: hub "${p.hub}" 가 허브 글 목록에 없습니다.`);

  for (const lang of ["ko", "en"]) {
    const c = p?.[lang];
    if (!c) {
      fail(`${id}: ${lang} 원고가 없습니다.`);
      continue;
    }
    const titleMax = lang === "ko" ? LIMITS.koTitleMax : LIMITS.enTitleMax;
    if (!c.title) fail(`${id}/${lang}: title 이 없습니다.`);
    else if (c.title.length > titleMax) fail(`${id}/${lang}: title ${c.title.length}자 (최대 ${titleMax})`);
    if (!c.description) fail(`${id}/${lang}: description 이 없습니다.`);
    else if (c.description.length > LIMITS.descMax) fail(`${id}/${lang}: description ${c.description.length}자 (최대 ${LIMITS.descMax})`);
    else if (c.description.length < LIMITS.descMin) warn(`${id}/${lang}: description ${c.description.length}자 (권장 ${LIMITS.descMin}자 이상)`);
  }

  const ko = p?.ko ?? {};
  if (!ko.h1) fail(`${id}: h1 이 없습니다.`);
  else if (ko.h1.length > LIMITS.h1Max) warn(`${id}: h1 이 ${ko.h1.length}자로 깁니다(최대 ${LIMITS.h1Max} 권장)`);
  if (!ko.intro || ko.intro.length < LIMITS.introMin) fail(`${id}: intro 가 ${ko.intro?.length ?? 0}자 — ${LIMITS.introMin}자 이상 필요`);
  if (!Array.isArray(ko.features) || ko.features.length < 3) fail(`${id}: features 가 3개 미만입니다.`);
  else if (ko.features.length > 6) warn(`${id}: features 가 ${ko.features.length}개로 많습니다(6개 이하 권장)`);
  if (!Array.isArray(ko.faq) || ko.faq.length < 2) fail(`${id}: faq 가 2개 미만입니다.`);
  else if (ko.faq.length > LIMITS.faqMax) warn(`${id}: faq 가 ${ko.faq.length}개입니다(최대 ${LIMITS.faqMax} 권장)`);
  for (const [i, f] of (ko.faq ?? []).entries()) {
    if (!f?.q || !f?.a) fail(`${id}: faq[${i}] 에 질문 또는 답변이 없습니다.`);
    else if (f.a.length < 20) warn(`${id}: faq[${i}] 답변이 짧습니다(${f.a.length}자).`);
  }

  rows.push({
    slug: id,
    ko: `${ko.title?.length ?? 0}자`,
    en: `${p?.en?.title?.length ?? 0}자`,
    desc: `${ko.description?.length ?? 0}/${p?.en?.description?.length ?? 0}`,
    faq: ko.faq?.length ?? 0,
  });
  // 경로 규칙 확인
  if (p?.path && p.path !== `/${basePath}/${id}`) warn(`${id}: path "${p.path}" 가 규칙 /${basePath}/${id} 과 다릅니다.`);
}

console.log(`기능 페이지 ${pages.length}개 · slug 중복 ${pages.length - seen.size}건\n`);
console.table(rows.slice(0, 20));
if (warns.length) {
  console.log(`\n권장 사항 ${warns.length}건`);
  for (const w of warns) console.log(`  · ${w}`);
}
if (errors.length) {
  console.error(`\n실패 ${errors.length}건`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log("\nPASS — 20개 기능 페이지 원고가 형식과 길이 기준을 통과했습니다.");
