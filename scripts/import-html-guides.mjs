#!/usr/bin/env node
/**
 * Import the supplied standalone HTML guides as static, read-only pages.
 *
 *   npm ci
 *   node scripts/import-html-guides.mjs /path/to/downloaded-guides [output-directory]
 *
 * The input directory must contain the 21 × 4 original files, using the names
 * in src/content/htmlGuides.json. The Drive originals are NOT modified. Images
 * are extracted losslessly, deduplicated by SHA-256, and served from this site.
 * Untrusted source scripts (including copied Cloudflare loaders) are removed;
 * the two screenshot-zoom pages use our small local viewer instead. All work is
 * staged and validated before the currently served files are replaced.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/htmlGuides.json"), "utf8"));
const INPUT = process.argv[2] ? path.resolve(process.argv[2]) : "";
const OUT = process.argv[3] ? path.resolve(process.argv[3]) : path.join(ROOT, "manuals");
const LANGS = [
  {
    code: "ko", file: "KO", html: "ko", title: "화면으로 보는 사용자 가이드",
    intro: "툴을 선택해 화면과 함께 단계별 사용법을 확인하세요.",
    home: "허브로 돌아가기", list: "가이드 목록", nav: "가이드 탐색", zoom: "이미지 확대",
    categories: { image: "이미지", video: "영상", storyboard: "스토리보드", assets: "에셋" },
  },
  {
    code: "en", file: "EN", html: "en", title: "Illustrated user guides",
    intro: "Choose a tool for a step-by-step guide with screenshots.",
    home: "Back to the hub", list: "All guides", nav: "Guide navigation", zoom: "Enlarge image",
    categories: { image: "Image", video: "Video", storyboard: "Storyboard", assets: "Assets" },
  },
  {
    code: "ja", file: "JA", html: "ja", title: "画面付きユーザーガイド",
    intro: "ツールを選んで、画面と一緒に使い方を確認しましょう。",
    home: "ハブに戻る", list: "ガイド一覧", nav: "ガイドのナビゲーション", zoom: "画像を拡大",
    categories: { image: "画像", video: "動画", storyboard: "ストーリーボード", assets: "アセット" },
  },
  {
    code: "zh", file: "ZH", html: "zh-CN", title: "图文用户指南",
    intro: "选择工具，结合截图查看分步使用方法。",
    home: "返回中心", list: "全部指南", nav: "指南导航", zoom: "放大图片",
    categories: { image: "图像", video: "视频", storyboard: "分镜", assets: "素材" },
  },
];
const CATEGORY_ORDER = ["image", "video", "storyboard", "assets"];
const CSP = [
  "default-src 'none'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "script-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
].join("; ");

if (!INPUT || !fs.existsSync(INPUT) || !fs.statSync(INPUT).isDirectory()) {
  throw new Error("사용법: node scripts/import-html-guides.mjs <원본 HTML이 있는 디렉터리> [출력 디렉터리]");
}
if (OUT === ROOT || OUT === INPUT || OUT === path.parse(OUT).root) {
  throw new Error("출력 디렉터리는 저장소 루트나 원본 디렉터리와 같을 수 없습니다.");
}
if (CATALOG.length !== 21 || new Set(CATALOG.map((x) => x.slug)).size !== CATALOG.length) {
  throw new Error("가이드 목록의 수 또는 slug가 올바르지 않습니다.");
}
for (const guide of CATALOG) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(guide.slug) || !CATEGORY_ORDER.includes(guide.category)) {
    throw new Error(`잘못된 가이드 항목: ${guide.slug}`);
  }
  for (const lang of LANGS) {
    const filename = `${guide.source}_Guide_${lang.file}.html`;
    if (!fs.existsSync(path.join(INPUT, filename))) throw new Error(`원본이 없습니다: ${filename}`);
  }
}

function addStylesheet(doc, href) {
  const link = doc.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  doc.head.appendChild(link);
}
function setPolicy(doc) {
  // Remove supplied executable policy/redirect tags before installing ours.
  for (const meta of doc.querySelectorAll("meta[http-equiv]")) {
    if (/^(refresh|content-security-policy)$/i.test(meta.getAttribute("http-equiv") ?? "")) meta.remove();
  }
  for (const meta of doc.querySelectorAll('meta[name="robots"]')) meta.remove();
  const policy = doc.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content = CSP;
  doc.head.prepend(policy);
  // The existing site already has an indexed guide. These copies are for
  // visitors until the supplied content/translations have been reviewed for SEO.
  const robots = doc.createElement("meta");
  robots.name = "robots";
  robots.content = "noindex, follow";
  doc.head.appendChild(robots);
}
function addNav(doc, lang, slug) {
  const nav = doc.createElement("nav");
  nav.className = "xconda-manual-nav notranslate";
  nav.setAttribute("aria-label", lang.nav);
  nav.setAttribute("data-zoom-label", lang.zoom);
  const links = doc.createElement("div");
  links.className = "xconda-manual-links";
  const brand = doc.createElement("a");
  brand.className = "xconda-manual-brand";
  brand.href = "../../#guides";
  brand.textContent = "XCONDA HUB";
  const home = doc.createElement("a");
  home.href = "../../#guides";
  home.textContent = lang.home;
  const list = doc.createElement("a");
  list.href = "index.html";
  list.textContent = lang.list;
  links.append(brand, home, list);

  const languages = doc.createElement("div");
  languages.className = "xconda-manual-languages";
  for (const option of LANGS) {
    const a = doc.createElement("a");
    a.href = `../${option.code}/${slug ? `${slug}.html` : "index.html"}`;
    a.hreflang = option.html;
    a.lang = option.html;
    a.textContent = option.file;
    if (option.code === lang.code) a.setAttribute("aria-current", "page");
    languages.append(a);
  }
  nav.append(links, languages);
  doc.body.prepend(nav);
}
function sanitize(doc) {
  for (const node of doc.querySelectorAll("script, iframe, object, embed, base, form")) node.remove();
  for (const node of doc.querySelectorAll("*")) {
    for (const attr of [...node.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      if (name.startsWith("on") || name === "srcdoc" || (/^(href|src|action|formaction|xlink:href)$/.test(name) && /^(?:javascript|vbscript):/i.test(value))) {
        node.removeAttribute(attr.name);
      }
    }
  }
}
function imageExtension(mime, bytes) {
  if (mime === "png" && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return "png";
  if ((mime === "jpeg" || mime === "jpg") && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (mime === "webp" && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  throw new Error(`알 수 없거나 손상된 이미지 형식: ${mime}`);
}
function extractImages(html, screenDir) {
  let count = 0;
  const text = html.replace(/data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)/gi, (_match, rawMime, data) => {
    const bytes = Buffer.from(data, "base64");
    if (bytes.length === 0 || bytes.toString("base64") !== data) throw new Error("손상된 base64 이미지");
    const ext = imageExtension(rawMime.toLowerCase(), bytes);
    const hash = crypto.createHash("sha256").update(bytes).digest("hex");
    const filename = `${hash}.${ext}`;
    const destination = path.join(screenDir, filename);
    if (!fs.existsSync(destination)) fs.writeFileSync(destination, bytes);
    count++;
    return `../assets/screens/${filename}`;
  });
  // Never silently ship an unsupported inline image or a guide without screens.
  if (/data:image\//i.test(text) || count === 0) throw new Error("이미지를 추출하지 못했거나 지원하지 않는 이미지가 있습니다.");
  return { text, count };
}
// Tidy inherited formatting without changing preformatted source text. CSS and
// indentation-only nodes in the supplied documents contain trailing spaces.
function tidyMarkup(doc) {
  const walker = doc.createTreeWalker(doc, doc.defaultView.NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent || parent.closest("pre, textarea")) continue;
    if (parent.tagName === "STYLE" || !node.data.trim()) {
      node.data = node.data.replace(/[ \t]+(?=\n)/g, "");
    }
  }
}
function createIndex(lang) {
  const dom = new JSDOM('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>');
  const { document: doc } = dom.window;
  doc.documentElement.lang = lang.html;
  doc.title = `${lang.title} | XCONDA HUB`;
  setPolicy(doc);
  addStylesheet(doc, "../assets/navigation.css");
  addStylesheet(doc, "../assets/index.css");
  const main = doc.createElement("main");
  main.className = "manual-index";
  const header = doc.createElement("header");
  const eyebrow = doc.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "XCONDA / GUIDE LIBRARY";
  const h1 = doc.createElement("h1");
  h1.textContent = lang.title;
  const intro = doc.createElement("p");
  intro.className = "intro";
  intro.textContent = lang.intro;
  header.append(eyebrow, h1, intro);
  main.append(header);
  for (const category of CATEGORY_ORDER) {
    const group = CATALOG.filter((guide) => guide.category === category);
    const section = doc.createElement("section");
    const h2 = doc.createElement("h2");
    h2.textContent = lang.categories[category];
    const count = doc.createElement("span");
    count.textContent = String(group.length).padStart(2, "0");
    h2.append(count);
    const list = doc.createElement("ul");
    for (const guide of group) {
      const item = doc.createElement("li");
      const a = doc.createElement("a");
      a.href = `${guide.slug}.html`;
      const name = doc.createElement("span");
      name.className = "notranslate";
      name.textContent = guide.name;
      const arrow = doc.createElement("span");
      arrow.className = "arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↗";
      a.append(name, arrow);
      item.append(a);
      list.append(item);
    }
    section.append(h2, list);
    main.append(section);
  }
  doc.body.append(main);
  addNav(doc, lang, null);
  const html = dom.serialize();
  dom.window.close();
  return html;
}

const stage = fs.mkdtempSync(path.join(os.tmpdir(), "xconda-html-guides-"));
try {
  const screenDir = path.join(stage, "screens");
  fs.mkdirSync(screenDir, { recursive: true });
  let images = 0;
  for (const lang of LANGS) {
    const langDir = path.join(stage, lang.code);
    fs.mkdirSync(langDir, { recursive: true });
    for (const guide of CATALOG) {
      const filename = `${guide.source}_Guide_${lang.file}.html`;
      const original = fs.readFileSync(path.join(INPUT, filename), "utf8");
      const extracted = extractImages(original, screenDir);
      images += extracted.count;
      const dom = new JSDOM(extracted.text);
      const { document: doc } = dom.window;
      if (!doc.title || !doc.body || doc.querySelectorAll("img[src]").length < extracted.count) {
        throw new Error(`원본 구조를 확인하세요: ${filename}`);
      }
      sanitize(doc);
      // Some supplied JA/ZH (and a few KO) files incorrectly declare lang=en.
      doc.documentElement.lang = lang.html;
      setPolicy(doc);
      addStylesheet(doc, "../assets/navigation.css");
      addNav(doc, lang, guide.slug);
      if (doc.querySelector('.zoom[role="dialog"]')) {
        const script = doc.createElement("script");
        script.src = "../assets/zoom.js";
        script.defer = true;
        doc.body.append(script);
      }
      tidyMarkup(doc);
      fs.writeFileSync(path.join(langDir, `${guide.slug}.html`), dom.serialize());
      dom.window.close();
    }
    fs.writeFileSync(path.join(langDir, "index.html"), createIndex(lang));
  }
  // Replace only our generated paths; navigation.css, index.css and zoom.js are
  // maintained source files. The rest of the site/build output is untouched.
  fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
  for (const name of LANGS.map((lang) => lang.code)) {
    const dest = path.join(OUT, name);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(path.join(stage, name), dest, { recursive: true });
  }
  const destScreens = path.join(OUT, "assets/screens");
  fs.rmSync(destScreens, { recursive: true, force: true });
  fs.cpSync(screenDir, destScreens, { recursive: true });
  console.log(`✔ ${CATALOG.length}개 가이드 × ${LANGS.length}개 언어, 이미지 ${images}개`);
  console.log(`✔ 고유 이미지 ${fs.readdirSync(screenDir).length}개 (원본 이미지 바이트 보존)`);
} finally {
  fs.rmSync(stage, { recursive: true, force: true });
}
