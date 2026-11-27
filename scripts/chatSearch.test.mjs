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

/* ---------------------------------------------------------------------------
 * EN / JA / ZH 화면 — 챗봇(ChatBot.tsx)처럼 사람이 검수한 번역(content/i18n/*.json)의
 * 제목·답변 + 한국어 원문을 함께 색인했을 때, 그 언어로 물어도 맞는 글을 찾는지 확인합니다.
 * ------------------------------------------------------------------------- */
const PREFIX = { faq: "qna", notice: "notice", guide: "guide" };
const localIndex = (file) => {
  const entries = JSON.parse(readFileSync(new URL(`../content/i18n/${file}.json`, import.meta.url), "utf8")).entries;
  const ldocs = docs.map((d) => {
    const tr = entries[`${PREFIX[d.kind]}/${d.slug}`];
    return tr?.title && tr?.summary
      ? { ...d, title: tr.title, text: `${tr.summary} ${d.title} ${d.text}`, translated: true }
      : { ...d, translated: false };
  });
  return { ldocs, lix: buildChatIndex(ldocs) };
};

const LOCALE_CASES = {
  en: [
    ["How much do credit packs cost?", "credit-packs-and-price"],
    ["How do I get a refund?", "how-to-request-refund"],
    ["How do I cancel my subscription?", ["cancel-subscription", "subscription-auto-renewal"]],
    ["Is there a contact email?", "contact-inquiry"],
    ["What is a credit pack?", "credit-packs-and-price"],
  ],
  ja: [
    ["クレジットパックの価格は?", "credit-packs-and-price"],
    ["返金を申請したい", "how-to-request-refund"],
  ],
  zh: [
    ["积分包多少钱?", "credit-packs-and-price"],
    ["怎么申请退款", "how-to-request-refund"],
  ],
};

for (const [file, cases] of Object.entries(LOCALE_CASES)) {
  const { ldocs, lix } = localIndex(file);
  test(`${file}: most Q&A have a human translation`, () => {
    assert.ok(ldocs.filter((d) => d.kind === "faq" && d.translated).length > 50);
  });
  for (const [q, want] of cases) {
    const slugs = [want].flat();
    test(`[${file}] "${q}" → ${slugs.join(" | ")}`, () => {
      const [hit] = searchChat(lix, q);
      assert.ok(hit, "no result");
      const got = ldocs[hit.index];
      assert.ok(slugs.includes(got.slug), `got ${got.slug}`);
      assert.ok(hit.score >= SCORE_GOOD, `score ${hit.score.toFixed(1)} below SCORE_GOOD`);
      assert.ok(got.translated, "answer should be the translated text");
    });
  }
  // 한국어로 물어도 같은 글을 찾음 (번역 화면에서 한국어 질문)
  test(`[${file}] Korean question still works`, () => {
    const [hit] = searchChat(lix, "엑스콘다 가격이 얼마예요?");
    assert.equal(ldocs[hit.index].slug, "credit-packs-and-price");
  });
}

// 사이트 빌드가 만드는 챗봇용 가벼운 번역 파일(assets/chat-i18n-<언어>.json)
test("build makes a slim chat translation file (Q&A·notice·guide titles and answers only)", async () => {
  const { chatTranslationsOf } = await import("./build-seo.mjs");
  const dict = JSON.parse(readFileSync(new URL("../content/i18n/en.json", import.meta.url), "utf8"));
  const slim = chatTranslationsOf(dict);
  assert.equal(slim.entries["qna/credit-packs-and-price"].title, dict.entries["qna/credit-packs-and-price"].title);
  assert.ok(!Object.keys(slim.entries).some((k) => k.startsWith("post/")), "blog posts are left out");
  assert.ok(!("blocks" in slim.entries["qna/credit-packs-and-price"]), "article bodies are left out");
  assert.ok(JSON.stringify(slim).length < 80_000, "small enough to fetch on demand");
});
