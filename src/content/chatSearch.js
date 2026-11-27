/* =============================================================================
 * 허브 Q&A 챗봇 검색 규칙 — 사이트(src/components/ChatBot.tsx)와 테스트가 함께 씁니다.
 * -----------------------------------------------------------------------------
 * AI·API 키 없이 브라우저 안에서만 동작합니다. 질문과 각 글을 "두 글자씩 자른 조각"
 * (바이그램)으로 바꾼 뒤, 겹치는 조각이 많고 드문 조각일수록 점수를 높게 주는
 * BM25 방식으로 가장 맞는 글을 고릅니다. 답변은 글의 요약(Q&A 는 답변 본문)을
 * 그대로 보여 주므로, 허브에 없는 내용을 지어내지 않습니다.
 *
 * 검색이 엉뚱한 글을 고르면:
 *   ① 같은 뜻 다른 표기 → SAME_WORDS
 *   ② 질문에 이 말이 있으면 덧붙일 단어 → EXPAND
 *   ③ 특정 글에 손님이 쓸 법한 말 → HINTS (Slug 기준)
 * 를 고치고 `npm run test:unit` 의 scripts/chatSearch.test.mjs 에 질문 예시를 추가하세요.
 * ============================================================================= */

/** 같은 뜻 다른 표기를 하나로 맞춤 (글과 질문 양쪽에 적용) */
const SAME_WORDS = [
  [/시댄스|씨댄스|seedance/g, " seedance "],
  [/플렉스\s*보드|flex\s*board|flexboard/g, " flexboard "],
  [/블로킹\s*보드|blocking\s*board/g, " 블로킹보드 "],
  [/시드림|seedream/g, " seedream "],
  [/드래프트|초안|draft/g, " draft "],
  [/클링|kling/g, " kling "],
  [/(?<![가-힣])턴|turn/g, " turn "],
  [/워크\s*스페이스|workspace/g, " 워크스페이스 "],
  [/엑스콘다|xconda/g, " "],
];

/** 질문에 이런 말이 있으면 관련 단어를 덧붙여 검색 (질문에만 적용) */
const EXPAND = [
  [/^\s*(엑스콘다|xconda)\s*(가|는|이|란|이란)?\s*(뭐|무엇|어떤|뭔)/i, " 서비스 소개 플랫폼 "],
  [/가격|요금|비용|얼마(?!나)|가격표|price|pricing|cost|결제\s*금액/i, " 크레딧 팩 가격 "],
  [/무료|공짜|체험|웰컴|free/i, " 웰컴 크레딧 무료 "],
  [/연락|전화|이메일|메일|고객\s*센터|상담|문의|contact|email/i, " 문의 고객센터 "],
  [/해지|구독\s*취소|그만|cancel/i, " 구독 해지 "],
  [/할인|프로모션|이벤트|세일|discount|promo/i, " 할인 행사 "],
  [/저작권|상업|copyright|commercial/i, " 저작권 상업적 "],
  [/회사|운영|만든/, " 회사 큐브베리 "],
  [/팀|동료|멤버|여럿이|같이\s*쓰|함께\s*쓰|team/i, " 워크스페이스 구성원 조직 "],
  [/가입|계정\s*만들|sign\s*up/i, " 회원가입 "],
  [/뭐야|뭐예요|뭐에요|무엇|뭔가요|뭔데|소개/, " 어떤 도구 "],
];

/** 질문 끝말처럼 어디에나 나오는 말은 빼고 검색 */
const STOP = /(싶어요|싶은데|싶으면|싶다|뭐야|인가요|있나요|하나요|되나요|어떻게|무엇|뭔가요|뭐예요|뭐에요|이에요|예요|에요|해요|나요|까요|궁금|알려\s*주세요|알려줘|주세요)/g;

/** 검색이 잘 되도록 글(Slug)마다 손님이 쓸 법한 말을 덧붙임. 화면에 보이는 답변은 바뀌지 않습니다. */
export const HINTS = {
  "credit-packs-and-price": "가격 요금 비용 얼마 요금제 가격표 플랜 상품 구매 원 달러",
  "how-to-request-refund": "환불 신청 요청 돌려받기 환불 받고 받기 방법",
  "non-refundable-cases": "환불 불가 안되는",
  "credit-expiry-and-refund-policy": "환불 규정 유효기간 만료",
  "cancel-subscription": "구독 해지 취소 그만 방법",
  "who-made-xconda": "회사 이름 운영사 만든 곳 큐브베리",
  "company-business-info": "회사 이름 사업자 등록번호 주소 대표",
  "contact-inquiry": "연락처 전화번호 이메일 고객센터 상담",
  "what-is-xconda": "서비스 소개 플랫폼",
  "how-to-sign-up": "가입 계정 만들기 로그인",
  "welcome-credits-500": "무료 공짜 체험 신규 가입 혜택",
  "seedance-credit-pricing": "시댄스 가격 크레딧 단가 초당 해상도 몇 크레딧",
  "commercial-use": "유튜브 광고 판매 수익 상업 사용",
};

/** 이 점수 이상이면 "찾았다", MAYBE 이상이면 "혹시 이 질문인가요?" 후보로만 보여 줍니다. */
export const SCORE_GOOD = 6;
export const SCORE_MAYBE = 4;

function norm(s) {
  let out = String(s || "").normalize("NFKC").toLowerCase();
  for (const [re, to] of SAME_WORDS) out = out.replace(re, to);
  return out.replace(/[^0-9a-z가-힣\s]/g, " ");
}

function grams(s) {
  const out = [];
  for (const w of s.split(/\s+/)) {
    if (!w) continue;
    if (/^[a-z0-9]+$/.test(w)) {
      if (w.length > 1) out.push(w);
      continue;
    }
    if (w.length === 1) {
      out.push(w);
      continue;
    }
    for (let i = 0; i < w.length - 1; i++) out.push(w.slice(i, i + 2));
  }
  return out;
}

/**
 * @param {{ title: string, text: string, slug?: string, kind: string }[]} docs
 */
export function buildChatIndex(docs) {
  const df = {};
  const items = docs.map((d) => {
    const hint = (d.slug && HINTS[d.slug]) || "";
    // 제목은 세 번, 검색 힌트는 두 번 넣어 비중을 높입니다.
    const g = grams(norm(`${d.title} ${d.title} ${d.title} ${hint} ${hint} ${d.text}`));
    const tf = {};
    for (const x of g) tf[x] = (tf[x] || 0) + 1;
    for (const x of Object.keys(tf)) df[x] = (df[x] || 0) + 1;
    return { tf, len: g.length };
  });
  const avg = items.reduce((a, d) => a + d.len, 0) / Math.max(1, items.length);
  return { docs, items, df, avg, N: items.length };
}

/** 점수 높은 순으로 [{ index, score }] 를 돌려줍니다. */
export function searchChat(ix, question) {
  let q = String(question || "");
  for (const [re, add] of EXPAND) if (re.test(q)) q += add;
  const qg = [...new Set(grams(norm(q).replace(STOP, " ")))];
  const k1 = 1.2;
  const b = 0.75;
  const res = [];
  ix.items.forEach((d, i) => {
    let s = 0;
    for (const x of qg) {
      const f = d.tf[x];
      if (!f) continue;
      const n = ix.df[x];
      const idf = Math.log(1 + (ix.N - n + 0.5) / (n + 0.5));
      s += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.len) / ix.avg));
    }
    if (ix.docs[i].kind === "faq") s *= 1.15; // 짧고 정확한 Q&A 를 조금 우대
    if (s > 0) res.push({ index: i, score: s });
  });
  res.sort((a, b2) => b2.score - a.score);
  return res;
}
