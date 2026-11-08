/**
 * 콘텐츠 발행 점검 회귀 방지 — 2026-11-08
 *
 * `scripts/content-audit.mjs` 는 노션 스냅샷만 읽어 **발행 전에 채워야 할 칸**을 짚습니다.
 * 이 도구가 조용히 틀리면(예: Q&A 73건을 "커버 없는 공지"로 잡거나, Slug 없는 글을 통과시키면)
 * 사람이 다시 눈으로 훑어야 하므로, 판정 규칙을 여기서 고정합니다.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { auditRow, auditSnapshot, formatMarkdown, titleSimilarity, sectionOf } from "./content-audit.mjs";

const row = (over = {}) => ({
  id: "r1",
  Title: "테스트 글",
  Type: "블로그",
  Slug: "test-post",
  "SEO 제목": "테스트 글",
  "SEO 설명": "가".repeat(80),
  Cover: "https://example.test/c.jpg",
  Published: "True",
  Date: "2026-11-01",
  ...over,
});

test("노션 한글 섹션 이름을 사이트 섹션으로 정규화한다", () => {
  assert.equal(sectionOf({ Type: "공지" }), "notice");
  assert.equal(sectionOf({ Type: "블로그" }), "blog");
  assert.equal(sectionOf({ Type: "News" }), "news");
  assert.equal(sectionOf({ Type: "가이드" }), "guide");
  // Type 이 없는 행은 Q&A 표 — 기본값(공지)으로 떨어지면 73건이 오탐이 됩니다.
  assert.equal(sectionOf({}), "");
});

test("Q&A 행은 커버·SEO 제목 누락을 문제로 잡지 않는다", () => {
  const { kind, issues } = auditRow({ Title: "환불은 어떻게 하나요?", Slug: "how-to-request-refund", Published: "True" });
  assert.equal(kind, "qna");
  assert.deepEqual(issues, []);
});

test("본문 글은 Slug·SEO 제목·SEO 설명·커버 누락을 각각 짚는다", () => {
  const { kind, issues } = auditRow(
    row({ Slug: "", "SEO 제목": "", "SEO 설명": "", Cover: "" }),
  );
  assert.equal(kind, "content");
  const codes = issues.map((i) => i.code).sort();
  assert.deepEqual(codes, ["cover-missing", "seo-description-missing", "seo-title-missing", "slug-missing"]);
});

test("Slug 형식 오류는 오류(error), 커버 누락은 경고(warn)로 구분한다", () => {
  const bad = auditRow(row({ Slug: "Test_Post" })).issues.find((i) => i.code === "slug-invalid");
  assert.equal(bad.level, "error");
  const cover = auditRow(row({ Cover: "" })).issues.find((i) => i.code === "cover-missing");
  assert.equal(cover.level, "warn");
});

test("필수 칸이 다 찬 글은 문제를 남기지 않는다", () => {
  assert.deepEqual(auditRow(row()).issues, []);
});

test("같은 Slug 를 두 글이 쓰면 양쪽 모두 오류로 표시한다", () => {
  const report = auditSnapshot({ rows: [row({ id: "a" }), row({ id: "b", Title: "다른 글" })] });
  assert.equal(report.summary.errors, 2);
  for (const item of report.items) {
    assert.ok(item.issues.some((i) => i.code === "slug-duplicate"), `${item.id} 에 중복 표시가 없습니다`);
  }
});

test("초안은 참고(info)로만 표시하고 오류로 세지 않는다", () => {
  const report = auditSnapshot({ rows: [row({ Published: false, Slug: "" })] });
  assert.equal(report.drafts, 1);
  assert.equal(report.summary.errors, 0);
});

test("제목 유사도는 같은 사건을 다룬 글을 찾아내고 무관한 글은 0 에 가깝다", () => {
  const same = titleSimilarity(
    "딥마인드 Genie 4, 실시간 조종·물리·소리·추론을 갖춘 월드 모델 공개",
    "구글 딥마인드, 영상과 소리를 함께 만드는 월드 모델 Genie 4 공개",
  );
  assert.ok(same >= 0.4, `같은 사건인데 유사도가 낮습니다: ${same}`);
  const different = titleSimilarity("웰컴 크레딧 500 지급", "FLEXBOARD는 어떤 도구인가요");
  assert.ok(different < 0.2, `무관한 글인데 유사도가 높습니다: ${different}`);
});

test("Markdown 보고서는 표·중복 후보·읽기 전용 안내를 담는다", () => {
  const md = formatMarkdown(auditSnapshot({ rows: [row({ Slug: "" })] }), { date: "2026-11-08" });
  assert.match(md, /# 콘텐츠 발행 점검 — 2026-11-08/);
  assert.match(md, /읽기 전용/);
  assert.match(md, /Slug 가 비어 있어 자기 주소가 없습니다/);
  assert.match(md, /## 3\. 제목이 비슷한 게시 글/);
});
