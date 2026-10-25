/**
 * 워크플로 설정 회귀 방지 — 2026-10-25 정리
 *
 * 지난 2주 동안 실제로 났던 문제를 설정 파일에서 막습니다.
 *   1) 생성 봇이 기능 브랜치에 커밋 → PR 충돌 (#51·#46 이 그렇게 쌓였습니다)
 *   2) 워크플로가 PR 을 자동으로 만들던 경로
 *   3) `www/**`·`content/i18n/**` 변경이 사이트 빌드를 트리거하지 않던 문제 (#60·#61)
 *   4) 새 언어 디렉터리(en/ja/zh)가 커밋 대상에서 빠져 배포 후 사라지던 문제
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(here, "..", ".github/workflows");
const read = (name) => fs.readFileSync(path.join(DIR, name), "utf8");
const workflowFiles = fs.readdirSync(DIR).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

test("워크플로가 PR 을 자동으로 만들지 않는다", () => {
  for (const file of workflowFiles) {
    const text = read(file);
    assert.doesNotMatch(text, /gh\s+pr\s+create/, `${file}: PR 자동 생성`);
    assert.doesNotMatch(text, /peter-evans\/create-pull-request/, `${file}: PR 자동 생성 액션`);
    assert.doesNotMatch(text, /pulls["']\s*[,)]/, `${file}: REST 로 PR 생성`);
  }
});

test("Notion 동기화는 main 에서만 돈다(기능 브랜치 push 금지)", () => {
  // 주석에 적힌 경고 문구("arena/** 를 넣으면 …")와 실제 설정을 구분합니다.
  const text = read("notion-sync.yml")
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
  const push = text.slice(text.indexOf("  push:"));
  assert.match(push, /branches:\s*\n\s*-\s*main/, "push.branches 에 main 만 있어야 합니다");
  assert.doesNotMatch(push, /arena\/\*\*/, "arena/** 를 다시 넣으면 PR 이 계속 충돌합니다");
});

test("사이트 빌드는 www·번역 파일 변경에도 트리거된다", () => {
  const text = read("build-site.yml");
  for (const p of ['"www/**"', '"scripts/www/**"', '"content/i18n/**"']) {
    assert.ok(text.includes(p), `paths 에 ${p} 가 없습니다`);
  }
});

test("생성 페이지를 커밋하는 워크플로는 언어 디렉터리까지 올린다", () => {
  for (const file of ["build-site.yml", "notion-sync.yml"]) {
    const text = read(file);
    assert.match(
      text,
      /for d in post notice qna guide en ja zh; do git add -A -- "\$d"/,
      `${file}: en·ja·zh 를 커밋 대상에 넣어야 배포 후 번역 페이지가 사라지지 않습니다`,
    );
  }
});

test("사이트 빌드는 www 원고 검사·산출물 빌드를 함께 돌린다", () => {
  const text = read("build-site.yml");
  assert.match(text, /npm run www:check/);
  assert.match(text, /npm run www:build/);
});
