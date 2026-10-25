#!/usr/bin/env node
/**
 * www.xconda.ai 기능 페이지 **정적 산출물 생성기** — `npm run www:build`
 *
 *   node scripts/www/build-feature-pages.mjs [--out www/dist] [--site https://www.xconda.ai]
 *
 * 왜 정적 HTML 인가
 *   www 소스 저장소가 이 작업 환경에 연결되어 있지 않습니다. 그래서 원고(www/feature-pages.json)를
 *   **그대로 배포할 수 있는 HTML** 로 뽑아 둡니다. Next.js 로 옮길 때는 www/snippets/* 를 쓰고,
 *   그 전에 임시로라도 CDN·정적 호스팅에 올려 색인을 시작할 수 있습니다.
 *
 * 만드는 것
 *   features/<slug>/index.html          영어 (기본 언어)
 *   ko/features/<slug>/index.html       한국어
 *   features/index.html                 기능 목록 (영어)
 *   ko/features/index.html              기능 목록 (한국어)
 *   features/<slug>/og.svg              공유 카드(SVG) — 제품 스크린샷이 준비되면 PNG 로 교체
 *   sitemap.xml · robots.txt · llms.txt
 *
 * 지켜지는 것
 *   · canonical = 자기 주소, hreflang en/ko/x-default 상호 참조
 *   · JSON-LD: SoftwareApplication + FAQPage + BreadcrumbList (문법 오류 없이 파싱되는지 검사)
 *   · 로그인 게이트(/studio/*)는 링크만 걸고 색인 대상으로 만들지 않음
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "../..");

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const OUT = path.resolve(ROOT, argOf("out", "www/dist"));
const SITE = String(argOf("site", "https://www.xconda.ai")).replace(/\/+$/, "");
const LAST_MODIFIED = "2026-10-25";

const data = JSON.parse(fs.readFileSync(path.join(ROOT, "www/feature-pages.json"), "utf8"));
const pages = data.pages ?? [];
const base = data.basePath ?? "features";

const escapeHtml = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const escapeXml = (v) => escapeHtml(v).replace(/&apos;/g, "&apos;");

const urlFor = (lang, p = "") => `${SITE}${lang === "ko" ? "/ko/" : "/"}${String(p).replace(/^\/+/, "")}`;
const alternates = (p) => [
  { hreflang: "en", href: urlFor("en", p) },
  { hreflang: "ko", href: urlFor("ko", p) },
  { hreflang: "x-default", href: urlFor("en", p) },
];

const LABELS = {
  ko: {
    features: "기능",
    home: "홈",
    try: data.cta?.ko ?? "스튜디오에서 써보기",
    faq: "자주 묻는 질문",
    more: "다른 기능 보기",
    hub: "허브에서 제작 방법 보기",
    allFeatures: "XCONDA 기능 전체",
    listIntro: "XCONDA의 제작 도구를 기능별로 정리했습니다. 각 페이지에서 쓰임새와 자주 묻는 질문을 확인하세요.",
  },
  en: {
    features: "Features",
    home: "Home",
    try: data.cta?.en ?? "Try it in the studio",
    faq: "FAQ",
    more: "Other features",
    hub: "Read the workflow on the hub",
    allFeatures: "All XCONDA features",
    listIntro: "Every XCONDA production tool, one page each — what it does and the questions people ask before using it.",
  },
};

const CSS = `
:root{--bg:#0b0b0b;--fg:#f4f4f5;--muted:#a1a1aa;--line:#27272a;--volt:#facc15;--card:#131316}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.7 Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI","Apple SD Gothic Neo","Malgun Gothic",sans-serif}
a{color:var(--volt);text-decoration:none}a:hover{text-decoration:underline}
main{max-width:760px;margin:0 auto;padding:48px 20px 80px}
nav.crumb{font-size:13px;color:var(--muted);margin-bottom:28px}
h1{font-size:clamp(28px,4vw,40px);line-height:1.25;letter-spacing:-.02em;margin:0 0 16px}
h2{font-size:20px;margin:40px 0 12px}
p.lead{color:#d4d4d8;font-size:17px}
ul{padding-left:20px}li{margin:6px 0}
details{border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin:10px 0;background:var(--card)}
summary{cursor:pointer;font-weight:600}
details p{color:var(--muted);margin:10px 0 0}
a.cta{display:inline-block;background:var(--volt);color:#0b0b0b;font-weight:800;padding:14px 22px;border-radius:999px;margin:28px 0 0}
footer{border-top:1px solid var(--line);margin-top:56px;padding-top:20px;font-size:13px;color:var(--muted)}
`.trim();

function jsonLdScript(...nodes) {
  return nodes
    .filter(Boolean)
    .map((n) => `<script type="application/ld+json">${JSON.stringify(n).replace(/</g, "\\u003c")}</script>`)
    .join("\n    ");
}

function pageHtml({ lang, title, description, url, alt, body, extraHead = "" }) {
  return `<!doctype html>
<html lang="${lang === "ko" ? "ko" : "en"}">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    ${alt.map((a) => `<link rel="alternate" hreflang="${a.hreflang}" href="${escapeHtml(a.href)}" />`).join("\n    ")}
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="XCONDA" />
    <meta property="og:locale" content="${lang === "ko" ? "ko_KR" : "en_US"}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta name="twitter:card" content="summary_large_image" />
    ${extraHead}
    <style>${CSS}</style>
</head>
<body>
<main>
${body}
<footer>
      <a href="${escapeHtml(urlFor(lang, base))}">${escapeHtml(LABELS[lang].allFeatures)}</a> · 
      <a href="https://hub.xconda.ai/${lang === "ko" ? "" : "en/"}">XCONDA Hub</a> · 
      <a href="${escapeHtml(urlFor(lang, "pricing"))}">Pricing</a>
</footer>
</main>
</body>
</html>
`;
}

/* ------------------------------ OG 카드(SVG) ------------------------------ */
function ogSvg({ lang, name, copy, slug }) {
  const title = escapeHtml(name);
  const sub = escapeHtml((copy.intro ?? "").slice(0, 96));
  const kicker = lang === "ko" ? "XCONDA 기능" : "XCONDA feature";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${title}">
  <rect width="1200" height="630" fill="#0b0b0b"/>
  <text x="72" y="96" fill="#facc15" font-family="Pretendard, Arial, sans-serif" font-size="30" font-weight="700">XCONDA</text>
  <text x="220" y="96" fill="#a1a1aa" font-family="Pretendard, Arial, sans-serif" font-size="30">· ${kicker}</text>
  <text x="72" y="270" fill="#ffffff" font-family="Pretendard, Arial, sans-serif" font-size="76" font-weight="800">${title}</text>
  <text x="72" y="350" fill="#a1a1aa" font-family="Pretendard, Arial, sans-serif" font-size="32">${sub}</text>
  <text x="72" y="560" fill="#71717a" font-family="Pretendard, Arial, sans-serif" font-size="26">${SITE.replace(/^https?:\/\//, "")}/${lang === "ko" ? "ko/" : ""}${base}/${escapeHtml(slug)}</text>
  <text x="980" y="560" fill="#facc15" font-family="Pretendard, Arial, sans-serif" font-size="26">hub.xconda.ai</text>
</svg>
`;
}

/* ------------------------------ 페이지 본문 ------------------------------ */
function featureBody({ page, lang }) {
  const copy = page[lang];
  const L = LABELS[lang];
  const studio = `${lang === "ko" ? "/ko" : ""}/studio/${page.studio}`;
  const hubPost = `https://hub.xconda.ai/${lang === "ko" ? "" : "en/"}post/${page.hub}/`;
  const related = pages.filter((p) => p.slug !== page.slug).slice(0, 4);

  return [
    `<nav class="crumb"><a href="${escapeHtml(urlFor(lang, ""))}">${escapeHtml(L.home)}</a> / <a href="${escapeHtml(urlFor(lang, base))}">${escapeHtml(L.features)}</a> / ${escapeHtml(page.name)}</nav>`,
    `<h1>${escapeHtml(copy.h1)}</h1>`,
    `<p class="lead">${escapeHtml(copy.intro)}</p>`,
    `<a class="cta" href="${escapeHtml(studio)}">${escapeHtml(L.try)}</a>`,
    `<h2>${lang === "ko" ? "주요 기능" : "What it does"}</h2>`,
    `<ul>${copy.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>`,
    `<h2>${escapeHtml(L.faq)}</h2>`,
    ...copy.faq.map((f) => `<details><summary>${escapeHtml(f.q)}</summary><p>${escapeHtml(f.a)}</p></details>`),
    `<h2>${escapeHtml(L.more)}</h2>`,
    `<ul>${related.map((r) => `<li><a href="../${escapeHtml(r.slug)}/">${escapeHtml(r[lang].h1)}</a></li>`).join("")}</ul>`,
    `<p><a href="${escapeHtml(hubPost)}">${escapeHtml(L.hub)}</a></p>`,
  ].join("\n");
}

/* ------------------------------ 파일 쓰기 ------------------------------ */
const written = [];
const write = (rel, content) => {
  const abs = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
  written.push(rel);
};

fs.rmSync(OUT, { recursive: true, force: true });

/** 그 언어로 페이지를 만들 수 있는가 — 제목·설명 + 본문(h1·intro·features·faq)이 모두 있어야 합니다. */
const hasBody = (page, lang) => {
  const c = page?.[lang];
  return Boolean(c?.title && c?.description && c?.h1 && c?.intro && c?.features?.length >= 3 && c?.faq?.length >= 2);
};
const missingBodies = pages.filter((p) => !hasBody(p, "en")).map((p) => p.slug);

for (const page of pages) {
  for (const lang of ["ko", "en"]) {
    if (!hasBody(page, lang)) continue; // 본문 번역이 아직 없는 언어는 만들지 않습니다(빈 페이지·중복 방지)
    const copy = page[lang];
    const p = `${base}/${page.slug}/`;
    const url = urlFor(lang, p);
    const ogUrl = `${SITE}/${p}og.png`;
    const body = featureBody({ page, lang });
    const appLd = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": `${url}#app`,
      name: page.name,
      description: copy.description,
      url,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      inLanguage: lang === "ko" ? "ko-KR" : "en-US",
      publisher: { "@type": "Organization", name: "Cubeberry Co., Ltd.", alternateName: "주식회사 큐브베리", url: `${SITE}/` },
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: lang === "ko" ? "무료로 시작하고 크레딧을 구매해 사용" : "Start free, buy credits as you go", url: urlFor(lang, "pricing") },
    };
    const faqLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: copy.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    };
    const crumbLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "XCONDA", item: urlFor(lang, "") },
        { "@type": "ListItem", position: 2, name: LABELS[lang].features, item: urlFor(lang, base) },
        { "@type": "ListItem", position: 3, name: page.name, item: url },
      ],
    };
    const extraHead = [
      `<meta property="og:image" content="${escapeHtml(ogUrl)}" />`,
      `<meta name="twitter:image" content="${escapeHtml(ogUrl)}" />`,
      jsonLdScript(appLd, faqLd, crumbLd),
    ].join("\n    ");
    write(
      `${lang === "ko" ? "ko/" : ""}${p}index.html`,
      pageHtml({ lang, title: copy.title, description: copy.description, url, alt: alternates(p), body, extraHead }),
    );
    write(`${lang === "ko" ? "ko/" : ""}${p}og.svg`, ogSvg({ lang, name: page.name, copy, slug: page.slug }));
  }
}

/* 공유 카드 PNG — 파이썬·Pillow·한글 폰트가 있으면 실제 PNG 카드를 만듭니다.
   없으면 위에서 만든 SVG 카드를 쓰고, meta og:image 도 SVG 로 바꿉니다. */
let hasPngCards = false;
{
  const py = spawnSync("python3", [path.join(ROOT, "scripts/www/render-og-png.py"), OUT], { encoding: "utf8" });
  hasPngCards = py.status === 0 && fs.existsSync(path.join(OUT, "features/flexboard/og.png"));
  if (!hasPngCards) {
    const why = (py.stderr || py.stdout || "").trim().split("\n").slice(-1)[0] || "python3/Pillow/한글 폰트 없음";
    console.log(`  · 공유 카드: PNG 생성 건너뜀 (${why}) → SVG 사용`);
  }
}

/* 목록 페이지 */
for (const lang of ["ko", "en"]) {
  const L = LABELS[lang];
  const url = urlFor(lang, base);
  const body = [
    `<nav class="crumb"><a href="${escapeHtml(urlFor(lang, ""))}">${escapeHtml(L.home)}</a> / ${escapeHtml(L.features)}</nav>`,
    `<h1>${escapeHtml(L.allFeatures)}</h1>`,
    `<p class="lead">${escapeHtml(L.listIntro)}</p>`,
    `<ul>`,
    ...pages
      .filter((p) => hasBody(p, lang))
      .map((p) => `<li><a href="./${escapeHtml(p.slug)}/">${escapeHtml(p[lang].h1)}</a> — ${escapeHtml(p[lang].description)}</li>`),
    `</ul>`,
  ].join("\n");
  write(
    `${lang === "ko" ? "ko/" : ""}${base}/index.html`,
    pageHtml({
      lang,
      title: lang === "ko" ? "XCONDA 기능 — 제작 도구 20가지" : "XCONDA features — 20 production tools",
      description:
        lang === "ko"
          ? "스토리보드(FLEXBOARD), 블로킹 보드, 360 Turn Studio, 이미지·영상 생성까지 XCONDA 제작 도구 20가지를 한눈에."
          : "FLEXBOARD storyboards, Blocking Board, 360 Turn Studio, image and video generation — all 20 XCONDA production tools.",
      url,
      alt: alternates(`${base}/`),
      body,
      extraHead: `<meta property="og:image" content="${escapeHtml(`${SITE}/${base}/og.png`)}" />`,
    }),
  );
}

/* 사이트맵 · robots · llms.txt */
const sitemapEntries = [];
for (const lang of ["ko", "en"]) {
  const slugs = pages.filter((p) => hasBody(p, lang)).map((p) => p.slug);
  for (const rel of ["", base + "/", ...slugs.map((slug) => `${base}/${slug}/`)]) {
    const alts = alternates(rel);
    sitemapEntries.push(
      [
        "  <url>",
        `    <loc>${escapeXml(urlFor(lang, rel))}</loc>`,
        `    <lastmod>${LAST_MODIFIED}</lastmod>`,
        `    <changefreq>${rel === "" ? "weekly" : "monthly"}</changefreq>`,
        `    <priority>${rel === "" ? "1.0" : rel === base + "/" ? "0.8" : "0.7"}</priority>`,
        ...alts.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${escapeXml(a.href)}" />`),
        "  </url>",
      ].join("\n"),
    );
  }
}
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemapEntries.join("\n")}
</urlset>
`,
);
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

const llms = fs.readFileSync(path.join(ROOT, "www/snippets/llms.txt"), "utf8");
write("llms.txt", llms.replace(/https:\/\/www\.xconda\.ai/g, SITE));

/* PNG 카드가 없으면 메타의 og.png → og.svg (없는 파일을 가리키지 않게) */
if (!hasPngCards) {
  for (const rel of written.filter((f) => f.endsWith(".html"))) {
    const abs = path.join(OUT, rel);
    const html = fs.readFileSync(abs, "utf8").replace(/\/og\.png/g, "/og.svg");
    fs.writeFileSync(abs, html, "utf8");
  }
}

/* ------------------------------ 검사 ------------------------------ */
const errors = [];
let jsonLdCount = 0;
let linkCount = 0;
let appLinkCount = 0;
/** 이 산출물에 없고 www 본사이트에만 있는 경로 */
const appRoutes = ["/studio/", "/ko/studio/", "/login", "/ko/login", "/pricing", "/ko/pricing", "/legal/", "/ko/legal/", "/support/", "/ko/support/"];
for (const rel of written.filter((f) => f.endsWith(".html"))) {
  const html = fs.readFileSync(path.join(OUT, rel), "utf8");
  // og:image 가 실제 파일을 가리키는지
  const ogImage = /<meta property="og:image" content="https:\/\/[^"]+\/(features\/[^"]*og\.(?:png|svg))"/.exec(html)?.[1];
  if (ogImage && !fs.existsSync(path.join(OUT, ogImage))) errors.push(`${rel}: og:image 파일 없음 (${ogImage})`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
      jsonLdCount += 1;
    } catch (e) {
      errors.push(`${rel}: JSON-LD 파싱 실패 (${e.message})`);
    }
  }
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
  if (!canonical) errors.push(`${rel}: canonical 없음`);
  const hrefs = [...html.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => m[1]);
  for (const need of ["en", "ko", "x-default"]) if (!hrefs.includes(need)) errors.push(`${rel}: hreflang ${need} 없음`);
  // 내부 링크 해석
  for (const m of html.matchAll(/<a[^>]+href="([^"]+)"/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|#)/.test(href)) continue;
    // 스튜디오·요금·약관은 **www 본사이트에만** 있는 주소입니다(이 정적 산출물에는 없음 → 검사 제외).
    if (appRoutes.some((r) => href === r.replace(/\/$/, "") || href.startsWith(r))) {
      appLinkCount += 1;
      continue;
    }
    linkCount += 1;
    const target = path.join(OUT, path.dirname(rel), href.split("#")[0]);
    const candidates = [target, path.join(target, "index.html")];
    if (!candidates.some((c) => fs.existsSync(c))) errors.push(`${rel}: 깨진 내부 링크 ${href}`);
  }
}

const files = written.length;
const htmlCount = written.filter((f) => f.endsWith(".html")).length;
console.log(`✔ www 기능 페이지 산출물 → ${path.relative(ROOT, OUT)}/`);
if (missingBodies.length) {
  console.log(`  ⚠️ 영어 본문이 없어 건너뛴 페이지 ${missingBodies.length}개: ${missingBodies.slice(0, 5).join(", ")}${missingBodies.length > 5 ? " …" : ""}`);
}
const cards = written.filter((f) => /og\.(svg|png)$/.test(f)).length;
console.log(`  페이지 ${htmlCount}개 · 공유 카드 ${cards}개(${hasPngCards ? "PNG" : "SVG"}) · 사이트맵 ${sitemapEntries.length} URL`);
console.log(`  JSON-LD ${jsonLdCount}개 파싱 성공 · 내부 링크 ${linkCount}개 확인 · 본사이트 링크 ${appLinkCount}개(검사 제외)`);
if (errors.length) {
  console.error(`\n실패 ${errors.length}건`);
  for (const e of errors.slice(0, 20)) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log("PASS — 모든 페이지의 canonical·hreflang·JSON-LD·내부 링크가 정상입니다.");
