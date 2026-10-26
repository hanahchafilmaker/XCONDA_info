/**
 * 번역 검수 진행률 도구 회귀 테스트 — 네트워크 없이 실행됩니다.
 *
 *   npm run test:unit
 *
 * 검증하는 것
 *   1) `review` 해석 — `YYYY-MM-DD 검수 완료(검수자)` 만 완료로 인정(초안·검수 전은 제외)
 *   2) 진행률 셈 — 완료/초안/번역 없음/원문 없는 키, QC 오류·경고를 항목별로 붙임
 *   3) 전체 합계 — 언어별 합이 전체와 같고 진행률이 반올림됨
 *   4) 실제 저장소 파일 — en·ja·zh 95항목 × 3언어가 리포트에 나오는지(오타·누락 방지)
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseReview, progressOf, overall, progressMarkdown, summaryMarkdown } from "./i18n-progress.mjs";
import { LANGS, koSources, loadAllowlist, qcLanguage } from "./i18n-qc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..");

const sources = new Map([
  ["qna/a", { title: "가", summary: "요약" }],
  ["post/b", { title: "나", summary: "요약" }],
]);

test("review 표기는 `YYYY-MM-DD 검수 완료(검수자)` 만 완료로 인정한다", () => {
  assert.equal(parseReview("2026-10-27 검수 완료(김하나)").reviewed, true);
  assert.equal(parseReview("2026-10-27 검수 완료(김하나)").date, "2026-10-27");
  assert.equal(parseReview("2026-10-27 검수 완료(김하나)").reviewer, "김하나");
  // 영어 표기 허용
  assert.equal(parseReview("2026-11-01 reviewed (Hana)").reviewed, true);
  // 날짜가 없거나 초안이면 완료가 아니다
  assert.equal(parseReview("검수 완료(김하나)").reviewed, false);
  assert.equal(parseReview("2026-10-25 AI 1차 번역(초안) — 원어민 검수 전").reviewed, false);
  assert.equal(parseReview("2026-10-25 검수 완료(초안)").reviewed, false);
  assert.equal(parseReview("").reviewed, false);
  assert.equal(parseReview(undefined).reviewed, false);
});

test("진행률은 완료·초안·번역 없음을 세고 QC 결과를 항목에 붙인다", () => {
  const dict = {
    review: "2026-10-25 AI 1차 번역(초안) — 원어민 검수 전",
    entries: {
      "qna/a": { title: "A", summary: "s", review: "2026-10-27 검수 완료(김하나)" },
      "qna/unknown": { title: "X", summary: "s" },
    },
  };
  const qc = {
    errors: [{ key: "post/b", kind: "email-missing", detail: "x@y.z" }],
    warnings: [{ key: "post/b", kind: "number-missing", detail: "7" }],
    suppressed: 2,
  };
  const p = progressOf({ sources, dict, qc });
  assert.equal(p.total, 2);
  assert.equal(p.reviewed, 1);
  assert.equal(p.draft, 0);
  assert.equal(p.missing, 1); // post/b 는 번역이 없습니다
  assert.equal(p.percent, 50);
  assert.equal(p.errors, 1);
  assert.equal(p.warnings, 1);
  assert.equal(p.suppressed, 2);
  assert.deepEqual(p.orphan, ["qna/unknown"]); // 원문이 없는 키
  // 번역이 없는 원문은 **한국어 제목**과 함께 남겨야 운영자가 무엇을 번역할지 압니다.
  assert.deepEqual(p.missingList, [{ key: "post/b", title: "나" }]);
  // QC 문제가 있는 미완료 항목만 검수 대기로 올라옵니다
  assert.deepEqual(p.todo.map((t) => t.key), ["post/b"]);
  assert.equal(p.todo[0].errors, 1);
  assert.equal(p.todo[0].state, "missing");
});

test("전체 합계는 언어별 합과 같고 진행률은 반올림한다", () => {
  const byLang = {
    en: { total: 3, reviewed: 1, draft: 2, missing: 0, errors: 0, warnings: 1 },
    ja: { total: 3, reviewed: 0, draft: 3, missing: 0, errors: 1, warnings: 0 },
    zh: { total: 3, reviewed: 2, draft: 1, missing: 0, errors: 0, warnings: 0 },
  };
  const all = overall(byLang);
  assert.equal(all.total, 9);
  assert.equal(all.reviewed, 3);
  assert.equal(all.draft, 6);
  assert.equal(all.errors, 1);
  assert.equal(all.warnings, 1);
  assert.equal(all.percent, 33); // 3/9 = 33.3 → 33
});

test("리포트는 언어별 표·검수 대기·다음 단계를 담는다", () => {
  const p = progressOf({
    sources,
    dict: { entries: { "qna/a": { title: "A", summary: "s" } } },
    qc: { errors: [], warnings: [{ key: "qna/a", kind: "latin-run", detail: "Foo Bar" }] },
  });
  const md = progressMarkdown({ en: p }, { date: "2026-10-26", overall: overall({ en: p }) });
  assert.match(md, /^# 번역 검수 진행률 — 2026-10-26/);
  assert.match(md, /\| 언어 \| 항목 \| 검수 완료 \|/);
  assert.match(md, /\| en \| 2 \| 0 \| 1 \| 1 \| 0% \|/);
  assert.match(md, /## 검수 대기/);
  assert.match(md, /`qna\/a`/);
  assert.match(md, /## 다음 단계/);
  assert.match(md, /YYYY-MM-DD 검수 완료\(검수자\)/);
});

test("리포트는 번역이 없는 원문을 제목과 함께 따로 모은다 — 새 글 감지", () => {
  const dict = { entries: { "qna/a": { title: "A", summary: "s" } } };
  const p = progressOf({ sources, dict });
  const md = progressMarkdown({ ja: p }, { date: "2026-10-26", overall: overall({ ja: p }) });
  assert.match(md, /## 번역이 없는 원문/);
  assert.match(md, /\| ja \| `post\/b` \| 나 \|/);
  // Q&A 처럼 이미 번역이 있는 항목은 목록에 없습니다.
  assert.equal(md.includes("`qna/a` | 가"), false);
});

test("CI 요약은 짧고, 파일을 쓰지 않으며, 없는 원문이 없으면 그렇게 말한다", () => {
  const withAll = {
    en: { total: 2, reviewed: 2, draft: 0, missing: 0, percent: 100, errors: 0, warnings: 0, suppressed: 0, missingList: [], orphan: [] },
    ja: { total: 2, reviewed: 1, draft: 1, missing: 0, percent: 50, errors: 0, warnings: 1, suppressed: 0, missingList: [], orphan: [] },
  };
  const md = summaryMarkdown(withAll, { date: "2026-10-26", overall: overall(withAll) });
  assert.match(md, /^### 번역 검수 진행률 — 2026-10-26/);
  assert.match(md, /\| en \| 2 \/ 2 \| 100% \| 0 \| 0 \|/);
  assert.match(md, /\| ja \| 1 \/ 2 \| 50% \| 0 \| 1 \|/);
  assert.match(md, /번역이 없는 원문 없음/);
  // 전체 리포트의 긴 섹션(다음 단계·검수 대기 표)은 CI 요약에 넣지 않습니다.
  assert.equal(md.includes("## 다음 단계"), false);
  assert.ok(md.split("\n").length < 20, "실행 요약은 짧아야 합니다");

  const withMissing = {
    en: { total: 3, reviewed: 0, draft: 2, missing: 1, percent: 0, errors: 0, warnings: 0, suppressed: 0, missingList: [{ key: "post/new-one", title: "새 글" }], orphan: [] },
  };
  const md2 = summaryMarkdown(withMissing, { date: "2026-10-26", overall: overall(withMissing) });
  assert.match(md2, /\*\*번역이 없는 원문 1건\*\*/);
  assert.match(md2, /- `post\/new-one` \(en\) 새 글/);
});

test("실제 저장소 번역 3언어가 모두 95항목으로 집계된다", () => {
  const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, "notion-content.json"), "utf8"));
  const ko = koSources(snapshot);
  const allow = loadAllowlist(ROOT);
  const byLang = {};
  for (const lang of LANGS) {
    const dict = JSON.parse(fs.readFileSync(path.join(ROOT, `content/i18n/${lang}.json`), "utf8"));
    byLang[lang] = progressOf({ sources: ko, dict, qc: qcLanguage(lang, dict, ko, allow) });
  }
  for (const lang of LANGS) {
    assert.equal(byLang[lang].total, 95, `${lang} 항목 수`);
    assert.deepEqual(byLang[lang].orphan, [], `${lang} 원문이 없는 번역 키`);
    // 연락처 불일치는 오류 — 진행률과 무관하게 0이어야 합니다.
    assert.equal(byLang[lang].errors, 0, `${lang} QC 오류`);
  }
  const all = overall(byLang);
  assert.equal(all.total, 285);
  assert.equal(all.reviewed, 0); // 아직 원어민 검수 전
  // 커버리지 — 지금은 모든 원문 글에 3언어 번역이 있습니다. 새 글이 번역 없이 들어오면
  // 이 검사가 먼저 알려 줍니다(빌드 요약에도 같은 내용이 나옵니다).
  for (const lang of LANGS) assert.deepEqual(byLang[lang].missingList, [], `${lang} 번역 누락`);
  const summary = summaryMarkdown(byLang, { date: "2026-10-26", overall: all });
  assert.match(summary, /285항목/);
  assert.match(summary, /번역이 없는 원문 없음/);
});
