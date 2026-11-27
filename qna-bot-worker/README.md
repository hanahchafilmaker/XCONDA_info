# XCONDA Q&A 도우미 · 무료 LLM 프록시 Worker (`qna-bot-worker`)

정적 사이트(`hub.xconda.ai`)에서 API 키 노출 없이 **무료 LLM 티어**를 연결하기 위한 Cloudflare Worker입니다.

브라우저의 **BM25 검색으로 관련 허브 문서 상위 3~4건만 먼저 추려 전달**하고, Worker가 무료 LLM으로 자연스러운 답변을 요약해 돌려줍니다. 일일 한도 초과(`429`)나 네트워크 장애가 나면 다음 무료 공급자로 자동 전환하며, 모든 공급자가 막히더라도 프런트엔드가 기존 **BM25 원문 카드 답변**으로 즉시 폴백합니다.

---

## 0. Cloudflare Workers AI 만으로 켜기 (2026-11-27 기본 설정 · API 키 필요 없음)

`wrangler.toml` 에 `[ai] binding = "AI"` 가 켜져 있고 `PROVIDER_ORDER` 첫 번째가 `workers-ai` 입니다. 외부 키 없이 Cloudflare 계정의 무료 한도(하루 10,000 Neurons, 매일 UTC 0시 = 한국 오전 9시 초기화)로 답합니다.

```bash
cd qna-bot-worker
npx wrangler login     # 처음 한 번: 브라우저가 열리면 Cloudflare 계정으로 로그인 → Allow
npx wrangler deploy    # 끝에 https://xconda-qna-bot.<내계정>.workers.dev 주소가 나옵니다
curl https://xconda-qna-bot.<내계정>.workers.dev/health   # {"ok":true,...,"providers":["workers-ai"]}
```

허브 챗봇과 연결: `src/content/qnaAi.ts` 의 `QNA_AI_ENDPOINT` 에 위 주소를 적고 main 에 합치면 끝입니다.
합치기 전에 내 브라우저에서만 먼저 시험하려면 허브를 열고 개발자 도구 Console 에
`localStorage.setItem("xconda-qna-ai-endpoint", "https://xconda-qna-bot.<내계정>.workers.dev")` 를 입력한 뒤 새로고침하세요 (지우기: `localStorage.removeItem("xconda-qna-ai-endpoint")`).

- **하루 몇 번 답할 수 있나요?** 답 하나에 쓰는 Neurons 는 모델·글 길이에 따라 다릅니다. 기본 모델(`@cf/meta/llama-3.3-70b-instruct-fp8-fast`)은 한국어 품질이 좋지만 무거워서 대략 하루 수십~백 건 안팎입니다. 더 많이 쓰려면 `CF_AI_MODEL` 을 더 가벼운 모델로 바꾸세요(한국어 품질은 낮아질 수 있음). 실제 사용량은 Cloudflare 대시보드 → AI → Workers AI 에서 확인합니다.
- **한도를 다 쓰면?** Worker 가 503 을 돌려주고, 챗봇은 AI 칸을 지운 채 지금처럼 허브 글 검색 답변만 보여 줍니다. 다음 날 오전 9시(한국)에 다시 켜집니다.
- **비용** 무료(Free) 플랜이면 한도를 넘어도 과금되지 않고 멈추기만 합니다. Workers **유료** 플랜 계정이면 넘은 만큼 과금됩니다(1,000 Neurons 당 약 $0.011).
- 이 Worker 는 허브(`hub.xconda.ai`) 화면에서 온 요청만 받도록 CORS 를 제한하지만, 브라우저 밖에서 흉내 낸 요청까지 완전히 막지는 못합니다. 그래서 IP 당 분당 20회 제한(`RATE_LIMIT_RPM`)이 걸려 있습니다.

---

## 1. 무료 API 키 발급 (하나만 있어도 동작, 둘 다 넣으면 자동 백업)

1. **Google Gemini API (1순위 추천 · 한국어/다국어 품질 우수)**
   - [Google AI Studio](https://aistudio.google.com/apikey) 접속 → 구글 계정 로그인 → **Create API key** (카드 등록 불필요)
2. **Groq API (2순위 추천 · 초고속 응답 & 입력 데이터 비학습)**
   - [Groq Console](https://console.groq.com/keys) 접속 → 이메일 가입 → **Create API Key** (`gsk_...`, 카드 등록 불필요)
3. **Cloudflare Workers AI (3순위 · 외부 키 발급 불필요)**
   - `wrangler.toml`에서 `[ai]` / `binding = "AI"` 주석만 해제하면 매일 10,000 Neurons 무료 제공

---

## 2. 배포 방법 (3분)

```bash
cd qna-bot-worker

# 발급받은 무료 키 등록 (사용할 공급자만 등록해도 됩니다)
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GROQ_API_KEY

# Cloudflare 배포
npx wrangler deploy
```

배포가 끝나면 출력되는 주소(`https://xconda-qna-bot.<계정>.workers.dev`)로 상태를 확인할 수 있습니다:

```bash
curl https://xconda-qna-bot.<계정>.workers.dev/health
# {"ok":true,"service":"xconda-qna-bot-worker","providers":["gemini","groq"]}
```

---

## 3. 프런트엔드(위젯 / HTML) 연동 스니펫

다른 작업 브랜치의 허브 위젯이나 단독 HTML(`prototypes/xconda-qna-bot.html`)에서 그대로 복사해 쓸 수 있는 호출 함수입니다.

```ts
export type BotDocInput = {
  title: string;
  answer: string;
  url: string;
  kind?: "qna" | "notice" | "guide" | "blog" | "news";
  date?: string;
};

export type BotAskResult =
  | { mode: "ai"; answer: string; provider: string; sources: BotDocInput[] }
  | { mode: "bm25-fallback"; primary: BotDocInput };

export async function askXcondaBot(
  workerUrl: string,
  question: string,
  rankedDocs: BotDocInput[],
  lang: "ko" | "en" | "ja" | "zh" = "ko",
): Promise<BotAskResult> {
  const topDocs = rankedDocs.slice(0, 4);
  if (!workerUrl || topDocs.length === 0) {
    return { mode: "bm25-fallback", primary: topDocs[0] };
  }

  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${workerUrl.replace(/\/$/, "")}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, docs: topDocs, lang }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      return { mode: "bm25-fallback", primary: topDocs[0] };
    }
    const data = await res.json();
    if (!data?.answer) {
      return { mode: "bm25-fallback", primary: topDocs[0] };
    }
    return {
      mode: "ai",
      answer: data.answer,
      provider: data.provider,
      sources: data.sources ?? topDocs,
    };
  } catch {
    // 타임아웃·오프라인·429 한도 초과 시 서비스 중단 없이 BM25 원문 카드로 즉시 폴백
    return { mode: "bm25-fallback", primary: topDocs[0] };
  } finally {
    window.clearTimeout(timer);
  }
}
```

---

## 4. 단독 프로토타입에서 바로 시험하기

[`prototypes/xconda-qna-bot.html`](../prototypes/xconda-qna-bot.html)은 기본 상태에서는 내장 BM25로 동작하고, 주소 뒤에 `?api=https://xconda-qna-bot.<계정>.workers.dev`를 붙이거나 파일 상단 `<meta name="xconda:qna-api" content="...">`에 배포한 Worker 주소를 적으면 즉시 AI 요약 + 원문 근거 모드로 전환됩니다.
