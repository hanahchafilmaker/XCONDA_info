#!/usr/bin/env node
/**
 * 영어 예전 주소 301 점검 — hub.xconda.ai/en/* → www.xconda.ai/hub/*
 * (Worker: hub-redirect-worker/worker.js · 순서: reports/en-hub-subdirectory-handoff-20261114.md › 5-2)
 *
 *   npm run redirect:check
 *   node scripts/check-en-301.mjs --hub=https://hub.xconda.ai/ --www=https://www.xconda.ai/hub/
 *
 * Worker 의 상태(응답 헤더 `x-hub-redirect`)를 읽어 단계에 맞는 검사를 합니다.
 *   observe  301 을 **켜도 되는지** — 제품 사이트 프록시가 "통과" 로 인식되는가(아니면 켜는 순간 무한 반복)
 *   on       실제 301 — 새 주소·쿼리 유지·한 번에 이동·자산·다른 언어·새 주소가 200 인가
 * 전부 통과하면 0, 하나라도 실패하면 1 로 끝납니다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE_HEADER = "x-hub-redirect";
const slash = (u) => String(u).replace(/\/*$/, "/");

/** 저장소에 실제로 있는 영어 글 하나(끝 `/` 포함 경로). 없으면 목록 주소. */
export function sampleArticle(dir = path.join(root, "en")) {
  for (const section of ["qna", "post", "notice"]) {
    const base = path.join(dir, section);
    if (!fs.existsSync(base)) continue;
    const slug = fs.readdirSync(base).sort().find((n) => fs.existsSync(path.join(base, n, "index.html")));
    if (slug) return `${section}/${slug}/`;
  }
  return "qna/";
}

/** 저장소에 실제로 있는 영어 폴더 자산 하나(`assets/…`). */
export function sampleAsset(dir = path.join(root, "en")) {
  const walk = (d) => {
    for (const entry of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)) : []) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        const hit = walk(full);
        if (hit) return hit;
      } else return full;
    }
    return "";
  };
  const hit = walk(path.join(dir, "assets"));
  return hit ? path.relative(dir, hit).split(path.sep).join("/") : "";
}

/**
 * @param {{ hub?: string, www?: string, fetchImpl?: typeof fetch, article?: string, asset?: string }} options
 * @returns {Promise<{ stage: "none" | "off" | "observe" | "on", results: { ok: boolean, label: string, detail: string }[], failed: number }>}
 */
export async function runChecks({ hub = "https://hub.xconda.ai/", www = "https://www.xconda.ai/hub/", fetchImpl = fetch, article = sampleArticle(), asset = sampleAsset() } = {}) {
  hub = slash(hub);
  www = slash(www);
  const results = [];
  const report = (ok, label, detail = "") => results.push({ ok: Boolean(ok), label, detail: ok ? "" : detail });
  const done = (stage) => ({ stage, results, failed: results.filter((r) => !r.ok).length });
  // 캐시된 응답을 보지 않도록 주소마다 다른 쿼리를 붙입니다(쿼리가 새 주소로 넘어가는지도 함께 봅니다).
  const stamp = `check=${Date.now().toString(36)}`;
  const get = async (url) => {
    try {
      const res = await fetchImpl(url, { redirect: "manual", headers: { "user-agent": "xconda-hub-301-check" } });
      const location = res.headers.get("location") ?? "";
      return { status: res.status, state: res.headers.get(STATE_HEADER) ?? "", location: location ? new URL(location, url).href : "", cache: res.headers.get("cache-control") ?? "" };
    } catch (error) {
      return { status: 0, state: "", location: "", cache: "", error: String(error?.cause?.code ?? error?.message ?? error) };
    }
  };
  const seen = (r) => (r.error ? r.error : `${r.status}${r.location ? ` → ${r.location}` : ""}${r.state ? ` [${r.state}]` : ""}`);

  // ── 지금 어느 단계인가 ──
  const home = await get(`${hub}en/?${stamp}`);
  const stage = home.status === 301 && home.state === "301" ? "on" : home.state.startsWith("observe") ? "observe" : home.state === "off" ? "off" : "none";
  if (home.error) {
    report(false, `${hub}en/ 에 접속하지 못했습니다`, `${home.error} — 네트워크·주소를 확인하세요(Worker 상태는 알 수 없습니다)`);
    return done("none");
  }
  if (stage === "none") {
    report(false, `${hub}en/ 에서 Worker 가 보이지 않습니다`, `${seen(home)} — 응답에 ${STATE_HEADER} 헤더가 없습니다. Cloudflare DNS 의 hub 레코드가 프록시(주황 구름)인지, Worker 라우트(hub.xconda.ai/en · /en/*)가 걸렸는지 확인하세요`);
    return done(stage);
  }
  if (stage === "off") {
    report(false, "301 이 꺼져 있습니다 (MODE = off)", "켜려면 wrangler.toml 의 MODE 를 observe → on 순서로 바꿔 배포하세요");
    return done(stage);
  }

  // ── 두 단계 공통: 제품 사이트 프록시가 '통과' 로 인식되는가 (무한 반복 방지) ──
  const proxied = await get(`${www}?${stamp}`);
  report(proxied.status === 200, `${www} 가 200 (리다이렉트 아님)`, `${seen(proxied)} — 프록시가 원본을 가져오는 요청이 301 되고 있습니다(무한 반복). 즉시 MODE = "off" 로 배포하세요`);
  if (proxied.status === 200) {
    if (proxied.state.startsWith("bypass:")) report(true, `프록시 요청이 통과로 인식됨 [${proxied.state}]`);
    else if (proxied.state) report(false, "프록시 요청이 통과로 인식되지 않음", `[${proxied.state}] — 이 상태로 켜면 무한 반복입니다. 프록시가 x-hub-origin-key 를 보내는지(값이 ORIGIN_KEY 와 같은지) 확인하세요. xfh= 뒤 값이 www.xconda.ai 이면 BYPASS_FORWARDED_HOSTS 로도 됩니다`);
    else report(stage === "on", "프록시 요청 인식 여부를 알 수 없음", `제품 사이트 응답에 ${STATE_HEADER} 헤더가 없습니다(프록시가 원본 헤더를 넘기지 않음). 켜기 전에 \`npx wrangler tail\` 로 www.xconda.ai/hub/ 요청이 bypass 로 찍히는지 직접 확인하세요`);
  }

  // ── 두 단계 공통: 손대면 안 되는 주소 ──
  if (asset) {
    const a = await get(`${hub}en/${asset}`);
    report(a.status === 200 && a.state === "pass:assets", `영어 폴더 자산은 그대로 (en/${asset})`, seen(a));
  }
  for (const rel of ["", "ja/", "zh/"]) {
    const r = await get(`${hub}${rel}`);
    report(r.status === 200 && !r.state, `${hub}${rel} 는 Worker 를 거치지 않음`, seen(r));
  }

  if (stage === "observe") {
    report(home.status === 200, `${hub}en/ 는 아직 200 (관찰 단계)`, seen(home));
    return done(stage);
  }

  // ── 켠 뒤: 실제 301 ──
  report(home.location === `${www}?${stamp}`, `${hub}en/ → ${www} (쿼리 유지)`, seen(home));
  report(/max-age=\d+/.test(home.cache), "301 에 캐시 기한이 있음 (되돌릴 수 있게)", `cache-control: ${home.cache || "(없음)"} — 기한이 없으면 브라우저가 301 을 계속 기억합니다`);
  const bare = await get(`${hub}en`);
  report(bare.status === 301 && bare.location === www, `${hub}en (끝 슬래시 없음) → ${www}`, seen(bare));
  const post = await get(`${hub}en/${article}?utm_source=check&${stamp}`);
  report(post.status === 301 && post.location === `${www}${article}?utm_source=check&${stamp}`, `글 주소 → 같은 글의 새 주소 (en/${article})`, seen(post));
  const noSlash = article.replace(/\/$/, "");
  if (noSlash !== article) {
    const r = await get(`${hub}en/${noSlash}`);
    report(r.status === 301 && r.location === `${www}${article}`, `끝 슬래시 없는 글 주소도 한 번에 (en/${noSlash})`, seen(r));
  }
  const landed = await get(`${www}${article}?${stamp}`);
  report(landed.status === 200, `새 주소의 글이 200 (${www}${article})`, seen(landed));
  const map = await get(`${hub}en/sitemap.xml`);
  report(map.status === 301 && map.location === `${www}sitemap.xml`, "영어 사이트맵 → 새 주소", seen(map));
  return done(stage);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const { stage, results, failed } = await runChecks({ hub: arg("hub"), www: arg("www") });
  console.log(`단계: ${{ none: "확인 불가 / Worker 없음", off: "꺼짐", observe: "관찰(observe) — 301 은 아직 안 나갑니다", on: "켜짐(on)" }[stage]}\n`);
  for (const r of results) console.log(`${r.ok ? "✅" : "❌"} ${r.label}${r.detail ? ` — ${r.detail}` : ""}`);
  if (failed) console.log(`\n${failed}건 실패.`);
  else console.log(stage === "observe" ? '\n켜도 안전합니다 → hub-redirect-worker/wrangler.toml 의 MODE 를 "on" 으로 바꿔 배포한 뒤 다시 실행하세요.' : "\n301 이 정상 동작합니다.");
  process.exit(failed ? 1 : 0);
}
