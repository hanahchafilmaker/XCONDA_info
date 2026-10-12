/* =============================================================================
 * 허브 Q&A 표(XCONDA 허브 Q&A) 규칙 — **한 곳에서만 관리**
 * -----------------------------------------------------------------------------
 * 이 파일은 **동기화 스크립트(scripts/)와 사이트(src/)가 함께** 사용합니다.
 *
 * 왜 따로 있나
 *   공지 · 뉴스 · 가이드 · 블로그 · FAQ 는 `XCONDA_NEWs` 표 하나에서 옵니다
 *   (분류 규칙: src/content/classify.js). 고객 지원용 Q&A 78건은 **별도 표**
 *   (`XCONDA 허브 Q&A`)에 있고, 구조가 다릅니다.
 *     ▸ 질문 1건 = 노션 페이지 1개 (질문은 `질문` 제목 열, 나머지는 속성)
 *     ▸ 답변 본문은 페이지 안의 `답변` 섹션에 있습니다 (체크박스가 아니라 문단)
 *     ▸ 게시 여부도 체크박스가 아니라 `상태` · `허브 게시` 두 열로 판단합니다
 *
 * 게시 규칙 (표 → 사이트)
 *   1) `허브 게시` = 게시 / 공개 / 노출      → 상태와 무관하게 **노출** (강제 공개)
 *   2) `허브 게시` = 보류 / 숨김 / 내림      → **제외** (강제 숨김)
 *   3) 그 밖(미게시 · 비어 있음)은 `상태` 로 판단
 *        `상태` 에 확인 필요 / 정보 필요 / 검토 / 작성 중 / 보류 등이 있으면 **제외**
 *        그 외(`초안 완료` 등)는 **노출**
 *
 *   ⚠️ `게시` 라는 이름의 열은 이 표에 만들지 마세요.
 *      메인 표의 Published 별칭(src/content/classify.js `PUBLISHED_KEYS`)과 겹쳐서
 *      "미게시" 값이 "미공개"로 잘못 읽힙니다. (`허브 게시` 는 겹치지 않습니다)
 *
 * 본문 규칙 (노션 페이지 → 사이트)
 *   `답변` 섹션           → 목록에서 펼치면 보이는 답변 글 (Summary)
 *   `게시용 출처` 섹션     → 상세 모달의 출처 목록 (본문)
 *   `내부 근거` · `확인·추가 필요 정보` 등 나머지 섹션 → **사이트로 내려가지 않습니다**
 *   (섹션 제목을 못 찾은 페이지는 본문 전체를 공개하고, Actions 요약에 경고를 남깁니다)
 * ========================================================================== */

/** 이 글은 허브 Q&A 표에서 왔다는 표시 (스냅샷 행의 `__source`) */
export const HUB_QNA_SOURCE = "hub-qna";

/* ------------------------------ 속성 이름 ------------------------------ */

/** 질문(제목) 열 */
export const HUB_TITLE_KEYS = ["질문", "Question", "Title", "제목"];
/** 카테고리 열 — 사이트의 Q&A 분류·뱃지로 그대로 씁니다 */
export const HUB_CATEGORY_KEYS = ["카테고리", "Category", "분류"];
/** 우선순위 열 — 1이 가장 급함. 정렬(Order)에 반영됩니다 */
export const HUB_PRIORITY_KEYS = ["우선순위", "Priority", "중요도"];
/** 엑셀 원본의 질문 번호 — 정렬(Order)에 반영됩니다 */
export const HUB_NUMBER_KEYS = ["No", "NO", "no.", "번호", "순번"];
/** 검수 상태 열 (`초안 완료` · `일부 확인 필요` · `정보 필요` …) */
export const HUB_STATUS_KEYS = ["상태", "Status", "검수 상태"];
/** 허브 게시 열 (`게시` · `미게시` · `보류`) — `게시` 단독 이름은 쓰지 않습니다(위 주석) */
export const HUB_PUBLISH_KEYS = ["허브 게시", "허브게시", "Hub Publish", "게시 여부"];

/** `허브 게시` 값 — 강제 공개 */
export const HUB_PUBLISH_VALUES = ["게시", "게시됨", "공개", "노출", "예", "yes", "y", "o", "true", "v", "✓"];
/** `허브 게시` 값 — 강제 숨김 */
export const HUB_HOLD_VALUES = ["보류", "보류중", "숨김", "제외", "내림", "hold", "hidden", "no", "n", "x", "false"];

/** `상태` 값에 이 조각이 있으면 "아직 게시하면 안 되는 글" 로 봅니다. */
export const HUB_CHECK_PATTERNS = ["확인필요", "정보필요", "검토", "작성중", "미완", "보류", "검증필요", "needscheck"];

/* ------------------------------ 본문 섹션 ------------------------------ */

/** 답변 섹션 제목 */
export const HUB_ANSWER_HEADINGS = [/답변/, /^answer/, /^a$/];
/** 출처 섹션 제목 — 상세 모달에만 나갑니다 */
export const HUB_SOURCE_HEADINGS = [/게시용\s*출처/, /^출처/, /^source/];
/** 내부용 섹션 제목 — 사이트로 내려가지 않습니다 */
export const HUB_INTERNAL_HEADINGS = [
  /내부\s*근거/,
  /내부/,
  /비공개/,
  /^메모/,
  /internal/,
  /note\s*to\s*self/,
  /^확인\s*[·・]?\s*추가/,
  /^확인\s*필요/,
];

/** 본문·답변에서 걸러 낼 "내부 메모" 문단 (섹션 제목 없이 콜아웃만 붙인 경우) */
const INTERNAL_NOTE_PATTERNS = [
  /^확인\s*[·・]?\s*추가\s*필요/,
  /^확인\s*필요/,
  /^내부\s*(근거|메모|참고)/,
  /^비공개/,
];

/* ------------------------------ 유틸 ------------------------------ */

const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

/** 속성 이름을 대소문자·공백 무시하고 찾습니다. (없으면 undefined) */
function pickProperty(source, names) {
  if (!isRecord(source)) return undefined;
  const keys = Object.keys(source);
  for (const name of names) {
    const wanted = String(name).trim().toLowerCase().replace(/\s+/g, "");
    const hit = keys.find((key) => key.trim().toLowerCase().replace(/\s+/g, "") === wanted);
    if (hit !== undefined) return source[hit];
  }
  return undefined;
}

/** 레거시 rich text(`[["글", [["b"]]], …]`) · 신형 rich_text 배열 → 평문 */
export function richPlain(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => {
      if (Array.isArray(part)) return typeof part[0] === "string" ? part[0] : "";
      if (isRecord(part)) return typeof part.plain_text === "string" ? part.plain_text : "";
      return typeof part === "string" ? part : "";
    })
    .join("");
}

/** 행에서 문자열 값 (별칭 → 평문 → trim) */
export function hubQnaText(row, names) {
  return richPlain(pickProperty(row, names)).trim();
}

/** 행에서 숫자 값 (별칭 → Number, 숫자가 아니면 undefined) */
export function hubQnaNumberValue(row, names) {
  const raw = pickProperty(row, names);
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Number(typeof raw === "string" ? raw.replace(/[^\d.-]/g, "") : raw);
  return Number.isFinite(n) ? n : undefined;
}

/** 비교용 정규화 — 공백 · 구분 기호 · 대소문자를 없앱니다. (" 일부 확인 필요 " → "일부확인필요") */
export function normalizeHubValue(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-–—.·・|,/;:!*~^()[\]{}<>'"“”]+/g, "");
}

export const hubQnaTitle = (row) => hubQnaText(row, HUB_TITLE_KEYS);
export const hubQnaCategory = (row) => hubQnaText(row, HUB_CATEGORY_KEYS);
export const hubQnaStatus = (row) => hubQnaText(row, HUB_STATUS_KEYS);
export const hubQnaPublishValue = (row) => hubQnaText(row, HUB_PUBLISH_KEYS);
export const hubQnaPriority = (row) => hubQnaNumberValue(row, HUB_PRIORITY_KEYS);
export const hubQnaNumber = (row) => hubQnaNumberValue(row, HUB_NUMBER_KEYS);

/**
 * `상태` 가 "아직 게시하면 안 되는 상태" 인지 — 확인 필요 / 정보 필요 / 검토 / 작성 중 …
 * (비어 있으면 게시 가능으로 봅니다: 상태 열을 안 쓰는 표일 수 있으므로)
 */
export function hubQnaNeedsCheck(row) {
  const value = normalizeHubValue(hubQnaStatus(row));
  if (!value) return false;
  return HUB_CHECK_PATTERNS.some((pattern) => value.includes(pattern));
}

/**
 * 이 문항을 사이트에 넣을지 결정합니다.
 * @returns {{ include: boolean, reason: string, status: string, publish: string, forced: "publish"|"hold"|null }}
 */
export function hubQnaDecision(row) {
  const status = hubQnaStatus(row);
  const publishRaw = hubQnaPublishValue(row);
  const publish = normalizeHubValue(publishRaw);

  if (publish && HUB_PUBLISH_VALUES.includes(publish)) {
    return { include: true, reason: `허브 게시=${publishRaw || publish} → 강제 공개`, status, publish: publishRaw, forced: "publish" };
  }
  if (publish && HUB_HOLD_VALUES.includes(publish)) {
    return { include: false, reason: `허브 게시=${publishRaw || publish} → 강제 숨김`, status, publish: publishRaw, forced: "hold" };
  }
  if (hubQnaNeedsCheck(row)) {
    return {
      include: false,
      reason: `상태=${status || "(비어 있음)"} → 확인이 끝나면 게시`,
      status,
      publish: publishRaw,
      forced: null,
    };
  }
  return {
    include: true,
    reason: status ? `상태=${status} → 게시` : "상태 열 없음 → 게시",
    status,
    publish: publishRaw,
    forced: null,
  };
}

/** 사이트에 넣을지 (스냅샷 생성·사이트 읽기 양쪽에서 같은 판단) */
export const includeHubQnaRow = (row) => hubQnaDecision(row).include;

/**
 * 정렬 값 → 사이트 `Order`.
 * `우선순위`(1이 가장 급함)를 앞세우고, 같은 우선순위 안에서는 엑셀 원본 번호(`No`) 순서로 둡니다.
 *   우선순위 1 · No 16 → 1016 … 우선순위 3 · No 78 → 3078
 * (사이트 FAQ 정렬은 `order` → 날짜 순서입니다 — ContentContext.byOrder)
 */
export function hubQnaOrder(row) {
  const priority = hubQnaPriority(row);
  const number = hubQnaNumber(row);
  const band = Number.isFinite(priority) && priority >= 1 && priority <= 9 ? priority : 2; // 없으면 중간(2)
  const index = Number.isFinite(number) && number >= 0 && number <= 999 ? number : 900; // 없으면 그 묶음의 뒤쪽
  return band * 1000 + index;
}

/* ------------------------------ 본문 블록 ------------------------------ */

const HEADING_TYPES = new Set([
  "header",
  "sub_header",
  "sub_sub_header",
  "header_4",
  "heading_1",
  "heading_2",
  "heading_3",
  "heading_4",
]);

const undash = (id) => String(id ?? "").replace(/-/g, "").toLowerCase();

/** 레거시 record map(`{ [id]: { value: 블록 } }`) → `Map(id → 블록)` */
export function toBlockMap(pageMap) {
  const map = new Map();
  if (pageMap instanceof Map) return pageMap;
  if (!isRecord(pageMap)) return map;
  for (const [id, entry] of Object.entries(pageMap)) {
    const value = entry?.value?.value ?? entry?.value ?? entry;
    if (isRecord(value) && (value.id || value.type)) map.set(value.id ?? id, value);
  }
  return map;
}

/** 페이지 블록(루트) 찾기 — 하이픈 유무 · record map 형태 차이를 모두 흡수 */
function findRootBlock(map, rootId) {
  const wanted = [String(rootId ?? ""), undash(rootId)];
  for (const id of wanted) {
    const hit = map.get(id) ?? map.get([...map.keys()].find((key) => undash(key) === undash(id)) ?? "");
    if (hit) return { key: hit.id ?? id, block: hit };
  }
  for (const [key, block] of map) if (block?.type === "page") return { key: block.id ?? key, block };
  return undefined;
}

/** 블록의 rich text 배열 — 레거시(`properties.title`) · 신형(`블록[type].rich_text`) 모두 지원 */
export function blockRich(block) {
  if (!isRecord(block)) return undefined;
  if (Array.isArray(block.properties?.title)) return block.properties.title;
  const payload = block[block.type];
  if (isRecord(payload) && Array.isArray(payload.rich_text)) return payload.rich_text;
  if (Array.isArray(block.rich_text)) return block.rich_text;
  return undefined;
}

/** 블록의 평문 텍스트 */
export const blockText = (block) => richPlain(blockRich(block)).trim();

export const isHeadingBlock = (block) => isRecord(block) && HEADING_TYPES.has(String(block.type));

/** 섹션 제목 → 어디로 보낼지 ("answer" · "source" · "internal" · undefined = 알 수 없음) */
export function hubHeadingKind(heading) {
  const text = String(heading ?? "").trim();
  if (!text) return undefined;
  if (HUB_ANSWER_HEADINGS.some((re) => re.test(text))) return "answer";
  if (HUB_SOURCE_HEADINGS.some((re) => re.test(text))) return "source";
  if (HUB_INTERNAL_HEADINGS.some((re) => re.test(text))) return "internal";
  return undefined;
}

/** 내부 메모 문단인지 (섹션 제목 없이 콜아웃만 붙인 경우) */
export const isInternalNoteText = (text) => INTERNAL_NOTE_PATTERNS.some((re) => re.test(String(text ?? "").trim()));

/**
 * 페이지를 섹션으로 나눕니다.
 *   mode: "preamble"(첫 제목 앞) · "answer" · "source" · "internal" · "unknown"
 * 알 수 없는 제목은 **직전 섹션을 유지**합니다(답변 안의 소제목이 답변을 자르지 않도록).
 * @returns {Array<{ mode: string, heading: string, ids: string[] }>}
 */
export function splitHubSections(pageMap, rootId) {
  const map = toBlockMap(pageMap);
  const root = findRootBlock(map, rootId)?.block;
  const order = Array.isArray(root?.content) ? root.content : [];
  const sections = [{ mode: "preamble", heading: "", ids: [] }];
  let mode = "preamble";

  for (const id of order) {
    const block = map.get(id) ?? map.get([...map.keys()].find((key) => undash(key) === undash(id)) ?? "");
    if (!block) continue;
    if (isHeadingBlock(block)) {
      const heading = blockText(block);
      const kind = hubHeadingKind(heading);
      if (kind) mode = kind;
      else if (mode === "preamble") mode = "unknown";
      sections.push({ mode, heading, ids: [id] });
      continue;
    }
    sections[sections.length - 1].ids.push(block.id ?? id);
  }
  return sections.map((section) => ({ ...section, ids: [...section.ids] }));
}

/** 블록 하나(+자식) → 답변 글의 줄 목록 */
function blockLines(block, map, depth = 0) {
  if (!isRecord(block) || depth > 4) return [];
  const text = blockText(block);
  const children = Array.isArray(block.content) ? block.content : [];
  const childLines = () => children.flatMap((id) => blockLines(map.get(id), map, depth + 1));

  if (isInternalNoteText(text)) return []; // 내부 메모는 답변에서 제외
  if (!text) return childLines();

  const indent = depth > 0 ? "  ".repeat(depth) : "";
  switch (String(block.type)) {
    case "bulleted_list":
    case "bulleted_list_item":
    case "numbered_list":
    case "numbered_list_item":
    case "to_do":
      return [{ kind: "line", text: `${indent}- ${text}` }, ...childLines()];
    case "quote":
      return [{ kind: "para", text: `> ${text}` }, ...childLines()];
    case "table_row": {
      const cells = Object.keys(block.properties ?? {})
        .filter((key) => key !== "title")
        .sort()
        .map((key) => richPlain(block.properties[key]).trim())
        .filter(Boolean);
      return cells.length ? [{ kind: "line", text: `${indent}| ${cells.join(" | ")} |` }] : childLines();
    }
    case "image":
    case "video":
    case "divider":
      return childLines();
    default:
      return [{ kind: "para", text }, ...childLines()];
  }
}

/** 줄 목록 → 답변 텍스트 (문단 사이는 빈 줄, 목록은 줄바꿈) */
function linesToText(lines) {
  let out = "";
  let previousPara = false;
  for (const line of lines) {
    const isPara = line.kind === "para";
    if (out) out += isPara && previousPara ? "\n\n" : "\n";
    out += line.text;
    previousPara = isPara;
  }
  return out.trim();
}

/** 섹션 → 글 (제목 블록은 빼고 뽑습니다) */
function sectionText(section, map) {
  const ids = section.heading ? section.ids.slice(1) : section.ids;
  return linesToText(ids.flatMap((id) => blockLines(map.get(id), map)));
}

/**
 * 노션 페이지 → 사이트에 보여 줄 답변 글.
 *   `답변` 섹션 → 그 글. 없으면 첫 제목 앞 문단(preamble).
 * @returns {{ text: string, from: "answer"|"preamble"|"none", sections: Array<{mode:string,heading:string}> }}
 */
export function hubAnswerFromPage(pageMap, rootId) {
  const map = toBlockMap(pageMap);
  const sections = splitHubSections(map, rootId);
  const brief = sections.map((section) => ({ mode: section.mode, heading: section.heading }));

  // 섹션 제목(`답변` 등)은 답변 글에서 빼고, 안쪽 내용만 이어 붙입니다.
  // (제목 없이 이어지는 소제목은 `sectionText` 가 같은 규칙으로 걸러 냅니다)
  const answerText = sections
    .filter((section) => section.mode === "answer")
    .map((section) => sectionText(section, map))
    .filter(Boolean)
    .join("\n\n");
  if (answerText) return { text: answerText, from: "answer", sections: brief };

  const preamble = sections.find((section) => section.mode === "preamble");
  const preambleText = preamble ? sectionText(preamble, map) : "";
  if (preambleText) return { text: preambleText, from: "preamble", sections: brief };

  return { text: "", from: "none", sections: brief };
}

/**
 * 본문 중 **사이트로 내려도 되는 부분만** 남긴 record map.
 *   `게시용 출처` 섹션(있으면) — 상세 모달의 출처 목록
 *   `답변` 은 목록의 답변 글로 이미 나가므로 본문에서는 뺍니다(모달에서 두 번 보이지 않게).
 *   섹션 제목이 하나도 없는 페이지는 내부 섹션을 구분할 수 없으므로 전체 공개하고,
 *   `note` 에 그 사실을 남깁니다(동기화 요약에서 경고).
 * @returns {{ map: Record<string, unknown>, note: string|null, keptModes: string[] }}
 */
export function hubPublicPageMap(pageMap, rootId) {
  const map = toBlockMap(pageMap);
  const root = findRootBlock(map, rootId);
  const sections = splitHubSections(map, rootId);
  const labelled = sections.some(
    (section) => section.mode === "answer" || section.mode === "source" || section.mode === "internal"
  );
  // 제목 표시가 있으면 `게시용 출처` 만, 아예 없으면 전체(내부 메모 문단은 제외)
  const kept = labelled ? sections.filter((section) => section.mode === "source") : sections;

  const out = {};
  const contentIds = [];
  const keepIds = (ids) => {
    for (const id of ids) {
      const block = map.get(id);
      if (!block || out[id]) continue;
      const key = block.id ?? id;
      if (!isHeadingBlock(block) && isInternalNoteText(blockText(block))) continue; // 내부 메모 문단 제외
      out[key] = { value: block };
      if (Array.isArray(block.content)) keepIds(block.content);
    }
  };

  if (root) {
    for (const section of kept) {
      if (section.mode === "answer") continue; // 답변은 목록의 답변 글로 나갑니다
      for (const id of section.ids) contentIds.push(id);
      keepIds(section.ids);
    }
    out[root.key] = { value: { ...root.block, content: contentIds } };
  }

  const note = labelled ? null : "섹션 제목(답변 · 게시용 출처 · 내부 근거)이 없어 본문 전체를 공개했습니다";
  return { map: out, note, keptModes: [...new Set(kept.map((section) => section.mode))] };
}

/* ------------------------------ 표 → 사이트 행 ------------------------------ */

/**
 * 노션 Q&A 행 → 사이트가 읽는 평면 행.
 * (`Title` · `Summary` · `Category` · `Order` · `Published` 규칙은 src/notionPublic.ts 와 동일)
 */
export function hubQnaSiteRow(row, { summary = "", dateFallback = "" } = {}) {
  const decision = hubQnaDecision(row);
  return {
    id: row?.id,
    Title: hubQnaTitle(row),
    Summary: summary,
    Category: hubQnaCategory(row),
    Date: dateFallback || new Date().toISOString().slice(0, 10),
    Order: hubQnaOrder(row),
    // 메인 표의 `Published` 규칙(체크박스)과 같은 형태로 맞춰 둡니다 —
    // 사이트는 "Published 열이 있는 표" 에서 값이 빠진 행을 미공개로 봅니다.
    Published: true,
    __type: "faq",
    __source: HUB_QNA_SOURCE,
    // 원본 속성 — 사이트가 같은 규칙(hubQnaDecision)을 다시 적용하고, 사람이 스냅샷만 보고도 판단할 수 있게 남깁니다.
    "허브 게시": hubQnaPublishValue(row),
    "상태": hubQnaStatus(row),
    No: hubQnaNumber(row),
    "우선순위": hubQnaPriority(row),
    "카테고리": hubQnaCategory(row),
    // 글 주소 · 검색 설명 (노션 Q&A 표의 `Slug` · `SEO 설명`) — src/content/seo.js 규칙
    Slug: hubQnaText(row, ["Slug"]),
    "SEO 설명": hubQnaText(row, ["SEO 설명"]),
    __decision: decision.reason,
  };
}
