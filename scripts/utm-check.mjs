#!/usr/bin/env node
/**
 * UTM 링크 검사기 — 게시 전에 링크가 「UTM 규칙 v1.0」을 지켰는지 확인합니다.
 *
 *   node scripts/utm-check.mjs "https://www.xconda.ai/?utm_source=instagram&utm_medium=social&utm_campaign=flexboard_202611&utm_content=mhw_reel01"
 *   node scripts/utm-check.mjs --file links.txt      # 한 줄에 링크 하나, # 주석 허용
 *   node scripts/utm-check.mjs --examples            # 규칙 문서의 표준 예시를 스스로 검사
 *
 * 규칙 문서: reports/utm-rules-20261109.md
 * 이 파일의 ALLOWED_* · EXAMPLES 상수가 문서와 같은 값을 가리킵니다.
 * 문서와 코드가 어긋나면 **문서를 먼저 고치고** 함께 커밋하세요.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** utm_source — 플랫폼 이름. 새 채널은 승인 후에만 추가합니다. */
export const ALLOWED_SOURCE = [
  "youtube",
  "instagram",
  "facebook",
  "x",
  "threads",
  "reddit",
  "linkedin",
  "newsletter",
];

/** utm_medium — GA4 기본 채널 그룹이 읽는 값. 임의 확장 금지. */
export const ALLOWED_MEDIUM = ["social", "video", "community", "email", "paid"];

/** utm_content 의 팀 접두어. */
export const ALLOWED_TEAM = ["mhw", "cb"];

/** 규칙 문서 §7 의 표준 예시. `--examples` 와 테스트가 같은 링크를 씁니다. */
export const EXAMPLES = [
  "https://www.xconda.ai/?utm_source=instagram&utm_medium=social&utm_campaign=flexboard_202611&utm_content=mhw_reel01",
  "https://www.xconda.ai/?utm_source=youtube&utm_medium=video&utm_campaign=flexboard_202611&utm_content=cb_video01",
  "https://hub.xconda.ai/post/kbs-documentary-seongmul-xconda/?utm_source=instagram&utm_medium=social&utm_campaign=case_kbs_202611&utm_content=cb_post03",
  "https://www.xconda.ai/?utm_source=newsletter&utm_medium=email&utm_campaign=flexboard_202611&utm_content=cb_mail01",
  "https://www.xconda.ai/?utm_source=reddit&utm_medium=community&utm_campaign=flexboard_202611&utm_content=mhw_reddit01",
  "https://www.xconda.ai/?utm_source=instagram&utm_medium=paid&utm_campaign=flexboard_202611&utm_content=mhw_ad01&utm_term=ai_storyboard",
];

const REQUIRED = ["utm_source", "utm_medium", "utm_campaign"];
const KNOWN = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const LOWER = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const CAMPAIGN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*_((?:19|20)\d{2})(0[1-9]|1[0-2])$/;
const CONTENT = /^([a-z0-9]{2,4})_([a-z0-9]{2,})$/;
/** 쿼리를 떨어뜨리기 쉬운 단축 주소. */
const SHORTENERS = ["bit.ly", "bitly.com", "t.co", "goo.gl", "tinyurl.com", "han.gl", "vo.la", "me2.do", "url.kr"];

/**
 * 링크 하나를 검사합니다.
 * @returns {{url: string, errors: string[], warnings: string[], values: Record<string,string>}}
 */
export function checkLink(input) {
  const errors = [];
  const warnings = [];
  const values = {};
  const url = String(input || "").trim();

  if (!url) return { url, errors: ["빈 링크"], warnings, values };
  if (/\s/.test(url)) errors.push("링크에 공백이 있습니다 — %20 이 아니라 값을 고치세요");

  const hashAt = url.indexOf("#");
  const queryAt = url.indexOf("?");
  if (hashAt !== -1 && queryAt > hashAt) {
    errors.push("`?` 가 `#` 뒤에 있습니다 — 앵커 뒤 파라미터는 서버로 전달되지 않습니다");
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { url, errors: ["URL 형식이 아닙니다"], warnings, values };
  }
  if (!/^https?:$/.test(parsed.protocol)) errors.push("http(s) 주소가 아닙니다");

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  if (SHORTENERS.includes(host)) {
    warnings.push("단축 주소입니다 — 리다이렉트에서 UTM이 사라질 수 있어 원본 주소를 권장합니다");
  }

  const seen = new Set();
  for (const [key, value] of parsed.searchParams.entries()) {
    if (seen.has(key)) errors.push(`\`${key}\` 가 두 번 들어 있습니다`);
    seen.add(key);
    if (key.startsWith("utm_") && !KNOWN.includes(key)) {
      errors.push(`모르는 파라미터 \`${key}\` — 쓰는 칸은 다섯 개뿐입니다`);
    }
    if (key.startsWith("utm_") || key === "gclid" || key === "fbclid") values[key] = value;
  }

  for (const key of REQUIRED) {
    if (!values[key]) errors.push(`필수 칸 \`${key}\` 가 없습니다`);
  }

  const lower = (key) => {
    const value = values[key];
    if (!value) return;
    if (/[A-Z]/.test(value)) errors.push(`\`${key}=${value}\` — 대문자입니다. \`${value.toLowerCase()}\` 로 쓰세요`);
    if (/[가-힣]/.test(value)) errors.push(`\`${key}=${value}\` — 한글입니다. 영문 소문자·숫자·밑줄만 쓰세요`);
    if (/[-\s.]/.test(value)) errors.push(`\`${key}=${value}\` — 하이픈·공백·마침표 대신 밑줄(_)을 쓰세요`);
    if (!/^[a-z0-9_]+$/.test(value) && !/[가-힣]/.test(value)) {
      errors.push(`\`${key}=${value}\` — 허용 문자는 a-z, 0-9, _ 입니다`);
    }
  };
  for (const key of KNOWN) lower(key);

  const source = values.utm_source;
  const medium = values.utm_medium;
  const campaign = values.utm_campaign;
  const content = values.utm_content;

  if (source && !ALLOWED_SOURCE.includes(source)) {
    errors.push(
      `\`utm_source=${source}\` 는 허용값이 아닙니다 (${ALLOWED_SOURCE.join(", ")}). 새 채널은 규칙에 먼저 추가하세요`,
    );
  }
  if (medium && !ALLOWED_MEDIUM.includes(medium)) {
    errors.push(
      `\`utm_medium=${medium}\` 는 허용값이 아닙니다 (${ALLOWED_MEDIUM.join(", ")}). GA4 채널 그룹이 이 값을 읽습니다`,
    );
  }
  if (medium === "newsletter") {
    errors.push("`utm_medium=newsletter` 는 Email 로 분류되지 않습니다 — `utm_source=newsletter&utm_medium=email` 을 쓰세요");
  }
  if (source === "newsletter" && medium && medium !== "email") {
    errors.push(`뉴스레터는 \`utm_medium=email\` 고정입니다 (지금: ${medium})`);
  }
  if (/^(instagram|facebook|youtube|x|threads|linkedin|reddit)_(ads|ad|paid)$/.test(source || "")) {
    errors.push("유료는 source를 바꾸지 말고 `utm_medium=paid` 로 구분하세요");
  }
  if (medium === "paid" && source === "youtube") {
    warnings.push("YouTube 유료는 GA4에서 Paid Video 로 분류됩니다 — 리포트에서 채널을 따로 보세요");
  }
  if (medium === "community") {
    warnings.push("`community` 는 GA4 기본 채널 그룹에 없습니다 — 커스텀 채널 그룹 'Community' 등록 여부를 확인하세요");
  }
  if (medium === "video" && source && source !== "youtube") {
    warnings.push("`video` 는 보통 YouTube 설명란에 씁니다 — 다른 플랫폼이면 `social` 이 맞는지 확인하세요");
  }
  if (medium === "social" && source === "youtube") {
    warnings.push("YouTube 설명란 링크는 `video`, 커뮤니티 탭 게시물은 `social` 입니다");
  }

  if (campaign && !CAMPAIGN.test(campaign)) {
    errors.push(`\`utm_campaign=${campaign}\` — 형식은 \`주제_연월\` (예: flexboard_202611) 입니다`);
  }

  if (content) {
    const m = content.match(CONTENT);
    if (!m) {
      errors.push(`\`utm_content=${content}\` — 형식은 \`팀_게시물\` (예: mhw_reel01) 입니다`);
    } else if (!ALLOWED_TEAM.includes(m[1])) {
      errors.push(`\`utm_content\` 의 팀 \`${m[1]}\` 이 목록에 없습니다 (${ALLOWED_TEAM.join(", ")})`);
    }
  }

  const term = values.utm_term;
  if (term && medium && medium !== "paid") {
    warnings.push("`utm_term` 은 검색 광고에만 씁니다 — 오가닉·소셜이면 빼세요");
  }
  if (term && /[가-힣]/.test(term)) {
    warnings.push("한글 검색어는 ValueTrack `{keyword}` 로만 들어옵니다 — 수동 입력이면 키워드 코드를 쓰세요");
  }
  if (values.gclid || values.fbclid) {
    warnings.push("자동 태깅(gclid·fbclid)과 UTM을 함께 쓰면 리포트가 갈라질 수 있습니다 — 매체 담당자와 기준을 하나로 정하세요");
  }

  return { url, errors, warnings, values };
}

export function formatResult(result) {
  const line = `${result.errors.length ? "✖" : result.warnings.length ? "⚠" : "✔"} ${result.url}`;
  const detail = KNOWN.filter((k) => result.values[k]).map((k) => `${k.replace("utm_", "")}=${result.values[k]}`);
  const rows = [line, detail.length ? `   ${detail.join("  ")}` : ""];
  for (const error of result.errors) rows.push(`   오류: ${error}`);
  for (const warning of result.warnings) rows.push(`   확인: ${warning}`);
  return rows.filter(Boolean).join("\n");
}

function readLinks(file) {
  const full = path.resolve(process.cwd(), file);
  return fs
    .readFileSync(full, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function main(argv) {
  let links = [];
  let source = "인자";

  if (argv.includes("--examples")) {
    links = EXAMPLES;
    source = "표준 예시";
  } else if (argv.includes("--file")) {
    const i = argv.indexOf("--file");
    const file = argv[i + 1];
    if (!file) {
      console.error("--file 뒤에 경로가 필요합니다");
      process.exit(2);
    }
    links = readLinks(file);
    source = file;
  } else {
    links = argv.filter((arg) => !arg.startsWith("--"));
  }

  if (!links.length) {
    console.error("검사할 링크가 없습니다.\n\n" + fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
    process.exit(2);
  }

  const results = links.map(checkLink);
  console.log(`UTM 검사 (${source}) — ${results.length}건\n`);
  for (const result of results) console.log(formatResult(result) + "\n");

  const failed = results.filter((r) => r.errors.length).length;
  const warned = results.filter((r) => !r.errors.length && r.warnings.length).length;
  const passed = results.length - failed - warned;
  console.log(`결과: 통과 ${passed} · 확인 ${warned} · 오류 ${failed}`);
  process.exit(failed ? 1 : 0);
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) main(process.argv.slice(2));
