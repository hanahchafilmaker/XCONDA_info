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

// 사이트맵 (스위치를 켠 뒤에만 생깁니다 — 켜기 전에는 404 가 정상)
try {
  const res = await get(`${base}sitemap.xml`);
  if (res.status === 200) report((await res.text()).includes(`<loc>${base}`), `${base}sitemap.xml`);
  else console.log(`ℹ️  ${base}sitemap.xml — ${res.status} (스위치를 켜기 전이면 정상)`);
} catch (error) {
  report(false, `${base}sitemap.xml`, String(error?.message ?? error));
}

console.log(failed ? `\n❌ ${failed}건 실패 — 스위치를 켜지 마세요.` : "\n✅ 프록시 준비됨 — 스위치를 켜도 됩니다.");
process.exit(failed ? 1 : 0);
