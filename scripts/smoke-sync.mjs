/**
 * "지금 동기화" 정직성 회귀 테스트.
 *
 * 배경: 공개 프록시(notion-api.splitbee.io)가 죽어 있으면 "지금 동기화"는 정적 스냅샷
 * (notion-content.json)으로 폴백한다. 예전에는 이때도 배지에 "방금 전"을 표시해서,
 * 몇 시간 전 데이터를 방금 동기화한 것처럼 보였다("동기화했는데 새 글이 왜 안 보이지?").
 * → 스냅샷에서 읽었다면 스냅샷 생성 시각을, 실시간으로 읽었을 때만 "방금 전"을 표시해야 한다.
 *
 * 실제 앱 번들(IIFE)을 jsdom 에서 실행하고 fetch 를 스텁해 세 가지 시나리오를 검증한다.
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
  const syncButtons = () =>
    [...doc.querySelectorAll("button")].filter((b) => /지금 동기화|Sync now|동기화 완료|Synced|동기화 중|Syncing/.test(b.getAttribute("aria-label") ?? ""));

  const initial = { badge: badge(), rows: noticeRows() };
  const button = syncButtons()[0];
  button?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await wait(1200);
  const afterManual = { badge: badge(), rows: noticeRows() };
  window.close();

  return { name, initial, afterManual, hasSyncButton: !!button, problems, liveCalls: calls.filter((u) => u.includes("splitbee")).length };
}

const JUST_NOW = /방금 전|just now/;
const HOURS = (n) => new RegExp(`${n}시간 전|${n}h ago`);
const MINUTES = (n) => new RegExp(`${n}분 전|${n}m ago`);

const scenarios = [
  {
    // 실제 최악의 경우: 스냅샷 7시간 경과 + 프록시 사망 → 초기 로드도, 수동 동기화도 "7시간 전"이어야 한다
    spec: { name: "프록시 사망 + 낡은 스냅샷(7시간)", snapshotAgeMin: 7 * 60, proxy: "dead" },
    check: (r, fail) => {
      if (!HOURS(7).test(r.initial.badge)) fail(`초기 배지가 7시간 전이 아님: "${r.initial.badge}"`);
      if (!HOURS(7).test(r.afterManual.badge)) fail(`수동 동기화 후 배지가 7시간 전이 아님(폴백을 '방금 전'으로 속임): "${r.afterManual.badge}"`);
      if (JUST_NOW.test(r.afterManual.badge)) fail(`스냅샷으로 폴백했는데 '방금 전' 표시: "${r.afterManual.badge}"`);
      if (r.afterManual.rows !== 3) fail(`행 수가 3이 아님: ${r.afterManual.rows}`);
    },
  },
  {
    // 가장 흔한 경우: 스냅샷 90분 경과(6시간 이내) + 프록시 사망 → 수동 동기화해도 "1시간 전"
    spec: { name: "프록시 사망 + 신선한 스냅샷(90분)", snapshotAgeMin: 90, proxy: "dead" },
    check: (r, fail) => {
      if (!HOURS(1).test(r.initial.badge)) fail(`초기 배지가 1시간 전이 아님: "${r.initial.badge}"`);
      if (!HOURS(1).test(r.afterManual.badge)) fail(`수동 동기화 후 배지가 1시간 전이 아님: "${r.afterManual.badge}"`);
      if (JUST_NOW.test(r.afterManual.badge)) fail(`스냅샷으로 폴백했는데 '방금 전' 표시: "${r.afterManual.badge}"`);
      if (r.afterManual.rows !== 3) fail(`행 수가 3이 아님: ${r.afterManual.rows}`);
      if (r.liveCalls < 1) fail("수동 동기화가 공개 프록시를 시도하지 않음");
    },
  },
  {
    // 프록시가 살아 있으면 예전처럼 실시간 데이터(새 글 포함)와 "방금 전"이 나와야 한다
    spec: { name: "프록시 정상 + 스냅샷(10분)", snapshotAgeMin: 10, proxy: "live" },
    check: (r, fail) => {
      if (!MINUTES(10).test(r.initial.badge)) fail(`초기 배지가 10분 전이 아님: "${r.initial.badge}"`);
      if (r.initial.rows !== 3) fail(`초기 행 수가 3이 아님: ${r.initial.rows}`);
      if (!JUST_NOW.test(r.afterManual.badge)) fail(`실시간으로 읽었는데 '방금 전'이 아님: "${r.afterManual.badge}"`);
      if (r.afterManual.rows !== 4) fail(`실시간 새 글이 반영되지 않음(행 ${r.afterManual.rows})`);
    },
  },
];

const failures = [];
for (const { spec, check } of scenarios) {
  const result = await runScenario(spec);
  const fail = (msg) => failures.push(`[${spec.name}] ${msg}`);
  if (!result.hasSyncButton) fail("동기화 버튼을 찾지 못함");
  if (result.problems.length) fail(`런타임 오류: ${result.problems.slice(0, 3).join(" | ")}`);
  check(result, fail);
  console.log(
    `${failures.some((f) => f.startsWith(`[${spec.name}]`)) ? "✖" : "✔"} ${spec.name}\n` +
      `    초기: "${result.initial.badge}" (공지 ${result.initial.rows}행)  →  수동 동기화 후: "${result.afterManual.badge}" (공지 ${result.afterManual.rows}행)`,
  );
}

if (failures.length) {
  console.error("\nFAIL:\n - " + failures.join("\n - "));
  process.exit(1);
}
console.log("\nPASS — 수동 동기화가 데이터 출처(스냅샷/실시간)에 맞는 시각을 정직하게 표시합니다.");
