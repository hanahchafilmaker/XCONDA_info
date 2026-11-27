/**
 * Q&A 도우미 무료 LLM 프록시 Worker 및 하이브리드 폴백 검증
 *
 * 검증 항목:
 *   1) CORS 허용 출처 검사 및 비허용 Origin 차단(403)
 *   2) 입력 길이 제한 · 외부 피싱 URL 정화
 *   3) 무료 티어 공급자 자동 폴백 (Gemini 429 → Groq 503 → Workers AI 성공)
 *   4) 전체 공급자 한도 초과 시 503 + fallback:"bm25" 응답
 *   5) IP 분당 요청 제한(429) 동작
 *   6) wrangler.toml 에 평문 API 키가 잘못 커밋되지 않았는지 검사
 *   7) 단독 HTML 프로토타입(prototypes/xconda-qna-bot.html)의 BM25 검색 + API 폴백 동작
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

import worker, {
  resetRateLimitsForTest,
  sanitizeDocUrl,
  validatePayload,
} from "../qna-bot-worker/worker.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const SAMPLE_DOCS = [
  {
    title: "환불은 어떻게 요청하고, 얼마나 걸리나요?",
    answer: "결제 후 7일 이내, 크레딧 미사용 시 cubeberry@cuberry.kr 로 전액 환불을 요청할 수 있습니다.",
    url: "https://hub.xconda.ai/qna/how-to-request-refund/",
    kind: "qna",
    date: "2026-10-11",
  },
];

test("GET /health 는 설정된 공급자 이름만 노출하고 API 키 값은 절대 포함하지 않는다", async () => {
  const secretGemini = "AIzaSy-DO-NOT-LEAK";
  const secretGroq = "gsk_DO_NOT_LEAK";
  const res = await worker.fetch(
    new Request("https://xconda-qna-bot.example.workers.dev/health", {
      headers: { Origin: "https://hub.xconda.ai" },
    }),
    { GEMINI_API_KEY: secretGemini, GROQ_API_KEY: secretGroq },
  );
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.ok(!text.includes(secretGemini));
  assert.ok(!text.includes(secretGroq));
  const data = JSON.parse(text);
  assert.equal(data.ok, true);
  assert.deepEqual(data.providers, ["gemini", "groq"]);
});

test("허용되지 않은 외부 Origin 의 POST 호출은 403 으로 차단한다", async () => {
  const res = await worker.fetch(
    new Request("https://xconda-qna-bot.example.workers.dev/ask", {
      method: "POST",
      headers: {
        Origin: "https://attacker.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: "환불 방법", docs: SAMPLE_DOCS }),
    }),
    { GEMINI_API_KEY: "test-key" },
  );
  assert.equal(res.status, 403);
});

test("참고 문서 URL 은 hub.xconda.ai / xconda.ai 외 외부 주소를 제거한다", () => {
  assert.equal(
    sanitizeDocUrl("https://hub.xconda.ai/qna/how-to-request-refund/"),
    "https://hub.xconda.ai/qna/how-to-request-refund/",
  );
  assert.equal(sanitizeDocUrl("/qna/commercial-use/"), "https://hub.xconda.ai/qna/commercial-use/");
  assert.equal(sanitizeDocUrl("https://phishing.example/login"), "");
  assert.equal(sanitizeDocUrl("javascript:alert(1)"), "");

  const checked = validatePayload({
    question: "환불은 어떻게 하나요?",
    docs: [{ title: "환불 안내", answer: "7일 이내 미사용 전액 환불", url: "https://evil.example/fake" }],
  });
  assert.equal(checked.ok, true);
  assert.equal(checked.docs[0].url, "");
});

test("Gemini 가 429 한도 초과를 반환하면 Groq → Workers AI 순서로 자동 폴백한다", async () => {
  resetRateLimitsForTest();
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url: String(url), headers: init?.headers });
    if (String(url).includes("generativelanguage.googleapis.com")) {
      // 쿼리스트링에 API 키가 노출되지 않고 헤더로 전달되는지 함께 검증
      assert.ok(!String(url).includes("gemini-secret"));
      assert.equal(init.headers["x-goog-api-key"], "gemini-secret");
      return new Response("Quota exceeded", { status: 429 });
    }
    if (String(url).includes("api.groq.com")) {
      return new Response("Upstream unavailable", { status: 503 });
    }
    throw new Error(`unexpected fetch: ${url}`);
  };

  const env = {
    GEMINI_API_KEY: "gemini-secret",
    GROQ_API_KEY: "groq-secret",
    AI: {
      async run(model) {
        calls.push({ workersAiModel: model });
        return { response: "결제 후 7일 이내 미사용 시 cubeberry@cuberry.kr 로 환불을 요청하실 수 있습니다." };
      },
    },
  };

  const res = await worker.fetch(
    new Request("https://xconda-qna-bot.example.workers.dev/ask", {
      method: "POST",
      headers: {
        Origin: "https://hub.xconda.ai",
        "CF-Connecting-IP": "203.0.113.10",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: "환불은 어떻게 받나요?", docs: SAMPLE_DOCS, lang: "ko" }),
    }),
    env,
    undefined,
    fakeFetch,
  );

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.provider, "workers-ai");
  assert.match(body.answer, /7일 이내/);
  assert.equal(body.sources.length, 1);
  assert.equal(calls.length, 3, "Gemini → Groq → Workers AI 순으로 호출되어야 합니다");
});

test("모든 공급자가 실패하면 프런트엔드가 즉시 BM25 로 폴백하도록 503 을 돌려준다", async () => {
  resetRateLimitsForTest();
  const fakeFetch = async () => new Response("Rate limit", { status: 429 });
  const res = await worker.fetch(
    new Request("https://xconda-qna-bot.example.workers.dev/ask", {
      method: "POST",
      headers: { Origin: "https://hub.xconda.ai", "Content-Type": "application/json" },
      body: JSON.stringify({ question: "환불 방법", docs: SAMPLE_DOCS }),
    }),
    { GROQ_API_KEY: "groq-secret" },
    undefined,
    fakeFetch,
  );
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.fallback, "bm25");
});

test("분당 요청 한도를 넘긴 IP 는 429 와 Retry-After 헤더를 받는다", async () => {
  resetRateLimitsForTest();
  const env = {
    RATE_LIMIT_RPM: "2",
    AI: { async run() { return { response: "답변" }; } },
  };
  const makeReq = () =>
    worker.fetch(
      new Request("https://xconda-qna-bot.example.workers.dev/ask", {
        method: "POST",
        headers: {
          Origin: "https://hub.xconda.ai",
          "CF-Connecting-IP": "198.51.100.77",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: "환불", docs: SAMPLE_DOCS }),
      }),
      env,
    );

  assert.equal((await makeReq()).status, 200);
  assert.equal((await makeReq()).status, 200);
  const third = await makeReq();
  assert.equal(third.status, 429);
  assert.ok(Number(third.headers.get("Retry-After")) >= 1);
});

test("wrangler.toml 에 평문 API 키가 포함되지 않는다", () => {
  const toml = fs.readFileSync(path.join(ROOT, "qna-bot-worker/wrangler.toml"), "utf8");
  const activeLines = toml
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
  assert.doesNotMatch(activeLines, /GEMINI_API_KEY\s*=/);
  assert.doesNotMatch(activeLines, /GROQ_API_KEY\s*=/);
});

test("단독 프로토타입 HTML 은 BM25 검색과 API 실패 시 자동 폴백을 모두 지원한다", async () => {
  const html = fs.readFileSync(path.join(ROOT, "prototypes/xconda-qna-bot.html"), "utf8");
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.ok(scripts.length >= 2);

  // 1) 엔진 스크립트 단독 추출 검증 (buildIndex · search · askBotApi)
  const sandbox = { module: { exports: {} }, setTimeout, clearTimeout, AbortController };
  vm.runInNewContext(scripts[0], sandbox);
  const { buildIndex, search, askBotApi } = sandbox.module.exports;

  const kbJson = JSON.parse(html.match(/<script id="kb" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  const ix = buildIndex(kbJson);
  const hits = search(ix, "환불은 어떻게 받나요?");
  assert.ok(hits.length > 0 && hits[0].s >= 6);
  assert.match(kbJson[hits[0].i].u, /refund/);

  // API 가 429 를 반환하면 에러를 던지지 않고 null 을 반환해 BM25 폴백을 유도
  const fallbackResult = await askBotApi(
    "https://xconda-qna-bot.example.workers.dev",
    "환불은 어떻게 받나요?",
    [kbJson[hits[0].i]],
    "ko",
    async () => new Response("rate limited", { status: 429 }),
  );
  assert.equal(fallbackResult, null);

  // 2) DOM 렌더링 검증 (API 미연결 상태에서 첫 화면 즉시 동작)
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://hub.xconda.ai/prototypes/xconda-qna-bot.html" });
  const doc = dom.window.document;
  assert.match(doc.getElementById("sub").textContent, /Q&A \d+개/);
  assert.ok(doc.querySelectorAll("#log .msg.bot").length >= 2, "인사말과 첫 예시 답변 카드가 표시되어야 합니다");
  dom.window.close();
});

/* ---------------- Workers AI 를 기본 공급자로 쓰는 배포 설정 (2026-11-27) ---------------- */

test("wrangler.toml: Workers AI 바인딩이 켜져 있고 가장 먼저 호출된다", () => {
  const toml = fs.readFileSync(path.join(ROOT, "qna-bot-worker/wrangler.toml"), "utf8");
  assert.match(toml, /^\[ai\]\s*\nbinding = "AI"/m, "[ai] binding 이 주석 처리되어 있으면 Workers AI 를 쓸 수 없습니다");
  const order = /^PROVIDER_ORDER = "([^"]+)"/m.exec(toml)?.[1] ?? "";
  assert.equal(order.split(",")[0], "workers-ai");
});

test("키 없이 Workers AI 만 있어도 답하고, 하루 한도를 넘기면 503 + bm25 폴백을 알린다", async () => {
  resetRateLimitsForTest();
  const req = () =>
    new Request("https://xconda-qna-bot.example.workers.dev/ask", {
      method: "POST",
      headers: { Origin: "https://hub.xconda.ai", "CF-Connecting-IP": "203.0.113.77", "Content-Type": "application/json" },
      body: JSON.stringify({ question: "환불은 어떻게 받나요?", docs: SAMPLE_DOCS, lang: "ko" }),
    });
  const order = { PROVIDER_ORDER: "workers-ai,gemini,groq" };

  const ok = await worker.fetch(req(), { ...order, AI: { run: async () => ({ response: "7일 이내 미사용이면 환불됩니다." }) } });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).provider, "workers-ai");

  const quota = await worker.fetch(req(), {
    ...order,
    AI: { run: async () => { throw new Error("4006: you have used up your daily free allocation of 10,000 neurons"); } },
  });
  assert.equal(quota.status, 503);
  assert.equal((await quota.json()).fallback, "bm25");
});
