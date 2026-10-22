/**
 * 동기화 배지 정직성 회귀 테스트.
 *
 * 배경: 공개 프록시(notion-api.splitbee.io)가 죽어 있으면 앱은 정적 스냅샷
 * (notion-content.json)으로 폴백한다. 예전에는 이때도 배지에 "방금 전"을 표시해서,
 * 몇 시간 전 데이터를 방금 동기화한 것처럼 보였다("동기화했는데 새 글이 왜 안 보이지?").
 * → 스냅샷에서 읽었다면 스냅샷 생성 시각을 표시해야 한다.
 *
 * 2026-10-21 UI 결정으로 수동 "지금 동기화(Sync now)" 버튼은 숨겼다(방문자에게는 배지만
 * 보여주고, 즉시 반영은 Actions 워크플로 수동 실행으로 한다). 그래서 이 테스트는
 *   ① 초기 로드 배지가 출처(스냅샷) 시각을 정직하게 표시하는지,
 *   ② "지금 동기화" 버튼이 다시 나타나지 않는지
 * 를 검증한다. 실제 앱 번들(IIFE)을 jsdom 에서 실행하고 fetch 를 스텁한다.
 *   node scripts/smoke-sync.mjs [번들 경로]      (기본: ../dist-test/app.js)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const here = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(here, "../dist-test/app.js");
const bundle = fs.readFileSync(bundlePath, "utf8");

const PAGE_ID = "3e72ebc0-17ad-8024-a3f5-ef8fb9f8c6dd"; // src/notion.ts DEFAULT_ENDPOINT 와 동일
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const row = (n, extra = {}) => ({
  id: `00000000-0000-0000-0000-00000000000${n}`,
  Title: `공지 ${n}`,
  Type: "공지",
  Published: true,
  Date: "2026-09-29",
  ...extra,
});

const reply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
});

/**
 * @param snapshotAgeMin  스냅샷이 만들어진 지 몇 분 됐는가
 * @param proxy           "dead" = splitbee /table 500 + /page 는 표 없음 (현재 실제 상태)
 *                        "live" = /table 이 행 4개(새 글 1개 포함)를 돌려줌
 */
async function runScenario({ name, snapshotAgeMin, proxy }) {
  const problems = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => problems.push(`jsdomError: ${e.message}`));

  const dom = new JSDOM(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>t</title></head><body><div id="root"></div></body></html>`,
    { runScripts: "dangerously", pretendToBeVisual: true, url: "http://localhost/dev.html", virtualConsole: vc },
  );
  const { window } = dom;

  class IO {
    constructor(cb) { this.cb = cb; }
    observe(el) { this.cb([{ isIntersecting: true, target: el }], this); }
    unobserve() {}
    disconnect() {}
  }
  window.IntersectionObserver = IO;
  window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.scrollTo = () => {};
  Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", { value() {}, writable: true });

  const snapshotRows = [row(1), row(2), row(3)];
  const snapshot = {
    generatedAt: new Date(Date.now() - snapshotAgeMin * 60_000).toISOString(),
    source: { pageId: PAGE_ID, collectionViewId: null, collectionId: null },
    rows: snapshotRows,
    pages: {},
  };
  const calls = [];
  window.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("notion-content.json")) return reply(200, snapshot);
    if (url.includes("/v1/table/")) {
      return proxy === "live" ? reply(200, [...snapshotRows, row(4, { Title: "방금 올린 새 글" })]) : reply(500, "Internal Server Error");
    }
    if (url.includes("/v1/page/")) return reply(200, { [PAGE_ID]: { value: { value: { id: PAGE_ID, type: "page" } } } }); // 표(행) 없음
    return reply(404, "not found");
  };

  const script = window.document.createElement("script");
  script.textContent = bundle;
  window.document.body.appendChild(script);
  await wait(1200);

  const doc = window.document;
  const badge = () => doc.querySelector('#news [aria-live="polite"]')?.textContent?.trim() ?? "";
  // 공지 섹션은 첫 글을 큰 카드로, 나머지를 목록으로 그리므로 제목이 몇 개 보이는지로 센다.
  const noticeRows = () => {
    const text = doc.querySelector("#notices")?.textContent ?? "";
    return ["공지 1", "공지 2", "공지 3", "방금 올린 새 글"].filter((title) => text.includes(title)).length;
  };
  // 숨기기로 결정된 버튼이 되살아나면 실패시킨다 (10/21 결정 회귀 방지).
  const syncButtons = () =>
    [...doc.querySelectorAll("button")].filter((b) => /지금 동기화|Sync now|동기화 완료|Synced/.test(b.getAttribute("aria-label") ?? ""));

  const initial = { badge: badge(), rows: noticeRows() };
  const syncButtonCount = syncButtons().length;
  window.close();

  return { name, initial, syncButtonCount, problems, liveCalls: calls.filter((u) => u.includes("splitbee")).length };
}

const JUST_NOW = /방금 전|just now/;
const HOURS = (n) => new RegExp(`${n}시간 전|${n}h ago`);
const MINUTES = (n) => new RegExp(`${n}분 전|${n}m ago`);

const scenarios = [
  {
    // 실제 최악의 경우: 스냅샷 7시간 경과 + 프록시 사망 → 배지는 "7시간 전"이어야 한다
    spec: { name: "프록시 사망 + 낡은 스냅샷(7시간)", snapshotAgeMin: 7 * 60, proxy: "dead" },
    check: (r, fail) => {
      if (!HOURS(7).test(r.initial.badge)) fail(`초기 배지가 7시간 전이 아님: "${r.initial.badge}"`);
      if (JUST_NOW.test(r.initial.badge)) fail(`스냅샷으로 폴백했는데 '방금 전' 표시: "${r.initial.badge}"`);
      if (r.initial.rows !== 3) fail(`행 수가 3이 아님: ${r.initial.rows}`);
    },
  },
  {
    // 가장 흔한 경우: 스냅샷 90분 경과 + 프록시 사망 → "1시간 전"
    spec: { name: "프록시 사망 + 신선한 스냅샷(90분)", snapshotAgeMin: 90, proxy: "dead" },
    check: (r, fail) => {
      if (!HOURS(1).test(r.initial.badge)) fail(`초기 배지가 1시간 전이 아님: "${r.initial.badge}"`);
      if (JUST_NOW.test(r.initial.badge)) fail(`스냅샷으로 폴백했는데 '방금 전' 표시: "${r.initial.badge}"`);
      if (r.initial.rows !== 3) fail(`행 수가 3이 아님: ${r.initial.rows}`);
    },
  },
  {
    // 프록시가 살아 있어도 초기 표시는 스냅샷 기준(10분 전)이어야 한다.
    // 실시간 반영은 자동 폴링이 담당하므로, 버튼 클릭 기반 검증은 버튼 숨김 결정과 함께 뺐다.
    spec: { name: "프록시 정상 + 스냅샷(10분)", snapshotAgeMin: 10, proxy: "live" },
    check: (r, fail) => {
      if (!MINUTES(10).test(r.initial.badge)) fail(`초기 배지가 10분 전이 아님: "${r.initial.badge}"`);
      if (r.initial.rows !== 3) fail(`초기 행 수가 3이 아님: ${r.initial.rows}`);
    },
  },
];

const failures = [];
for (const { spec, check } of scenarios) {
  const result = await runScenario(spec);
  const fail = (msg) => failures.push(`[${spec.name}] ${msg}`);
  if (result.syncButtonCount > 0) fail(`숨기기로 한 "지금 동기화" 버튼이 보임 (${result.syncButtonCount}개)`);
  if (result.problems.length) fail(`런타임 오류: ${result.problems.slice(0, 3).join(" | ")}`);
  check(result, fail);
  console.log(
    `${failures.some((f) => f.startsWith(`[${spec.name}]`)) ? "✖" : "✔"} ${spec.name}\n` +
      `    초기: "${result.initial.badge}" (공지 ${result.initial.rows}행, 동기화 버튼 ${result.syncButtonCount}개)`,
  );
}

if (failures.length) {
  console.error("\nFAIL:\n - " + failures.join("\n - "));
  process.exit(1);
}
console.log("\nPASS — 배지가 데이터 출처(스냅샷) 시각을 정직하게 표시하고, 수동 동기화 버튼은 숨겨져 있습니다.");
