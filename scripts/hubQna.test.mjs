/**
 * 허브 Q&A 표(`XCONDA 허브 Q&A`) 규칙 테스트 — 네트워크 없이 실행됩니다.
 *
 *   npm run test:unit        (node --test)
 *
 * 검증하는 것
 *   1) 게시 판정 — `허브 게시`(강제 공개/숨김) → `상태`(확인 필요 계열 제외) 순서
 *   2) 정렬(Order) — 우선순위 밴드 × 1000 + 엑셀 원본 번호(No)
 *   3) 본문 분리 — `답변` → 목록의 답변 글 / `게시용 출처` → 상세 모달 / `내부 근거` → 비공개
 *   4) 스냅샷 생성 — 노션 응답을 fetch 스텁으로 먹여 실제 행 · 본문이 만들어지는지 확인
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  HUB_QNA_SOURCE,
  hubQnaDecision,
  includeHubQnaRow,
  hubQnaOrder,
  hubHeadingKind,
  isInternalNoteText,
  splitHubSections,
  hubAnswerFromPage,
  hubPublicPageMap,
} from "../src/content/hubQna.js";
import { loadHubQna } from "./notion-snapshot.mjs";

/* ========================= 1. 게시 판정 ========================= */

/** 표 한 행 (속성 이름은 노션 열 이름 그대로) */
const row = (properties = {}) => ({ id: "row-1", ...properties });

test("상태가 초안 완료면 게시한다 (기본 경로)", () => {
  const decision = hubQnaDecision(row({ 상태: "초안 완료", "허브 게시": "미게시" }));
  assert.equal(decision.include, true);
  assert.equal(decision.forced, null);
  assert.match(decision.reason, /초안 완료/);
});

test("상태가 확인 필요 계열이면 제외한다 (문구·띄어쓰기 흡수)", () => {
  for (const status of ["일부 확인 필요", "확인필요", " 정보 필요 ", "검토 중", "작성 중", "미완성", "검증 필요"]) {
    const decision = hubQnaDecision(row({ 상태: status, "허브 게시": "미게시" }));
    assert.equal(decision.include, false, status);
    assert.equal(decision.forced, null, status);
  }
});

test("허브 게시=게시 는 상태와 무관하게 강제 공개한다", () => {
  const decision = hubQnaDecision(row({ 상태: "일부 확인 필요", "허브 게시": "게시" }));
  assert.equal(decision.include, true);
  assert.equal(decision.forced, "publish");
  assert.match(decision.reason, /강제 공개/);
});

test("허브 게시=보류 는 상태가 초안 완료여도 강제 숨김한다", () => {
  const decision = hubQnaDecision(row({ 상태: "초안 완료", "허브 게시": "보류" }));
  assert.equal(decision.include, false);
  assert.equal(decision.forced, "hold");
  assert.match(decision.reason, /강제 숨김/);
});

test("허브 게시 값의 공백 · 대소문자를 흡수한다", () => {
  assert.equal(hubQnaDecision(row({ "허브 게시": " 게시 " })).forced, "publish");
  assert.equal(hubQnaDecision(row({ "허브 게시": "HOLD" })).forced, "hold");
  assert.equal(hubQnaDecision(row({ "허브 게시": "숨김" })).forced, "hold");
});

test("상태 열이 없으면 게시한다 (메인 표와 달리 체크박스가 아님)", () => {
  assert.equal(includeHubQnaRow(row({ 질문: "질문", "허브 게시": "미게시" })), true);
  assert.equal(includeHubQnaRow(row({})), true);
});

test("`게시` 만 있는 열은 허브 Q&A 판정에 쓰지 않는다 (메인 표 Published 규칙과 겹침 방지)", () => {
  // `게시` 열에 false(미게시 아님) 값이 있어도 허브 Q&A 규칙은 상태만 봅니다.
  assert.equal(includeHubQnaRow(row({ "게시": false, 상태: "초안 완료" })), true);
  // 반대로 `허브 게시` 는 확실히 잡습니다.
  assert.equal(includeHubQnaRow(row({ "게시": true, "허브 게시": "보류" })), false);
});

/* ========================= 2. 정렬(Order) ========================= */

test("Order = 우선순위(1~9) × 1000 + No", () => {
  assert.equal(hubQnaOrder(row({ 우선순위: 1, No: 16 })), 1016);
  assert.equal(hubQnaOrder(row({ 우선순위: 3, No: 78 })), 3078);
});

test("우선순위가 없으면 중간(2) 밴드, No가 없으면 그 묶음의 뒤쪽", () => {
  assert.equal(hubQnaOrder(row({ No: 5 })), 2005);
  assert.equal(hubQnaOrder(row({ 우선순위: 1 })), 1900);
  assert.equal(hubQnaOrder(row({})), 2900);
});

/* ========================= 3. 본문 분리 ========================= */

/** 레거시 record map 블록 (스냅샷·노션 API 와 같은 형태) */
const block = (id, type, text, content = []) => ({
  id,
  type,
  properties: { title: [[text]] },
  ...(content.length ? { content } : {}),
});

const pageMap = (rootId, blocks) => ({
  [rootId]: { value: block(rootId, "page", "질문", blocks.map((b) => b.id)) },
  ...Object.fromEntries(blocks.map((b) => [b.id, { value: b }])),
});

const ANSWER_PAGE = pageMap("q-1", [
  block("h-answer", "header", "답변"),
  block("t-1", "text", "엑스콘다는 큐브베리가 운영하는 AI 영상·이미지 제작 플랫폼입니다."),
  block("l-1", "bulleted_list", "여러 생성 모델을 한 화면에서 씁니다."),
  block("h-example", "sub_header", "예시"), // 모르는 제목 → 답변 섹션 유지
  block("t-2", "text", "FLEXBOARD · Turn · 블로킹 보드."),
  block("c-1", "callout", "확인 필요 — 크레딧 숫자는 게시하지 않기로 했습니다."),
  block("h-source", "header", "게시용 출처"),
  block("t-3", "text", "Hub 블로그 · cubeberry.ai"),
  block("h-internal", "header", "내부 근거"),
  block("t-4", "text", "2026 IR 자료 (공개 가능한 부분만)"),
]);

test("답변 섹션만 답변 글로 뽑고, 내부 메모 콜아웃 · 출처 · 내부 근거는 넣지 않는다", () => {
  const answer = hubAnswerFromPage(ANSWER_PAGE, "q-1");
  assert.equal(answer.from, "answer");
  assert.equal(
    answer.text,
    // 소제목(`예시`)은 글자로 나가지 않고, 구간이 나뉜 자리만 빈 줄로 남습니다.
    "엑스콘다는 큐브베리가 운영하는 AI 영상·이미지 제작 플랫폼입니다.\n- 여러 생성 모델을 한 화면에서 씁니다.\n\nFLEXBOARD · Turn · 블로킹 보드."
  );
  assert.doesNotMatch(answer.text, /확인 필요/);
  assert.doesNotMatch(answer.text, /IR 자료/);
  assert.doesNotMatch(answer.text, /cubeberry\.ai/);
});

test("모르는 제목은 직전 섹션을 유지한다 (답변 안의 소제목이 답변을 자르지 않음)", () => {
  const sections = splitHubSections(ANSWER_PAGE, "q-1");
  assert.deepEqual(
    sections.map((s) => [s.mode, s.heading]),
    [
      ["preamble", ""],
      ["answer", "답변"],
      ["answer", "예시"],
      ["source", "게시용 출처"],
      ["internal", "내부 근거"],
    ]
  );
  assert.equal(hubHeadingKind("게시용 출처"), "source");
  assert.equal(hubHeadingKind("플랫폼 소개"), undefined); // 사이트 제목 후보 아님
});

test("게시용 출처만 상세 모달로 내보내고, 답변·내부 근거는 본문에서 뺀다", () => {
  const publicMap = hubPublicPageMap(ANSWER_PAGE, "q-1");
  assert.equal(publicMap.note, null);
  assert.deepEqual(publicMap.keptModes, ["source"]);
  const ids = Object.keys(publicMap.map);
  assert.deepEqual(ids.sort(), ["h-source", "q-1", "t-3"]);
  assert.deepEqual(publicMap.map["q-1"].value.content, ["h-source", "t-3"]);
});

test("섹션 제목이 없는 페이지는 본문 전체를 공개하고 경고(note)를 남긴다", () => {
  const page = pageMap("q-9", [block("t-1", "text", "답변 첫 문단"), block("t-2", "text", "이어지는 문단")]);
  const answer = hubAnswerFromPage(page, "q-9");
  assert.equal(answer.from, "preamble");
  assert.equal(answer.text, "답변 첫 문단\n\n이어지는 문단"); // 문단 블록 사이는 빈 줄

  const publicMap = hubPublicPageMap(page, "q-9");
  assert.match(publicMap.note, /섹션 제목/);
  assert.deepEqual(Object.keys(publicMap.map).sort(), ["q-9", "t-1", "t-2"]);
});

test("내부 메모 문단 판정 — 콜아웃 본문", () => {
  assert.equal(isInternalNoteText("확인 필요 — 대표님 확인 후 반영"), true);
  assert.equal(isInternalNoteText("확인·추가 필요 정보"), true);
  assert.equal(isInternalNoteText("내부 참고용"), true);
  assert.equal(isInternalNoteText("엑스콘다는 AI 영상 제작 플랫폼입니다."), false);
});

/* ========================= 4. 표 → 스냅샷 (fetch 스텁) ========================= */

const FAQ_PAGE_ID = "15d208576a644c499959ace667de40a2";
const FAQ_VIEW_ID = "2d3c8b526b4845999e2014f1db5eab93";
const COLLECTION_ID = "84f0b15c3aa54e4e9b1b4a0a49b0cbb1";
const SPACE_ID = "0a0a0a0a-0a0a-0a0a-0a0a-0a0a0a0a0a0a";

const PROP = { title: "p-title", no: "p-no", status: "p-status", publish: "p-publish", priority: "p-priority", category: "p-category" };
const SCHEMA = {
  [PROP.title]: { name: "질문", type: "title" },
  [PROP.no]: { name: "No", type: "number" },
  [PROP.status]: { name: "상태", type: "select" },
  [PROP.publish]: { name: "허브 게시", type: "select" },
  [PROP.priority]: { name: "우선순위", type: "number" },
  [PROP.category]: { name: "카테고리", type: "select" },
};

const qnaRow = (id, { no, status, publish, priority = 1, category = "엑스콘다 소개", question }) => ({
  id,
  properties: {
    [PROP.title]: [[question]],
    [PROP.no]: [[String(no)]],
    [PROP.status]: [[status]],
    [PROP.publish]: [[publish]],
    [PROP.priority]: [[String(priority)]],
    [PROP.category]: [[category]],
  },
});

const ROWS = {
  "row-keep": qnaRow("11111111111111111111111111111111", { no: 1, status: "초안 완료", publish: "미게시", question: "엑스콘다(XCONDA)는 어떤 서비스인가요?" }),
  "row-check": qnaRow("22222222222222222222222222222222", { no: 2, status: "일부 확인 필요", publish: "미게시", priority: 2, question: "AI 영상 제작 교육이나 강의도 제공하나요?" }),
  "row-hold": qnaRow("33333333333333333333333333333333", { no: 3, status: "초안 완료", publish: "보류", priority: 3, category: "Turn", question: "Turn에서 방 크기를 바꾸면 크레딧이 또 드나요?" }),
  "row-publish": qnaRow("44444444444444444444444444444444", { no: 4, status: "일부 확인 필요", publish: "게시", priority: 2, category: "문의·협업", question: "문의는 어디로 하나요?" }),
};

const BODY_BLOCKS = [
  block("h-answer", "header", "답변"),
  block("t-1", "text", "답변 본문입니다."),
  block("h-source", "header", "게시용 출처"),
  block("t-2", "text", "Terms 1.10.5 · Hub 가이드"),
  block("h-internal", "header", "내부 근거"),
  block("t-3", "text", "내부 확인용 메모 — 게시 금지"),
];

const bodyChunk = (rowId) => ({
  recordMap: {
    block: Object.fromEntries(
      [block(rowId, "page", "질문", BODY_BLOCKS.map((b) => b.id)), ...BODY_BLOCKS].map((b) => [b.id, { value: b }])
    ),
  },
  cursor: { stack: [] },
});

/** 노션 API 응답을 흉내 내는 fetch 스텁 — 호출한 pageId 를 기록합니다. */
function withFakeNotion(run) {
  const previousFetch = globalThis.fetch;
  const previousLog = console.log;
  const loaded = [];
  globalThis.fetch = async (url, init) => {
    const path = String(url).replace("https://www.notion.so/api/v3/", "");
    const body = JSON.parse(init?.body ?? "{}");
    let data;
    if (path.startsWith("loadPageChunk")) {
      loaded.push(body.pageId);
      data =
        body.pageId === "15d20857-6a64-4c49-9959-ace667de40a2"
          ? {
              recordMap: {
                block: {
                  [FAQ_PAGE_ID]: {
                    value: {
                      id: FAQ_PAGE_ID,
                      type: "collection_view_page",
                      collection_id: COLLECTION_ID,
                      view_ids: [FAQ_VIEW_ID],
                      space_id: SPACE_ID,
                      properties: { title: [["XCONDA 허브 Q&A"]] },
                      content: [],
                    },
                  },
                },
              },
              cursor: { stack: [] },
            }
          : bodyChunk(body.pageId);
    } else if (path.startsWith("queryCollection")) {
      data = {
        result: { reducerResults: { collection_group_results: { blockIds: Object.keys(ROWS) } } },
        recordMap: {
          collection: { [COLLECTION_ID]: { value: { id: COLLECTION_ID, schema: SCHEMA } } },
          block: Object.fromEntries(Object.entries(ROWS).map(([id, value]) => [id, { value: { ...value, type: "page" } }])),
        },
      };
    } else {
      throw new Error(`예상하지 못한 요청: ${path}`);
    }
    return { ok: true, status: 200, text: async () => JSON.stringify(data) };
  };
  console.log = () => {};
  return Promise.resolve()
    .then(run)
    .finally(() => {
      globalThis.fetch = previousFetch;
      console.log = previousLog;
    })
    .then((value) => ({ value, loaded }));
}

test("loadHubQna: 게시 대상만 행으로 만들고, 내부 근거는 본문에서 뺀다", async () => {
  const { value: result, loaded } = await withFakeNotion(() => loadHubQna({ pageId: FAQ_PAGE_ID, databaseId: FAQ_VIEW_ID }));

  assert.equal(result.report.rowCount, 4);
  assert.deepEqual(
    result.rows.map((r) => r.Title),
    ["엑스콘다(XCONDA)는 어떤 서비스인가요?", "문의는 어디로 하나요?"]
  );
  assert.deepEqual(
    result.report.excluded.map((e) => [e.title, e.reason.includes("강제 숨김")]),
    [
      ["AI 영상 제작 교육이나 강의도 제공하나요?", false],
      ["Turn에서 방 크기를 바꾸면 크레딧이 또 드나요?", true],
    ]
  );

  const first = result.rows[0];
  assert.equal(first.Summary, "답변 본문입니다.");
  assert.equal(first.Category, "엑스콘다 소개");
  assert.equal(first.Order, 1001); // 우선순위 1 × 1000 + No 1
  assert.equal(first.Published, true);
  assert.equal(first.__type, "faq");
  assert.equal(first.__source, HUB_QNA_SOURCE);
  assert.match(first.__decision, /초안 완료/);

  // 본문은 `게시용 출처` 만 — 답변(목록으로 나감) · 내부 근거(비공개)는 없음
  const publicMap = result.pages[first.id];
  const keys = Object.keys(publicMap);
  assert.equal(keys.length, 3); // 페이지 블록 + 출처 제목 + 출처 문단
  assert.ok(keys.includes("h-source") && keys.includes("t-2"), keys.join(", "));
  for (const gone of ["h-answer", "t-1", "h-internal", "t-3"]) {
    assert.equal(keys.includes(gone), false, `${gone} 이(가) 본문에 남아 있음`);
  }

  // 제외된 행은 본문을 읽지 않는다 (API 호출 절약)
  assert.equal(loaded.includes("22222222-2222-2222-2222-222222222222"), false);
  assert.equal(loaded.includes("33333333-3333-3333-3333-333333333333"), false);
  assert.equal(loaded.length, 3); // 표 1 + 포함 행 2
});
