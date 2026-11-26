/**
 * 허브 규칙 점검(`npm run hub:headers`) 회귀 방지 — 2026-11-26
 *
 * 실제 네트워크 없이 **가짜 서버**로 판정 로직을 고정합니다.
 *   1) 정상(200 + 짧은 캐시 + noindex 없음 + 자산 content-type 정상) → 위반 0
 *   2) 의도하지 않은 리다이렉트 · WAF 차단 · noindex · 긴 캐시 · 자산이 HTML → 각각 잡아냄
 *   3) 연결이 끊기는 환경(샌드박스) → "서버 규칙 문제"가 아니라 **네트워크 차단**으로 보고
 */
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { cacheSeconds, networkBlocked, targets, sampleEnPath } from "./check-hub-headers.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

test("대상 주소 목록에 홈·언어·영어 예전 주소·자산·IndexNow key 가 들어 있다", () => {
  const list = targets().map((t) => t.rel);
  for (const need of ["", "qna/", "ja/", "zh/", "robots.txt", "llms.txt", "sitemap.xml", "notion-content.json", "assets/app.js", "assets/app.css"]) {
    assert.ok(list.includes(need), need);
  }
  // 영어는 **예전 주소**(en/…)로 점검합니다 — 301 을 켜기 전에는 200 이어야 합니다.
  assert.ok(list.some((r) => r.startsWith("en/") && r !== "en/"), "en/ 하위 글이 대상에 없습니다");
  // IndexNow key 파일은 파일명이 곧 키입니다(scripts/indexnow.mjs 와 같은 규칙).
  assert.ok(list.includes("b431e2c7231b6a5e01aa9e2b8402d0ec.txt"));
  // 모든 항목에 사람이 읽을 label 이 있어야 보고가 읽힙니다.
  for (const t of targets()) assert.ok(t.label, `label 없음: ${t.rel}`);
  // 저장소에 있는 실제 영어 글을 골라야 404 를 점검하지 않습니다.
  assert.match(sampleEnPath(), /^qna\/(?:.*\/)?$/);
});

test("캐시 TTL 을 정확히 읽는다", () => {
  const h = (cc) => new Headers(cc ? { "cache-control": cc } : {});
  assert.equal(cacheSeconds(h("public, max-age=300, s-maxage=600")), 600);
  assert.equal(cacheSeconds(h("public, max-age=300")), 300);
  assert.equal(cacheSeconds(h("no-store")), 0);
  assert.equal(cacheSeconds(h("private, max-age=60")), 0);
  assert.equal(cacheSeconds(h("")), null);
});

test("연결 실패는 '네트워크 차단'으로 분류한다 (서버 규칙 문제와 구분)", () => {
  for (const code of ["ECONNRESET", "ENOTFOUND", "ETIMEDOUT", "ECONNREFUSED", "UNABLE_TO_VERIFY_LEAF_SIGNATURE"]) {
    assert.equal(networkBlocked({ cause: { code } }), true, code);
  }
  assert.equal(networkBlocked({ cause: { code: "ERR_INVALID_URL" } }), false);
  assert.equal(networkBlocked(new Error("boom")), false);
});

/** 점검 대상 주소마다 "정상" 응답을 돌려주는 가짜 허브. */
function healthyHandler(overrides = {}) {
  return (req, res) => {
    const url = req.url.split("?")[0];
    if (overrides[url]) return overrides[url](req, res);
    const type = url.endsWith(".json")
      ? "application/json"
      : url.endsWith(".js")
        ? "text/javascript"
        : url.endsWith(".css")
          ? "text/css"
          : url.endsWith(".png")
            ? "image/png"
            : url.endsWith(".xml")
              ? "application/xml"
              : url.endsWith(".txt")
                ? "text/plain"
                : "text/html";
    const body = url.endsWith(".json")
      ? JSON.stringify({ rows: [] })
      : url.endsWith(".txt")
        ? "b431e2c7231b6a5e01aa9e2b8402d0ec"
        : "<html><title>ok</title></html>";
    res.writeHead(200, { "content-type": type, "cache-control": "public, max-age=300" });
    res.end(body);
  };
}

/** 가짜 서버를 띄우고 점검 스크립트를 실행합니다. (스크립트는 비동기 실행 — 서버가 응답해야 함) */
async function check(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}/`;
  try {
    // 위반이 있으면 스크립트는 exit 1 로 끝납니다 — 출력은 그대로 받습니다.
    const { stdout } = await new Promise((resolve) => {
      execFile(
        process.execPath,
        ["scripts/check-hub-headers.mjs", base, "--json"],
        { cwd: ROOT, timeout: 60000 },
        // exit 코드(위반 시 1)와 무관하게 출력만 받습니다.
        (error, out) => resolve({ stdout: out ?? "", code: error?.code ?? 0 }),
      );
    });
    assert.ok(stdout.trim(), "점검 스크립트가 아무 것도 출력하지 않았습니다");
    return JSON.parse(stdout);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("정상 허브 — 응답으로 드러난 리다이렉트·차단·noindex·캐시 문제가 없다", async () => {
  const report = await check(healthyHandler());
  assert.equal(report.networkBlocked, false);
  const failed = report.results.filter((r) => !r.ok && r.level === "fail");
  assert.deepEqual(failed.map((r) => `${r.label}: ${r.detail}`), []);
  // 영어 예전 주소는 지금 JS 이동 상태 — 보고에 남아야 합니다(301 아님).
  const moved = report.results.find((r) => r.label === "영어 예전 주소 이동 방식");
  assert.ok(moved, "이동 방식 항목이 없습니다");
});

test("규칙이 걸려 있으면 각각 잡아낸다 (리다이렉트 · WAF · noindex · 긴 캐시 · 자산이 HTML)", async () => {
  const report = await check(
    healthyHandler({
      "/": (req, res) => {
        res.writeHead(301, { location: "/ko/" });
        res.end();
      },
      "/ja/": (req, res) => {
        res.writeHead(403);
        res.end("blocked");
      },
      "/zh/": (req, res) => {
        res.writeHead(200, { "content-type": "text/html", "x-robots-tag": "noindex" });
        res.end("<html></html>");
      },
      "/qna/": (req, res) => {
        res.writeHead(200, { "content-type": "text/html", "cache-control": "public, max-age=86400" });
        res.end("<html></html>");
      },
      "/assets/app.js": (req, res) => {
        res.writeHead(200, { "content-type": "text/html" });
        res.end("<html></html>");
      },
    }),
  );
  const fails = report.results.filter((r) => !r.ok && r.level === "fail").map((r) => r.label);
  assert.ok(fails.some((l) => l.startsWith("홈")), `리다이렉트를 못 잡았습니다: ${fails}`);
  assert.ok(fails.some((l) => l.startsWith("일본어 홈")), `WAF 차단을 못 잡았습니다: ${fails}`);
  assert.ok(fails.some((l) => l.includes("noindex")), `noindex 를 못 잡았습니다: ${fails}`);
  assert.ok(fails.some((l) => l.startsWith("앱 번들(JS)")), `자산이 HTML 인 것을 못 잡았습니다: ${fails}`);
  const warns = report.results.filter((r) => !r.ok && r.level === "warn").map((r) => r.label);
  assert.ok(warns.some((l) => l.startsWith("Q&A 목록")), `긴 캐시를 경고하지 않았습니다: ${warns}`);
});

