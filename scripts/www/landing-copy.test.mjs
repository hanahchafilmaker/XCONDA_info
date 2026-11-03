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
