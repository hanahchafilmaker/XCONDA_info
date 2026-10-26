#!/usr/bin/env node
/**
 * 번역 품질 점검 (i18n QC)
 *
 * 사람이 원어민 검수를 하기 전에, **기계적으로 잡을 수 있는 것**만 잡습니다.
 *   - 원문에 있는 이메일 · 전화번호 · 주소가 번역문에도 그대로 있는가 (사실 누락 = 오류)
 *   - 원문에 있는 숫자(가격 · 기간 · 번호)가 번역문에도 있는가 (누락 = 경고)
 *   - 통화 표기(원/달러)가 번역문에 맞게 남아 있는가
 *   - 일본어·중국어에 번역되지 않은 영어 문장이 남아 있는가
 *   - 브랜드 · 모델명 표기가 언어 안에서 일관되는가 (Flexboard / FLEXBOARD 혼용 등)
 *   - 같은 언어 안에서 제목이 중복되는가
 *   - 번역문 길이가 원문 대비 지나치게 짧거나 긴가 (누락·덧붙임 신호)
 *
 * 사용법
 *   npm run i18n:qc              # 요약만 출력
 *   npm run i18n:qc -- --write   # reports/i18n-qc-<날짜>.md 도 갱신
 *
 * 종료 코드: 사실(연락처) 불일치가 있으면 1. 그 밖의 문제는 경고만 하고 0.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LOCALIZED_BLOCK_TYPES } from "./build-seo.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
export const LANGS = ["en", "ja", "zh"];

/** 번역 대상 글의 한국어 원문 (notion-content.json) → `qna/slug` 키 */
export function koSources(snapshot) {
  const prefixOf = { faq: "qna", blog: "post", news: "post", notice: "notice", guide: "guide" };
  const out = new Map();
  for (const row of snapshot.rows ?? []) {
    const slug = String(row.Slug ?? "").trim();
    if (!slug) continue;
    const key = `${prefixOf[row.__type] ?? row.__type}/${slug}`;
    out.set(key, {
      title: String(row.Title ?? "").trim(),
      summary: String(row.Summary ?? "").trim(),
      category: String(row.Category ?? "").trim(),
    });
  }
  return out;
}

/** 이메일 · 전화번호 · URL — 번역문에 **그대로** 있어야 하는 사실 */
export function contactTokens(text) {
  const s = String(text ?? "");
  // 문장 끝 마침표 · 전각 괄호가 값에 붙으면 비교가 어긋나므로 떼어 냅니다.
  const trimTail = (v) => v.replace(/[.,;:!?)\]}>」』】）]+$/, "");
  const emails = [...s.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/g)].map((m) => trimTail(m[0]).toLowerCase());
  const phones = [...s.matchAll(/\+(\d{1,3})[-\s]?(\d[\d\s-]{5,})/g)].map((m) => `+${m[1]}${m[2]}`.replace(/[\s-]/g, ""));
  // 일본어·중국어 문장은 주소 뒤에 공백 없이 조사·괄호가 붙습니다 — 전각 문장부호에서 끊습니다.
  const urls = [...s.matchAll(/https?:\/\/[^\s"'<>)\]）」。、，]+/g)].map((m) => trimTail(m[0]));
  return { emails: [...new Set(emails)], phones: [...new Set(phones)], urls: [...new Set(urls)] };
}

/** 숫자 토큰 — 쉼표만 제거하고 순서는 무시합니다. */
export function numberTokens(text) {
  return [...new Set((String(text ?? "").match(/\d[\d,]*/g) ?? []).map((n) => n.replace(/,/g, "")))];
}

/**
 * 숫자를 글자로 쓴 경우 — "4자리" → "four digits", "5월" → "May".
 * 숫자 누락 경고를 띄우기 전에 이 표현이 있는지 확인합니다.
 */
export const SPELLED_NUMBERS = {
  1: ["one", "once", "first", "一", "１", "单"],
  2: ["two", "twice", "second", "二", "２"],
  3: ["three", "third", "三", "３", "march"],
  4: ["four", "fourth", "四", "４", "april"],
  5: ["five", "fifth", "五", "５", "may"],
  6: ["six", "sixth", "六", "６", "june"],
  7: ["seven", "seventh", "七", "７", "july"],
  8: ["eight", "eighth", "八", "８", "august"],
  9: ["nine", "ninth", "九", "９", "september"],
  10: ["ten", "tenth", "十", "１０", "october"],
  11: ["eleven", "十一", "november"],
  12: ["twelve", "十二", "december"],
  20: ["twenty", "二十"],
  30: ["thirty", "三十"],
};

/** 숫자를 글자로 쓴 표현이 번역문에 있는지 (없으면 false) */
export function hasSpelledNumber(value, lower) {
  const words = SPELLED_NUMBERS[Number(lower)];
  if (!words) return false;
  const text = String(value ?? "").toLowerCase();
  return words.some((w) => text.includes(w.toLowerCase()));
}

/** 브랜드 · 모델명 — 번역하지 않고 그대로 쓰는 고유명사 */
export const BRAND_TOKENS = [
  "XCONDA",
  "FLEXBOARD",
  "Turn",
  "Blocking Board",
  "Seedance",
  "Suno",
  "Premiere Pro",
  "Stripe",
  "PortOne",
  "Toss Payments",
  "KakaoPay",
  "Eximbay",
  "Claude",
  "Gemini",
  "GPT Image",
  "Seedream",
  "BytePlus",
  "ByteDance",
  "KBS",
  "KOCCA",
  "Cubeberry",
  "AWS",
  "Firebase",
  "Google",
  "Black Forest Labs",
  "FLUX",
  "DeepSeek",
  "Hugging Face",
  "Skillry",
  "Lemo-Opuscar",
  "OPUSCAR",
  "Clawd",
  "Kling",
  "veo",
  "Nano Banana",
  "Art Director Pro",
  "Director's Cut",
  "Prompt Motion",
  "CreatorMotion",
  "Lipsync",
  "Higgsfield",
  "Freepik",
  "Runway",
  "Veo",
  "Pixar",
];

/** 통화 표기 — 원문에 통화가 있으면 번역문에도 있어야 합니다. */
const CURRENCY_HINTS = {
  // "회원" 처럼 숫자 없이 쓰인 '원' 은 통화가 아닙니다 — 금액 뒤에 붙은 경우만 봅니다.
  krw: { source: /\d[\d,]*\s*원|₩/, target: { en: /KRW|won\b|₩/i, ja: /ウォン|KRW|₩/, zh: /韩元|韩币|KRW|₩/ } },
  usd: { source: /\$|달러/, target: { en: /\$|USD|dollars?/i, ja: /\$|ドル|USD/, zh: /\$|美元|USD/ } },
};

/**
 * 의도된 차이 — `content/i18n/qc-allow.json` 에 적어 두면 그 경고는 보고서에서 빠집니다.
 * 예: 한국어 원문에 없는 언어별 주소(/en/ 등)를 영어 답변에만 덧붙인 경우.
 */
export function loadAllowlist(root) {
  const file = path.join(root, "content/i18n/qc-allow.json");
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
}

const LATIN_RUN = /[A-Za-z][A-Za-z'’.-]*(?:\s+[A-Za-z][A-Za-z'’.-]*){2,}/g;

/**
 * 번역하지 않고 그대로 두는 것이 맞는 표현 — 제품 UI 라벨과 고유명사.
 * (일본어·중국어 페이지에서도 버튼 이름은 영어 원문 그대로 안내합니다)
 */
export const LATIN_ALLOW = [
  ...BRAND_TOKENS,
  "Amazon Web Services",
  "Republic of Korea",
  "Upload a skill",
  "Create skill",
  "Download CUT ZIP",
  "Download Sheet",
  "Number of Panels",
  "Shot Length",
  "Apply Room Size",
  "No Additional Generation",
  "Room Size",
  "Camera Angle",
  "Camera Movement",
  "Shot Size",
  "Quick Edit",
  "Detailed Edit",
  "Edit Panel",
  "Panel",
  "Sheet",
  "Wall Edit",
  "INPAINT",
  "REGEN",
  "REPLACE",
  "Input Assets",
  "Reference Assets",
  "Scene Settings",
  "Freeze Frame",
  "High Quality",
  "Starter Pack",
  "Pro Pack",
  "Master Pack",
  "Ref-to-video",
  "Account Settings",
  "Customize",
  "Skills",
  "Capabilities",
  "Authorized Dealer",
  "Premiere",
  "WebM",
  "Auto Refine",
  "Instant Apply",
  "Cut ZIP",
];

/**
 * 길이 비율. 일본어·중국어는 같은 내용을 한국어보다 훨씬 적은 글자로 씁니다
 * (한자 한 자에 담기는 정보량이 크기 때문). 가중치 없이 비교하면 짧은 제목에서
 * 거의 항상 '너무 짧음' 오탐이 납니다.
 */
const DENSITY = { ja: 1.7, zh: 1.7 };

function ratioFlag(ko, tr, lang) {
  const a = [...ko].length;
  const raw = [...tr].length;
  if (!a) return null;
  const w = DENSITY[lang] ?? 1;
  // 짧음: 글자당 정보량 가중치를 적용 (한자·가나가 같은 내용을 더 적게 씁니다)
  const shortRatio = (raw * w) / a;
  if (shortRatio < 0.45) return { kind: "short", ratio: shortRatio };
  // 김: 가중치를 빼고 원래 글자 수로 비교 (가나가 풀어 쓰는 것은 정상)
  const longRatio = raw / a;
  if (longRatio > 2.6) return { kind: "long", ratio: longRatio };
  return null;
}

/**
 * 한 언어를 점검합니다.
 * @returns {{ errors: object[], warnings: object[] }}
 */
export function qcLanguage(lang, dict, sources, allow = {}) {
  const errors = [];
  const warnings = [];
  const entries = dict.entries ?? {};
  const seenTitles = new Map();

  for (const [key, tr] of Object.entries(entries)) {
    const ko = sources.get(key);
    if (!ko) continue; // 원문이 없는 키는 seo.test.mjs 가 잡습니다.
    const text = `${tr.title ?? ""}\n${tr.summary ?? ""}`;
    const koText = `${ko.title}\n${ko.summary}`;

    // 1) 연락처 · 주소는 사실이므로 그대로 있어야 합니다.
    const koContact = contactTokens(koText);
    const trContact = contactTokens(text);
    for (const email of koContact.emails) {
      if (!trContact.emails.includes(email)) errors.push({ key, kind: "email-missing", detail: email });
    }
    for (const phone of koContact.phones) {
      if (!trContact.phones.includes(phone)) errors.push({ key, kind: "phone-missing", detail: phone });
    }
    for (const url of koContact.urls) {
      if (!trContact.urls.some((u) => u.replace(/\/$/, "") === url.replace(/\/$/, "")))
        errors.push({ key, kind: "url-missing", detail: url });
    }

    // 2) 숫자 누락 — 가격 · 기간 · 번호가 사라지면 내용이 틀어진 것입니다.
    const koNumbers = numberTokens(ko.summary);
    const trNumbers = new Set(numberTokens(text));
    const missing = koNumbers.filter((n) => !trNumbers.has(n) && !hasSpelledNumber(text, n));
    if (missing.length) warnings.push({ key, kind: "number-missing", detail: missing.join(", ") });

    // 3) 통화 표기
    for (const [name, spec] of Object.entries(CURRENCY_HINTS)) {
      if (!spec.source.test(ko.summary)) continue;
      const re = spec.target[lang];
      if (re && !re.test(text)) warnings.push({ key, kind: `currency-${name}`, detail: "통화 표기 없음" });
    }

    // 4) 일본어 · 중국어에 번역 안 된 영어 문장
    if (lang === "ja" || lang === "zh") {
      for (const run of text.match(LATIN_RUN) ?? []) {
        const isBrand = LATIN_ALLOW.some((b) => run.toLowerCase().includes(b.toLowerCase()));
        if (!isBrand) warnings.push({ key, kind: "latin-run", detail: run.trim().slice(0, 60) });
      }
    }

    // 5) 제목 중복(같은 언어 안에서)
    const t = String(tr.title ?? "").trim();
    if (t) {
      if (seenTitles.has(t)) warnings.push({ key, kind: "duplicate-title", detail: `${t} ← ${seenTitles.get(t)}` });
      else seenTitles.set(t, key);
    }

    // 6) 본문 번역(blocks) — 형식 오류, 한글 잔존, 미번역 영어
    const blocks = tr.blocks;
    if (blocks != null) {
      if (!Array.isArray(blocks)) {
        errors.push({ key, kind: "blocks-not-array", detail: "blocks 가 배열이 아닙니다" });
      } else {
        const bodyText = blocks
          .map((b) =>
            Array.isArray(b?.items)
              ? b.items.join(" ")
              : Array.isArray(b?.rows)
                ? b.rows.map((r) => (Array.isArray(r) ? r.join(" ") : "")).join(" ")
                : String(b?.text ?? ""),
          )
          .join("\n");
        for (const block of blocks) {
          if (!LOCALIZED_BLOCK_TYPES.includes(block?.type)) {
            errors.push({ key, kind: "block-type", detail: `지원하지 않는 type(${block?.type})` });
          }
          if ((block?.type === "ul" || block?.type === "ol") && (!Array.isArray(block.items) || !block.items.length)) {
            errors.push({ key, kind: "block-items", detail: `${block?.type} 에 items 가 없습니다` });
          }
          if (block?.type === "table") {
            const rows = block.rows;
            if (!Array.isArray(rows) || !rows.length) errors.push({ key, kind: "block-table", detail: "table 에 rows 가 없습니다" });
            else if (rows.some((r) => !Array.isArray(r) || !r.length)) errors.push({ key, kind: "block-table", detail: "table 행이 비었습니다" });
            else if (rows.some((r) => r.length !== rows[0].length)) errors.push({ key, kind: "block-table", detail: "table 행마다 칸 수가 다릅니다" });
          }
          if (["p", "h2", "h3", "quote", "callout"].includes(block?.type) && !String(block?.text ?? "").trim()) {
            errors.push({ key, kind: "block-empty", detail: `${block?.type} 의 text 가 비었습니다` });
          }
        }
        const bodyHangul = (bodyText.match(/[가-힣]/g) ?? []).length;
        if (bodyText.length > 0 && bodyHangul / bodyText.length >= 0.2) {
          errors.push({
            key,
            kind: "block-hangul",
            detail: `본문 한글 비중 ${Math.round((bodyHangul / bodyText.length) * 100)}% — 번역이 남아 있습니다`,
          });
        }
        // 원문 본문이 있는데 번역 본문이 없으면 경고(SEO 상 이득이 큰 글)
        if (!blocks.length && (ko.summary?.length ?? 0) > 0) {
          warnings.push({ key, kind: "body-missing", detail: "본문 번역 없음(요약만)" });
        }
      }
    }

    // 7) 길이 비율
    if (ko.summary) {
      const flag = ratioFlag(ko.summary, String(tr.summary ?? ""), lang);
      if (flag) warnings.push({ key, kind: `length-${flag.kind}`, detail: `${flag.ratio.toFixed(2)}×` });
    }
  }

  // 8) 브랜드 표기 일관성 — 언어 전체에서 대소문자가 섞이면 알려 줍니다.
  // 주소·도메인(xconda.ai)은 소문자가 정상이므로 표기 검사에서 제외합니다.
  const corpus = Object.values(entries)
    .map((e) => `${e.title ?? ""} ${e.summary ?? ""}`)
    .join("\n")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, " ")
    .replace(/\b[a-z0-9-]+\.(ai|kr|com|net|io)\b/gi, " ");
  for (const brand of ["FLEXBOARD", "Turn", "Blocking Board", "Seedance", "XCONDA"]) {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // 단어 경계로 봐야 합니다 — "returned" 안의 "turn" 을 브랜드로 오인하지 않도록.
    const variants = new Set((corpus.match(new RegExp(`\\b${escaped}\\b`, "gi")) ?? []).map((m) => m));
    if (variants.size > 1) warnings.push({ key: "(전체)", kind: "brand-case", detail: `${brand}: ${[...variants].join(" / ")}` });
  }

  // 허용 목록에 적힌 (키, 유형) 조합은 뺍니다.
  const allowed = allow[lang] ?? {};
  const filtered = warnings.filter((w) => !(allowed[w.key] ?? []).includes(w.kind));
  return { errors, warnings: filtered, suppressed: warnings.length - filtered.length };
}

/** 마크다운 리포트 */
export function reportMarkdown(results, { date, dicts, notes = "" }) {
  const lines = [`# 번역 품질 점검 (i18n QC) — ${date}`, ""];
  lines.push("> 대상: XCONDA허브 Q&A 번역 초안. 사람이 원어민 검수하기 전에 **기계적으로 확인 가능한 사실·표기**만 검사합니다.", "");
  if (notes) lines.push(notes.trim(), "");
  lines.push("## 요약", "", "| 언어 | 항목 | 오류(연락처) | 경고 |", "|---|---|---|---|");
  for (const [lang, r] of Object.entries(results)) {
    lines.push(`| ${lang} | ${Object.keys(dicts[lang].entries ?? {}).length} | **${r.errors.length}** | ${r.warnings.length} |`);
  }
  const kinds = (list) => {
    const m = new Map();
    for (const w of list) m.set(w.kind, (m.get(w.kind) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  for (const [lang, r] of Object.entries(results)) {
    lines.push("", `## ${lang}`, "");
    if (r.errors.length) {
      lines.push("### 오류 — 반드시 수정", "", "| 키 | 유형 | 값 |", "|---|---|---|");
      for (const e of r.errors) lines.push(`| \`${e.key}\` | ${e.kind} | ${e.detail} |`);
    } else {
      lines.push("오류 없음(연락처 · 주소 일치).");
    }
    const k = kinds(r.warnings);
    lines.push("", "### 경고 유형", "");
    if (!k.length) lines.push("없음.");
    else {
      lines.push("| 유형 | 건수 |", "|---|---|");
      for (const [kind, n] of k) lines.push(`| ${kind} | ${n} |`);
      lines.push("", "<details><summary>경고 전체 보기</summary>", "", "| 키 | 유형 | 값 |", "|---|---|---|");
      for (const w of r.warnings.slice(0, 400)) lines.push(`| \`${w.key}\` | ${w.kind} | ${w.detail} |`);
      lines.push("", "</details>");
    }
  }
  lines.push("", "## 경고 유형 해설", "",
    "- `number-missing`: 원문 숫자가 번역문에 없음 — 가격·기간·번호 누락 의심",
    "- `currency-*`: 원문에 통화가 있는데 번역문에 통화 표기가 없음",
    "- `latin-run`: 일본어·중국어에 번역되지 않은 영어 문장(브랜드명은 제외)",
    "- `duplicate-title`: 같은 언어 안에서 제목 중복",
    "- `length-short` / `length-long`: 원문 대비 0.45× 미만 또는 2.6× 초과 (일본어·중국어는 짧음 판정에만 글자당 정보량 1.7배 가중)",
    "- `brand-case`: 브랜드 표기 대소문자 혼용",
    "");
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, "notion-content.json"), "utf8"));
  const sources = koSources(snapshot);
  const dicts = {};
  for (const lang of LANGS) {
    const file = path.join(ROOT, "content/i18n", `${lang}.json`);
    if (fs.existsSync(file)) dicts[lang] = JSON.parse(fs.readFileSync(file, "utf8"));
  }
  const allow = loadAllowlist(ROOT);
  const results = {};
  let errorCount = 0;
  // 본문 번역 현황 — 사람이 "무엇이 남았는지" 바로 알 수 있게
  const bodyStats = {};
  for (const [lang, dict] of Object.entries(dicts)) {
    const entries = Object.values(dict.entries ?? {});
    const withBody = entries.filter((e) => Array.isArray(e.blocks) && e.blocks.length).length;
    bodyStats[lang] = { withBody, total: entries.length };
  }

  for (const [lang, dict] of Object.entries(dicts)) {
    const r = qcLanguage(lang, dict, sources, allow);
    results[lang] = r;
    errorCount += r.errors.length;
    console.log(
      `${lang}: 항목 ${Object.keys(dict.entries ?? {}).length} · 본문 ${bodyStats[lang].withBody}편 · 오류 ${r.errors.length} · 경고 ${r.warnings.length}` +
        (r.suppressed ? ` (허용 ${r.suppressed})` : ""),
    );
    for (const e of r.errors.slice(0, 10)) console.log(`   ✗ ${e.key} ${e.kind} ${e.detail}`);
  }
  if (args.includes("--write")) {
    const date = new Date().toISOString().slice(0, 10);
    const dir = path.join(ROOT, "reports");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `i18n-qc-${date.replace(/-/g, "")}.md`);
    // 점검 이력은 사람이 적는 메모 파일에서 가져옵니다(없으면 생략).
    const notesFile = path.join(ROOT, "content/i18n/qc-notes.md");
    const notes = fs.existsSync(notesFile) ? fs.readFileSync(notesFile, "utf8") : "";
    fs.writeFileSync(file, `${reportMarkdown(results, { date, dicts, notes })}\n`);
    console.log(`\n리포트: ${path.relative(ROOT, file)}`);
  }
  if (errorCount) {
    console.error(`\n연락처 불일치 ${errorCount}건 — 수정이 필요합니다.`);
    process.exit(1);
  }
  console.log("\n연락처 · 주소는 모든 번역에서 일치합니다.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
