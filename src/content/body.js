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
        else if (d[0] === "color" && d[1]) seg.color = d[1];
      }
    }
    segs.push(seg);
  }
  return segs;
}

const legacyPlain = (val) =>
  Array.isArray(val) ? val.map((i) => (Array.isArray(i) ? String(i[0] ?? "") : "")).join("") : "";

function convertLegacy(ids, map, depth = 0, entryTitle = "알 수 없는 글") {
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
        if (legacyPlain(p.title).trim()) out.push({ type: "p", text: title, ...(f.block_color ? { color: f.block_color } : {}) });
        break;
      case "header": // 노션 H1 — 글 제목과 겹치지 않도록 h2 로 내립니다
      case "sub_header":
        out.push({ type: "h2", text: title, ...(f.block_color ? { color: f.block_color } : {}) });
        break;
      case "sub_sub_header":
        out.push({ type: "h3", text: title, ...(f.block_color ? { color: f.block_color } : {}) });
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
          color: f.block_color,
          children: b.content?.length ? convertLegacy(b.content, map, depth + 1, entryTitle) : undefined,
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
      case "column_list":
        out.push({ type: "column_list", children: b.content?.length ? convertLegacy(b.content, map, depth + 1, entryTitle) : [] });
        break;
      case "column":
        out.push({ type: "column", ratio: Number(f.column_ratio) || undefined, children: b.content?.length ? convertLegacy(b.content, map, depth + 1, entryTitle) : [] });
        break;
      case "file":
      case "pdf":
      case "audio": {
        const rawSrc = f.display_source || legacyPlain(p.source) || legacyPlain(p.title);
        const src = rawSrc ? signNotionImage(rawSrc, b.id) : "";
        const caption = legacyPlain(p.caption) || legacyPlain(p.title) || undefined;
        if (src) {
          if (b.type === "file") out.push({ type: "file", name: caption || "Download file", url: src, size: f.size });
          else out.push({ type: b.type, src, caption });
        }
        break;
      }
      case "table": {
        const columnOrder = Array.isArray(f.table_block_column_order) ? f.table_block_column_order : null;
        const rows = (b.content ?? []).map((rowId) => {
          const row = map.get(rowId);
          const props = row?.properties ?? {};
          const keys = columnOrder?.length ? columnOrder : Object.keys(props);
          return { cells: keys.map((key) => legacyRich(props[key])) };
        });
        out.push({ type: "table", rows });
        break;
      }
      case "toggle":
        out.push({ type: "toggle", text: title, children: b.content?.length ? convertLegacy(b.content, map, depth + 1, entryTitle) : undefined });
        break;
      default:
        console.warn(`지원하지 않는 블록: ${b.type} (${entryTitle})`);
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
  const entryTitle = legacyPlain(root?.properties?.title) || "알 수 없는 글";
  return root?.content?.length ? convertLegacy(root.content, map, 0, entryTitle) : [];
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
      if (seg.color && /^[a-z_]+$/.test(seg.color)) html = `<span class="notion-${esc(seg.color)}">${html}</span>`;
      if (isHttp(seg.href)) html = `<a href="${esc(seg.href)}" rel="noopener noreferrer">${html}</a>`;
      return html;
    })
    .join("");
}

function blockToHtml(block, options) {
  const { alt = "" } = options;
  switch (block.type) {
    case "p":
      return `<p class="notion-${esc(block.color || "default")}">${richToHtml(block.text)}</p>`;
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
    case "callout": {
      const inner = (block.children ?? []).map((c) => blockToHtml(c, options)).join("\n");
      return `<aside class="callout notion-${esc(block.color || "default")}"><p>${block.icon ? `${esc(block.icon)} ` : ""}${richToHtml(block.text)}</p>${inner}</aside>`;
    }
    case "column_list":
      return `<div class="notion-columns">${(block.children ?? []).map((c) => blockToHtml(c, options)).join("\n")}</div>`;
    case "column":
      return `<div class="notion-column" style="--column-ratio:${Math.max(0.1, Math.min(1, Number(block.ratio) || 0.5))}">${(block.children ?? []).map((c) => blockToHtml(c, options)).join("\n")}</div>`;
    case "file":
      return isHttp(block.url) ? `<a class="notion-file" href="${esc(block.url)}" download>${esc(block.name)}${block.size ? ` <small>${esc(block.size)}</small>` : ""}</a>` : "";
    case "pdf":
      return isHttp(block.src) ? `<a class="notion-file" href="${esc(block.src)}" target="_blank" rel="noopener noreferrer">${esc(block.caption || "PDF 보기")}</a>` : "";
    case "audio":
      return isHttp(block.src) ? `<figure><audio controls preload="metadata" src="${esc(block.src)}"></audio>${block.caption ? `<figcaption>${esc(block.caption)}</figcaption>` : ""}</figure>` : "";
    case "table":
      return `<div class="notion-table-wrap"><table><tbody>${(block.rows ?? []).map((r) => `<tr>${r.cells.map((cell) => `<td>${richToHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    case "code":
      return `<pre><code${block.language ? ` class="language-${esc(block.language)}"` : ""}>${esc(block.text)}</code></pre>`;
    case "img": {
      if (!block.src) return "";
      // 캡션(측션)이 alt. 비어 있으면 글 제목을 기본값으로 씁니다.
      const text = String(block.caption || alt || "").trim();
      return `<figure><img src="${esc(block.src)}" alt="${esc(text)}" loading="lazy" decoding="async"></figure>`;
    }
    case "video":
      return /\.(mp4|webm|ogg)(?:[?#]|$)/i.test(block.src) ? `<video controls playsinline preload="metadata" src="${esc(block.src)}" class="notion-video"></video>` : `<p><a href="${esc(block.src)}" rel="noopener noreferrer">${esc(block.caption || block.src)}</a></p>`;
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
