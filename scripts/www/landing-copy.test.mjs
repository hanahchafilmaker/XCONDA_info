import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { routePrefixFor } from "../../src/content/seo.js";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const featurePages = JSON.parse(read("www/feature-pages.json")).pages;

test("Turn 도구 안내와 이관 원고는 1장으로 충분하고 최대 4장까지임을 함께 밝힌다", () => {
  const phrase = "사진 1장이면 충분, 방향별로 최대 4장까지";
  const hubTools = read("src/content/tools.ts");
  const guide = read("src/content/toolGuides.ts");
  const htmlGuide = read("user-guide.html");
  const turn = featurePages.find((page) => page.slug === "turn");
  assert.ok(turn);
  for (const copy of [hubTools, guide, htmlGuide, turn.ko.description, turn.ko.features[0]]) {
    assert.ok(copy.includes(phrase));
  }
  assert.match(turn.ko.intro, /글 설명만으로도/);
  assert.match(turn.en.intro, /up to four/);
  assert.match(turn.en.intro, /written description/);
  assert.match(read("src/content/tools.en.ts"), /One photo is enough; use up to four from different directions/);
});

test("Director의 두 도구 이름은 운영 메인에서 확인한 아포스트로피를 쓴다", () => {
  const tools = read("src/content/tools.ts");
  const guide = read("user-guide.html");
  assert.match(tools, /name: "Director's Cut"/);
  assert.match(tools, /name: "Director's Sequence"/);
  assert.match(guide, /Director's Sequence/);
  assert.doesNotMatch(tools, /Directors Sequence/);
  assert.equal(featurePages.find((page) => page.slug === "drct-seq").name, "Director's Sequence");
});

test("이관용 파비콘은 48px 이상 정사각형 PNG다", () => {
  const icon = readFileSync(new URL("../../www/assets/xconda-favicon-96.png", import.meta.url));
  assert.equal(icon.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  const width = icon.readUInt32BE(16);
  const height = icon.readUInt32BE(20);
  assert.equal(width, 96);
  assert.equal(width, height);
});

test("기능 페이지 허브 링크는 실제 섹션과 존재하는 한국어·영어 글로 연결된다", (t) => {
  const snapshot = JSON.parse(read("notion-content.json"));
  const translations = JSON.parse(read("content/i18n/en.json")).entries;
  for (const page of featurePages) {
    const row = snapshot.rows.find((entry) => entry.Slug === page.hub && entry.Published !== false);
    assert.ok(row, `${page.slug}: 허브 글이 없습니다`);
    assert.equal(page.hubSection, routePrefixFor(row.__type), page.slug);
    assert.ok(translations[`${page.hubSection}/${page.hub}`], `${page.slug}: 영어 번역이 없습니다`);
  }

  // 실제 빌드된 HTML도 확인합니다. 슬롯/언어가 잘못되어 허브 주소가 404가 되는 회귀를 방지합니다.
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const out = mkdtempSync(path.join(tmpdir(), "xconda-www-test-"));
  t.after(() => rmSync(out, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, ["scripts/www/build-feature-pages.mjs", "--out", out], {
    cwd: root, encoding: "utf8", env: { ...process.env, WWW_NO_PNG: "1" },
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  for (const page of featurePages) {
    for (const [lang, outputPrefix, hubPrefix] of [["ko", "ko/", ""], ["en", "", "en/"]]) {
      const html = readFileSync(path.join(out, outputPrefix, "features", page.slug, "index.html"), "utf8");
      const href = `https://hub.xconda.ai/${hubPrefix}${page.hubSection}/${page.hub}/`;
      assert.ok(html.includes(`href="${href}"`), `${page.slug}/${lang}: ${href}`);
    }
  }
});

test("www llms.txt 는 짧은 안내문이고, 확정되지 않은 가격 숫자를 담지 않는다 (2026-11-26)", () => {
  const llms = read("www/snippets/llms.txt");
  // 형식: llmstxt.org — H1 + 인용 요약
  assert.match(llms, /^# XCONDA$/m);
  assert.match(llms, /^> /m);
  // 세 도구가 모두 설명됩니다.
  for (const tool of ["FLEXBOARD", "Blocking Board", "Turn"]) assert.ok(llms.includes(tool), tool);
  // 허브 가이드로 가는 길
  assert.match(llms, /hub\.xconda\.ai\/guide\/flexboard-storyboard-guide\//);
  // 가격은 숫자를 옮겨 적지 않고 요금 페이지로 보냅니다(값이 바뀌면 낡은 인용이 됩니다).
  assert.match(llms, /https:\/\/www\.xconda\.ai\/pricing/);
  assert.doesNotMatch(llms, /\$\s?\d/);
  assert.doesNotMatch(llms, /\d{1,3}(?:,\d{3})+\s*(?:credits|크레딧)/i);
  // 데이터 신뢰 규칙 — 기준일과 확인 불가 원칙을 밝힙니다.
  assert.match(llms, /2026-11-26/);
  assert.match(llms, /확인 불가/);
  // 학습 이용 불가를 밝힙니다(robots.txt 의 차단과 같은 정책).
  assert.match(llms, /Model-training crawling is not permitted/);
  // 아직 없는 에이전트 경로를 있다고 말하지 않습니다.
  assert.match(llms, /does not currently expose MCP, OpenAPI or `agent\.json`/);
});

test("www 빌드는 robots.txt(같은 AI 정책)와 llms.txt 를 함께 내보낸다", (t) => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const out = mkdtempSync(path.join(tmpdir(), "xconda-www-robots-"));
  t.after(() => rmSync(out, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, ["scripts/www/build-feature-pages.mjs", "--out", out], {
    cwd: root, encoding: "utf8", env: { ...process.env, WWW_NO_PNG: "1" },
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);

  const robots = readFileSync(path.join(out, "robots.txt"), "utf8");
  // 허브와 같은 정책: 검색용은 허용, 학습용은 차단 (2026-11-26)
  // 이름 줄은 여러 개가 묶이므로, 같은 그룹의 첫 지시까지 넘어가며 판정합니다.
  const ruleFor = (agent) => {
    const re = new RegExp(`User-agent: ${agent}\\n(?:User-agent: [^\\n]+\\n)*(Allow|Disallow): (\\S+)`);
    const m = re.exec(robots);
    return m ? `${m[1]}: ${m[2]}` : null;
  };
  for (const name of ["PerplexityBot", "OAI-SearchBot", "Claude-SearchBot"]) {
    assert.equal(ruleFor(name), "Allow: /", name);
  }
  for (const name of ["GPTBot", "ClaudeBot", "Google-Extended", "CCBot"]) {
    assert.equal(ruleFor(name), "Disallow: /", name);
  }
  // 학습 크롤러는 이름으로 막혔으므로 `User-agent: *` 는 계속 허용입니다.
  assert.match(robots, /^User-agent: \*\nAllow: \/$/m);
  // 이 파일이 배포되는 곳은 www 입니다 — 사이트맵 줄이 허브를 가리키면 안 됩니다.
  assert.match(robots, /^Sitemap: https:\/\/www\.xconda\.ai\/sitemap\.xml$/m);
  assert.doesNotMatch(robots, /hub\.xconda\.ai\/sitemap\.xml/);

  const llms = readFileSync(path.join(out, "llms.txt"), "utf8");
  assert.match(llms, /^# XCONDA$/m);
  // 허브 링크는 그대로, www 링크는 배포 도메인 기준
  assert.match(llms, /https:\/\/hub\.xconda\.ai\/guide\/flexboard-storyboard-guide\//);
  assert.match(llms, /https:\/\/www\.xconda\.ai\/pricing/);
});
