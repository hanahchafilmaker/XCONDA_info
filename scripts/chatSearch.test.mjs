/**
 * 허브 Q&A 챗봇 검색 규칙 테스트 — 네트워크 없이 실행됩니다.
 *
 *   npm run test:unit        (node --test)
 *
 * 커밋된 스냅샷(notion-content.json)의 Q&A · 공지 · 가이드로 색인을 만들고,
 * 손님이 실제로 물어볼 법한 질문이 맞는 글을 1등으로 찾는지 확인합니다.
 * 챗봇(src/components/ChatBot.tsx)이 화면에서 쓰는 것과 같은 검색 함수입니다.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildChatIndex, searchChat, SCORE_GOOD } from "../src/content/chatSearch.js";

const snap = JSON.parse(readFileSync(new URL("../notion-content.json", import.meta.url), "utf8"));
const docs = snap.rows
  .filter((r) => ["faq", "notice", "guide"].includes(r.__type) && r.Slug)
  .map((r) => ({
    kind: r.__type,
    slug: r.Slug,
    title: String(r.Title || "").trim(),
    text: [r.Summary, r["SEO 제목"], r["SEO 설명"], ...(r.Tags || [])].filter(Boolean).join(" "),
  }));
const ix = buildChatIndex(docs);
const top = (q) => {
  const [hit] = searchChat(ix, q);
  return hit ? { slug: docs[hit.index].slug, score: hit.score } : null;
};

const CASES = [
  ["엑스콘다 가격이 얼마예요?", "credit-packs-and-price"],
  ["환불 받고 싶어요", "how-to-request-refund"],
  ["환불은 얼마나 걸려요", "how-to-request-refund"],
  // 자동 갱신 답변에도 "해지 방법" 이 들어 있어 둘 다 맞는 답으로 봅니다.
  ["구독 해지 방법", ["cancel-subscription", "subscription-auto-renewal"]],
  ["고객센터 전화번호", "contact-inquiry"],
  ["무료로 써볼 수 있나요", "welcome-credits-500"],
  ["시댄스 1080p 몇 크레딧?", "seedance-credit-pricing"],
  ["연예인 얼굴 써도 돼?", "real-person-celebrity-reference"],
  ["한국어로 프롬프트 써도 돼?", "seedance-prompt-language"],
  ["엑스콘다가 뭐예요", "what-is-xconda"],
  ["턴은 뭐예요", "what-is-turn"],
  ["미성년자 가입", "minors-eligibility"],
  ["크레딧 다음달로 넘어가?", "subscription-credit-rollover"],
];

test("snapshot has Q&A docs to search", () => {
  assert.ok(docs.filter((d) => d.kind === "faq").length > 50);
});

for (const [q, want] of CASES) {
  const slugs = [want].flat();
  test(`"${q}" → ${slugs.join(" | ")}`, () => {
    const hit = top(q);
    assert.ok(hit, "no result");
    assert.ok(slugs.includes(hit.slug), `got ${hit.slug}`);
    assert.ok(hit.score >= SCORE_GOOD, `score ${hit.score.toFixed(1)} below SCORE_GOOD`);
  });
}

test("unrelated question is not answered confidently", () => {
  const hit = top("오늘 날씨 어때");
  assert.ok(!hit || hit.score < SCORE_GOOD);
});
