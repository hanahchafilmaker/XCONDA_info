/**
 * 영어 예전 주소 301 Worker 회귀 방지 — 2026-11-23
 *
 * hub.xconda.ai/en/* → www.xconda.ai/hub/* 301 은 **잘못 켜면 영어 허브 전체가 멈춥니다**
 * (새 주소는 예전 주소를 가져다 보여 주는 프록시라, 그 요청까지 301 하면 무한 반복).
 * 아래를 지킵니다.
 *   1) 주소 변환 — 쿼리 유지 · 끝 슬래시 · index.html · 다른 도메인으로 새지 않음
 *   2) 통과 조건 — 프록시 요청(키·x-forwarded-host) · 영어 폴더 자산 · 다른 언어
 *   3) 단계 — 기본은 observe(301 안 냄). on 일 때만 301
 *   4) 스위치(LOCALE_BASE_URLS.en)·wrangler.toml 과 서로 어긋나지 않음
 *   5) 점검 스크립트(check-en-301)가 "켜면 무한 반복" 을 켜기 전에 잡아냄 (가짜 네트워크로 끝까지 실행)
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import worker, { decide, restOf, TARGET_BASE, KEY_HEADER, STATE_HEADER, REDIRECT_CACHE_SECONDS } from "../hub-redirect-worker/worker.js";
import { runChecks, sampleArticle, sampleAsset, WORKER_DEPLOYABLE, CURRENT_FALLBACK } from "./check-en-301.mjs";
import { LOCALE_BASE_URLS } from "../src/content/seo.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const wrangler = fs.readFileSync(path.join(ROOT, "hub-redirect-worker/wrangler.toml"), "utf8");
const KEY = "test-key";
const ON = { MODE: "on", ORIGIN_KEY: KEY };

const ask = (url, env = ON, { method = "GET", headers = {} } = {}) => decide({ url: new URL(url), method, headers: new Headers(headers) }, env);

/* ------------------------------ 1) 주소 변환 ------------------------------ */

test("영어 주소는 같은 글의 새 주소로 간다", () => {
  const cases = {
    "https://hub.xconda.ai/en": "https://www.xconda.ai/hub/",
    "https://hub.xconda.ai/en/": "https://www.xconda.ai/hub/",
    "https://hub.xconda.ai/en/qna/": "https://www.xconda.ai/hub/qna/",
    "https://hub.xconda.ai/en/qna/commercial-use/": "https://www.xconda.ai/hub/qna/commercial-use/",
    "https://hub.xconda.ai/en/sitemap.xml": "https://www.xconda.ai/hub/sitemap.xml",
    "https://hub.xconda.ai/en/notion-content.json": "https://www.xconda.ai/hub/notion-content.json",
  };
  for (const [from, to] of Object.entries(cases)) {
    assert.deepEqual(ask(from), { action: "redirect", state: "301", location: to }, from);
  }
});

test("쿼리는 그대로 넘긴다 (공유 링크의 UTM 보존)", () => {
  assert.equal(ask("https://hub.xconda.ai/en/post/abc/?utm_source=x&utm_medium=social").location, "https://www.xconda.ai/hub/post/abc/?utm_source=x&utm_medium=social");
});

test("끝 슬래시 없는 글 주소·index.html 은 대표 주소로 한 번에 보낸다", () => {
  assert.equal(ask("https://hub.xconda.ai/en/qna/commercial-use").location, "https://www.xconda.ai/hub/qna/commercial-use/");
  assert.equal(ask("https://hub.xconda.ai/en/qna/commercial-use?a=1").location, "https://www.xconda.ai/hub/qna/commercial-use/?a=1");
  assert.equal(ask("https://hub.xconda.ai/en/index.html").location, "https://www.xconda.ai/hub/");
  assert.equal(ask("https://hub.xconda.ai/en/post/abc/index.html").location, "https://www.xconda.ai/hub/post/abc/");
  // 점이 들어간 글 주소(버전 번호)는 파일로 보지 않습니다.
  assert.equal(restOf("/en/notice/seedance-2.5"), "notice/seedance-2.5/");
});

test("어떤 주소를 넣어도 새 주소(www.xconda.ai/hub/) 밖으로 나가지 않는다", () => {
  for (const from of ["https://hub.xconda.ai/en//evil.example/", "https://hub.xconda.ai/en/%2F%2Fevil.example/", "https://hub.xconda.ai/en/..%2F..%2Fpricing", "https://hub.xconda.ai/en/\\\\evil.example"]) {
    const verdict = ask(from);
    if (verdict.action !== "redirect") continue; // `..` 로 /en 밖이 된 주소는 대상이 아닙니다
    const to = new URL(verdict.location);
    assert.equal(to.origin, "https://www.xconda.ai", from);
    assert.ok(to.pathname.startsWith("/hub/"), `${from} → ${verdict.location}`);
  }
});

/* ------------------------------ 2) 통과 조건 ------------------------------ */

test("영어가 아닌 주소는 건드리지 않는다", () => {
  for (const from of ["https://hub.xconda.ai/", "https://hub.xconda.ai/qna/refund/", "https://hub.xconda.ai/ja/", "https://hub.xconda.ai/zh/qna/", "https://hub.xconda.ai/english/", "https://hub.xconda.ai/entry", "https://hub.xconda.ai/assets/app.js"]) {
    assert.equal(ask(from).state, "pass:path", from);
  }
  // 다른 호스트(workers.dev 미리보기 등)에서는 아무 것도 하지 않습니다.
  assert.equal(ask("https://xconda-hub-en-redirect.example.workers.dev/en/").state, "pass:host");
});

test("영어 폴더 자산은 301 하지 않는다 (새 주소에는 /hub/assets/ 가 없다)", () => {
  assert.deepEqual(ask("https://hub.xconda.ai/en/assets/img/logo/xconda-mark.svg"), { action: "pass", state: "pass:assets" });
});

test("GET·HEAD 가 아니면 통과시킨다", () => {
  assert.equal(ask("https://hub.xconda.ai/en/", ON, { method: "POST" }).state, "pass:method");
  assert.equal(ask("https://hub.xconda.ai/en/", ON, { method: "HEAD" }).action, "redirect");
});

test("프록시 요청(키가 맞음)은 통과시킨다 — 무한 반복 방지", () => {
  assert.deepEqual(ask("https://hub.xconda.ai/en/qna/", ON, { headers: { [KEY_HEADER]: KEY } }), { action: "pass", state: "bypass:key" });
  // 키가 틀리거나, ORIGIN_KEY 를 안 넣었는데 빈 헤더가 온 경우는 통과가 아닙니다.
  assert.equal(ask("https://hub.xconda.ai/en/qna/", ON, { headers: { [KEY_HEADER]: "wrong" } }).action, "redirect");
  assert.equal(ask("https://hub.xconda.ai/en/qna/", { MODE: "on" }, { headers: { [KEY_HEADER]: "" } }).action, "redirect");
});

test("x-forwarded-host 로도 프록시를 알아볼 수 있다 (설정했을 때만)", () => {
  const headers = { "x-forwarded-host": "www.xconda.ai" };
  assert.equal(ask("https://hub.xconda.ai/en/", { MODE: "on" }, { headers }).action, "redirect");
  assert.equal(ask("https://hub.xconda.ai/en/", { MODE: "on", BYPASS_FORWARDED_HOSTS: "www.xconda.ai, xconda.ai" }, { headers }).state, "bypass:forwarded-host");
  assert.equal(ask("https://hub.xconda.ai/en/", { MODE: "on", BYPASS_FORWARDED_HOSTS: "www.xconda.ai" }, { headers: { "x-forwarded-host": "other.example" } }).action, "redirect");
});

/* ------------------------------ 3) 단계 ------------------------------ */

test("MODE 를 안 넣으면 observe — 301 을 내지 않고 '냈을 것' 만 알린다", () => {
  for (const env of [{}, { MODE: "" }, { MODE: "ON" }, { MODE: "observe" }]) {
    const verdict = ask("https://hub.xconda.ai/en/qna/?a=1", env, { headers: { "x-forwarded-host": "www.xconda.ai" } });
    assert.equal(verdict.action, "pass");
    assert.equal(verdict.state, "observe; would=301; xfh=www.xconda.ai");
    assert.equal(verdict.location, "https://www.xconda.ai/hub/qna/?a=1");
  }
  assert.equal(ask("https://hub.xconda.ai/en/", {}).state, "observe; would=301; xfh=-");
  assert.deepEqual(ask("https://hub.xconda.ai/en/", { MODE: "off" }), { action: "pass", state: "off" });
});

test("301 응답은 캐시 기한을 갖는다 (없으면 브라우저가 계속 기억해 되돌릴 수 없다)", async () => {
  const res = await worker.fetch(new Request("https://hub.xconda.ai/en/qna/"), ON);
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), "https://www.xconda.ai/hub/qna/");
  assert.equal(res.headers.get("cache-control"), `public, max-age=${REDIRECT_CACHE_SECONDS}`);
  assert.ok(REDIRECT_CACHE_SECONDS <= 86400, "하루를 넘기지 않습니다");
});

/* ------------------------------ 4) 설정 일치 ------------------------------ */

test("Worker 의 새 주소는 영어 허브 스위치와 같다", () => {
  const mode = /^MODE\s*=\s*"([^"]*)"/m.exec(wrangler)?.[1];
  assert.ok(["observe", "on", "off"].includes(mode), `wrangler.toml 의 MODE 값이 이상합니다: ${mode}`);
  if (LOCALE_BASE_URLS.en) {
    assert.equal(TARGET_BASE, LOCALE_BASE_URLS.en, "영어 허브 주소(src/content/seo.js › LOCALE_BASE_URLS.en)와 Worker 의 TARGET_BASE 가 다릅니다");
  } else {
    // 스위치를 끄면 영어의 대표 주소가 다시 hub.xconda.ai/en/ 입니다 — 301 이 켜져 있으면 대표 주소로 갈 수 없습니다.
    assert.notEqual(mode, "on", '영어 허브 스위치를 껐습니다. hub-redirect-worker/wrangler.toml 의 MODE 를 "off" 로 바꿔 **먼저 배포**하세요');
  }
});

test("wrangler.toml — 영어 폴더에만 걸고, 비밀값은 적지 않는다", () => {
  const patterns = [...wrangler.matchAll(/pattern\s*=\s*"([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(patterns, ["hub.xconda.ai/en", "hub.xconda.ai/en/*"], "한국어·일본어·중국어·자산까지 Worker 를 거치게 하지 않습니다");
  assert.doesNotMatch(wrangler, /^\s*ORIGIN_KEY\s*=/m, "ORIGIN_KEY 는 `wrangler secret put` 으로만 넣습니다");
  assert.match(wrangler, /^workers_dev\s*=\s*false/m);
});

test("package.json 에 점검 명령이 있다", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.equal(pkg.scripts["redirect:check"], "node scripts/check-en-301.mjs");
  assert.match(pkg.scripts["test:unit"], /scripts\/hub-redirect-worker\.test\.mjs/);
});

/* ------------------------------ 5) 점검 스크립트 (가짜 네트워크) ------------------------------ */

/**
 * 실제 구성을 그대로 흉내 냅니다.
 *   hub.xconda.ai      GitHub Pages(원본). `/en` · `/en/*` 는 Worker 를 거칩니다(deployed 일 때).
 *   www.xconda.ai/hub  제품 사이트 프록시 — hub.xconda.ai/en/* 를 가져오고, Location 은 /hub/… 로 고칩니다.
 */
function fakeNetwork({ deployed = true, env = {}, proxyHeaders = {}, passHeaders = true } = {}) {
  const pages = new Set(["/", "/ja/", "/zh/", "/en/", "/en/qna/", "/en/qna/sample/", "/en/sitemap.xml", "/en/assets/img/logo.svg"]);
  const origin = async (request) => {
    const { pathname } = new URL(request.url);
    if (pages.has(pathname)) return new Response(`page ${pathname}`, { status: 200, headers: { "content-type": "text/html" } });
    if (pages.has(`${pathname}/`)) return new Response(null, { status: 301, headers: { location: `https://hub.xconda.ai${pathname}/` } });
    return new Response("not found", { status: 404 });
  };
  const hub = async (request) => {
    const { pathname } = new URL(request.url);
    const routed = deployed && (pathname === "/en" || pathname.startsWith("/en/"));
    if (!routed) return origin(request);
    const realFetch = globalThis.fetch;
    globalThis.fetch = origin; // Worker 안의 fetch(request) = 원본(GitHub Pages)
    try {
      return await worker.fetch(request, env);
    } finally {
      globalThis.fetch = realFetch;
    }
  };
  const www = async (request) => {
    const url = new URL(request.url);
    if (url.pathname === "/hub") return new Response(null, { status: 301, headers: { location: "/hub/" } });
    const rest = url.pathname.slice("/hub/".length);
    const res = await hub(new Request(`https://hub.xconda.ai/en/${rest}${url.search}`, { headers: proxyHeaders }));
    const location = res.headers.get("location");
    if (location) {
      const next = new URL(location, "https://hub.xconda.ai");
      const moved = next.hostname === "hub.xconda.ai" ? `/hub/${next.pathname.slice("/en/".length)}${next.search}` : `${next.pathname}${next.search}`;
      return new Response(null, { status: 301, headers: { location: moved } });
    }
    return new Response(res.body, { status: res.status, headers: passHeaders ? res.headers : {} });
  };
  return async (input, init) => {
    const request = new Request(input, { ...init, redirect: "manual" });
    const url = new URL(request.url);
    if (url.hostname === "hub.xconda.ai") return hub(request);
    if (url.hostname === "www.xconda.ai" && url.pathname.startsWith("/hub")) return www(request);
    throw new Error(`가짜 네트워크에 없는 주소: ${request.url}`);
  };
}

const check = (network) => runChecks({ fetchImpl: fakeNetwork(network), article: "qna/sample/", asset: "assets/img/logo.svg" });
const failures = (out) => out.results.filter((r) => !r.ok).map((r) => `${r.label} — ${r.detail}`);

test("점검: Worker 가 없으면 '없음' 으로 실패한다", async () => {
  const out = await check({ deployed: false });
  assert.equal(out.stage, "none");
  assert.equal(out.failed, 1);
  assert.match(failures(out)[0], /주황 구름/);
});

test("점검(observe): 프록시가 키를 보내면 '켜도 안전' — 301 은 아직 안 나간다", async () => {
  const out = await check({ env: { MODE: "observe", ORIGIN_KEY: KEY }, proxyHeaders: { [KEY_HEADER]: KEY } });
  assert.equal(out.stage, "observe");
  assert.deepEqual(failures(out), []);
});

test("점검(observe): 프록시가 키를 안 보내면 켜기 전에 잡아낸다", async () => {
  const out = await check({ env: { MODE: "observe", ORIGIN_KEY: KEY }, proxyHeaders: { "x-forwarded-host": "www.xconda.ai" } });
  assert.equal(out.stage, "observe");
  assert.equal(out.failed, 1);
  assert.match(failures(out)[0], /통과로 인식되지 않음.*xfh=www\.xconda\.ai.*무한 반복/);
});

test("점검(observe): 프록시가 응답 헤더를 넘기지 않으면 '알 수 없음' 으로 실패한다(안전한 쪽)", async () => {
  const out = await check({ env: { MODE: "observe", ORIGIN_KEY: KEY }, proxyHeaders: { [KEY_HEADER]: KEY }, passHeaders: false });
  assert.equal(out.failed, 1);
  assert.match(failures(out)[0], /알 수 없음.*wrangler tail/);
});

test("점검(on): 정상 구성은 전부 통과한다", async () => {
  for (const network of [
    { env: ON, proxyHeaders: { [KEY_HEADER]: KEY } },
    { env: ON, proxyHeaders: { [KEY_HEADER]: KEY }, passHeaders: false },
    { env: { MODE: "on", BYPASS_FORWARDED_HOSTS: "www.xconda.ai" }, proxyHeaders: { "x-forwarded-host": "www.xconda.ai" } },
  ]) {
    const out = await check(network);
    assert.equal(out.stage, "on");
    assert.deepEqual(failures(out), []);
    assert.ok(out.results.length >= 11, "켠 뒤 검사가 빠짐없이 돌아야 합니다");
  }
});

test("점검(on): 통과 표식 없이 켜면 무한 반복을 보고한다", async () => {
  const out = await check({ env: ON, proxyHeaders: {} });
  assert.equal(out.stage, "on");
  const text = failures(out).join("\n");
  assert.match(text, /가 200 \(리다이렉트 아님\).*301 → https:\/\/www\.xconda\.ai\/hub\/.*무한 반복.*MODE = "off"/);
  assert.match(text, /새 주소의 글이 200/);
});

test("점검(off): 꺼져 있으면 꺼졌다고 알린다", async () => {
  const out = await check({ env: { MODE: "off" } });
  assert.equal(out.stage, "off");
  assert.equal(out.failed, 1);
});

test("점검에 쓰는 표본은 저장소에 실제로 있는 영어 글·자산이다", () => {
  const article = sampleArticle();
  assert.match(article, /^(qna|post|notice)\/[^/]+\/$/);
  assert.ok(fs.existsSync(path.join(ROOT, "en", article, "index.html")));
  const asset = sampleAsset();
  assert.match(asset, /^assets\//);
  assert.ok(fs.existsSync(path.join(ROOT, "en", asset)));
  assert.equal(decide({ url: new URL(`https://hub.xconda.ai/en/${asset}`), headers: new Headers() }, ON).state, "pass:assets");
  assert.equal(STATE_HEADER, "x-hub-redirect");
});

/* ------------------------------ 6) 지금 배포 가능한가 ------------------------------ */

test("301 Worker 는 아직 배포할 수 없다 — DNS 가 Route 53 이고, 그동안은 canonical + 브라우저 이동만 돈다", () => {
  // 이 값이 false 인 동안에는 배포 절차를 안내하지 않습니다(안내하면 실행 불가한 순서를 따르게 됩니다).
  // 앞단이 정해져(CloudFront · Cloudflare Pages 이전) DNS 를 옮길 수 있게 되면
  // check-en-301.mjs 의 WORKER_DEPLOYABLE 을 true 로 바꾸고 이 테스트도 함께 고칩니다.
  assert.equal(WORKER_DEPLOYABLE, false);
  // 서버 301 이 없다는 사실을 코드가 말해 줍니다 — 크롤러는 200 을 받고 JS 는 돌지 않습니다.
  assert.deepEqual(CURRENT_FALLBACK, {
    serverRedirect: false,
    mechanism: "canonical + data-hub-moved (브라우저 JS 이동)",
    affectsCrawlers: false,
  });
  // wrangler 라우트는 Cloudflare 존을 전제합니다 — DNS 를 옮기기 전에는 배포할 수 없습니다.
  assert.match(wrangler, /zone_name = "xconda\.ai"/);
});
