/**
 * `scripts/notion-snapshot.mjs` 의 변경 감지(빈 커밋 방지) 로직 단위 테스트.
 * 네트워크 없이 실행됩니다.   npm run test:unit
 */
import test from "node:test";
import assert from "node:assert/strict";
import { HEARTBEAT_MS, shouldWriteSnapshot, snapshotContentKey, stableStringify } from "./notion-snapshot.mjs";

const NOW = Date.parse("2026-09-29T12:00:00.000Z");
const minutesAgo = (m) => new Date(NOW - m * 60_000).toISOString();

const snapshot = (overrides = {}) => ({
  generatedAt: minutesAgo(5),
  source: { pageId: "page-1", collectionViewId: "view-1", collectionId: "col-1" },
  rows: [{ id: "row-1", Title: "공지", Published: true, Type: "공지", Date: "2026-09-29" }],
  pages: { "row-1": { "row-1": { value: { id: "row-1", type: "page", content: ["b-1"] } }, "b-1": { value: { id: "b-1", type: "text" } } } },
  ...overrides,
});

test("stableStringify: 키 순서가 달라도 같은 값이면 같은 문자열", () => {
  assert.equal(stableStringify({ a: 1, b: { c: [1, 2], d: "x" } }), stableStringify({ b: { d: "x", c: [1, 2] }, a: 1 }));
  assert.notEqual(stableStringify({ a: [1, 2] }), stableStringify({ a: [2, 1] })); // 배열 순서는 의미가 있음
});

test("stableStringify: undefined 키는 없는 것으로 취급 (JSON 왕복과 동일)", () => {
  assert.equal(stableStringify({ a: 1, b: undefined }), stableStringify({ a: 1 }));
  const roundTrip = JSON.parse(JSON.stringify({ a: 1, b: undefined, c: [undefined, null] }));
  assert.equal(stableStringify({ a: 1, b: undefined, c: [undefined, null] }), stableStringify(roundTrip));
});

test("snapshotContentKey: generatedAt 만 다르면 같은 지문", () => {
  assert.equal(snapshotContentKey(snapshot()), snapshotContentKey(snapshot({ generatedAt: minutesAgo(500) })));
});

test("이전 스냅샷이 없거나 형식이 다르면 항상 쓴다", () => {
  for (const previous of [null, undefined, {}, [], "x", { rows: "no" }]) {
    assert.deepEqual(shouldWriteSnapshot(previous, snapshot(), { now: NOW }), { write: true, reason: "이전 스냅샷 없음" });
  }
});

test("내용이 같고 하트비트 이내면 쓰지 않는다 (빈 커밋 방지)", () => {
  const decision = shouldWriteSnapshot(snapshot({ generatedAt: minutesAgo(10) }), snapshot({ generatedAt: minutesAgo(0) }), { now: NOW });
  assert.deepEqual(decision, { write: false, reason: "변경 없음" });
});

test("내용이 같아도 하트비트가 지나면 쓴다 (n분 전 표시·stale 판정 유지)", () => {
  const justUnder = shouldWriteSnapshot(snapshot({ generatedAt: minutesAgo(59) }), snapshot(), { now: NOW });
  assert.equal(justUnder.write, false);

  const atLimit = shouldWriteSnapshot(snapshot({ generatedAt: new Date(NOW - HEARTBEAT_MS).toISOString() }), snapshot(), { now: NOW });
  assert.deepEqual(atLimit, { write: true, reason: "하트비트 갱신" });

  const old = shouldWriteSnapshot(snapshot({ generatedAt: minutesAgo(600) }), snapshot(), { now: NOW });
  assert.deepEqual(old, { write: true, reason: "하트비트 갱신" });
});

test("하트비트 간격은 옵션으로 조정할 수 있다", () => {
  const previous = snapshot({ generatedAt: minutesAgo(20) });
  assert.equal(shouldWriteSnapshot(previous, snapshot(), { now: NOW, heartbeatMs: 30 * 60_000 }).write, false);
  assert.equal(shouldWriteSnapshot(previous, snapshot(), { now: NOW, heartbeatMs: 15 * 60_000 }).write, true);
});

test("generatedAt 이 없거나 깨졌거나 미래면 안전하게 쓴다", () => {
  for (const generatedAt of [undefined, "", "not-a-date", new Date(NOW + 3_600_000).toISOString()]) {
    const previous = snapshot();
    if (generatedAt === undefined) delete previous.generatedAt;
    else previous.generatedAt = generatedAt;
    assert.deepEqual(shouldWriteSnapshot(previous, snapshot(), { now: NOW }), { write: true, reason: "하트비트 갱신" }, String(generatedAt));
  }
});

test("행 추가 · 행 수정 · 삭제 · Published 해제는 모두 '내용 변경'으로 쓴다", () => {
  const previous = snapshot({ generatedAt: minutesAgo(1) });
  const added = snapshot({ rows: [...previous.rows, { id: "row-2", Title: "새 글", Published: true }] });
  const edited = snapshot({ rows: [{ ...previous.rows[0], Title: "공지 (수정)" }] });
  const removed = snapshot({ rows: [] });
  for (const next of [added, edited, removed]) {
    assert.deepEqual(shouldWriteSnapshot(previous, next, { now: NOW }), { write: true, reason: "내용 변경" });
  }
});

test("본문 블록이 바뀌면 쓴다", () => {
  const previous = snapshot({ generatedAt: minutesAgo(1) });
  const next = snapshot();
  next.pages["row-1"]["b-1"].value.properties = { title: [["본문 수정"]] };
  assert.deepEqual(shouldWriteSnapshot(previous, next, { now: NOW }), { write: true, reason: "내용 변경" });
});

test("대상 페이지/DB(source)가 바뀌면 쓴다", () => {
  const previous = snapshot({ generatedAt: minutesAgo(1) });
  const next = snapshot({ source: { pageId: "other", collectionViewId: "view-1", collectionId: "col-1" } });
  assert.deepEqual(shouldWriteSnapshot(previous, next, { now: NOW }), { write: true, reason: "내용 변경" });
});

test("파일에서 읽은 이전 스냅샷(JSON 왕복)과 새로 만든 스냅샷은 키 순서가 달라도 같은 내용으로 본다", () => {
  const fresh = snapshot({ generatedAt: minutesAgo(0) });
  const fromDisk = JSON.parse(JSON.stringify(snapshot({ generatedAt: minutesAgo(10) })));
  // 새 스냅샷 쪽 행의 키 순서를 뒤집어도 동일해야 함
  fresh.rows = fresh.rows.map((row) => Object.fromEntries(Object.entries(row).reverse()));
  assert.deepEqual(shouldWriteSnapshot(fromDisk, fresh, { now: NOW }), { write: false, reason: "변경 없음" });
});
