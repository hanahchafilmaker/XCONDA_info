#!/usr/bin/env node
/**
 * 영어 허브 프록시 점검 — 스위치(src/content/seo.js › LOCALE_BASE_URLS.en)를 켜기 **전에** 돌립니다.
 *
 *   node scripts/check-en-proxy.mjs                      # https://www.xconda.ai/hub/ 점검
 *   node scripts/check-en-proxy.mjs https://xconda.ai/hub/
 *
 * 확인하는 것: 새 주소가 리다이렉트 없이 200 으로 열리는가 · 허브의 영어 페이지와 같은 내용인가 ·
 * 끝 슬래시 없는 주소가 슬래시 있는 **새 주소**로 가는가 · 사이트맵이 열리는가.
 * 전부 통과하면 0, 하나라도 실패하면 1 로 끝납니다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = (process.argv[2] ?? "https://www.xconda.ai/hub/").replace(/\/*$/, "/");
const ORIGIN = "https://hub.xconda.ai/en/";

// 점검할 경로: 홈 · 목록 · 저장소에 있는 영어 글 두 개
const samples = ["", "qna/"];
for (const section of ["post", "notice", "qna"]) {
  const dir = path.join(root, "en", section);
  if (!fs.existsSync(dir)) continue;
  const slug = fs.readdirSync(dir).find((n) => fs.existsSync(path.join(dir, n, "index.html")));
  if (slug) samples.push(`${section}/${slug}/`);
}

let failed = 0;
const report = (ok, label, detail = "") => {
  if (!ok) failed += 1;
  console.log(`${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const titleOf = (html) => (html.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? "";
const get = (url) => fetch(url, { redirect: "manual", headers: { "user-agent": "xconda-hub-proxy-check" } });

for (const rel of samples) {
  const url = `${base}${rel}`;
  try {
    const [proxied, origin] = await Promise.all([get(url), get(`${ORIGIN}${rel}`)]);
    if (proxied.status !== 200) {
      report(false, url, `상태 ${proxied.status}${proxied.headers.get("location") ? ` → ${proxied.headers.get("location")}` : ""} (리다이렉트 없이 200 이어야 합니다)`);
      continue;
    }
    const [a, b] = [await proxied.text(), await origin.text()];
    report(titleOf(a) !== "" && titleOf(a) === titleOf(b), url, titleOf(a) === titleOf(b) ? "" : `제목이 허브와 다릅니다: "${titleOf(a)}" ≠ "${titleOf(b)}"`);
    const type = proxied.headers.get("content-type") ?? "";
    if (!/text\/html/.test(type)) report(false, `${url} content-type`, type);
    if (/noindex/i.test(proxied.headers.get("x-robots-tag") ?? "")) report(false, `${url} x-robots-tag`, "noindex 가 붙어 있습니다");
  } catch (error) {
    report(false, url, String(error?.cause?.code ?? error?.message ?? error));
  }
}

// 끝 슬래시 없는 주소 → 슬래시 있는 새 주소 (hub.xconda.ai/en/ 로 새면 안 됩니다)
try {
  const bare = base.replace(/\/$/, "");
  const res = await get(bare);
  const location = res.headers.get("location") ?? "";
  const target = location ? new URL(location, bare).href : "";
  report(res.status === 200 || ([301, 308].includes(res.status) && target === base), `${bare} (끝 슬래시 없음)`, res.status === 200 ? "" : `${res.status} → ${target || "?"}`);
} catch (error) {
  report(false, "끝 슬래시 없는 주소", String(error?.message ?? error));
}

// 홈·목록이 허브 앱으로 튕기지 않는가 (2026-11-17 회귀)
//   영어 홈·목록에 `data-hub-entry`(= `/?lang=en` 으로 보내는 스크립트)가 남아 있으면,
//   주소창이 `www.xconda.ai/?lang=en` — 즉 **제품 사이트 첫 화면**으로 바뀝니다.
//   스위치(LOCALE_BASE_URLS.en)를 켜면 그 스크립트가 빠지므로, 이 검사가 그 상태를 지킵니다.
for (const rel of ["", "qna/"]) {
  try {
    const res = await get(`${base}${rel}`);
    if (res.status !== 200) continue; // 위 검사에서 이미 실패로 기록됨
    const html = await res.text();
    report(!/data-hub-entry/.test(html), `${base}${rel} 허브 앱 이동 없음`, "data-hub-entry 가 남아 있어 제품 사이트 첫 화면(/?lang=en)으로 튕깁니다 — 스위치를 켜고 빌드했는지 확인");
  } catch (error) {
    report(false, `${base}${rel} hub-entry`, String(error?.message ?? error));
  }
}

// 자산 프록시 — 이미지·CSS 자리에 HTML(앱 셸)이 오지 않는가 (2026-11-17 로고 깨짐)
//   프록시가 `/hub/*` → `hub.xconda.ai/en/*` 인데 en/ 폴더에는 원래 assets/ 가 없습니다.
//   그래서 원본 404 가 사이트 catch-all 로 떨어져 **200 + HTML** 이 이미지 자리에 들어갑니다.
//   허브 쪽에서 가벼운 자산만 en/ 에 복사해 두었지만, 본문 커버·OG 카드는 프록시 예외가 있어야 합니다.
const ASSETS = [
  ["assets/img/logo/xconda-wordmark-official.png", /^image\//],
  ["assets/img/tools/tool-flexboard.jpg", /^image\//],
  ["assets/img/og/lang/en-home.png", /^image\//],
  // 앱 번들은 프록시를 거치지 않고 원본 도메인 절대 주소로 부릅니다(그래야 404 → HTML 을 피함).
  // 여기서는 "프록시로도 받아지긴 하는지"를 보는 참고 항목입니다.
  ["assets/app.css", /^text\/css/],
];

// 스냅샷 — 이게 HTML 로 오면 앱이 스냅샷을 못 읽어 공개 프록시 폴백(최대 16초)을 탑니다.
// 영어 허브가 느리던 직접 원인이므로 프록시 점검의 필수 항목으로 둡니다.
try {
  const res = await get(`${base}notion-content.json`);
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  let ok = res.status === 200 && /^application\/json/.test(type);
  let detail = ok ? type : `${res.status} · content-type: ${type || "?"} (application/json 이어야 합니다)`;
  if (ok) {
    const data = await res.json().catch(() => null);
    ok = Boolean(data && Array.isArray(data.rows));
    if (!ok) detail = "JSON 이지만 스냅샷 형태가 아닙니다(rows 없음)";
  }
  report(ok, `${base}notion-content.json`, detail);
} catch (error) {
  report(false, `${base}notion-content.json`, String(error?.cause?.code ?? error?.message ?? error));
}
for (const [rel, expect] of ASSETS) {
  const url = `${base}${rel}`;
  try {
    const res = await get(url);
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    const ok = res.status === 200 && expect.test(type);
    report(ok, url, ok ? type : `${res.status} · content-type: ${type || "?"} (${expect.source} 이어야 합니다)`);
  } catch (error) {
    report(false, url, String(error?.cause?.code ?? error?.message ?? error));
  }
}

// 사이트맵 (스위치를 켠 뒤에만 생깁니다 — 켜기 전에는 404 가 정상)
try {
  const res = await get(`${base}sitemap.xml`);
  if (res.status === 200) report((await res.text()).includes(`<loc>${base}`), `${base}sitemap.xml`);
  else console.log(`ℹ️  ${base}sitemap.xml — ${res.status} (스위치를 켜기 전이면 정상)`);
} catch (error) {
  report(false, `${base}sitemap.xml`, String(error?.message ?? error));
}

// robots.txt — /hub/ 을 막지 않았는가 (제품 사이트 담당자에게 요청한 항목)
try {
  const origin = new URL(base).origin;
  const res = await get(`${origin}/robots.txt`);
  if (res.status === 200) {
    const txt = await res.text();
    const blocked = txt
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^(dis)?allow:\s*\/hub/i.test(line));
    report(!blocked.some((line) => /^disallow/i.test(line)), `${origin}/robots.txt — /hub/ 차단 없음`, blocked.join(", "));
  } else {
    console.log(`ℹ️  ${origin}/robots.txt — ${res.status}`);
  }
} catch (error) {
  report(false, "robots.txt", String(error?.message ?? error));
}

console.log(failed ? `\n❌ ${failed}건 실패 — 스위치를 켜지 마세요.` : "\n✅ 프록시 준비됨 — 스위치를 켜도 됩니다.");
process.exit(failed ? 1 : 0);
