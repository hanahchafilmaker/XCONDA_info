#!/usr/bin/env node
/* =============================================================================
 * 언어별 공유 카드(OG 이미지) 생성
 * -----------------------------------------------------------------------------
 *   npm run og:cards
 *
 * 왜 필요한가 — 커버 이미지가 없는 글, 언어 홈(/en/), 언어별 목록(/ja/qna/)은
 * 모두 **같은 기본 카드**(xconda-hub-1200x630.png)를 씁니다. 그래서 일본어 링크를
 * 공유해도 미리보기에 언어도 제목도 없습니다. 이 스크립트는 **그 언어의 제목으로**
 * 1200×630 카드를 그려 `assets/img/og/lang/` 에 두고 manifest 를 갱신합니다.
 * 빌드(scripts/build-seo.mjs)는 manifest 에 있으면 기본 카드보다 먼저 이 카드를 씁니다.
 *
 * 동작 순서
 *   1) 지금 저장소 상태로 한 번 빌드(node scripts/build-seo.mjs) → 페이지 HTML 확보
 *   2) 만들 페이지 찾기 — og:image 가 "기본 카드"이거나 "이전 언어 카드"인 페이지
 *      · 언어 홈(/) · /en/ · /ja/ · /zh/ · 언어별 목록(/en/qna/ …)
 *      · 글(/en/post/slug/)은 **커버가 없을 때만** (post · notice · guide · blog)
 *      · Q&A 개별 글은 만들지 않습니다(219편 × 4언어 — 목록 카드로 대신)
 *   3) 카드 렌더(python3 + Pillow + CJK 폰트) → PNG
 *   4) manifest 저장 → 다시 빌드해서 og:image 를 카드로 교체
 *
 * 폰트는 저장소에 넣지 않습니다(수 MB). 캐시에 없으면 npm 에서 한 번 받아
 * `node_modules/.cache/og-fonts/` 에 둡니다. 폰트가 없으면 **생성을 건너뛰고**
 * 기존 카드를 그대로 씁니다(빌드는 실패하지 않음).
 * ========================================================================== */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_OG_IMAGE_PATH,
  OG_LANG_DIR,
  OG_LANG_MANIFEST_PATH,
  langByCode,
  ogLangManifestKey,
} from "../../src/content/seo.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "../..");
const OUT_DIR = path.join(ROOT, OG_LANG_DIR);
const RENDERER = path.join(here, "render-og-cards.py");
const FONT_CACHE = path.join(ROOT, "node_modules/.cache/og-fonts");

/** 카드 상단 브랜드 표기 — 사이트 이름(SITE_NAME)은 한국어라 카드에서는 라틴 표기를 씁니다. */
const BRAND = "XCONDA HUB";
/** 글 카드까지 만들 섹션 — Q&A 는 편수가 많아 목록 카드로만 씁니다. */
const ARTICLE_PREFIXES = ["post", "notice", "guide", "blog"];
/** 섹션 이름(카드 상단 kicker) — 언어와 무관한 라틴 표기로 통일합니다. */
const SECTION_KICKER = { post: "POST", notice: "NOTICE", guide: "GUIDE", blog: "BLOG", qna: "Q&A" };
/** 폰트 패키지 — 저장소에 넣지 않고 필요할 때 npm 에서 받습니다. */
const FONT_PKG = {
  ko: { pkg: "@expo-google-fonts/noto-sans-kr", family: "NotoSansKR" },
  en: { pkg: "@expo-google-fonts/noto-sans", family: "NotoSans" },
  ja: { pkg: "@expo-google-fonts/noto-sans-jp", family: "NotoSansJP" },
  zh: { pkg: "@expo-google-fonts/noto-sans-sc", family: "NotoSansSC" },
};

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };
const decode = (s) => String(s ?? "").replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m);

/** 상대 경로의 `index.html` 하나를 페이지 정보로 바꿉니다. */
function pageOf(relFile) {
  const rel = relFile.replace(/\\/g, "/");
  if (!rel.endsWith("index.html")) return null;
  if (rel.startsWith("dist") || rel.startsWith("node_modules")) return null;
  const dir = rel.slice(0, -"index.html".length).replace(/\/$/, "");
  const langMatch = /^([a-z]{2})(\/|$)/.exec(dir);
  const code = langMatch && langByCode(langMatch[1]) ? langMatch[1] : "ko";
  const lang = langByCode(code);
  // `en` · `en/` 접두사를 떼고 사이트 안 경로만 남깁니다(홈은 빈 문자열).
  const prefix = lang ? lang.prefix.replace(/\/$/, "") : "";
  const inside = lang && prefix && dir.startsWith(prefix) ? dir.slice(prefix.length).replace(/^\//, "") : dir;
  return { file: rel, code, path: inside ? `${inside}/` : "" };
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name === "index.html") out.push(path.relative(ROOT, full));
  }
  return out;
}

const metaOf = (html, prop) => {
  const m = new RegExp(`<meta property="${prop}" content="([^"]*)"`).exec(html);
  return m ? decode(m[1]) : "";
};

/** 카드가 필요한 페이지인지 판단하고 카드 정보를 만듭니다. */
function planCard(page, html, defaultUrl, langCardPrefix) {
  const image = metaOf(html, "og:image");
  const usesDefault = !image || image === defaultUrl || image.startsWith(langCardPrefix);
  if (!usesDefault) return null;
  const segs = page.path.split("/").filter(Boolean);
  const kind = segs.length === 0 ? "home" : segs.length === 1 ? "section" : "article";
  if (kind === "article" && !ARTICLE_PREFIXES.includes(segs[0])) return null;

  const title = metaOf(html, "og:title");
  if (!title) return null;
  const description = metaOf(html, "og:description");
  const lang = langByCode(page.code);
  const prefix = kind === "home" ? "" : segs[0];
  const kicker = prefix ? `${BRAND} · ${SECTION_KICKER[prefix] ?? prefix.toUpperCase()}` : BRAND;
  const bare = page.path.replace(/\/$/, "");

  return {
    key: ogLangManifestKey(page.code, page.path),
    file: `${page.code}-${bare ? bare.replace(/\//g, "-") : "home"}.png`,
    lang: page.code,
    kicker,
    title,
    description,
    label: lang?.name ?? "",
    foot: `${new URL(defaultUrl).host}/${page.code === "ko" ? "" : `${page.code}/`}${page.path}`,
  };
}

/** 폰트 파일 확보 — 환경변수 → 캐시 → npm(한 번만). 실패하면 null. */
function fontFor(code) {
  const meta = FONT_PKG[code] ?? FONT_PKG.ko;
  const envBold = process.env[`OG_FONT_${code.toUpperCase()}_BOLD`];
  const envRegular = process.env[`OG_FONT_${code.toUpperCase()}_REGULAR`];
  if (envBold && fs.existsSync(envBold)) {
    return { bold: envBold, regular: envRegular && fs.existsSync(envRegular) ? envRegular : envBold };
  }
  const cached = {
    bold: path.join(FONT_CACHE, `${code}-700-${meta.family}_700Bold.ttf`),
    regular: path.join(FONT_CACHE, `${code}-400-${meta.family}_400Regular.ttf`),
  };
  if (fs.existsSync(cached.bold) && fs.existsSync(cached.regular)) return cached;

  fs.mkdirSync(FONT_CACHE, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "og-font-"));
  const packed = spawnSync("npm", ["pack", meta.pkg, "--silent"], { cwd: tmp, encoding: "utf8" });
  const tgz = fs.readdirSync(tmp).find((f) => f.endsWith(".tgz"));
  if (packed.status !== 0 || !tgz) {
    console.warn(`  · ${code} 폰트를 받지 못했습니다 (${meta.pkg}) — ${(packed.stderr ?? "").trim().split("\n")[0]}`);
    return null;
  }
  const weights = [
    ["400Regular", cached.regular, `${meta.family}_400Regular.ttf`],
    ["700Bold", cached.bold, `${meta.family}_700Bold.ttf`],
  ];
  for (const [dir, dest, name] of weights) {
    spawnSync("tar", ["-xzf", path.join(tmp, tgz), "-C", tmp, `package/${dir}/${name}`], { encoding: "utf8" });
    const found = path.join(tmp, "package", dir, name);
    if (!fs.existsSync(found)) {
      console.warn(`  · ${code} 폰트(${dir}) 압축을 풀지 못했습니다`);
      return null;
    }
    fs.copyFileSync(found, dest);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  return cached;
}

function runBuild(label) {
  const res = spawnSync(process.execPath, [path.join(ROOT, "scripts/build-seo.mjs")], { cwd: ROOT, encoding: "utf8" });
  if (res.status !== 0) {
    console.error(`${label} 실패:`, (res.stderr ?? "").trim().split("\n").slice(-4).join(" "));
    process.exit(res.status ?? 1);
  }
}

function main() {
  console.log("· 1/4 현재 상태로 빌드 (페이지 HTML 확보)");
  runBuild("빌드");

  const siteUrl = process.env.SITE_URL || "https://hub.xconda.ai/";
  const base = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  const defaultUrl = new URL(DEFAULT_OG_IMAGE_PATH, base).href;
  const langCardPrefix = new URL(`${OG_LANG_DIR}/`, base).href;

  const plans = [];
  for (const rel of walk(ROOT)) {
    const page = pageOf(rel);
    if (!page) continue;
    const html = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const card = planCard(page, html, defaultUrl, langCardPrefix);
    if (card) plans.push(card);
  }
  plans.sort((a, b) => a.key.localeCompare(b.key));
  console.log(`· 2/4 카드 대상 ${plans.length}장 (언어 홈 · 목록 · 커버 없는 글)`);
  if (!plans.length) {
    console.log("  카드가 필요한 페이지가 없습니다 — 그대로 둡니다");
    return;
  }

  const fonts = {};
  for (const code of [...new Set(plans.map((p) => p.lang))].sort()) {
    const font = fontFor(code);
    if (!font) {
      console.log(`  · ${code} 폰트가 없어 카드 생성을 건너뜁니다 (기존 카드 유지)`);
      return;
    }
    fonts[code] = font;
  }

  const specPath = path.join(os.tmpdir(), "og-cards-spec.json");
  fs.writeFileSync(specPath, `${JSON.stringify({ fonts, cards: plans }, null, 2)}\n`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const render = spawnSync("python3", [RENDERER, specPath, OUT_DIR], { cwd: ROOT, encoding: "utf8" });
  process.stdout.write(render.stdout ?? "");
  if (render.stderr) process.stderr.write(render.stderr);
  if (render.status !== 0) {
    console.log("  카드 렌더를 건너뜁니다 (Pillow 없음 또는 폰트 문제) — 기존 카드 유지");
    return;
  }

  // manifest — 키를 정렬해 써서 같은 입력이면 같은 파일이 나옵니다(멱등).
  const manifest = {};
  for (const card of plans) manifest[card.key] = card.file;
  const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  fs.writeFileSync(path.join(ROOT, OG_LANG_MANIFEST_PATH), `${JSON.stringify(sorted, null, 2)}\n`);

  // 더 이상 쓰지 않는 카드 정리(이름이 바뀐 글 등)
  const keep = new Set(Object.values(sorted));
  let removed = 0;
  for (const name of fs.readdirSync(OUT_DIR)) {
    if (name === "manifest.json" || !name.endsWith(".png")) continue;
    if (keep.has(name)) continue;
    fs.unlinkSync(path.join(OUT_DIR, name));
    removed += 1;
  }

  console.log(`· 3/4 manifest 갱신 — ${OG_LANG_MANIFEST_PATH} (${Object.keys(sorted).length}장${removed ? `, 정리 ${removed}장` : ""})`);
  console.log("· 4/4 다시 빌드 (og:image 를 카드로 교체)");
  runBuild("재빌드");

  const byLang = {};
  for (const card of plans) byLang[card.lang] = (byLang[card.lang] ?? 0) + 1;
  console.log(`✔ 언어별 카드 ${plans.length}장 · ${Object.entries(byLang).map(([c, n]) => `${c} ${n}`).join(" · ")}`);
}

main();
