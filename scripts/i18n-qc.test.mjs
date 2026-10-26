import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  contactTokens,
  numberTokens,
  hasSpelledNumber,
  qcLanguage,
  koSources,
  loadAllowlist,
  reportMarkdown,
} from "./i18n-qc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..");

test("연락처 토큰은 문장부호·전각 괄호를 떼어 낸다", () => {
  const t = contactTokens("문의 cubeberry@cuberry.kr. 전화 +82-70-8095-2302, 사이트 https://www.ftc.go.kr/bizCommPop.do?wrkr_no=4808803079）에서 확인");
  assert.deepEqual(t.emails, ["cubeberry@cuberry.kr"]);
  assert.deepEqual(t.phones, ["+827080952302".replace("+82", "+82")]);
  assert.deepEqual(t.urls, ["https://www.ftc.go.kr/bizCommPop.do?wrkr_no=4808803079"]);
});

test("숫자 토큰은 쉼표를 지우고 중복을 합친다", () => {
  assert.deepEqual(numberTokens("10,450원 3,100컷 10,450원"), ["10450", "3100"]);
});

test("숫자를 글자로 쓴 표현을 인식한다", () => {
  assert.equal(hasSpelledNumber("only the last four digits", "4"), true);
  assert.equal(hasSpelledNumber("每月举办一次", "1"), true);
  assert.equal(hasSpelledNumber("单次生成所需的点数", "1"), true);
  assert.equal(hasSpelledNumber("no numbers here", "4"), false);
});

const sources = new Map([
  ["qna/a", { title: "문의는 어디로 하나요?", summary: "이메일 cubeberry@cuberry.kr, 카드 끝 4자리, 10,450원입니다.", category: "" }],
]);

test("연락처가 빠지면 오류로 잡는다", () => {
  const dict = { entries: { "qna/a": { title: "Where do I ask?", summary: "Email us. Last four digits, 10,450 KRW." } } };
  const r = qcLanguage("en", dict, sources);
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].kind, "email-missing");
});

test("연락처가 있으면 통과하고, 숫자는 글자 표기까지 인정한다", () => {
  const dict = {
    entries: {
      "qna/a": { title: "Where do I ask?", summary: "Email cubeberry@cuberry.kr. We keep the last four digits. Packs cost 10,450 KRW." },
    },
  };
  const r = qcLanguage("en", dict, sources);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
});

test("본문 번역(blocks)의 형식 오류와 한글 잔존을 잡는다", () => {
  const ok = qcLanguage("en", {
    entries: {
      "qna/a": {
        title: "Where do I ask?",
        summary: "Email cubeberry@cuberry.kr. Last four digits, 10,450 KRW.",
        blocks: [{ type: "h2", text: "Heading" }, { type: "p", text: "Body text." }, { type: "ul", items: ["one"] }],
      },
    },
  }, sources);
  assert.deepEqual(ok.errors, []);

  const bad = qcLanguage("en", {
    entries: {
      "qna/a": {
        title: "Where do I ask?",
        summary: "Email cubeberry@cuberry.kr. Last four digits, 10,450 KRW.",
        blocks: [
          { type: "image", src: "x.png" },
          { type: "p", text: "" },
          { type: "ul" },
          { type: "p", text: "문의는 큐브베리 고객센터로 연락 주시면 확인 후 안내드립니다." },
        ],
      },
    },
  }, sources);
  const kinds = bad.errors.map((e) => e.kind);
  assert.ok(kinds.includes("block-type"));
  assert.ok(kinds.includes("block-empty"));
  assert.ok(kinds.includes("block-items"));
  assert.ok(kinds.includes("block-hangul"), "한글이 남은 본문을 잡지 못했습니다");
});

test("허용 목록에 적은 (키, 유형)은 경고에서 빠진다", () => {
  const dict = { entries: { "qna/a": { title: "Where do I ask?", summary: "Email cubeberry@cuberry.kr. " + "x".repeat(400) } } };
  const plain = qcLanguage("en", dict, sources);
  assert.ok(plain.warnings.some((w) => w.kind === "length-long"));
  const allowed = qcLanguage("en", dict, sources, { en: { "qna/a": ["length-long"] } });
  assert.equal(allowed.warnings.some((w) => w.kind === "length-long"), false, "허용한 유형이 남아 있습니다");
  assert.equal(allowed.suppressed, 1);
  assert.equal(allowed.warnings.length, plain.warnings.length - 1);
});

test("한국어 원문(notion-content.json)을 주소/슬러그 키로 읽는다", () => {
  const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, "notion-content.json"), "utf8"));
  const map = koSources(snapshot);
  assert.ok(map.has("qna/contact-inquiry"));
  assert.equal(map.get("qna/contact-inquiry").title.length > 0, true);
});

test("허용 목록 파일은 실제 키를 가리킨다", () => {
  const allow = loadAllowlist(ROOT);
  const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, "notion-content.json"), "utf8"));
  const keys = new Set(koSources(snapshot).keys());
  for (const [lang, items] of Object.entries(allow)) {
    if (lang.startsWith("_")) continue;
    const dict = JSON.parse(fs.readFileSync(path.join(ROOT, "content/i18n", `${lang}.json`), "utf8"));
    for (const [key, kinds] of Object.entries(items)) {
      assert.ok(keys.has(key), `원문이 없는 키: ${lang}/${key}`);
      assert.ok(dict.entries?.[key], `번역이 없는 키: ${lang}/${key}`);
      assert.ok(Array.isArray(kinds) && kinds.length > 0, `${lang}/${key}: 유형이 비었습니다`);
    }
  }
});

test("리포트는 언어별 요약 표와 해설을 담는다", () => {
  const md = reportMarkdown(
    { en: { errors: [], warnings: [] }, ja: { errors: [], warnings: [{ key: "qna/a", kind: "latin-run", detail: "x" }] } },
    { date: "2026-10-25", dicts: { en: { entries: {} }, ja: { entries: {} } } },
  );
  assert.match(md, /\| 언어 \| 항목 \| 오류\(연락처\) \| 경고 \|/);
  assert.match(md, /latin-run/);
  assert.match(md, /경고 유형 해설/);
});
