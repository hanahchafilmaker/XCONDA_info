/**
 * Q&A 챗봇 · AI 요약 답변 연결 (qna-bot-worker)
 * -----------------------------------------------------------------------------
 * 배포한 Worker 주소를 아래 `QNA_AI_ENDPOINT` 에 적으면 챗봇이 AI 요약 답변을 함께 보여 줍니다.
 *   예: "https://xconda-qna-bot.<계정>.workers.dev"
 * 비어 있으면(기본) AI 를 부르지 않고 지금처럼 허브 글 검색 답변만 보여 줍니다.
 *
 * 동작
 *   - 브라우저 검색(chatSearch.js)이 고른 상위 허브 글 몇 건만 Worker 에 보냅니다.
 *   - Worker 는 그 글만 근거로 답합니다 (설정: qna-bot-worker/wrangler.toml).
 *   - 하루 무료 한도 초과 · 오류 · 8초 초과면 조용히 포기하고 검색 답변만 남깁니다.
 */
export const QNA_AI_ENDPOINT = "https://xconda-qna-bot.wjwn93.workers.dev";

/**
 * 실제로 쓸 주소. 시험용으로 브라우저에 직접 넣은 값이 있으면 그것을, 없으면 위 상수를 씁니다.
 *   (개발자 도구 Console 에서) localStorage.setItem("xconda-qna-ai-endpoint", "https://….workers.dev")
 * https 주소(또는 내 컴퓨터 localhost)만 받습니다.
 */
export function resolveQnaAiEndpoint(): string {
  try {
    const v = window.localStorage.getItem("xconda-qna-ai-endpoint") ?? "";
    if (/^https:\/\/[^\s]+$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/.test(v)) return v;
  } catch {
    /* 저장소를 못 읽는 브라우저 → 기본 주소 사용 */
  }
  return QNA_AI_ENDPOINT;
}

export type AiDoc = { title: string; answer: string; url: string; kind: string; date?: string };

/** 성공하면 답변 문장, 실패하면 null (화면은 검색 답변만 유지) */
export async function askQnaAi(question: string, docs: AiDoc[], lang: string, endpoint = resolveQnaAiEndpoint()): Promise<string | null> {
  if (!endpoint || docs.length === 0) return null;
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${endpoint.replace(/\/$/, "")}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, docs: docs.slice(0, 4), lang }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { answer?: unknown };
    return typeof data.answer === "string" && data.answer.trim() ? data.answer.trim() : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}
