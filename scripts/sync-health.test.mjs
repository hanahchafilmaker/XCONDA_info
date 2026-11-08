/**
 * 동기화 건강 점검 회귀 방지 — 2026-11-08
 *
 * 51회 연속 실패가 조용히 지나간 뒤, 같은 일이 반복되지 않도록
 * ① 워크플로가 실패를 **항상** 요약에 남기고 ② 실패 시 게시·커밋을 건너뛰는지 고정합니다.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ageHours, summaryMarkdown } from "./sync-health.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const workflow = fs.readFileSync(path.join(ROOT, ".github/workflows/notion-sync.yml"), "utf8");

test("스냅샷 나이를 시간 단위로 계산한다", () => {
  const now = new Date("2026-11-08T02:00:00Z");
  assert.equal(ageHours("2026-11-08T00:00:00.000Z", now), 2);
  assert.equal(ageHours("", now), null);
  assert.equal(ageHours("해석 불가", now), null);
});

test("실패하면 '직전 스냅샷 그대로'라는 사실을 요약에 남긴다", () => {
  const md = summaryMarkdown({
    outcome: "failure",
    info: { generatedAt: "2026-11-07T22:08:10.483Z", rows: 114, published: 114, withoutSlug: 2 },
    now: new Date("2026-11-08T02:00:00Z"),
  });
  assert.match(md, /스냅샷 생성 실패/);
  assert.match(md, /직전 스냅샷 그대로/);
  assert.match(md, /경과 \| 3\.9시간/);
  assert.match(md, /Slug 없는 글 \| 2건/);
  assert.match(md, /NOTION_TOKEN/);
  assert.match(md, /npm run content:audit/);
});

test("성공하면 실패 경고를 넣지 않는다", () => {
  const md = summaryMarkdown({ outcome: "success", info: { generatedAt: "2026-11-08T01:55:00Z", rows: 114, published: 114, withoutSlug: 0 } });
  assert.match(md, /스냅샷 생성 성공/);
  assert.doesNotMatch(md, /실패/);
});

test("워크플로는 스냅샷 실패를 삼키지 않고 요약·경고로 남긴다", () => {
  assert.match(workflow, /id: snapshot/);
  assert.match(workflow, /node scripts\/notion-snapshot\.mjs/);
  // 실패해도 다음 스텝이 돌아야 요약을 남길 수 있습니다.
  const afterSnapshot = workflow.slice(workflow.indexOf("id: snapshot"));
  assert.match(afterSnapshot.slice(0, 1200), /continue-on-error: true/);
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /node scripts\/sync-health\.mjs >> "\$GITHUB_STEP_SUMMARY"/);
  assert.match(workflow, /::warning::Notion 스냅샷 생성 실패/);
});

test("스냅샷이 없으면 게시·아티팩트 단계로 넘어가지 않는다", () => {
  // 옛 스냅샷을 올리거나 커밋하면 사이트가 조용히 뒤처진 채로 '성공'처럼 보입니다.
  assert.match(workflow, /if: steps\.snapshot\.outcome == 'success'[\s\S]{0,200}name: notion-content/);
  const publish = workflow.slice(workflow.indexOf("id: publish"));
  assert.match(publish.slice(0, 400), /if: steps\.snapshot\.outcome == 'success'/);
});
