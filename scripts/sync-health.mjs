#!/usr/bin/env node
/**
 * 동기화 건강 점검 (sync health) — 2026-11-08
 *
 *   node scripts/sync-health.mjs                      # 실행 요약(Markdown)을 표준출력으로
 *   SNAPSHOT_OUTCOME=failure node scripts/sync-health.mjs
 *   node scripts/sync-health.mjs --json               # 기계용
 *
 * 왜 필요한가 — 2026-11-07 21:25Z ~ 11/08 02:05Z 사이 Notion 동기화가 **51회 연속 실패**했는데,
 * 사이트에는 아무 표시가 없었습니다(상단 배지의 60분 지연 문구뿐). 그동안 노션에 올린 글이
 * 사이트에 반영되지 않았고, 발행 점검(`content:audit`)을 돌리지 않으면 아무도 몰랐습니다.
 *
 * 이 스크립트는 워크플로 실행 요약에 **"지금 사이트가 언제 기준 콘텐츠인지"** 와
 * 실패 시 **어디부터 볼지**(점검 순서)를 남깁니다. 원인을 추측하지 않고, 확인 가능한 사실만 씁니다.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const SNAPSHOT = path.join(ROOT, "notion-content.json");

/** 스냅샷 파일의 생성 시각·글 수 (없으면 null) */
export function snapshotInfo(file = SNAPSHOT) {
  if (!fs.existsSync(file)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    return {
      generatedAt: String(data?.generatedAt ?? ""),
      rows: rows.length,
      published: rows.filter((r) => r?.Published === "True" || r?.Published === true).length,
      withoutSlug: rows.filter((r) => !String(r?.Slug ?? "").trim()).length,
    };
  } catch {
    return null;
  }
}

/**
 * 스냅샷 나이(시간). `generatedAt` 이 없거나 해석 불가면 null.
 * @param {string} generatedAt ISO 문자열
 * @param {Date} [now]
 */
export function ageHours(generatedAt, now = new Date()) {
  const t = Date.parse(String(generatedAt ?? ""));
  if (!Number.isFinite(t)) return null;
  return Math.round(((now.getTime() - t) / 36e5) * 10) / 10;
}

/** 사람이 읽는 실행 요약 */
export function summaryMarkdown({ outcome = "", info = null, now = new Date() } = {}) {
  const lines = ["## Notion 동기화 상태", ""];
  const failed = outcome && outcome !== "success";
  if (failed) {
    lines.push(`> ⚠️ **스냅샷 생성 실패** (\`${outcome}\`). 이번 실행에서는 콘텐츠를 게시하지 않았습니다.`);
    lines.push("> 사이트는 **직전 스냅샷 그대로**이며, 그 이후 노션에 쓴 글은 아직 반영되지 않았습니다.", "");
  } else if (outcome) {
    lines.push("> ✅ 스냅샷 생성 성공.", "");
  }

  if (!info) {
    lines.push("- 스냅샷 파일을 읽을 수 없습니다(`notion-content.json`).");
  } else {
    const age = ageHours(info.generatedAt, now);
    lines.push("| 항목 | 값 |", "|---|---|");
    lines.push(`| 스냅샷 생성 시각 | ${info.generatedAt || "(기록 없음)"} |`);
    if (age !== null) {
      // 2026-11-10 부터 스냅샷은 **콘텐츠가 바뀔 때만** 갱신됩니다(하트비트 제거).
      // 그래서 "며칠 전 스냅샷"은 정상일 수 있습니다 — 오래됨 경고는 일주일 기준으로만 냅니다.
      const stale = age > 24 * 7;
      lines.push(`| 마지막 콘텐츠 변경 | ${age}시간 전${stale ? " ⚠️ 오래됨 (동기화가 일주일 넘게 새 글을 못 올림)" : ""} |`);
    }
    lines.push(`| 글 수 | ${info.rows}건 (게시 ${info.published}) |`);
    lines.push(`| Slug 없는 글 | ${info.withoutSlug}건 |`);
    lines.push("");
    lines.push("발행 전 점검: `npm run content:audit` — Slug·SEO 제목·SEO 설명·커버 누락과 중복 후보를 표로 보여 줍니다.");
  }

  if (failed) {
    lines.push("", "### 실패 시 점검 순서 (위에서부터)", "");
    lines.push("1. **`NOTION_TOKEN` 시크릿** — 만료·재발급·워크스페이스 접근 권한 회수 여부");
    lines.push("2. **`NOTION_DATABASE_ID`·`NOTION_PAGE_ID` 변수** — 표/페이지가 옮겨지거나 삭제되지 않았는지");
    lines.push("3. **연동(Integration) 권한** — 해당 데이터베이스에 초대되어 있는지");
    lines.push("4. **노션 쪽 일시 오류** — 몇 분 뒤 `Run workflow` 로 재시도");
    lines.push("");
    lines.push("위 4개를 확인해도 계속 실패하면 이 실행의 **실패한 스텝 로그**를 그대로 개발 담당에게 전달해 주세요(토큰 값은 붙이지 않습니다).");
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const args = process.argv.slice(2);
  const input = { outcome: process.env.SNAPSHOT_OUTCOME ?? "", info: snapshotInfo() };
  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(input, null, 2)}\n`);
    return;
  }
  process.stdout.write(summaryMarkdown(input));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
