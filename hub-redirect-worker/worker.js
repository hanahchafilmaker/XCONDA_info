/**
 * XCONDA허브 · 영어 예전 주소 301 (Cloudflare Worker)
 * ---------------------------------------------------------------
 *   hub.xconda.ai/en/*  →  301  →  www.xconda.ai/hub/*
 *
 * 왜 Worker 인가: hub.xconda.ai 는 GitHub Pages 라 서버 301 을 낼 수 없습니다.
 * hub.xconda.ai 앞에 Cloudflare 프록시(주황 구름)를 두고 이 Worker 를 `/en` · `/en/*` 에만 겁니다.
 *
 * ⚠️ 무한 반복 주의
 *   www.xconda.ai/hub/* 는 hub.xconda.ai/en/* 를 **가져다 보여 주는** 프록시입니다.
 *   그 "가져오는 요청"까지 301 하면 /hub/ → /en/ → /hub/ … 로 영어 허브 전체가 멈춥니다.
 *   그래서 프록시 요청은 아래 둘 중 하나로 알아보고 **그대로 통과**시킵니다.
 *     1) 요청 헤더 `x-hub-origin-key` 가 ORIGIN_KEY 와 같다        (권장)
 *     2) 요청 헤더 `x-forwarded-host` 가 BYPASS_FORWARDED_HOSTS 에 있다
 *   이 헤더는 보안 장치가 아닙니다(통과해도 지금 공개된 페이지가 보일 뿐). 반복을 막는 표식입니다.
 *
 * 환경 변수 (wrangler.toml [vars] · 비밀값은 `wrangler secret put`)
 *   MODE                    "observe"(기본) | "on" | "off"
 *                           observe = 301 을 내지 않고 "냈을 것"만 응답 헤더로 알려 줍니다(안전 확인용).
 *   ORIGIN_KEY              (secret) 프록시가 붙여 보내는 값. 저장소에 적지 않습니다.
 *   BYPASS_FORWARDED_HOSTS  (선택) "www.xconda.ai,xconda.ai" 처럼 쉼표로 구분
 *
 * 모든 응답에 `x-hub-redirect` 헤더로 판정 결과를 남깁니다 → `npm run redirect:check` 가 읽습니다.
 *   301 · observe; would=301 · bypass:key · bypass:forwarded-host · pass:assets · pass:method · off
 *
 * 순서·점검·되돌리기: reports/en-hub-subdirectory-handoff-20261114.md › 5-2
 */

export const SOURCE_HOST = "hub.xconda.ai";
export const SOURCE_PREFIX = "/en";
/** 새 주소(끝 `/`). src/content/seo.js › LOCALE_BASE_URLS.en 과 같아야 합니다(테스트가 지킵니다). */
export const TARGET_BASE = "https://www.xconda.ai/hub/";
export const KEY_HEADER = "x-hub-origin-key";
export const STATE_HEADER = "x-hub-redirect";
/**
 * 301 을 브라우저가 기억하는 시간. 헤더가 없으면 브라우저는 301 을 **기한 없이** 기억해서,
 * 나중에 영어 주소를 되돌려도 그 방문자는 계속 새 주소로 갑니다. 1시간으로 묶어 둡니다.
 */
export const REDIRECT_CACHE_SECONDS = 3600;

const MODES = ["observe", "on", "off"];

/** `/en` · `/en/…` 뒤쪽 경로를 새 주소용으로 다듬어 돌려줍니다. 대상이 아니면 null. */
export function restOf(pathname) {
  if (pathname === SOURCE_PREFIX) return "";
  if (!pathname.startsWith(`${SOURCE_PREFIX}/`)) return null;
  // 앞쪽 `/` 를 걷어 내 `/hub//…` 같은 주소가 생기지 않게 합니다.
  let rest = pathname.slice(SOURCE_PREFIX.length + 1).replace(/^\/+/, "");
  // …/index.html → …/  (같은 글의 대표 주소로 모읍니다)
  rest = rest.replace(/(^|\/)index\.html$/, "$1");
  // 끝 슬래시 없는 글 주소는 여기서 붙여 한 번에 보냅니다(안 붙이면 새 주소에서 301 이 한 번 더 납니다).
  const last = rest.split("/").pop();
  if (rest && !rest.endsWith("/") && !/\.[a-z][a-z0-9]{1,5}$/i.test(last)) rest += "/";
  return rest;
}

function bypassReason(headers, env) {
  const key = String(env.ORIGIN_KEY ?? "");
  if (key && headers.get(KEY_HEADER) === key) return "key";
  const hosts = String(env.BYPASS_FORWARDED_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (hosts.length && hosts.includes(forwardedHost(headers))) return "forwarded-host";
  return "";
}

function forwardedHost(headers) {
  return (headers.get("x-forwarded-host") ?? "").split(",")[0].trim().toLowerCase();
}

/**
 * 요청 하나를 어떻게 처리할지 정합니다(네트워크 없음 — 테스트가 이 함수를 직접 부릅니다).
 * @returns {{ action: "redirect" | "pass", state: string, location?: string }}
 */
export function decide({ url, method = "GET", headers = new Headers() }, env = {}) {
  const mode = MODES.includes(env.MODE) ? env.MODE : "observe";
  if (url.hostname !== SOURCE_HOST) return { action: "pass", state: "pass:host" };
  const rest = restOf(url.pathname);
  if (rest === null) return { action: "pass", state: "pass:path" };
  // en/assets/ 의 이미지는 새 주소에 없습니다(프록시는 /hub/assets/ 를 넘기지 않음) — 그대로 둡니다.
  if (rest.startsWith("assets/")) return { action: "pass", state: "pass:assets" };
  if (method !== "GET" && method !== "HEAD") return { action: "pass", state: "pass:method" };
  const bypass = bypassReason(headers, env);
  if (bypass) return { action: "pass", state: `bypass:${bypass}` };
  if (mode === "off") return { action: "pass", state: "off" };

  // 주소는 고정된 새 주소 뒤에 **이어 붙입니다**(new URL 로 풀지 않음 → 다른 도메인으로 샐 수 없습니다).
  const location = `${TARGET_BASE}${rest}${url.search}`;
  if (mode === "on") return { action: "redirect", state: "301", location };
  // observe: 301 은 내지 않고, 어떤 x-forwarded-host 가 왔는지만 함께 알려 줍니다(프록시 구분값 찾기용).
  const seen = forwardedHost(headers).replace(/[^a-z0-9.:-]/g, "") || "-";
  return { action: "pass", state: `observe; would=301; xfh=${seen}`, location };
}

export default {
  async fetch(request, env = {}) {
    const verdict = decide({ url: new URL(request.url), method: request.method, headers: request.headers }, env);
    if (verdict.action === "redirect") {
      return new Response(null, {
        status: 301,
        headers: {
          location: verdict.location,
          "cache-control": `public, max-age=${REDIRECT_CACHE_SECONDS}`,
          [STATE_HEADER]: verdict.state,
        },
      });
    }
    const origin = await fetch(request);
    const response = new Response(origin.body, origin);
    response.headers.set(STATE_HEADER, verdict.state);
    return response;
  },
};
