/**
 * 글 분류(섹션 배정) 회귀 테스트 — 네트워크·의존성 없이 실행됩니다.
 *
 *   npm run test:unit        (node --test)
 *
 * 검증하는 것
 *   1) 노션 `Type` 표기 흡수 — 공백 · 대소문자 · 대괄호 · 전각 · 동의어 · "뉴스/블로그" 같은 다중 값
 *   2) 내용 기반 추론 — Tool → 툴 사용법, SNS Category · Version · Changes · SNS 링크 → 뉴스
 *   3) `Type` 이 명시되면 추론보다 우선 (SNS 링크가 있어도 공지로 둔 글은 공지 유지)
 *   4) Published 규칙 — 열이 있는데 값이 없으면 미공개(제외)
 *   5) 행 묶음 → 섹션 배정 결과가 기대와 정확히 일치 (사이트 목록과 같은 규칙)
 *   6) 스냅샷에 기록된 `__type` 과 현재 규칙이 일치 (규칙 변경 시 재동기화 필요 감지)
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyType,
  resolveTypeAlias,
  normalizeTypeKey,
  channelFromUrl,
  hasPublishedColumn,
  isPublishedRow,
  includeRow,
  isEntryType,
} from "../src/content/classify.js";

const here = path.dirname(fileURLToPath(import.meta.url));

/* ------------------------------ 1. Type 표기 흡수 ------------------------------ */

test("Type 값: 한글·영문·공백·대소문자·괄호·전각을 모두 같은 뜻으로 읽는다", () => {
  const cases = [
    ["공지", "notice"],
    [" 공지사항 ", "notice"],
    ["공지 사항", "notice"],
    ["[뉴스]", "news"],
    ["뉴스", "news"],
    ["NEWS", "news"],
    ["News", "news"],
    ["ＮＥＷＳ", "news"], // 전각
    ["업데이트", "news"],
    ["릴리스 노트", "news"],
    ["Release", "news"],
    ["changelog", "news"],
    ["가이드", "guide"],
    ["사용법", "guide"],
    ["툴 사용법", "guide"],
    ["Tutorial", "guide"],
    ["블로그", "blog"],
    ["BLOG", "blog"],
    ["아티클", "blog"],
    ["FAQ", "faq"],
    ["Q&A", "faq"],
    ["q & a", "faq"],
    ["자주 묻는 질문", "faq"],
    ["공지(Notice)", "notice"],
    ["뉴스/블로그", "news"],
    ["블로그, 뉴스", "blog"],
    ["뉴스 및 소식", "news"],
    ["뉴스 공지", "news"],
  ];
  for (const [input, expected] of cases) {
    assert.equal(resolveTypeAlias(input), expected, `Type=${JSON.stringify(input)}`);
  }
});

test("처음 보는 Type 값은 억지로 매칭하지 않는다 (추론으로 넘김)", () => {
  for (const unknown of ["재밌는글", "공지소식모음", "잡담", "???"]) {
    assert.equal(resolveTypeAlias(unknown), undefined, unknown);
  }
  assert.equal(resolveTypeAlias(""), undefined);
  assert.equal(resolveTypeAlias(null), undefined);
  assert.equal(normalizeTypeKey("  News  "), "news");
});

test("isEntryType 은 사이트가 아는 섹션만 통과시킨다", () => {
  for (const type of ["notice", "news", "guide", "blog", "faq"]) assert.equal(isEntryType(type), true);
  for (const other of ["공지", "NEWS", "", null, undefined, 1]) assert.equal(isEntryType(other), false);
});

/* ------------------------------ 2. 내용 기반 추론 ------------------------------ */

test("Type 이 비어 있으면 내용으로 섹션을 추정한다", () => {
  assert.equal(classifyType({ link: "https://x.com/VibeEverything/status/1" }).type, "news");
  assert.equal(classifyType({ link: "https://www.youtube.com/watch?v=abc" }).type, "news");
  assert.equal(classifyType({ category: "YouTube" }).type, "news");
  assert.equal(classifyType({ category: "릴리스" }).type, "news");
  assert.equal(classifyType({ changes: "[New] 스토리보드 9컷" }).type, "news");
  assert.equal(classifyType({ version: "v2.5.0" }).type, "news");
  assert.equal(classifyType({ tool: "Director's Cut" }).type, "guide");
  assert.equal(classifyType({}).type, "notice");
});

test("추론 결과에는 근거와 출처가 함께 남는다 (Actions 요약에 표시)", () => {
  const inferred = classifyType({ link: "https://x.com/hanahchafilmaker/status/1" });
  assert.equal(inferred.source, "default");
  assert.match(inferred.reason, /SNS 링크\(X\)/);
  assert.equal(inferred.channel, "x");

  const unknown = classifyType({ type: "재밌는글", changes: "개선" });
  assert.equal(unknown.source, "unknown");
  assert.equal(unknown.raw, "재밌는글");
  assert.equal(unknown.type, "news");
});

test("Type 이 명시되면 내용 추론보다 우선한다", () => {
  // SNS 링크가 있어도 Type=공지면 공지사항에 남는다 (자동 이동 없음 — 노션에서 고치는 게 원칙)
  const notice = classifyType({ type: "공지", link: "https://x.com/VibeEverything/status/1" });
  assert.equal(notice.type, "notice");
  assert.equal(notice.source, "type");
  assert.equal(notice.channel, "x"); // 링크 채널 정보는 참고용으로 유지

  // Type=뉴스면 링크와 무관하게 뉴스
  assert.equal(classifyType({ type: "뉴스", category: "공지" }).type, "news");
  // Type=블로그 + 툴 지정이면 블로그 (툴 사용법으로 끌려가지 않음)
  assert.equal(classifyType({ type: "블로그", tool: "Art Director Pro" }).type, "blog");
});

test("channelFromUrl — 알려진 SNS 주소만 채널로 인식", () => {
  assert.equal(channelFromUrl("https://x.com/a/status/1"), "x");
  assert.equal(channelFromUrl("twitter.com/a"), "x");
  assert.equal(channelFromUrl("https://www.threads.com/@xconda_offcial"), "threads");
  assert.equal(channelFromUrl("https://youtu.be/abc"), "youtube");
  assert.equal(channelFromUrl("https://www.instagram.com/xconda_ai/"), "instagram");
  assert.equal(channelFromUrl("https://silicon-mascara-c7d.notion.site/XCONDA_NEWs-3e72ebc0"), "notion");
  for (const other of ["https://xconda.ai", "https://blog.example.com/x.com", "", null, "메모"]) {
    assert.equal(channelFromUrl(other), undefined, String(other));
  }
});

/* ------------------------------ 3. Published 규칙 ------------------------------ */

test("Published 열이 있으면 체크된 행만, 열이 아예 없으면 전부 노출", () => {
  const rows = [
    { id: "a", Title: "공개", Type: "공지", Published: true },
    { id: "b", Title: "미공개", Type: "공지", Published: false },
    { id: "c", Title: "미체크(속성 없음)", Type: "공지" },
  ];
  assert.equal(hasPublishedColumn(rows), true);
  assert.equal(isPublishedRow(rows[0]), true);
  assert.equal(includeRow(rows[0], true), true);
  // Published 열이 있는 표에서 값이 없으면 = 미공개 (노션은 체크 해제 행의 속성을 빼고 보냅니다)
  assert.equal(includeRow(rows[2], true), false);
  assert.equal(includeRow(rows[1], true), false);

  const noColumn = [{ id: "a", Title: "글", Type: "뉴스" }];
  assert.equal(hasPublishedColumn(noColumn), false);
  assert.equal(includeRow(noColumn[0], false), true);
});

/* ------------------------------ 4. 행 묶음 → 섹션 ------------------------------ */

/** 사이트(ContentContext)와 같은 방식으로 행을 섹션별로 나눕니다. */
function sectionsOf(rows) {
  const requirePublished = hasPublishedColumn(rows);
  const sections = { notice: [], news: [], guide: [], blog: [], faq: [] };
  for (const row of rows) {
    if (!includeRow(row, requirePublished)) continue;
    const decision = classifyType({
      type: row.Type,
      category: row.Category,
      link: row.Link,
      changes: row.Changes,
      version: row.Version,
      tool: row.Tool,
    });
    sections[decision.type].push(row.Title);
  }
  return sections;
}

test("섹션 배정 — 다섯 종류가 정확히 갈라지고, 미공개·미분류도 규칙대로 처리된다", () => {
  const rows = [
    { id: "1", Title: "서버 점검 안내", Type: "공지", Published: true, Category: "점검" },
    { id: "2", Title: "X 바이럴 영상 모음", Type: "뉴스", Published: true, Link: "https://x.com/a/status/1" },
    { id: "3", Title: "60fps.design 팁", Type: "뉴스", Published: true, Link: "https://x.com/b/status/2" },
    { id: "4", Title: "Director's Cut 사용법", Type: "가이드", Published: true, Tool: "Director's Cut" },
    { id: "5", Title: "워크플로우 인터뷰", Type: "블로그", Published: true, Category: "인터뷰" },
    { id: "6", Title: "크레딧 환불 되나요?", Type: "FAQ", Published: true },
    // Type 이 비어 있어 내용으로 추론되는 글
    { id: "7", Title: "릴리스 v2.6.0", Type: "", Published: true, Version: "v2.6.0", Changes: "[New] 컷 합치기" },
    { id: "8", Title: "타 SNS 소식", Type: "", Published: true, Link: "https://www.youtube.com/watch?v=abc" },
    { id: "9", Title: "툴 가이드 (Type 미입력)", Type: "", Published: true, Tool: "Art Director Pro" },
    // 처음 보는 Type 값 → 기본값(공지사항) + 경고 대상
    { id: "10", Title: "알쓸신잡", Type: "재밌는글", Published: true },
    // 미공개 → 어느 섹션에도 없음
    { id: "11", Title: "초안", Type: "뉴스", Published: false },
  ];

  const sections = sectionsOf(rows);
  assert.deepEqual(sections.notice, ["서버 점검 안내", "알쓸신잡"]);
  assert.deepEqual(sections.news, ["X 바이럴 영상 모음", "60fps.design 팁", "릴리스 v2.6.0", "타 SNS 소식"]);
  assert.deepEqual(sections.guide, ["Director's Cut 사용법", "툴 가이드 (Type 미입력)"]);
  assert.deepEqual(sections.blog, ["워크플로우 인터뷰"]);
  assert.deepEqual(sections.faq, ["크레딧 환불 되나요?"]);

  const total = Object.values(sections).reduce((n, list) => n + list.length, 0);
  assert.equal(total, rows.length - 1, "미공개 1건만 제외되어야 함");
});

test("백지에서 Type 만 바꾸면 섹션이 그대로 바뀐다 (노션 → 사이트 반영 확인)", () => {
  const row = { id: "1", Title: "Claude Opus 5.5 바이럴 영상", Type: "공지", Published: true, Link: "https://x.com/a/status/1" };
  assert.equal(classifyType({ type: row.Type, link: row.Link }).type, "notice");
  row.Type = "뉴스"; // 노션에서 Type 만 뉴스로 수정
  assert.equal(classifyType({ type: row.Type, link: row.Link }).type, "news");
});

/* ------------------------------ 5. 실제 스냅샷과의 정합성 ------------------------------ */

test("스냅샷에 기록된 __type 은 현재 규칙과 일치해야 한다", () => {
  const file = path.join(here, "..", "notion-content.json");
  if (!fs.existsSync(file)) return; // 스냅샷이 없으면 검사 생략
  const snapshot = JSON.parse(fs.readFileSync(file, "utf8"));
  const rows = Array.isArray(snapshot.rows) ? snapshot.rows : [];
  let checked = 0;
  for (const row of rows) {
    if (!isEntryType(row.__type)) continue; // 아직 분류 정보가 없는 옛 스냅샷은 생략
    checked += 1;
    const decision = classifyType({
      type: row.Type,
      category: row.Category,
      link: row.Link,
      changes: row.Changes,
      version: row.Version,
      tool: row.Tool,
    });
    assert.equal(
      decision.type,
      row.__type,
      `"${row.Title}" — 스냅샷 __type=${row.__type} 인데 규칙은 ${decision.type} 로 봅니다. 분류 규칙을 바꿨다면 Actions 에서 "Notion 동기화"를 한 번 실행해 스냅샷을 갱신하세요.`
    );
  }
  console.log(`  · 스냅샷 ${rows.length}행 중 ${checked}행의 __type 을 확인했습니다.`);
});
