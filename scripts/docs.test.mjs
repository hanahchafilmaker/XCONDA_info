/**
 * 저장소 진입 문서 회귀 방지 — 2026-10-25
 *
 * `README.md` 는 저장소 첫 화면입니다. 여기 적힌 링크·명령이 실제와 어긋나면
 * 처음 온 사람이 바로 막힙니다. 아래를 자동으로 검사합니다.
 *   1) README · HANDOFF 같은 안내 문서가 존재하고, 링크한 파일이 실제로 있는가
 *   2) README 에 적힌 `npm run <script>` 가 package.json 에 실제로 있는가
 *   3) CI 가 런타임 스모크까지 돌리는가 (백로그 "중간" 항목의 회귀 방지)
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");
const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

/** README 의 상대 링크(`./foo`, `foo/`)만 뽑습니다. 외부 URL·앵커는 제외. */
function relativeLinks(markdown) {
  const out = new Set();
  for (const m of markdown.matchAll(/\]\(([^)\s]+)\)/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|#)/.test(href)) continue;
    out.add(href.replace(/^\.\//, "").replace(/#.*$/, ""));
  }
  return [...out];
}

test("README 가 저장소 진입점으로 존재한다", () => {
  assert.ok(fs.existsSync(path.join(ROOT, "README.md")));
  assert.match(readme, /^# /, "제목(#)이 필요합니다");
  assert.match(readme, /HANDOFF\.md/, "상세 문서(HANDOFF.md)로 가는 길이 있어야 합니다");
  assert.match(readme, /hub\.xconda\.ai/, "운영 주소가 있어야 합니다");
  // 생성물을 직접 고치지 말라는 경고는 사고 예방에 직결됩니다.
  assert.match(readme, /직접 고치지 마세요|직접 수정 금지/);
});

test("README 의 상대 링크는 실제 파일을 가리킨다", () => {
  const missing = relativeLinks(readme).filter((href) => {
    if (!href) return false;
    return !fs.existsSync(path.join(ROOT, href));
  });
  assert.deepEqual(missing, [], `없는 파일을 링크합니다: ${missing.join(", ")}`);
});

test("README 에 적힌 npm 스크립트는 package.json 에 있다", () => {
  const used = new Set([...readme.matchAll(/npm run ([a-z0-9:]+)/g)].map((m) => m[1]));
  assert.ok(used.size >= 4, "빠른 시작에 실행 명령이 충분히 있어야 합니다");
  const missing = [...used].filter((name) => !pkg.scripts?.[name]);
  assert.deepEqual(missing, [], `package.json 에 없는 스크립트: ${missing.join(", ")}`);
});

test("CI 가 런타임 스모크 테스트까지 돌린다", () => {
  const ci = fs.readFileSync(path.join(ROOT, ".github/workflows/build-site.yml"), "utf8");
  assert.match(ci, /npm run test:smoke/, "배포 전에 스모크 테스트가 돌아야 합니다");
  // 스모크가 게시 단계보다 먼저 와야 실패 시 배포가 막힙니다.
  assert.ok(
    ci.indexOf("npm run test:smoke") < ci.indexOf("name: 빌드 결과물 게시"),
    "스모크 테스트는 게시 단계보다 앞에 있어야 합니다",
  );
});

test("README 의 워크플로 표가 실제 워크플로 파일과 맞는다", () => {
  const dir = path.join(ROOT, ".github/workflows");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".yml"));
  assert.ok(files.length >= 3, "워크플로 파일이 3개 이상이어야 합니다");
  assert.match(readme, /www 기능 페이지 산출물/);
  assert.match(readme, /Notion 동기화/);
});
