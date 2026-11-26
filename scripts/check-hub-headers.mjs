#!/usr/bin/env node
/**
 * 허브에 **리다이렉트 · WAF · 캐시 · noindex** 규칙이 걸려 있는지 점검
 * (`npm run hub:headers`) — 2026-11-26
 *
 *   node scripts/check-hub-headers.mjs                  # https://hub.xconda.ai/
 *   node scripts/check-hub-headers.mjs https://hub.xconda.ai/
 *   node scripts/check-hub-headers.mjs --json            # 결과를 JSON 으로(티켓·슬랙 첨부용)
 *
 * 왜 필요한가
 *   Cloudflare 로 이전(B안)하기 전후에, 허브에 **의도하지 않은 규칙**이 걸려 있으면
 *   눈에 안 띄는 손실이 생깁니다.
 *     · 리다이렉트  → 검색·AI 크롤러가 엉뚱한 주소를 색인
 *     · WAF/챌린지  → 크롤러·에이전트가 403/503 을 받고, 사람도 한 번 더 통과해야 함
 *     · noindex     → 허브가 검색에서 빠짐(11/17 사고와 같은 증상)
 *     · 긴 캐시      → 노션 동기화로 재배포해도 옛 화면이 남음
 *     · HTML content-type → `assets/*` 자리에 앱 셸 HTML 이 와서 이미지·스크립트가 깨짐
 *
 * 무엇을 "실패"로 보는가 (규칙이 있으면 안 되는 주소만 봅니다)
 *   · `/` `·` `/ja/` `/zh/` `/qna/` `/en/qna/<글>/` → **200** 이어야 함(301/302/307/308·403·503 은 실패)
 *   · `http://` → https 로 넘어가는 것은 정상(그 1회만 허용)
 *   · `x-robots-tag` 에 noindex 없음 · `set-cookie` 없음(로그인/세션 미들웨어) · `x-frame-options` 등 상관 없음
 *   · `assets/*` 는 **자기 content-type** 이어야 함(HTML 이면 실패) · 캐시 TTL 은 1시간 이하 권장
 *
 * 한계
 *   · Cloudflare 대시보드의 규칙 목록(Bulk Redirects·WAF 커스텀 규칙)은 **API 토큰 없이는** 볼 수 없습니다.
 *     이 스크립트는 **응답으로 드러나는 것**만 봅니다. 규칙이 있지만 지금 요청에 안 걸리면 통과로 나옵니다.
 *   · Cloudflare 존으로 옮긴 뒤에는 응답 헤더 `cf-ray` · `server: cloudflare` 로 프록시 여부도 함께 확인합니다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..");

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const baseArg = args.find((a) => !a.startsWith("--"));
const BASE = (baseArg ?? "https://hub.xconda.ai/").replace(/\/*$/, "/");

const TIMEOUT_MS = 15000;

/** 저장소에 실제로 있는 영어 글 하나 — en/qna/<글>/ 로 점검합니다(없으면 목록). */
export function sampleEnPath() {
  const dir = path.join(ROOT, "en", "qna");
  if (!fs.existsSync(dir)) return "qna/";
  const slug = fs.readdirSync(dir).sort().find((n) => fs.existsSync(path.join(dir, n, "index.html")));
  return slug ? `qna/${slug}/` : "qna/";
}

/** 점검할 주소 — { url, label, expect: "html" | "asset", type: RegExp } */
export function targets() {
  const enArticle = sampleEnPath();
  return [
    { rel: "", expect: "html", label: "홈" },
    { rel: "qna/", expect: "html", label: "Q&A 목록" },
    { rel: "ja/", expect: "html", label: "일본어 홈" },
    { rel: "zh/", expect: "html", label: "중국어 홈" },
    { rel: "post/", expect: "html", label: "뉴스·블로그 목록" },
    // 영어는 예전 주소입니다 — 301 Worker 를 켜기 전에는 **200** 이어야 정상입니다.
    { rel: `en/${enArticle}`, expect: "html", label: "영어 글(예전 주소)" },
    { rel: "robots.txt", expect: "text", type: /^text\/plain/, label: "robots.txt" },
    { rel: "llms.txt", expect: "text", type: /^text\/(plain|markdown)/, label: "llms.txt" },
    { rel: "sitemap.xml", expect: "text", type: /^(application|text)\/xml/, label: "sitemap.xml" },
    { rel: "notion-content.json", expect: "json", type: /^application\/json/, label: "notion-content.json" },
    { rel: "assets/app.js", expect: "asset", type: /^(text|application)\/javascript/, label: "앱 번들(JS)" },
    { rel: "assets/app.css", expect: "asset", type: /^text\/css/, label: "앱 스타일(CSS)" },
    { rel: "assets/img/logo/xconda-wordmark-official.png", expect: "asset", type: /^image\//, label: "로고 이미지" },
    { rel: "b431e2c7231b6a5e01aa9e2b8402d0ec.txt", expect: "text", type: /^text\/plain/, label: "IndexNow key 파일" },
  ];
}

const results = [];
let networkErrors = 0;
const add = (ok, label, detail, level = "fail") => results.push({ ok, label, detail, level });

/**
 * **이 환경에서 hub 로 나가는 연결이 막혔는지** — 서버 규칙 문제와 구분합니다.
 * 샌드박스·사내 방화벽에서는 DNS 는 되는데 TCP 가 끊기는 일이 흔합니다(ECONNRESET 등).
 */
export function networkBlocked(error) {
  const code = String(error?.cause?.code ?? error?.code ?? "");
  return ["ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT", "EHOSTUNREACH", "ENETUNREACH", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "CERT_HAS_EXPIRED"].includes(code);
}

/** 캐시 TTL(초). `no-store`/`private` 는 0, 없으면 null. */
export function cacheSeconds(headers) {
  const cc = (headers.get("cache-control") ?? "").toLowerCase();
  if (!cc) return null;
  if (/no-store|private|no-cache/.test(cc)) return 0;
  const s = /s-maxage=(\d+)/.exec(cc)?.[1] ?? /max-age=(\d+)/.exec(cc)?.[1];
  return s ? Number(s) : null;
}

async function head(url) {
  const res = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": "xconda-hub-header-check/1.0 (+https://hub.xconda.ai/)" },
  });
  return res;
}

async function main() {
  // 0) http → https (한 번만 넘어가는 것은 정상) — https 로 점검할 때만 봅니다.
  if (BASE.startsWith("https://")) try {
    const res = await head(BASE.replace(/^https:/, "http:"));
    const loc = res.headers.get("location") ?? "";
    const ok = [301, 308].includes(res.status) && loc.startsWith("https://");
    add(ok, "http:// → https://", ok ? `${res.status} → ${loc}` : `${res.status} ${loc || "(location 없음)"}`);
  } catch (error) {
    if (networkBlocked(error)) networkErrors += 1;
    add(false, "http:// → https://", String(error?.cause?.code ?? error?.message ?? error));
  }

  // 1) 주소별 상태·리다이렉트·noindex·content-type·캐시
  for (const t of targets()) {
    const url = `${BASE}${t.rel}`;
    let res;
    try {
      res = await head(url);
    } catch (error) {
      if (networkBlocked(error)) networkErrors += 1;
      add(false, `${t.label} (${t.rel || "/"})`, `요청 실패: ${error?.cause?.code ?? error?.message ?? error}`);
      continue;
    }
    const status = res.status;
    const loc = res.headers.get("location");

    if ([301, 302, 303, 307, 308].includes(status)) {
      add(false, `${t.label} (${t.rel || "/"})`, `리다이렉트 ${status} → ${loc ?? "?"} — 허브 주소는 리다이렉트 없이 200 이어야 합니다`);
      continue;
    }
    if ([401, 403, 429, 503].includes(status)) {
      const via = res.headers.get("cf-mitigated") ? " (Cloudflare 챌린지/WAF)" : "";
      add(false, `${t.label} (${t.rel || "/"})`, `차단 ${status}${via} — WAF·챌린지·로그인 미들웨어 확인`);
      continue;
    }
    if (status !== 200) {
      add(false, `${t.label} (${t.rel || "/"})`, `상태 ${status} (200 이어야 합니다)`);
      continue;
    }

    // noindex
    const robotsTag = res.headers.get("x-robots-tag") ?? "";
    add(!/noindex/i.test(robotsTag), `${t.label} noindex 없음`, /noindex/i.test(robotsTag) ? `x-robots-tag: ${robotsTag}` : "");

    // 세션/로그인 미들웨어
    const cookie = res.headers.get("set-cookie") ?? "";
    add(!cookie, `${t.label} 세션 쿠키 없음`, cookie ? `set-cookie: ${cookie.slice(0, 80)}…` : "");

    // content-type
    if (t.type) {
      const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      const ok = t.type.test(type);
      add(ok, `${t.label} content-type`, ok ? type : `${type || "(없음)"} — ${t.type.source} 이어야 합니다(HTML 이면 자산 자리에 앱 셸이 온 것)`);
    }

    // 캐시 — HTML 은 짧게(5~10분 권장), 자산은 1시간 초과면 경고
    const secs = cacheSeconds(res.headers);
    if (secs === null) {
      add(true, `${t.label} 캐시`, "cache-control 없음", "warn");
    } else if (t.expect === "asset") {
      add(secs <= 3600, `${t.label} 캐시 TTL`, `${secs}초${secs > 3600 ? " — 1시간 초과(자산 갱신이 늦게 보일 수 있음)" : ""}`, "warn");
    } else {
      add(secs <= 600, `${t.label} 캐시 TTL`, `${secs}초${secs > 600 ? " — 10분 초과(노션 동기화 재배포가 늦게 보임)" : ""}`, "warn");
    }

    // 어떤 서버가 응답했는지 — Cloudflare 이전 전후 비교용
    const server = res.headers.get("server") ?? "";
    const cfRay = res.headers.get("cf-ray");
    add(true, `${t.label} 응답 서버`, `${server || "(server 헤더 없음)"}${cfRay ? " · Cloudflare 프록시(cf-ray 있음)" : ""}`, "info");
  }

  // 2) 영어 예전 주소의 `data-hub-moved` 스크립트 — 301 을 켜기 전 상태 표시
  try {
    const en = sampleEnPath();
    const res = await head(`${BASE}en/${en}`);
    if (res.status === 200) {
      const html = await res.text();
      const hasMoved = /data-hub-moved/.test(html);
      add(true, "영어 예전 주소 이동 방식", hasMoved ? "JS 이동(data-hub-moved) — 서버 301 아님" : "이동 스크립트 없음", "info");
    }
  } catch {
    /* 위에서 이미 실패로 기록됨 */
  }

  // 3) 보고
  const fails = results.filter((r) => !r.ok && r.level === "fail");
  const warns = results.filter((r) => !r.ok && r.level === "warn");
  if (asJson) {
    console.log(JSON.stringify({ base: BASE, networkBlocked: networkErrors >= results.length - 2, failed: fails.length, warned: warns.length, results }, null, 2));
  } else {
    console.log(`허브 규칙 점검 — ${BASE}\n`);
    for (const r of results) {
      const mark = r.ok ? (r.level === "info" ? "·" : "✅") : r.level === "warn" ? "⚠️" : "❌";
      console.log(`${mark} ${r.label}${r.detail ? ` — ${r.detail}` : ""}`);
    }
    console.log(`\n실패 ${fails.length}건 · 경고 ${warns.length}건 · 확인 ${results.length}건`);
    if (networkErrors >= results.length - 2) {
      // 전부 연결 실패 — 서버 규칙 문제가 아니라 **이 실행 환경의 네트워크**입니다.
      console.log(
        "네트워크 차단 — 이 환경에서 허브로 나가는 HTTPS 연결이 막혀 있어 점검하지 못했습니다.\n" +
          "   (DNS 는 조회되고 TCP 연결만 끊기는 패턴입니다. 서버 규칙과 무관합니다.)\n" +
          "   네트워크가 열린 곳에서 다시 실행하거나, 같은 명령을 점검 담당자에게 전달하세요:\n" +
          `   npm run hub:headers   (또는 node scripts/check-hub-headers.mjs ${BASE})`,
      );
    } else if (fails.length) {
      console.log(
        "→ 리다이렉트/WAF/캐시 규칙을 확인하세요. Cloudflare 대시보드의 Bulk Redirects · Security(WAF) Rules · Rules(Transform/Cache) 순으로 봅니다.",
      );
    } else {
      console.log(
        "PASS — 응답으로 드러난 리다이렉트·차단·noindex·캐시 문제는 없습니다. (대시보드 규칙 목록은 API 토큰 없이는 볼 수 없습니다)",
      );
    }
  }
  process.exitCode = fails.length ? 1 : 0;
}

/**
 * **직접 실행했을 때만** 점검합니다.
 * 테스트가 `targets`·`cacheSeconds` 만 쓰려고 import 해도 네트워크 요청이 나가면 안 됩니다
 * (샌드박스에서는 그 요청이 ECONNRESET 을 던져 테스트 파일 자체가 실패합니다).
 */
const isMain = (() => {
  try {
    return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (isMain) {
  main().catch((error) => {
    console.error(`점검 실패: ${error?.message ?? error}`);
    process.exitCode = 1;
  });
}
