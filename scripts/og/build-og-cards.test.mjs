/**
 * 언어별 공유 카드 생성기 — 카드 대상 판단(planCard) 회귀 테스트.
 * 렌더(Pillow·폰트)와 네트워크 없이 돌아갑니다.
 *
 *   npm run test:unit
 *
 * 지켜야 하는 것
 *   1) 이미 언어별 카드를 쓰는 페이지도 같은 키·파일로 다시 그린다(제목이 바뀌면 카드도 갱신)
 *   2) 커버 이미지가 있는 글은 카드를 만들지 않는다(사진이 더 좋은 미리보기)
 *   3) Q&A 개별 글은 기본으로 만들지 않고, `--include-qna` 일 때만 만든다(876장 · 약 25~30MB)
 */
import test from "node:test";
import assert from "node:assert/strict";
import { planCard } from "./build-og-cards.mjs";

const DEFAULT = "https://hub.xconda.ai/assets/img/og/xconda-hub-1200x630.png";
const LANG_PREFIX = "https://hub.xconda.ai/assets/img/og/lang/";
const html = (image, title = "제목", description = "설명") =>
  `<meta property="og:image" content="${image}" />` +
  `<meta property="og:title" content="${title}" />` +
  `<meta property="og:description" content="${description}" />`;
const opts = (over = {}) => ({ defaultUrl: DEFAULT, langCardPrefix: LANG_PREFIX, ...over });

test("언어 홈 · 목록 카드는 같은 키·파일로 다시 그린다(제목 변경 반영)", () => {
  const home = planCard({ code: "ja", path: "" }, html(DEFAULT), opts());
  assert.equal(home.key, "ja");
  assert.equal(home.file, "ja-home.png");
  assert.equal(home.kicker, "XCONDA HUB");
  assert.equal(home.label, "日本語");
  assert.equal(home.foot, "hub.xconda.ai/ja/");

  const list = planCard({ code: "zh", path: "qna/" }, html(DEFAULT, "XCONDA 问答"), opts());
  assert.equal(list.key, "zh/qna");
  assert.equal(list.kicker, "XCONDA HUB · Q&A");
  assert.equal(list.foot, "hub.xconda.ai/zh/qna/");

  // 이미 언어별 카드를 쓰는 페이지도 **같은 키·파일**로 다시 그립니다.
  // (글 제목이 바뀌었는데 카드만 옛 제목으로 남는 일을 막기 위해 — 파일이 늘지는 않습니다)
  const again = planCard({ code: "ja", path: "" }, html(`${LANG_PREFIX}ja-home.png`, "새 제목"), opts());
  assert.equal(again.key, "ja");
  assert.equal(again.file, "ja-home.png");
  assert.equal(again.title, "새 제목");
});

test("커버 이미지가 있는 글은 카드를 만들지 않는다", () => {
  const page = { code: "en", path: "post/some-slug/" };
  assert.equal(planCard(page, html("https://media.toolgov.com/cover.png"), opts()), null);
  const card = planCard(page, html(DEFAULT, "Some post"), opts());
  assert.equal(card.key, "en/post/some-slug");
  assert.equal(card.file, "en-post-some-slug.png");
  assert.equal(card.kicker, "XCONDA HUB · POST");
});

test("Q&A 개별 글은 기본으로 만들지 않고 --include-qna 일 때만 만든다", () => {
  const page = { code: "ko", path: "qna/refund-policy/" };
  assert.equal(planCard(page, html(DEFAULT, "환불은 어떻게 하나요?"), opts()), null);
  const card = planCard(page, html(DEFAULT, "환불은 어떻게 하나요?"), opts({ includeQna: true }));
  assert.equal(card.key, "ko/qna/refund-policy");
  assert.equal(card.file, "ko-qna-refund-policy.png");
  assert.equal(card.kicker, "XCONDA HUB · Q&A");
});

test("og:title 이 없으면 카드를 만들지 않는다(빈 카드 방지)", () => {
  assert.equal(planCard({ code: "ja", path: "" }, '<meta property="og:image" content="x" />', opts()), null);
});
