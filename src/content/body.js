/* =============================================================================
 * 본문(노션 record map) 해석 · HTML 출력 — **사이트(src/)와 빌드 스크립트(scripts/)가 함께** 사용
 * -----------------------------------------------------------------------------
 * ▸ parseLegacyRecordMap : 스냅샷/공개 프록시의 record map → Block[] (앱 상세 모달이 씀)
 * ▸ blocksToHtml         : Block[] → HTML 문자열 (글별 정적 페이지 `post/{slug}/index.html` 이 씀)
 *
 * 출력 규칙 (검색 · 공유 미리보기 대응)
 *   - 노션 H1(heading_1) 은 h2 로 내립니다. <h1> 은 글 제목 한 번만 씁니다.
 *   - 노션 H2 → <h2>, H3 → <h3> 그대로.
 *   - 이미지 alt = 노션 캡션(측션). 캡션이 비면 `alt` 옵션(글 제목)을 씁니다.
 * ========================================================================== */

import { signNotionImage } from "./fields.js";


const undash = (id) => String(id ?? "").replace(/-/g, "").toLowerCase();

/** 하이픈 없는 32자리 ID → 8-4-4-4-12 형태 */
export const dashed = (id) => {
  const raw = undash(id);
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
};

/** notion.so / notion.site URL, 32자리 ID, UUID 등에서 페이지 ID를 추출 */
export function extractPageId(input) {
  const m = String(input ?? "").replace(/-/g, "").match(/[0-9a-f]{32}(?![0-9a-f])/i);
  return m ? m[0].toLowerCase() : undefined;
}

/* ------------------------------ 입력: record map → Block[] ------------------------------ */

/** legacy rich text → Rich. 예: [["텍스트", [["b"], ["a", "url"]]]] */
function legacyRich(val) {
  if (!Array.isArray(val)) return "";
  const segs = [];
  for (const item of val) {
    if (!Array.isArray(item)) continue;
    const [text, decos] = item;
    if (typeof text !== "string") continue;
    const seg = { text };
    if (Array.isArray(decos)) {
      for (const d of decos) {
        if (!Array.isArray(d)) continue;
        if (d[0] === "b") seg.bold = true;
        else if (d[0] === "i") seg.italic = true;
        else if (d[0] === "s") seg.strike = true;
        else if (d[0] === "c") seg.code = true;
        else if (d[0] === "a" && d[1]) seg.href = d[1];
      }
    }
    segs.push(seg);
  }
  return segs;
}

const legacyPlain = (val) =>
  Array.isArray(val) ? val.map((i) => (Array.isArray(i) ? String(i[0] ?? "") : "")).join("") : "";

function convertLegacy(ids, map, depth = 0) {
  const out = [];
  for (const id of ids) {
    const b = map.get(id);
    if (!b) continue;
    const p = b.properties ?? {};
    const f = b.format ?? {};
    const title = legacyRich(p.title);
    const last = out[out.length - 1];
    switch (b.type) {
      case "text":
        if (legacyPlain(p.title).trim()) out.push({ type: "p", text: title });
        break;
      case "header": // 노션 H1 — 글 제목과 겹치지 않도록 h2 로 내립니다
      case "sub_header":
        out.push({ type: "h2", text: title });
        break;
      case "sub_sub_header":
        out.push({ type: "h3", text: title });
        break;
      case "bulleted_list":
        if (last?.type === "ul") last.items.push(title);
        else out.push({ type: "ul", items: [title] });
        break;
      case "numbered_list":
        if (last?.type === "ol") last.items.push(title);
        else out.push({ type: "ol", items: [title] });
        break;
      case "to_do": {
        const checked = legacyPlain(p.checked) === "Yes";
        if (last?.type === "todo") last.items.push({ text: title, checked });
        else out.push({ type: "todo", items: [{ text: title, checked }] });
        break;
      }
      case "quote":
        out.push({ type: "quote", text: title });
        break;
      case "callout":
        out.push({
          type: "callout",
          text: title,
          icon: typeof f.page_icon === "string" && f.page_icon.length <= 4 ? f.page_icon : undefined,
        });
        break;
      case "code":
        out.push({ type: "code", text: legacyPlain(p.title), language: legacyPlain(p.language).toLowerCase() || undefined });
        break;
      case "divider":
        out.push({ type: "divider" });
        break;
      case "image": {
        const src = legacyPlain(p.source) || f.display_source || "";
        // 본문 이미지 · 썸네일이 같은 규칙(src/content/fields.js)으로 공개 주소를 만듭니다.
        if (src) out.push({ type: "img", src: signNotionImage(src, b.id), caption: legacyPlain(p.caption) || undefined });
        break;
      }
      case "video": {
        const src = f.display_source || legacyPlain(p.source) || "";
        if (src) out.push({ type: "video", src, caption: legacyPlain(p.caption) || undefined });
        break;
      }
      case "bookmark":
      case "embed": {
        const href = legacyPlain(p.link) || legacyPlain(p.source) || f.display_source || "";
        if (href) out.push({ type: "link", href, caption: legacyPlain(p.caption) || legacyPlain(p.description) || undefined });
        break;
      }
      case "toggle":
        out.push({
          type: "toggle",
          text: title,
          children: depth < 2 && b.content?.length ? convertLegacy(b.content, map, depth + 1) : undefined,
        });
        break;
      default:
        break;
    }
  }
  return out;
}

/** 레거시 레코드맵(`{ id: { value } }`) → 블록 목록 (앱 상세 모달 · 정적 페이지 공용) */
export function parseLegacyRecordMap(data, pageId) {
  const map = new Map();
  for (const [id, entry] of Object.entries(data ?? {})) {
    const v = entry?.value?.value ?? entry?.value; // 응답 형태 2종 모두 지원
    if (v?.id && v?.type) map.set(id, v);
  }
  const plainId = extractPageId(pageId) ?? String(pageId ?? "").replace(/-/g, "");
  const root = map.get(dashed(plainId)) ?? map.get(pageId) ?? map.get(plainId);
  return root?.content?.length ? convertLegacy(root.content, map) : [];
}

/* ------------------------------ 출력: Block[] → HTML ------------------------------ */

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isHttp = (href) => /^https?:\/\//i.test(String(href ?? ""));

/** Rich → HTML (서식 · 링크 · 줄바꿈 보존) */
export function richToHtml(rich) {
  if (typeof rich === "string") return esc(rich).replace(/\n/g, "<br>");
  if (!Array.isArray(rich)) return "";
  return rich
    .map((seg) => {
      let html = esc(seg.text).replace(/\n/g, "<br>");
      if (seg.code) html = `<code>${html}</code>`;
      if (seg.bold) html = `<strong>${html}</strong>`;
      if (seg.italic) html = `<em>${html}</em>`;
      if (seg.strike) html = `<s>${html}</s>`;
      if (isHttp(seg.href)) html = `<a href="${esc(seg.href)}" rel="noopener noreferrer">${html}</a>`;
      return html;
    })
    .join("");
}

function blockToHtml(block, options) {
  const { alt = "" } = options;
  switch (block.type) {
    case "p":
      return `<p>${richToHtml(block.text)}</p>`;
    case "h2":
      return `<h2>${richToHtml(block.text)}</h2>`;
    case "h3":
      return `<h3>${richToHtml(block.text)}</h3>`;
    case "ul":
      return `<ul>${block.items.map((it) => `<li>${richToHtml(it)}</li>`).join("")}</ul>`;
    case "ol":
      return `<ol>${block.items.map((it) => `<li>${richToHtml(it)}</li>`).join("")}</ol>`;
    case "todo":
      return `<ul class="todo">${block.items
        .map((it) => `<li><input type="checkbox" disabled${it.checked ? " checked" : ""}> ${richToHtml(it.text)}</li>`)
        .join("")}</ul>`;
    case "quote":
      return `<blockquote><p>${richToHtml(block.text)}</p></blockquote>`;
    case "callout":
      return `<aside class="callout"><p>${block.icon ? `${esc(block.icon)} ` : ""}${richToHtml(block.text)}</p></aside>`;
    case "code":
      return `<pre><code${block.language ? ` class="language-${esc(block.language)}"` : ""}>${esc(block.text)}</code></pre>`;
    case "img": {
      if (!block.src) return "";
      // 캡션(측션)이 alt. 비어 있으면 글 제목을 기본값으로 씁니다.
      const text = String(block.caption || alt || "").trim();
      return `<figure><img src="${esc(block.src)}" alt="${esc(text)}" loading="lazy" decoding="async"></figure>`;
    }
    case "video":
      return `<p><a href="${esc(block.src)}" rel="noopener noreferrer">${esc(block.caption || block.src)}</a></p>`;
    case "link":
      return isHttp(block.href)
        ? `<p><a href="${esc(block.href)}" rel="noopener noreferrer">${esc(block.caption || block.href)}</a></p>`
        : "";
    case "toggle": {
      const inner = (block.children ?? []).map((c) => blockToHtml(c, options)).join("\n");
      return `<details><summary>${richToHtml(block.text)}</summary>${inner}</details>`;
    }
    case "divider":
      return "<hr>";
    default:
      return "";
  }
}

/**
 * 블록 목록 → HTML 문자열.
 * @param {object[]} blocks
 * @param {{ alt?: string }} [options] alt — 캡션이 없는 이미지에 쓸 기본 설명(보통 글 제목)
 */
export function blocksToHtml(blocks, options = {}) {
  return (blocks ?? [])
    .map((b) => blockToHtml(b, { alt: options.alt ?? "" }))
    .filter(Boolean)
    .join("\n");
}
