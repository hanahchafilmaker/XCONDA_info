/* =============================================================================
 * 노션 속성(필드) 규칙 — **사이트(src/)와 동기화 스크립트(scripts/)가 함께** 사용
 * -----------------------------------------------------------------------------
 * ▸ 사이트  : src/notionPublic.ts (정적 스냅샷 · 공개 프록시 행 → Entry), src/notion.ts (Worker)
 * ▸ 동기화  : scripts/notion-snapshot.mjs (`__cover` 기록 · Actions 요약의 썸네일 · 작성자 열)
 * 규칙을 한 곳에서 관리하지 않으면 "노션엔 이미지가 있는데 사이트 썸네일은 비어 있는",
 * "작성자 칸을 채웠는데 사이트에 안 나오는" 불일치가 생깁니다.
 * 바꾸실 때는 이 파일만 고치면 됩니다.
 *
 * ── 작성자 ──────────────────────────────────────────────────────────────────
 * 표에 `Author`(또는 `작성자`) 속성을 만들면 그 값이 블로그 카드와 상세 모달에 표시됩니다.
 *
 * 썸네일 우선순위 (위에서 먼저 있으면 그것을 씁니다)
 *   1) 표의 `Cover`(또는 `커버` · `썸네일`) 속성
 *   2) 노션 페이지 커버 (블록의 `format.page_cover`)
 *   3) **본문에 넣은 첫 번째 이미지 블록** — Cover 칸을 비워도 이미지가 있으면 썸네일이 됩니다
 * 셋 다 없으면 카드에 자리 표시자(placeholder)가 나옵니다.
 *
 * ⚠️ 노션에 직접 올린 파일(`attachment:` · S3 · secure.notion-static.com)은 브라우저에서
 *    바로 열리지 않으므로 `signNotionImage()` 로 notion.so 이미지 프록시 주소를 만듭니다.
 * ========================================================================== */

/** 표에서 썸네일로 인정하는 속성 이름 (대소문자 · 띄어쓰기 무시) */
export const COVER_KEYS = ["Cover", "커버", "썸네일", "Thumbnail", "Image", "이미지"];

/** 표에서 작성자로 인정하는 속성 이름 — 노션 "사람(Person)" 속성이면 이름이 그대로 들어옵니다. */
export const AUTHOR_KEYS = ["Author", "작성자", "글쓴이", "Written by", "By", "작성자명"];

/** 영문 작성자 표기 (EN 모드) */
export const AUTHOR_EN_KEYS = ["Author EN", "English Author", "작성자 EN", "영문 작성자"];

/** 본문 블록 트리 탐색 깊이 제한 (비정상 데이터에서 무한 재귀 방지) */
const MAX_DEPTH = 8;

const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

const undash = (id) => String(id ?? "").replace(/-/g, "").toLowerCase();

/**
 * 노션 내부 이미지 주소를 브라우저에서 열 수 있는 공개 프록시 주소로 변환합니다.
 * 이미 프록시 주소이거나 외부(https) 이미지면 그대로 돌려줍니다.
 */
export function signNotionImage(src, blockId) {
  const value = typeof src === "string" ? src : "";
  if (!value || value.startsWith("data:")) return value;
  if (/^https?:\/\/www\.notion\.so\/image\//i.test(value)) return value; // 이미 프록시 주소
  const internal =
    value.startsWith("/") ||
    value.startsWith("attachment:") ||
    /(^https?:\/\/)(s3[^/]*\.amazonaws\.com|file\.notion\.so|prod-files-secure)/i.test(value) ||
    value.includes("secure.notion-static.com") ||
    /^https?:\/\/(www\.)?notion\.(so|site)\/(signed|file|secure)\//i.test(value);
  if (!internal) return value;
  const abs = value.startsWith("/") ? `https://www.notion.so${value}` : value;
  return `https://www.notion.so/image/${encodeURIComponent(abs)}?table=block&id=${blockId}&cache=v2`;
}

/** 레거시 rich text 값 `[["https://…"]]` → 문자열 */
function legacyText(value) {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.map((part) => (Array.isArray(part) ? String(part[0] ?? "") : "")).join("");
}

/** record map(`{ [blockId]: { value } }` 또는 `{ [blockId]: { value: { value } } }`) → 블록 맵 */
function toBlockMap(pageMap) {
  const map = new Map();
  if (!isRecord(pageMap)) return map;
  for (const entry of Object.values(pageMap)) {
    const v = entry?.value?.value ?? entry?.value;
    if (isRecord(v) && v.id && v.type) map.set(undash(v.id), v);
  }
  return map;
}

/** 노션 첨부(`attachment:<파일ID>:<이름>`)를 실제 파일 저장소(prod-files) 주소로 바꿉니다. */
const PROD_FILES = "https://prod-files-secure.s3.us-west-2.amazonaws.com";
function prodFilesUrl(src, spaceId) {
  const m = /^attachment:([0-9a-f-]{32,36}):(.+)$/i.exec(typeof src === "string" ? src.trim() : "");
  const space = typeof spaceId === "string" && spaceId ? spaceId.trim() : "";
  if (!m || !space) return "";
  return `${PROD_FILES}/${space}/${m[1]}/${m[2]}`;
}

/**
 * 노션 "사람(Person)" 셀에서 **이름만** 꺼냅니다.
 * 레거시 셀은 `[["‣"], [["u", "<계정ID>", "이름"]]]` 처럼 계정 참조가 배열 속에 들어 있어
 * 그대로 문자열로 만들면 "‣" 가 작성자 이름으로 표시됩니다.
 * 이름을 찾지 못하면 빈 문자열을 돌려줍니다(→ 사이트에 작성자를 표시하지 않음).
 */
export function personNames(value) {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value)) return "";
  const names = [];
  let sawUser = false;
  const walk = (node) => {
    if (!Array.isArray(node)) return;
    if (node[0] === "u") {
      // ["u", 계정ID, 이름?] — 이름이 함께 오는 경우만 사용
      sawUser = true;
      if (typeof node[2] === "string" && node[2].trim()) names.push(node[2].trim());
      return;
    }
    for (const child of node) walk(child);
  };
  walk(value);
  if (names.length) return [...new Set(names)].join(", ");
  if (sawUser) return ""; // 계정 참조만 있고 이름을 알 수 없음 → 작성자를 표시하지 않습니다
  const text = legacyText(value).trim(); // 텍스트 속성(예: `작성자`)은 그대로 통과
  return text === "\u2023" ? "" : text; // "‣" 는 이름이 아닌 자리 표시자
}

/** 이미지 블록의 원본 주소 (properties.source → format.display_source) */
function imageSource(block) {
  const props = isRecord(block.properties) ? block.properties : {};
  const format = isRecord(block.format) ? block.format : {};
  const raw = legacyText(props.source) || (typeof format.display_source === "string" ? format.display_source : "");
  return raw.trim();
}

/**
 * 본문 블록 트리를 문서 순서대로 훑어 첫 이미지 블록을 찾습니다.
 * 컬럼(column) · 토글 안에 있는 이미지도 그대로 찾습니다.
 */
function firstImageBlock(blocks, ids, depth = 0, seen = new Set()) {
  if (depth > MAX_DEPTH || !Array.isArray(ids)) return null;
  for (const id of ids) {
    const key = undash(id);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const block = blocks.get(key);
    if (!block) continue;
    if (block.type === "image" && imageSource(block)) return block;
    const children = firstImageBlock(blocks, block.content, depth + 1, seen);
    if (children) return children;
  }
  return null;
}

/** 페이지 블록 찾기 — 스냅샷(하이픈 있음) · 프록시(하이픈 없음) 어느 쪽이든 동작 */
function rootBlock(blocks, pageId) {
  return blocks.get(undash(pageId)) ?? [...blocks.values()].find((b) => /^page$/.test(String(b.type)));
}

/**
 * 글 하나의 본문 record map 에서 썸네일로 쓸 공개 이미지 주소를 만듭니다.
 * 페이지 커버가 있으면 그것을, 없으면 본문 첫 이미지를 씁니다. (없으면 null)
 *
 * `fallback` 은 같은 이미지의 **다른 공개 주소**입니다. 노션 첨부는 프록시 주소 형태가
 * 두 가지(`attachment:` 그대로 · 실제 prod-files 주소)인데 어느 쪽이 열리는지는
 * 워크스페이스 상태에 따라 달라질 수 있어, 먼저 실패하면 다음 주소로 다시 시도합니다.
 * (SmartImage 의 onError 체인 — 둘 다 실패하면 자리 표시자)
 *
 * @returns {{ url: string, source: "page_cover" | "body_image", fallback?: string } | null}
 */
export function coverFromPageMap(pageMap, pageId) {
  const blocks = toBlockMap(pageMap);
  if (!blocks.size) return null;
  const root = rootBlock(blocks, pageId);
  const pageCover = root && isRecord(root.format) ? root.format.page_cover : "";
  if (typeof pageCover === "string" && pageCover.trim()) {
    return { url: signNotionImage(pageCover.trim(), root.id), source: "page_cover" };
  }
  const image = firstImageBlock(blocks, root?.content ?? [...blocks.keys()]);
  if (!image) return null;
  const src = imageSource(image);
  const alt = prodFilesUrl(src, image.space_id);
  const urls = [alt ? signNotionImage(alt, image.id) : "", signNotionImage(src, image.id)].filter(Boolean);
  return {
    url: urls[0],
    source: "body_image",
    ...(urls[1] && urls[1] !== urls[0] ? { fallback: urls[1] } : {}),
  };
}

/** 사람이 읽는 썸네일 출처 (Actions 요약 · 동기화 로그) */
export const COVER_SOURCE_LABELS = { cover_property: "Cover 속성", page_cover: "페이지 커버", body_image: "본문 첫 이미지" };
