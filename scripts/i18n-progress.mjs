#!/usr/bin/env node
/**
 * 번역 검수 진행률 (i18n progress)
 *
 *   npm run i18n:progress            # 표를 출력하고 reports/i18n-progress-<날짜>.md 를 갱신
 *   npm run i18n:progress -- --quiet # 파일만 갱신
 *
 * 왜 필요한가 — `npm run i18n:qc` 는 **문제가 있는 항목**을 알려 주지만, 원어민 검수를
 * 맡길 때 필요한 "285항목(95 × 3언어) 중 몇 개가 끝났나" 는 어디에도 없었습니다.
 * 이 스크립트는 `content/i18n/<언어>.json` 의 `review` 표시를 세어 진행률을 만들고,
 * 기계 점검(QC)의 오류·경고를 **항목별로 붙여** 검수자가 어디부터 볼지 알려 줍니다.
 *
 * `review` 표기 규칙 (검수 완료로 인정하는 유일한 형식)
 *   - 파일 맨 위 `review`  : 그 언어 전체의 현재 상태 (예: "2026-10-25 AI 1차 번역(초안) — 원어민 검수 전")
 *   - 항목별 `entries[키].review` : "YYYY-MM-DD 검수 완료(검수자)" ← 이 형식이면 **검수 완료**
 *   항목 표시가 없으면 파일 전체 상태를 따릅니다(초안).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LANGS, koSources, loadAllowlist, qcLanguage } from "./i18n-qc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");

/**
 * `review` 문자열 해석 — "YYYY-MM-DD 검수 완료(검수자)" 만 검수 완료로 인정합니다.
 * 날짜가 없거나 "초안"·"검수 전" 이면 아직 초안입니다.
 * @param {string} value
 */
export function parseReview(value) {
  const s = String(value ?? "").trim();
  if (!s) return { reviewed: false, date: "", reviewer: "", text: "" };
  const date = /(\d{4}-\d{2}-\d{2})/.exec(s)?.[1] ?? "";
  const reviewer = /[（(]\s*([^）)]+?)\s*[）)]/.exec(s)?.[1] ?? "";
  const saysReviewed = /검수\s*완료|reviewed/i.test(s);
  const saysDraft = /초안|검수\s*전|draft/i.test(s);
  return { reviewed: Boolean(date && saysReviewed && !saysDraft), date, reviewer, text: s };
}

/**
 * 한 언어의 진행률을 셉니다.
 * @param {object} input
 * @param {Map<string, object>} input.sources 한국어 원문(`koSources`)
 * @param {object} input.dict `content/i18n/<언어>.json`
 * @param {{ errors: object[], warnings: object[] }} [input.qc] 기계 점검 결과
 */
export function progressOf({ sources, dict, qc }) {
  const entries = dict?.entries ?? {};
  const keys = [...sources.keys()];
  const issues = new Map();
  for (const issue of [...(qc?.errors ?? []), ...(qc?.warnings ?? [])]) {
    if (!issues.has(issue.key)) issues.set(issue.key, { errors: 0, warnings: 0 });
    const slot = issues.get(issue.key);
    if ((qc?.errors ?? []).includes(issue)) slot.errors += 1;
    else slot.warnings += 1;
  }

  const items = keys.map((key) => {
    const tr = entries[key];
    const state = !tr ? "missing" : parseReview(tr.review).reviewed ? "reviewed" : "draft";
    const qcSlot = issues.get(key) ?? { errors: 0, warnings: 0 };
    return { key, state, errors: qcSlot.errors, warnings: qcSlot.warnings, review: tr?.review ?? "" };
  });
  // 번역 파일에만 있고 원문이 없는 키(빌드가 경고하는 항목)도 빠뜨리지 않고 셉니다.
  const orphan = Object.keys(entries).filter((key) => !sources.has(key));

  const count = (state) => items.filter((i) => i.state === state).length;
  const total = items.length;
  const reviewed = count("reviewed");
  // 번역이 없는 원문 — 노션 동기화로 **새 글이 들어왔는데 번역이 없을 때** 여기에 나타납니다.
  // (주소·제목을 함께 남겨야 운영자가 무엇을 번역해야 하는지 바로 압니다)
  const missingList = items
    .filter((i) => i.state === "missing")
    .map((i) => ({ key: i.key, title: sources.get(i.key)?.title ?? "" }));
  return {
    total,
    reviewed,
    draft: count("draft"),
    missing: count("missing"),
    missingList,
    orphan,
    percent: total ? Math.round((reviewed / total) * 100) : 0,
    errors: (qc?.errors ?? []).length,
    warnings: (qc?.warnings ?? []).length,
    suppressed: qc?.suppressed ?? 0,
    fileReview: String(dict?.review ?? ""),
    items,
    // 검수자가 먼저 볼 곳 — 초안이면서 기계 점검이 문제를 찾은 항목
    todo: items
      .filter((i) => i.state !== "reviewed" && (i.errors || i.warnings))
      .sort((a, b) => b.errors - a.errors || b.warnings - a.warnings || a.key.localeCompare(b.key)),
  };
}

/** 여러 언어의 진행률을 하나로 묶습니다(전체 합계 포함). */
export function overall(byLang) {
  const rows = Object.entries(byLang);
  const sum = (field) => rows.reduce((acc, [, p]) => acc + p[field], 0);
  const total = sum("total");
  const reviewed = sum("reviewed");
  return {
    total,
    reviewed,
    draft: sum("draft"),
    missing: sum("missing"),
    errors: sum("errors"),
    warnings: sum("warnings"),
    percent: total ? Math.round((reviewed / total) * 100) : 0,
    languages: rows.length,
  };
}

const bar = (percent, width = 20) => {
  const filled = Math.round((percent / 100) * width);
  return `${"█".repeat(filled)}${"░".repeat(Math.max(0, width - filled))} ${String(percent).padStart(3)}%`;
};

/**
 * GitHub Actions 실행 요약용 **짧은** Markdown.
 *
 *   npm run i18n:progress -- --summary >> "$GITHUB_STEP_SUMMARY"
 *
 * 파일을 쓰지 않고 표준출력으로만 냅니다(CI 요약은 저장소를 바꾸지 않아야 합니다).
 * 전체 리포트는 `reports/i18n-progress-<날짜>.md` 에 남습니다.
 */
export function summaryMarkdown(byLang, { date, overall: all } = {}) {
  const lines = [`### 번역 검수 진행률 — ${date}`, ""];
  lines.push(
    `전체 **${all?.total ?? 0}항목**(95 × ${all?.languages ?? 0}언어) · 검수 완료 **${all?.reviewed ?? 0}** (${all?.percent ?? 0}%) · 초안 ${all?.draft ?? 0} · 번역 없음 ${all?.missing ?? 0}`,
    "",
    "| 언어 | 완료 / 항목 | 진행률 | QC 오류 | QC 경고 |",
    "|---|---|---|---|---|",
  );
  for (const [lang, p] of Object.entries(byLang)) {
    lines.push(`| ${lang} | ${p.reviewed} / ${p.total} | ${p.percent}% | ${p.errors} | ${p.warnings}${p.suppressed ? ` (허용 ${p.suppressed})` : ""} |`);
  }
  const untranslated = Object.entries(byLang).flatMap(([lang, p]) => (p.missingList ?? []).map((m) => ({ lang, ...m })));
  if (untranslated.length) {
    lines.push("", `**번역이 없는 원문 ${untranslated.length}건** — 새 글이 들어왔는지 확인하세요:`, "");
    for (const u of untranslated.slice(0, 10)) lines.push(`- \`${u.key}\` (${u.lang}) ${u.title.slice(0, 60)}`);
    if (untranslated.length > 10) lines.push(`- … 남은 ${untranslated.length - 10}건은 \`reports/i18n-progress-*.md\` 참고`);
  } else {
    lines.push("", "번역이 없는 원문 없음 — 모든 원문 글에 3언어 번역이 있습니다.");
  }
  lines.push("");
  return lines.join("\n");
}

/** 사람이 읽는 리포트(Markdown). */
export function progressMarkdown(byLang, { date, overall: all } = {}) {
  const lines = [];
  lines.push(`# 번역 검수 진행률 — ${date}`, "");
  const perLang = Math.max(0, ...Object.values(byLang).map((p) => p.total));
  const langCount = Object.keys(byLang).length;
  lines.push(
    `**전체 ${all?.total ?? 0}항목**(${perLang} × ${langCount}언어) 중 ` +
      `검수 완료 **${all?.reviewed ?? 0}** (${all?.percent ?? 0}%) · 초안 ${all?.draft ?? 0} · 번역 없음 ${all?.missing ?? 0}`,
    "",
    "`review` 표기가 `YYYY-MM-DD 검수 완료(검수자)` 인 항목만 완료로 셉니다. 항목 표시가 없으면 파일 전체 `review` 상태(초안)를 따릅니다.",
    "",
    "| 언어 | 항목 | 검수 완료 | 초안 | 번역 없음 | 진행률 | QC 오류 | QC 경고 |",
    "|---|---|---|---|---|---|---|---|",
  );
  for (const [lang, p] of Object.entries(byLang)) {
    lines.push(
      `| ${lang} | ${p.total} | ${p.reviewed} | ${p.draft} | ${p.missing}${p.orphan.length ? ` (+원문 없음 ${p.orphan.length})` : ""} | ${p.percent}% | ${p.errors} | ${p.warnings}${p.suppressed ? ` (허용 ${p.suppressed})` : ""} |`,
    );
  }
  lines.push("");

  const todo = Object.entries(byLang).flatMap(([lang, p]) => p.todo.map((t) => ({ lang, ...t })));
  if (!todo.length) {
    lines.push("## 검수 대기", "", "기계 점검에서 문제가 남은 항목이 없습니다. 원어민 검수만 남았습니다.", "");
  } else {
    lines.push("## 검수 대기 — 기계 점검이 문제를 찾은 항목부터", "");
    lines.push("| 언어 | 항목 | 상태 | 오류 | 경고 |", "|---|---|---|---|---|");
    for (const t of todo.slice(0, 40)) {
      lines.push(`| ${t.lang} | \`${t.key}\` | ${t.state === "missing" ? "번역 없음" : "초안"} | ${t.errors} | ${t.warnings} |`);
    }
    if (todo.length > 40) lines.push(`| … | 남은 ${todo.length - 40}건은 \`npm run i18n:qc -- --write\` 리포트를 보세요 | | | |`);
    lines.push("");
  }

  const untranslated = Object.entries(byLang).filter(([, p]) => p.missingList?.length);
  if (untranslated.length) {
    lines.push("## 번역이 없는 원문 — 새로 들어온 글부터", "");
    lines.push("| 언어 | 항목 | 한국어 제목 |", "|---|---|---|");
    const rows = untranslated.flatMap(([lang, p]) => p.missingList.map((m) => ({ lang, ...m })));
    for (const r of rows.slice(0, 40)) lines.push(`| ${r.lang} | \`${r.key}\` | ${r.title.replace(/\|/g, "\\|").slice(0, 60)} |`);
    if (rows.length > 40) lines.push(`| … | 남은 ${rows.length - 40}건 | |`);
    lines.push("");
  }

  const orphans = Object.entries(byLang).filter(([, p]) => p.orphan.length);
  if (orphans.length) {
    lines.push("## 원문이 없는 번역 키 (빌드가 만드는 주소 없음)", "");
    for (const [lang, p] of orphans) lines.push(`- ${lang}: ${p.orphan.map((k) => `\`${k}\``).join(", ")}`);
    lines.push("");
  }

  lines.push(
    "## 다음 단계",
    "",
    "1. 원어민이 검수한 항목의 `content/i18n/<언어>.json › entries[키].review` 를 `YYYY-MM-DD 검수 완료(검수자)` 로 바꿉니다.",
    "2. `npm run i18n:progress` — 이 리포트가 갱신됩니다(진행률·검수 대기 목록).",
    "3. `npm run i18n:qc` — 연락처 불일치(오류)가 0인지 확인합니다. 의도된 차이는 `content/i18n/qc-allow.json` 에 근거와 함께 적습니다.",
    "",
  );
  return lines.join("\n");
}

function main() {
  const args = process.argv.slice(2);
  const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, "notion-content.json"), "utf8"));
  const sources = koSources(snapshot);
  const allow = loadAllowlist(ROOT);
  const date = new Date().toISOString().slice(0, 10);

  const byLang = {};
  for (const lang of LANGS) {
    const file = path.join(ROOT, "content/i18n", `${lang}.json`);
    if (!fs.existsSync(file)) continue;
    const dict = JSON.parse(fs.readFileSync(file, "utf8"));
    const qc = qcLanguage(lang, dict, sources, allow);
    byLang[lang] = progressOf({ sources, dict, qc });
  }
  const all = overall(byLang);

  // CI 실행 요약 — 파일을 쓰지 않고 표준출력만 합니다.
  if (args.includes("--summary")) {
    process.stdout.write(summaryMarkdown(byLang, { date, overall: all }));
    return;
  }

  if (!args.includes("--quiet")) {
    console.log(`번역 검수 진행률 — ${date}`);
    for (const [lang, p] of Object.entries(byLang)) {
      console.log(
        `  ${lang}  ${bar(p.percent)}  완료 ${p.reviewed}/${p.total} · 초안 ${p.draft} · 없음 ${p.missing} · QC 오류 ${p.errors} · 경고 ${p.warnings}`,
      );
    }
    console.log(`  전체  ${bar(all.percent)}  완료 ${all.reviewed}/${all.total}`);
    const todo = Object.values(byLang).reduce((acc, p) => acc + p.todo.length, 0);
    console.log(todo ? `  검수 대기(QC 문제) ${todo}건 — 리포트 참고` : "  검수 대기(QC 문제) 없음");
  }

  const dir = path.join(ROOT, "reports");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `i18n-progress-${date.replace(/-/g, "")}.md`);
  fs.writeFileSync(file, `${progressMarkdown(byLang, { date, overall: all })}\n`);
  if (!args.includes("--quiet")) console.log(`\n리포트: ${path.relative(ROOT, file)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
