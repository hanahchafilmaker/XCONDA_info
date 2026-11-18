#!/usr/bin/env node
/**
 * Publish the 2026-11-18 current Drive guides as sanitized, same-origin assets.
 *
 *   node scripts/import-current-guides.mjs [raw-download-dir] [output-dir]
 *
 * The raw directory is produced by the Drive connector (96 HTML docs + 65 MP4s).
 * Nothing from it is copied verbatim: executable tags, remote loaders, localhost
 * references, HTML comments, event handlers and external URLs are removed;
 * base64 screenshots are extracted once by SHA-256. The staged output replaces
 * assets/guides/current only after every input has been validated.
 *
 * Legacy manual pages and the standalone user guide are relinked to those local
 * copies in the same transactional run, so no public page points at Drive /view.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG = JSON.parse(fs.readFileSync(path.join(ROOT, "src/content/driveGuides.json"), "utf8"));
const DOCS = CATALOG.docs;
const VIDEOS = [...CATALOG.videos, ...CATALOG.extraVideos];
const INPUT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, "google_drive");
const OUT = process.argv[3] ? path.resolve(process.argv[3]) : path.join(ROOT, "assets/guides/current");
const LANGS = [
  { code: "ko", file: "KO", html: "ko", title: "현재 사용자 가이드", intro: "2026-11-18 현재판 문서와 KO/EN 영상 가이드를 이 사이트에서 바로 열어 보세요." },
  { code: "en", file: "EN", html: "en", title: "Current user guides", intro: "Open the 2026-11-18 current documents and KO/EN video guides directly on this site." },
  { code: "ja", file: "JA", html: "ja", title: "現在のユーザーガイド", intro: "2026-11-18 現在版の文書と KO/EN 動画ガイドをこのサイトで開けます。" },
  { code: "zh", file: "ZH", html: "zh-CN", title: "当前用户指南", intro: "可在本站直接打开 2026-11-18 当前版文档和 KO/EN 视频指南。" },
];
const DOC_LANGS = ["ko", "en", "ja", "zh"];
const VIDEO_LANGS = ["ko", "en"];
const CSP = [
  "default-src 'self'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "script-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
].join("; ");
const RAW_VIDEO_NAME_BY_ID = {
  "1Ok4RcN9em2XzvTRyOUlJ5AiNYCF0obsS": "workspace-guide-en-16x9-2min30.mp4",
};

if (!fs.existsSync(INPUT) || !fs.statSync(INPUT).isDirectory()) {
  throw new Error(`원본 다운로드 디렉터리가 없습니다: ${INPUT}`);
}
if (OUT === ROOT || OUT === INPUT || OUT === path.parse(OUT).root || !OUT.startsWith(`${ROOT}${path.sep}`)) {
  throw new Error("출력 디렉터리는 저장소 안의 전용 경로여야 합니다.");
}
if (DOCS.length !== 24 || new Set(DOCS.map((doc) => doc.slug)).size !== 24) {
  throw new Error("현재판 문서 카탈로그는 24개 주제여야 합니다.");
}
const filenames = fs.readdirSync(INPUT);
const htmlFiles = filenames.filter((name) => name.toLowerCase().endsWith(".html"));
const mp4Files = filenames.filter((name) => name.toLowerCase().endsWith(".mp4"));
if (htmlFiles.length !== 96) throw new Error(`원본 HTML 96개가 필요합니다: ${htmlFiles.length}개`);
if (mp4Files.length !== 65) throw new Error(`원본 MP4 65개가 필요합니다: ${mp4Files.length}개`);

const findRaw = (list, predicate, label) => {
  const hits = list.filter(predicate);
  if (hits.length !== 1) throw new Error(`${label}: 원본 파일을 하나 찾지 못했습니다 (${hits.length}개)`);
  return path.join(INPUT, hits[0]);
};
const rawHtmlFor = (doc, lang) =>
  findRaw(
    htmlFiles,
    (name) => name.startsWith(`${doc.no}_`) && name.toUpperCase().endsWith(`_${lang.file}.HTML`),
    `${doc.no}/${lang.code} HTML`,
  );
const rawVideoFor = (video, lang) => {
  if (RAW_VIDEO_NAME_BY_ID[video.files[lang.code]]) return path.join(INPUT, RAW_VIDEO_NAME_BY_ID[video.files[lang.code]]);
  return findRaw(
    mp4Files,
    (name) => name.startsWith(`${video.no}_`) && name.toUpperCase().endsWith(`_${lang.file}.MP4`),
    `${video.no}/${lang.code} MP4`,
  );
};

function addMeta(doc, attrs) {
  const meta = doc.createElement("meta");
  for (const [key, value] of Object.entries(attrs)) meta.setAttribute(key, value);
  doc.head.append(meta);
}
function addStylesheet(doc, href) {
  const link = doc.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  doc.head.append(link);
}
function setPolicy(doc) {
  for (const node of doc.querySelectorAll('meta[http-equiv], meta[name="robots"]')) node.remove();
  const policy = doc.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content = CSP;
  doc.head.prepend(policy);
  addMeta(doc, { name: "robots", content: "noindex, follow" });
}
function addNav(doc, lang, slug) {
  const nav = doc.createElement("nav");
  nav.className = "xconda-manual-nav notranslate";
  nav.setAttribute("aria-label", `${lang.title} navigation`);
  nav.setAttribute("data-zoom-label", "이미지 확대");
  const links = doc.createElement("div");
  links.className = "xconda-manual-links";
  const brand = doc.createElement("a");
  brand.className = "xconda-manual-brand";
  brand.href = "../../../../#guides";
  brand.textContent = "XCONDA HUB";
  const home = doc.createElement("a");
  home.href = "../../../../#guides";
  home.textContent = "Back to the hub";
  const list = doc.createElement("a");
  list.href = "index.html";
  list.textContent = "Guide index";
  links.append(brand, home, list);
  const languages = doc.createElement("div");
  languages.className = "xconda-manual-languages";
  for (const option of LANGS) {
    const a = doc.createElement("a");
    a.href = slug ? `../${option.code}/${slug}.html` : `../${option.code}/index.html`;
    a.hreflang = option.html;
    a.lang = option.html;
    a.textContent = option.file;
    if (option.code === lang.code) a.setAttribute("aria-current", "page");
    languages.append(a);
  }
  nav.append(links, languages);
  doc.body.prepend(nav);
}
function addScripts(doc, withZoom) {
  const embed = doc.createElement("script");
  embed.src = "../embed.js";
  embed.defer = true;
  doc.body.append(embed);
  if (withZoom) {
    const zoom = doc.createElement("script");
    zoom.src = "../zoom.js";
    zoom.defer = true;
    doc.body.append(zoom);
  }
}
/** Keep generated text free of trailing whitespace and ASCII-only line endings. */
const cleanText = (text) => String(text).replace(/[ \t]+$/gm, "").replace(/\n+$/, "\n");
function imageExtension(mime, bytes) {
  if (mime === "png" && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return "png";
  if ((mime === "jpeg" || mime === "jpg") && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (mime === "webp" && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  throw new Error(`알 수 없거나 손상된 이미지 형식: ${mime}`);
}
function extractImages(html, screenDir) {
  let count = 0;
  const text = html.replace(/data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=\s]+)/gi, (_match, rawMime, data) => {
    const compact = data.replace(/\s/g, "");
    const bytes = Buffer.from(compact, "base64");
    if (!bytes.length || bytes.toString("base64") !== compact) throw new Error("손상된 base64 이미지");
    const ext = imageExtension(rawMime.toLowerCase(), bytes);
    const hash = crypto.createHash("sha256").update(bytes).digest("hex");
    const filename = `${hash}.${ext}`;
    const destination = path.join(screenDir, filename);
    if (!fs.existsSync(destination)) fs.writeFileSync(destination, bytes);
    count++;
    return `../screens/${filename}`;
  });
  if (/data:image\//i.test(text)) throw new Error("지원하지 않는 인라인 이미지가 남아 있습니다.");
  return { text, count };
}
function cleanStyles(doc) {
  for (const style of doc.querySelectorAll("style")) {
    let css = String(style.textContent ?? "");
    css = css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/@import\s+[^;]*;?/gi, "")
      .replace(/@font-face\s*\{[^}]*\}/gi, "")
      .replace(/url\(\s*(['"]?)(?:https?:)?\/\/[^)]*\1\s*\)/gi, "none")
      .replace(/url\(\s*(['"]?)data:font\/[^)]*\1\s*\)/gi, "none");
    style.textContent = css;
  }
}
function removeComments(doc) {
  const walker = doc.createTreeWalker(doc, doc.defaultView.NodeFilter.SHOW_COMMENT);
  const comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  for (const comment of comments) comment.remove();
}
function sanitize(doc, lang, docMeta) {
  for (const node of doc.querySelectorAll("script, iframe, object, embed, base, form, video, source, audio, noscript, template, link, meta[http-equiv]")) node.remove();
  removeComments(doc);
  // Preserve linked text while removing the remote navigation target.
  for (const a of [...doc.querySelectorAll("a[href]")]) {
    const href = a.getAttribute("href") ?? "";
    if (/^(?:https?:)?\/\//i.test(href) || /^javascript:/i.test(href)) a.replaceWith(...[...a.childNodes]);
  }
  for (const node of [...doc.querySelectorAll("*")]) {
    for (const attr of [...node.attributes]) {
      const name = attr.name.toLowerCase();
      const value = String(attr.value ?? "");
      if (
        name.startsWith("on") ||
        ["srcdoc", "srcset", "ping", "background", "poster", "formaction", "xlink:href"].includes(name) ||
        /^\s*(?:javascript|vbscript|data:text\/html):/i.test(value) ||
        (["href", "src", "action"].includes(name) && /^(?:https?:)?\/\//i.test(value)) ||
        (name === "style" && /(?:url\s*\(|@import|expression\s*\(|javascript:)/i.test(value)) ||
        /https?:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|drive\.google\.com|localhost)/i.test(value)
      ) node.removeAttribute(attr.name);
    }
  }
  for (const a of [...doc.querySelectorAll("a:not([href])")]) a.replaceWith(...[...a.childNodes]);
  for (const img of [...doc.querySelectorAll("img")]) {
    const src = img.getAttribute("src") ?? "";
    if (!/^\.\.\/screens\/[a-f0-9]{64}\.(?:png|jpg|webp)$/.test(src)) {
      img.remove();
      continue;
    }
    if (!img.hasAttribute("alt")) img.setAttribute("alt", docMeta.name);
    img.setAttribute("loading", "lazy");
  }
  cleanStyles(doc);
  if (!doc.body) throw new Error("원본에 body가 없습니다.");
  doc.documentElement.lang = lang.html;
  if (!String(doc.title ?? "").trim()) doc.title = `${docMeta.name} | XCONDA HUB`;
  doc.body.setAttribute("data-current-guide-slug", docMeta.slug);
  doc.body.setAttribute("data-current-guide-lang", lang.code);
  doc.body.setAttribute("data-current-guide-updated", CATALOG.updated);
  setPolicy(doc);
  addStylesheet(doc, "../navigation.css");
  addNav(doc, lang, docMeta.slug);
  addScripts(doc, Boolean(doc.querySelector('.zoom[role="dialog"]')));
  return doc;
}
function createIndex(lang) {
  const dom = new JSDOM('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>');
  const { document: doc } = dom.window;
  doc.documentElement.lang = lang.html;
  doc.title = `${lang.title} | XCONDA HUB`;
  setPolicy(doc);
  addStylesheet(doc, "../navigation.css");
  addStylesheet(doc, "../index.css");
  const main = doc.createElement("main");
  main.className = "manual-index";
  main.setAttribute("data-current-guide-count", "96");
  main.setAttribute("data-current-video-count", "65");
  const header = doc.createElement("header");
  const eyebrow = doc.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = `XCONDA / CURRENT GUIDE LIBRARY · ${CATALOG.updated}`;
  const h1 = doc.createElement("h1");
  h1.textContent = lang.title;
  const intro = doc.createElement("p");
  intro.className = "intro";
  intro.textContent = lang.intro;
  header.append(eyebrow, h1, intro);
  main.append(header);
  const docs = doc.createElement("section");
  const docsHeading = doc.createElement("h2");
  docsHeading.textContent = "Documents · 24 topics × 4 languages";
  const docsList = doc.createElement("ul");
  for (const guide of DOCS) {
    const item = doc.createElement("li");
    const a = doc.createElement("a");
    a.href = `${guide.slug}.html`;
    a.className = "notranslate";
    a.textContent = `${guide.no} · ${guide.name}`;
    item.append(a);
    docsList.append(item);
  }
  docs.append(docsHeading, docsList);
  main.append(docs);
  const videos = doc.createElement("section");
  const videoHeading = doc.createElement("h2");
  videoHeading.textContent = "KO/EN video guides · 65 clips";
  const videoList = doc.createElement("ul");
  for (const video of VIDEOS) {
    for (const code of VIDEO_LANGS) {
      if (!video.files[code]) continue;
      const item = doc.createElement("li");
      const a = doc.createElement("a");
      a.href = `../video/${video.no}_${code}.mp4`;
      a.className = "notranslate";
      a.textContent = `${video.no} · ${video.name} · ${code.toUpperCase()}`;
      item.append(a);
      videoList.append(item);
    }
  }
  videos.append(videoHeading, videoList);
  main.append(videos);
  doc.body.append(main);
  addNav(doc, lang, null);
  const html = dom.serialize();
  dom.window.close();
  return html;
}
function createRootIndex() {
  const dom = new JSDOM('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>');
  const { document: doc } = dom.window;
  doc.title = "2026-11-18 Current guides | XCONDA HUB";
  setPolicy(doc);
  addStylesheet(doc, "navigation.css");
  addStylesheet(doc, "index.css");
  const main = doc.createElement("main");
  main.className = "manual-index";
  main.setAttribute("data-current-guide-count", "96");
  main.setAttribute("data-current-video-count", "65");
  const h1 = doc.createElement("h1");
  h1.textContent = "2026-11-18 현재 가이드";
  const intro = doc.createElement("p");
  intro.className = "intro";
  intro.textContent = "24주제 × 4개 언어 문서 96개와 KO/EN 영상 65편. 언어를 선택하세요.";
  const list = doc.createElement("ul");
  for (const lang of LANGS) {
    const item = doc.createElement("li");
    const a = doc.createElement("a");
    a.href = `${lang.code}/index.html`;
    a.hreflang = lang.html;
    a.textContent = `${lang.file} · ${lang.title}`;
    item.append(a);
    list.append(item);
  }
  main.append(h1, intro, list);
  doc.body.append(main);
  const html = dom.serialize();
  dom.window.close();
  return html;
}

const driveView = (id) => `https://drive.google.com/file/d/${id}/view?usp=drive_link`;
const driveFolder = (id) => `https://drive.google.com/drive/folders/${id}?usp=drive_link`;
const filePathById = new Map();
for (const doc of DOCS) {
  for (const code of DOC_LANGS) {
    const id = doc.files[code];
    if (id) filePathById.set(id, `assets/guides/current/${code}/${doc.slug}.html`);
  }
}
for (const video of VIDEOS) {
  for (const code of VIDEO_LANGS) {
    const id = video.files[code];
    if (id) filePathById.set(id, `assets/guides/current/video/${video.no}_${code}.mp4`);
  }
}
filePathById.set(CATALOG.indexes.master, "assets/guides/current/index.html");
filePathById.set(CATALOG.indexes.textIndex, "assets/guides/current/index.html");
filePathById.set(CATALOG.indexes.videoZip, "assets/guides/current/index.html");
filePathById.set(CATALOG.indexes.textFolder, "assets/guides/current/index.html");
filePathById.set(CATALOG.indexes.videoFolder, "assets/guides/current/index.html");
const folderIds = [CATALOG.sourceFolder, driveFolder(CATALOG.indexes.textFolder), driveFolder(CATALOG.indexes.videoFolder)]
  .map((url) => String(url).match(/\/folders\/([^/?]+)/)?.[1])
  .filter(Boolean);
for (const id of folderIds) filePathById.set(id, "assets/guides/current/index.html");

function rewriteDriveUrls(text, prefix, label) {
  let replaced = 0;
  const fileRe = /https:\/\/drive\.google\.com\/file\/d\/([^/"'\s]+)\/view\?usp=drive_link/g;
  const folderRe = /https:\/\/drive\.google\.com\/drive\/folders\/([^/?'"\s]+)\?usp=drive_link/g;
  const out = text
    .replace(fileRe, (match, id) => {
      const rel = filePathById.get(id);
      if (!rel) throw new Error(`${label}: 카탈로그에 없는 Drive ID ${id}`);
      replaced++;
      return `${prefix}${rel}`;
    })
    .replace(folderRe, (match, id) => {
      const rel = filePathById.get(id) ?? "assets/guides/current/index.html";
      replaced++;
      return `${prefix}${rel}`;
    });
  if (/drive\.google\.com/i.test(out)) throw new Error(`${label}: Drive URL이 남아 있습니다`);
  return { text: out, replaced };
}
function updateStaticLinks() {
  const manualsDir = path.join(ROOT, "manuals");
  let pages = 0;
  for (const lang of LANGS) {
    const dir = path.join(manualsDir, lang.code);
    for (const name of fs.readdirSync(dir).filter((n) => n.endsWith(".html"))) {
      const file = path.join(dir, name);
      const original = fs.readFileSync(file, "utf8");
      let { text } = rewriteDriveUrls(original, "../../", `manuals/${lang.code}/${name}`);
      text = text
        .replace(/2026-11-18 최신본을 Google Drive에서 열기/g, "2026-11-18 현재판을 이 사이트에서 열기")
        .replace(/Google Drive에서 열기/g, "이 사이트에서 열기")
        .replace(/공유 Drive/g, "이 사이트");
      fs.writeFileSync(file, cleanText(text), "utf8");
      pages++;
    }
  }
  const guideFile = path.join(ROOT, "user-guide.html");
  let guide = fs.readFileSync(guideFile, "utf8");
  ({ text: guide } = rewriteDriveUrls(guide, "", "user-guide.html"));
  guide = guide
    .replace(/href="manuals\/ko\/index\.html"/g, 'href="assets/guides/current/ko/index.html"')
    .replace(/<p style="margin-top:10px;font-size:13px">[\s\S]*?<\/p>/, '<p style="margin-top:10px;font-size:13px"><a href="assets/guides/current/index.html" target="_blank" rel="noopener noreferrer">현재 가이드 색인 ↗</a></p>')
    .replace(/CURRENT DRIVE GUIDE LIBRARY/g, "CURRENT GUIDE LIBRARY")
    .replace(/공유 Drive의 현재판입니다\.[^<]*/g, "이 사이트에 보관한 2026-11-18 현재판입니다. 24주제 × 4개 언어 문서 96개와 KO/EN 영상 65편을 연결했습니다. 이전 버전 정적 사본 링크는 제거했고, 문서와 영상은 이 사이트에서 바로 열립니다.")
    .replace(/최신 상세 가이드 \(Google Drive에서 열기\)/g, "현재 상세 가이드 (이 사이트에서 열기)")
    .replace(/화면별 상세 가이드 \(새 탭\)/g, "현재 상세 가이드 (이 사이트에서 열기)")
    .replace(/현재 가이드 목록 · 문서 96 \/ 영상 65 \(새 탭\)/g, "현재 가이드 목록 · 문서 96 / 영상 65 (이 사이트에서 열기)")
    .replace(/현재 상세 가이드 \(새 탭\)/g, "현재 상세 가이드 (이 사이트에서 열기)")
    .replace(/최신 가이드 목록/g, "현재 가이드 목록")
    .replace(/Google Drive에서 열기/g, "이 사이트에서 열기")
    .replace(/공유 Drive/g, "이 사이트");
  fs.writeFileSync(guideFile, cleanText(guide), "utf8");
  console.log(`✔ 정적 안내 페이지 ${pages + 1}개의 링크를 같은 출처 자산으로 갱신`);
}

const stage = fs.mkdtempSync(path.join(os.tmpdir(), "xconda-current-guides-"));
try {
  const screenDir = path.join(stage, "screens");
  const videoDir = path.join(stage, "video");
  fs.mkdirSync(screenDir, { recursive: true });
  fs.mkdirSync(videoDir, { recursive: true });
  let imageCount = 0;
  let videoCount = 0;
  const manifest = { updated: CATALOG.updated, docs: [], videos: [] };
  for (const lang of LANGS) {
    const langDir = path.join(stage, lang.code);
    fs.mkdirSync(langDir, { recursive: true });
    for (const docMeta of DOCS) {
      const raw = fs.readFileSync(rawHtmlFor(docMeta, lang), "utf8")
        .replace(/https?:\/\/localhost:8010/g, "local server address")
        .replace(/localhost:8010/g, "local server address");
      const extracted = extractImages(raw, screenDir);
      imageCount += extracted.count;
      const dom = new JSDOM(extracted.text);
      try {
        const doc = sanitize(dom.window.document, lang, docMeta);
        if (!doc.body.textContent.trim() || doc.body.textContent.trim().length < 200) throw new Error("본문이 너무 짧습니다");
        if (/data:image\//i.test(doc.body.innerHTML)) throw new Error("인라인 이미지가 남아 있습니다");
        fs.writeFileSync(path.join(langDir, `${docMeta.slug}.html`), cleanText(dom.serialize()), "utf8");
      } finally {
        dom.window.close();
      }
      manifest.docs.push({ no: docMeta.no, slug: docMeta.slug, lang: lang.code, path: `assets/guides/current/${lang.code}/${docMeta.slug}.html` });
    }
    fs.writeFileSync(path.join(langDir, "index.html"), cleanText(createIndex(lang)), "utf8");
  }
  for (const video of VIDEOS) {
    for (const code of VIDEO_LANGS) {
      const id = video.files[code];
      if (!id) continue;
      const source = rawVideoFor(video, LANGS.find((lang) => lang.code === code));
      const bytes = fs.readFileSync(source);
      if (bytes.subarray(4, 8).toString("ascii") !== "ftyp") throw new Error(`MP4 헤더가 올바르지 않습니다: ${path.basename(source)}`);
      const filename = `${video.no}_${code}.mp4`;
      fs.writeFileSync(path.join(videoDir, filename), bytes);
      manifest.videos.push({ no: video.no, lang: code, path: `assets/guides/current/video/${filename}` });
      videoCount++;
    }
  }
  if (manifest.docs.length !== 96 || videoCount !== 65) throw new Error(`산출물 수가 맞지 않습니다 (${manifest.docs.length}/${videoCount})`);
  fs.writeFileSync(path.join(stage, "manifest.json"), cleanText(`${JSON.stringify(manifest, null, 2)}\n`), "utf8");
  const copyText = (source, destination) => fs.writeFileSync(destination, cleanText(fs.readFileSync(source, "utf8")), "utf8");
  copyText(path.join(ROOT, "manuals/assets/navigation.css"), path.join(stage, "navigation.css"));
  copyText(path.join(ROOT, "manuals/assets/index.css"), path.join(stage, "index.css"));
  copyText(path.join(ROOT, "manuals/assets/zoom.js"), path.join(stage, "zoom.js"));
  fs.writeFileSync(path.join(stage, "embed.js"), "(() => { if (new URLSearchParams(location.search).has('embedded')) document.documentElement.classList.add('xconda-guide-embedded'); })();\n", "utf8");
  fs.writeFileSync(path.join(stage, "index.html"), cleanText(createRootIndex()), "utf8");
  // Verify every extracted screenshot is reachable from the staged HTML before replacing the served directory.
  for (const lang of LANGS) {
    const dir = path.join(stage, lang.code);
    for (const name of fs.readdirSync(dir).filter((n) => n.endsWith(".html"))) {
      const html = fs.readFileSync(path.join(dir, name), "utf8");
      for (const src of html.matchAll(/src="\.\.\/screens\/([a-f0-9]{64}\.(?:png|jpg|webp))"/g)) {
        if (!fs.existsSync(path.join(screenDir, src[1]))) throw new Error(`${lang.code}/${name}: 이미지 없음 ${src[1]}`);
      }
      if (/data:image\/|data:font\/|@import|drive\.google\.com|localhost:8010|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(html)) {
        throw new Error(`${lang.code}/${name}: 금지된 원본 참조가 남아 있습니다`);
      }
    }
  }
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.cpSync(stage, OUT, { recursive: true });
  updateStaticLinks();
  console.log(`✔ 현재판 HTML ${manifest.docs.length}개 · 영상 ${videoCount}개 · 고유 이미지 ${fs.readdirSync(screenDir).length}개 · 이미지 참조 ${imageCount}개`);
  console.log(`✔ ${path.relative(ROOT, OUT)} 에 같은 출처 자산으로 게시`);
  // Keep the original catalogue helpers honest about the only public source URLs.
  void driveView;
} finally {
  fs.rmSync(stage, { recursive: true, force: true });
}
