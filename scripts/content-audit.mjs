#!/usr/bin/env node
/**
 * 콘텐츠 발행 점검 (content audit) — 2026-11-08
 *
 *   node scripts/content-audit.mjs                     # 표로 출력
 *   node scripts/content-audit.mjs --md                # Markdown (보고서에 붙이기)
 *   node scripts/content-audit.mjs --check             # 오류가 있으면 exit 1 (CI 게이트용)
 *   node scripts/content-audit.mjs --snapshot x.json   # 다른 스냅샷
 *
 * 왜 필요한가 — 노션에서 **Published 만 체크하고 Slug·SEO 제목·SEO 설명·커버 이미지를 비워 둔 글**이
 * 목록에는 뜨는데 자기 주소(`/post/…/`)·사이트맵에는 빠지는 일이 반복됐습니다. 사람이 100편을
 * 눈으로 훑는 대신, 스냅샷(`notion-content.json`)만 읽어 **발행 전에 채워야 할 칸**을 바로 짚습니다.
 *
 * 원칙
 *   - **읽기 전용.** 노션·스냅샷·생성물을 고치지 않습니다(팀이 원본을 확인하고 고치는 도구).
 *   - 노션 자격증명이 필요 없습니다. 스냅샷 파일만 있으면 CI·로컬 어디서나 돕니다.
 *   - 판정 기준은 `src/content/seo.js`(주소 규칙의 유일한 원천)와 맞춥니다 — Slug 형식·섹션별 접두어.
 *     그래서 "왜 이 글은 주소가 없나"를 이 도구와 빌드가 **같은 답**으로 말합니다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { routePrefixFor } from "../src/content/seo.js";
import { classifyType } from "../src/content/classify.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");

/**
 * 본문이 있는 섹션(정규화 기준: notice·news·guide·blog) — 커버·SEO 제목·설명을 모두 채워야 하는 글.
 * Q&A(faq)는 커버를 쓰지 않고 주소도 Slug 로만 만듭니다.
 * 노션의 한글 표기("공지"·"블로그")는 `classify.js` 로 정규화해 판정합니다 — 빌드와 같은 규칙.
 */
export const CONTENT_SECTIONS = new Set(["notice", "news", "guide", "blog"]);

/**
 * 노션 행 → 사이트 섹션 키(`notice`·`news`·…)로 정규화. 모르면 빈 문자열.
 * ⚠️ `Type` 이 아예 없는 행은 **Q&A 표**입니다. classify 는 값이 없으면 안전한 기본값(공지)으로
 *    떨어지므로, 그 기본값을 여기서 쓰면 Q&A 73건이 전부 "커버 없는 공지"로 잘못 잡힙니다.
 */
export function sectionOf(row) {
  if (empty(row?.Type)) return "";
  return classifyType({ type: row.Type, category: row?.Category, link: row?.Link, tool: row?.Tool })?.type ?? "";
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const text = (v) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());
const empty = (v) => text(v) === "";

/**
 * 행 하나를 점검합니다. (순수 함수 — 테스트에서 그대로 씁니다)
 * @param {object} row 스냅샷의 글 한 건
 * @returns {{ kind: "content"|"qna", issues: Array<{level:"error"|"warn"|"info", code:string, message:string}> }}
 */
export function auditRow(row) {
  const type = text(row?.Type);
  const section = sectionOf(row);
  const kind = CONTENT_SECTIONS.has(section) ? "content" : "qna";
  const issues = [];
  const push = (level, code, message) => issues.push({ level, code, message });

  const slug = text(row?.Slug);
  if (!slug) {
    // 본문 글은 주소가 없으면 검색·공유 링크를 만들 수 없습니다(목록에만 남습니다).
    push(kind === "content" ? "error" : "warn", "slug-missing", "Slug 가 비어 있어 자기 주소가 없습니다");
  } else if (!SLUG_RE.test(slug)) {
    push("error", "slug-invalid", `Slug 형식 오류 "${slug}" — 영문 소문자·숫자·하이픈만 씁니다`);
  } else if (kind === "content" && !routePrefixFor(section)) {
    push("error", "section-unknown", `섹션 "${type}" 에 주소 규칙이 없습니다`);
  }

  if (kind === "content") {
    if (empty(row?.["SEO 제목"])) push("warn", "seo-title-missing", "SEO 제목이 비어 있습니다");
    const desc = text(row?.["SEO 설명"]);
    if (!desc) push("warn", "seo-description-missing", "SEO 설명이 비어 있습니다");
    else if (desc.length < 50) push("info", "seo-description-short", `SEO 설명이 짧습니다 (${desc.length}자)`);
    else if (desc.length > 160) push("info", "seo-description-long", `SEO 설명이 깁니다 (${desc.length}자)`);
    if (empty(row?.Cover)) push("warn", "cover-missing", "커버 이미지가 없습니다");
  }

  if (empty(row?.Title)) push("error", "title-missing", "제목이 비어 있습니다");

  // 초안은 아직 채우지 않은 칸이 정상입니다 — 오류로 세면 게이트가 늘 빨개집니다.
  // 게시(Published)된 글만 "발행 전에 채워야 할 칸"으로 셉니다.
  const published = text(row?.Published) === "True" || row?.Published === true;
  if (!published) {
    for (const issue of issues) {
      if (issue.code === "slug-invalid" || issue.code === "title-missing") continue; // 형식 오류는 초안도 오류
      if (issue.level === "error") issue.level = "warn";
      else if (issue.level === "warn") issue.level = "info";
    }
    push("info", "draft", "게시되지 않은 글입니다(초안)");
  }
  return { kind, issues };
}

/** 제목 비교용 토큰 — 공백·기호로 나누고, 한글은 조사 꼬리를 조금 다듬습니다. */
function tokens(s) {
  return String(s ?? "")
    .toLowerCase()
    .split(/[^0-9a-z가-힣]+/)
    .map((t) => (t.length > 3 ? t.replace(/(은|는|이|가|을|를|의|에|와|과|로|으로)$/, "") : t))
    .filter((t) => t.length >= 2);
}

/**
 * 두 제목의 유사도 (토큰 자카드 + 2-gram 자카드 중 큰 값, 0~1).
 * 같은 사건을 다룬 글을 **사람이 찾도록 돕는 힌트**입니다 — 자동 삭제·자동 판정에 쓰지 않습니다.
 * 예: "딥마인드 Genie 4 … 월드 모델 공개" ↔ "구글 딥마인드, … 월드 모델 Genie 4 공개" ≈ 0.6
 */
export function titleSimilarity(a, b) {
  const bigrams = (s) => {
    const t = String(s ?? "")
      .toLowerCase()
      .replace(/[^0-9a-z가-힣]+/g, " ")
      .trim();
    const out = new Set();
    for (let i = 0; i < t.length - 1; i += 1) {
      const g = t.slice(i, i + 2);
      if (g.trim().length === 2) out.add(g);
    }
    return out;
  };
  const jaccard = (A, B) => {
    if (!A.size || !B.size) return 0;
    let shared = 0;
    for (const x of A) if (B.has(x)) shared += 1;
    return shared / (A.size + B.size - shared);
  };
  return Math.max(jaccard(bigrams(a), bigrams(b)), jaccard(new Set(tokens(a)), new Set(tokens(b))));
}

/**
 * 스냅샷 전체를 점검합니다.
 * @param {{ rows?: object[] }} snapshot
 * @param {{ similarAt?: number }} [options]
 */
export function auditSnapshot(snapshot, { similarAt = 0.5 } = {}) {
  const rows = Array.isArray(snapshot?.rows) ? snapshot.rows : [];
  const items = rows.map((row) => {
    const { kind, issues } = auditRow(row);
    return {
      id: row?.id ?? "",
      type: text(row?.Type) || "(Q&A)",
      section: sectionOf(row),
      title: text(row?.Title),
      slug: text(row?.Slug),
      published: text(row?.Published) === "True" || row?.Published === true,
      kind,
      issues,
    };
  });

  // 같은 Slug 가 두 번 나오면 한쪽 주소가 다른 쪽으로 덮입니다.
  const bySlug = new Map();
  for (const item of items) {
    if (!item.slug) continue;
    if (!bySlug.has(item.slug)) bySlug.set(item.slug, []);
    bySlug.get(item.slug).push(item);
  }
  for (const [slug, group] of bySlug) {
    if (group.length < 2) continue;
    for (const item of group) {
      item.issues.push({ level: "error", code: "slug-duplicate", message: `Slug "${slug}" 를 ${group.length}건이 같이 씁니다` });
    }
  }

  // 게시된 글 제목이 비슷한 쌍 — 중복 글로 합칠 후보(사람이 판단).
  const pairs = [];
  const published = items.filter((i) => i.published && i.title);
  for (let i = 0; i < published.length; i += 1) {
    for (let j = i + 1; j < published.length; j += 1) {
      const score = titleSimilarity(published[i].title, published[j].title);
      if (score >= similarAt) {
        pairs.push({ score, a: published[i], b: published[j] });
      }
    }
  }
  pairs.sort((x, y) => y.score - x.score);

  const count = (level) => items.reduce((n, i) => n + i.issues.filter((x) => x.level === level).length, 0);
  return {
    total: items.length,
    published: items.filter((i) => i.published).length,
    drafts: items.filter((i) => !i.published).length,
    items,
    pairs: pairs.slice(0, 20),
    summary: { errors: count("error"), warnings: count("warn"), infos: count("info") },
  };
}

const LEVEL_ICON = { error: "🔴", warn: "🟡", info: "⚪" };

/** 사람이 읽는 표 (터미널) */
export function formatText(report) {
  const lines = [];
  const { summary, total, published, drafts } = report;
  lines.push(`점검 ${total}건 (게시 ${published} · 초안 ${drafts})`);
  lines.push(`오류 ${summary.errors} · 경고 ${summary.warnings} · 참고 ${summary.infos}`);
  const flagged = report.items.filter((i) => i.issues.some((x) => x.level !== "info"));
  if (flagged.length) {
    lines.push("");
    for (const item of flagged) {
      lines.push(`${item.type} | ${item.title.slice(0, 40)} | ${item.slug || "(slug 없음)"}`);
      for (const issue of item.issues) {
        if (issue.level === "info") continue;
        lines.push(`   ${LEVEL_ICON[issue.level]} ${issue.message}`);
      }
    }
  }
  if (report.pairs.length) {
    lines.push("", "제목이 비슷한 게시 글(중복 후보 · 사람이 판단):");
    for (const { score, a, b } of report.pairs) {
      lines.push(`   ${(score * 100).toFixed(0)}%  ${a.slug || "(없음)"} ↔ ${b.slug || "(없음)"}`);
      lines.push(`         ${a.title.slice(0, 50)}`);
      lines.push(`         ${b.title.slice(0, 50)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

/** 보고서에 붙이는 Markdown */
export function formatMarkdown(report, { date = "" } = {}) {
  const { summary, total, published, drafts } = report;
  const out = [];
  out.push(`# 콘텐츠 발행 점검${date ? ` — ${date}` : ""}`, "");
  out.push(`- 점검 대상 **${total}건** (게시 ${published} · 초안 ${drafts})`);
  out.push(`- **오류 ${summary.errors} · 경고 ${summary.warnings} · 참고 ${summary.infos}**`, "");
  out.push("> 스냅샷(`notion-content.json`)만 읽는 읽기 전용 점검입니다. 고치는 곳은 노션 원본입니다.", "");

  const rowsFor = (predicate) =>
    report.items.filter((i) => predicate(i) && i.issues.some((x) => x.level !== "info"));

  out.push("## 1. 주소(Slug) 문제 — 검색·공유 링크가 없는 글", "");
  const slugIssues = rowsFor((i) => i.issues.some((x) => x.code.startsWith("slug") || x.code === "section-unknown"));
  if (!slugIssues.length) out.push("없음 ✅", "");
  else {
    out.push("| 섹션 | 제목 | Slug | 사유 |", "|---|---|---|---|");
    for (const item of slugIssues) {
      const why = item.issues.filter((x) => x.code.startsWith("slug") || x.code === "section-unknown").map((x) => x.message).join(" · ");
      out.push(`| ${item.type} | ${item.title.replace(/\|/g, "&#124;")} | \`${item.slug || "—"}\` | ${why.replace(/\|/g, "&#124;")} |`);
    }
    out.push("");
  }

  out.push("## 2. 발행 전에 채워야 할 칸 (SEO 제목·설명·커버)", "");
  const fieldIssues = rowsFor((i) => i.issues.some((x) => ["seo-title-missing", "seo-description-missing", "cover-missing"].includes(x.code)));
  if (!fieldIssues.length) out.push("없음 ✅", "");
  else {
    out.push("| 섹션 | 제목 | Slug | 비어 있는 칸 |", "|---|---|---|---|");
    for (const item of fieldIssues) {
      const miss = item.issues
        .filter((x) => ["seo-title-missing", "seo-description-missing", "cover-missing"].includes(x.code))
        .map((x) => ({ "seo-title-missing": "SEO 제목", "seo-description-missing": "SEO 설명", "cover-missing": "커버" })[x.code]);
      out.push(`| ${item.type} | ${item.title.replace(/\|/g, "&#124;")} | \`${item.slug || "—"}\` | ${miss.join(", ")} |`);
    }
    out.push("");
  }

  out.push("## 3. 제목이 비슷한 게시 글 (중복 후보)", "");
  if (!report.pairs.length) out.push("없음 ✅", "");
  else {
    out.push("| 유사도 | A | B |", "|---|---|---|");
    for (const { score, a, b } of report.pairs) {
      out.push(`| ${(score * 100).toFixed(0)}% | \`${a.slug || "—"}\` ${a.title.replace(/\|/g, "&#124;")} | \`${b.slug || "—"}\` ${b.title.replace(/\|/g, "&#124;")} |`);
    }
    out.push("");
  }
  return `${out.join("\n")}`;
}

function main() {
  const args = process.argv.slice(2);
  const at = (flag) => {
    const i = args.indexOf(flag);
    return i === -1 ? null : (args[i + 1] ?? null);
  };
  const snapshotPath = at("--snapshot") ?? path.join(ROOT, "notion-content.json");
  if (!fs.existsSync(snapshotPath)) {
    console.error(`스냅샷이 없습니다: ${snapshotPath}`);
    process.exit(2);
  }
  const report = auditSnapshot(JSON.parse(fs.readFileSync(snapshotPath, "utf8")));
  const date = at("--date") ?? "";
  if (args.includes("--md")) process.stdout.write(formatMarkdown(report, { date }));
  else process.stdout.write(formatText(report));
  if (args.includes("--check") && report.summary.errors > 0) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
