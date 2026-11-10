/**
 * 동기화 상태(Actions 실행) 판정 단위 테스트 — 네트워크 없이 실행됩니다.
 *
 * 배경(2026-11-10): 1시간마다 스냅샷을 다시 커밋하던 하트비트를 없애면서,
 * "동기화가 살아 있는가"를 사이트 배지가 **GitHub Actions 실행 상태**로 확인합니다.
 * 여기서는 그 변환 규칙만 고정합니다. (응답이 이상하면 null → 배지는 스냅샷 시각으로 폴백)
 */
import test from "node:test";
import assert from "node:assert/strict";
import { toSyncHealth } from "../src/content/syncHealth.js";

const NOW = Date.parse("2026-11-10T12:00:00.000Z");
const run = (conclusion, minutesAgo, status = "completed") => ({
  status,
  conclusion,
  updated_at: new Date(NOW - minutesAgo * 60_000).toISOString(),
});

test("최근 실행이 성공이면 ok=true, 마지막 성공 시각을 그대로 쓴다", () => {
  const health = toSyncHealth([run("success", 3), run("success", 13)], NOW);
  assert.equal(health?.ok, true);
  assert.equal(health?.at, NOW - 3 * 60_000);
  assert.equal(health?.lastSuccessAt, NOW - 3 * 60_000);
});

test("최근 실행이 실패면 ok=false 이고, 마지막 '성공' 시각을 따로 알려 준다", () => {
  // 2026-11-08 사고처럼 44시간 동안 실패가 이어지면 배지가 빨간 점 + "성공 2일 전"을 보여 줍니다.
  const health = toSyncHealth([run("failure", 5), run("failure", 20), run("success", 2 * 24 * 60)], NOW);
  assert.equal(health?.ok, false);
  assert.equal(health?.at, NOW - 5 * 60_000);
  assert.equal(health?.lastSuccessAt, NOW - 2 * 24 * 60 * 60_000);
});

test("진행 중인 실행은 '마지막 성공'을 가리지 않는다", () => {
  const health = toSyncHealth([run("", 1, "in_progress"), run("success", 8)], NOW);
  assert.equal(health?.ok, true);
  assert.equal(health?.lastSuccessAt, NOW - 8 * 60_000);
});

test("성공 기록이 하나도 없으면 lastSuccessAt 은 NaN (배지는 스냅샷 시각으로 폴백)", () => {
  const health = toSyncHealth([run("failure", 5)], NOW);
  assert.equal(health?.ok, false);
  assert.ok(Number.isNaN(health?.lastSuccessAt));
});

test("응답이 비었거나 이상하면 null — 조용히 예전 동작(스냅샷 시각)으로 돌아간다", () => {
  for (const value of [null, undefined, [], "nope", {}, [{}], [{ status: "queued" }]]) {
    assert.equal(toSyncHealth(value, NOW), null, JSON.stringify(value));
  }
});

test("미래 시각(러너 시계 오차)은 시각 계산에서 제외한다", () => {
  const future = { status: "completed", conclusion: "success", updated_at: new Date(NOW + 10 * 60_000).toISOString() };
  const health = toSyncHealth([future, run("success", 30)], NOW);
  assert.equal(health?.at, NOW - 30 * 60_000);
});
