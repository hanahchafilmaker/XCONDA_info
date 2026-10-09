/**
 * `scripts/notion-snapshot.mjs` 의 변경 감지(빈 커밋 방지) 로직 단위 테스트.
 * 네트워크 없이 실행됩니다.   npm run test:unit
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  HEARTBEAT_MS,
  renderSyncSummary,
  shouldWriteSnapshot,
  snapshotContentKey,
  stableStringify,
} from "./notion-snapshot.mjs";

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

/* ------------------------ Actions 요약 리포트 ------------------------ */

/** 테스트용 최소 리포트 */
const reportWith = (overrides = {}) => ({
  rowCount: 4,
  viewCount: 1,
  columns: ["Title(title)", "Type(select)", "Published(checkbox)"],
  included: [
    { title: "서버 점검 안내", type: "notice", rawType: "공지", source: "type", reason: "Type '공지'", category: "점검", cover: "page_cover", author: "XCONDA 팀" },
    { title: "X 바이럴 영상 모음", type: "news", rawType: "뉴스", source: "type", reason: "Type '뉴스'", category: "X", cover: "body_image", author: "" },
  ],
  excluded: [],
  ...overrides,
});

test("요약 리포트: 섹션별 글 수와 분류 근거를 표로 보여준다", () => {
  const markdown = renderSyncSummary({
    report: reportWith({
      included: [
        ...reportWith().included,
        { title: "정체불명", type: "notice", rawType: "재밌는글", source: "unknown", reason: "기본값(공지사항)" },
        { title: "Type 없는 글", type: "news", rawType: "", source: "default", reason: "SNS 링크(X)" },
      ],
    }),
    generatedAt: "2026-09-29T10:00:00.000Z",
    writeReason: "갱신 (내용 변경)",
  });
  assert.match(markdown, /사이트에 포함 \*\*4개\*\*/);
  assert.match(markdown, /\| 공지사항 \| 2 \|/);
  assert.match(markdown, /\| 뉴스 \| 2 \|/);
  assert.match(markdown, /\| 툴 사용법 \| 0 \|/);
  assert.match(markdown, /\| Q&A \| 0 \|/);
  assert.match(markdown, /정체불명/);
  assert.match(markdown, /갱신 \(내용 변경\)/);
});

test("요약 리포트: 처음 보는 Type · 빈 Type 은 노션에서 고치도록 안내한다", () => {
  const markdown = renderSyncSummary({
    report: reportWith({
      included: [
        { title: "정체불명", type: "notice", rawType: "재밌는글", source: "unknown", reason: "기본값(공지사항)" },
        { title: "Type 없는 글", type: "news", rawType: "", source: "default", reason: "SNS 링크(X)" },
      ],
    }),
  });
  assert.match(markdown, /처음 보는 Type 값/);
  assert.match(markdown, /`재밌는글`/);
  assert.match(markdown, /Type 칸이 비어 있는 글 1개/);
});

test("요약 리포트: SNS 링크가 있는 공지는 'Type 을 뉴스로 바꾸세요' 로 안내한다", () => {
  const markdown = renderSyncSummary({
    report: reportWith({
      included: [
        {
          title: "Claude Opus 5.5로 만든 바이럴 영상 389개, 프롬프트와 함께 공개",
          type: "notice",
          rawType: "공지",
          source: "type",
          reason: "Type '공지'",
          channel: "x",
          link: "https://x.com/VibeEverything/status/2104539752016076956",
        },
      ],
    }),
  });
  assert.match(markdown, /SNS 링크가 있는 공지 1개/);
  assert.match(markdown, /Type\` 을 \`뉴스\` 로 바꾸세요/);
});

test("요약 리포트: 미공개·표 여러 개·스냅샷 지연도 짚어 준다", () => {
  const markdown = renderSyncSummary({
    report: reportWith({ viewCount: 2, rowCount: 5, excluded: [{ title: "초안", rawType: "뉴스" }] }),
    previousGeneratedAt: "2026-09-29T05:00:00.000Z",
    now: Date.parse("2026-09-29T10:00:00.000Z"),
  });
  assert.match(markdown, /표\(데이터베이스\)가 2개/);
  assert.match(markdown, /미공개\(제외\) \*\*1개\*\*/);
  assert.match(markdown, /직전 스냅샷이 \*\*5\.0시간 전\*\*/);
  assert.match(markdown, /제외된 1개 글은/);
});

test("요약 리포트: 특이사항이 없으면 ✅ 한 줄로 끝난다", () => {
  const markdown = renderSyncSummary({ report: reportWith() });
  assert.match(markdown, /특별히 확인할 항목이 없습니다/);
  assert.doesNotMatch(markdown, /처음 보는 Type/);
});

test("요약 리포트: 썸네일 · 작성자 상태를 표와 안내로 보여준다", () => {
  const markdown = renderSyncSummary({
    report: reportWith({
      included: [
        { title: "썸네일 있는 블로그", type: "blog", rawType: "블로그", source: "type", reason: "Type '블로그'", cover: "body_image", author: "김하나 PD" },
        { title: "썸네일 없는 블로그", type: "blog", rawType: "블로그", source: "type", reason: "Type '블로그'", cover: "", author: "" },
      ],
    }),
  });
  assert.match(markdown, /\| 썸네일 \| 작성자 \|/);
  assert.match(markdown, /본문 첫 이미지 \| 김하나 PD \|/);
  assert.match(markdown, /\(없음\) \| \(없음\) \|/);
  assert.match(markdown, /썸네일이 없는 글 1개/);
  assert.match(markdown, /`Cover`\(커버\) 속성/);
  assert.match(markdown, /작성자가 없는 블로그 글 1개/);
  assert.match(markdown, /`Author`\(작성자\) 속성/);
});

test("요약 리포트: 제목에 | 나 줄바꿈이 있어도 표가 깨지지 않는다", () => {
  const markdown = renderSyncSummary({
    report: reportWith({
      included: [{ title: "A | B\nC", type: "notice", rawType: "공지", source: "type", reason: "Type '공지'" }],
    }),
  });
  assert.match(markdown, /A \\\| B C/);
  assert.doesNotMatch(markdown, /A \| B/);
});

test("요약 리포트: 게시된 글이 하나도 없으면 Published 확인을 안내한다", () => {
  const markdown = renderSyncSummary({ report: reportWith({ included: [], excluded: [{ title: "초안", rawType: "공지" }] }) });
  assert.match(markdown, /게시된 글이 0개/);
  assert.match(markdown, /\| 공지사항 \| 0 \|/);
});
