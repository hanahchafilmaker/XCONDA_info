/**
 * 언어 전환 "리로드 이후" 회귀 테스트.
 *
 * 배경(2026-10 실제 장애): 브라우저 언어가 영어(또는 일본어·중국어)인 사용자가 KO 를 누르면
 * 리로드 후 다시 영어로 돌아갔다.
 *   ① dev.html <head> 부트스트랩이 저장된 "ko"를 무시하고 브라우저 언어로 googtrans=/ko/en 을 다시 썼고
 *   ② LanguageProvider 가 저장된 선택보다 쿠키를 먼저 믿은 뒤, 그 결과(en)로 저장값까지 덮어썼다.
 * 기존 smoke.mjs 는 jsdom 에서 리로드가 일어나지 않아(상태만 바뀜) 이 버그를 잡지 못했다.
 *
 * 이 테스트는 실제 dev.html(인라인 스크립트 포함) + 실제 앱 번들(IIFE)을 jsdom 에서 띄우고,
 * 쿠키 저장소와 localStorage 를 이어 붙여 "클릭 → 리로드 → 다시 로드"를 그대로 재현한다.
 *   node scripts/smoke-lang.mjs [번들 경로]      (기본: ../dist-test/app.js)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CookieJar, JSDOM, VirtualConsole } from "jsdom";

const here = path.dirname(fileURLToPath(import.meta.url));
const bundlePath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(here, "../dist-test/app.js");
const bundle = fs.readFileSync(bundlePath, "utf8");
// 실제 진입점 HTML — 모듈 스크립트(번들로 대체)와 외부 리소스만 빼고 그대로 사용한다.
// (누군가 언어 관련 인라인 스크립트를 다시 넣으면 그것까지 함께 실행되어 검증된다)
const devHtml = fs
  .readFileSync(path.join(here, "../dev.html"), "utf8")
  .replace(/<script type="module"[^>]*><\/script>/, "")
  .replace(/<link [^>]*>/g, "");

const PAGES_URL = "https://hanahchafilmaker.github.io/XCONDA_info/";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** 브라우저 한 개(쿠키 · localStorage 가 리로드를 넘어 유지됨)
 *  `languages` 를 따로 주면 UI 언어(`language`)와 웹 선호 목록을 다르게 재현할 수 있다. */
function browser({ language, languages, url = PAGES_URL, storage = {}, cookies = [], storageBlocked = false, userAgent, localizedManifest = false }) {
  const jar = new CookieJar();
  for (const [cookie, cookieUrl] of cookies) jar.setCookieSync(cookie, cookieUrl ?? url);
  let saved = { ...storage };

  async function open() {
    let reloadRequested = false;
    let staticNavigationRequested = false;
    const problems = [];
    const vc = new VirtualConsole();
    vc.on("jsdomError", (e) => {
      const msg = String(e?.message ?? e);
      if (/Not implemented: (window\.location\.reload|navigation to another Document)/.test(msg)) {
        if (/navigation to another Document/.test(msg) && !/LocationImpl\.reload/.test(String(e.stack ?? ""))) staticNavigationRequested = true;
        reloadRequested = true;
        return;
      }
      problems.push(`jsdomError: ${msg}`);
    });
    vc.on("error", (...a) => problems.push(`console.error: ${a.join(" ")}`));

    const dom = new JSDOM(devHtml, {
      url,
      cookieJar: jar,
      runScripts: "dangerously",
      pretendToBeVisual: true,
      virtualConsole: vc,
      beforeParse(w) {
        // 크롤러 재현용 — UA 를 바꿔 "해외 데이터센터에서 온 AI 봇"을 흉내냅니다.
        if (userAgent) Object.defineProperty(w.navigator, "userAgent", { value: userAgent, configurable: true });
        Object.defineProperty(w.navigator, "language", { value: language, configurable: true });
        // jsdom 의 languages 는 기본값(en-US)에 머물러 있어, 지정이 없으면 UI 언어와 같은 목록으로 맞춰 둔다.
        const effectiveLanguages = languages ?? (language ? [language] : null);
        if (effectiveLanguages) {
          try {
            Object.defineProperty(w.navigator, "languages", {
              value: Object.freeze([...effectiveLanguages]),
              configurable: true,
            });
          } catch {
            /* jsdom 이 허용하지 않으면 language 만으로 진행 */
          }
        }
        if (storageBlocked) {
          Object.defineProperty(w, "localStorage", {
            configurable: true,
            get() {
              throw new w.DOMException("Access is denied for this document.", "SecurityError");
            },
          });
        } else {
          for (const [k, v] of Object.entries(saved)) w.localStorage.setItem(k, v);
        }
        w.IntersectionObserver = class {
          constructor(cb) { this.cb = cb; }
          observe(el) { this.cb([{ isIntersecting: true, target: el }], this); }
          unobserve() {}
          disconnect() {}
        };
        w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
        if (localizedManifest) w.fetch = async (input) => ({
          ok: String(input).includes("i18n-paths.json"),
          json: async () => ({ en: [""], ja: [""], zh: [""] }),
        });
        w.scrollTo = () => {};
        Object.defineProperty(w.HTMLElement.prototype, "scrollIntoView", { value() {}, writable: true });
      },
    });
    const w = dom.window;
    const doc = w.document;
    const script = doc.createElement("script");
    script.textContent = bundle;
    doc.body.appendChild(script);
    await wait(700);

    const toggles = () => [...doc.querySelectorAll("header button[aria-pressed]")];
    const state = () => {
      const m = doc.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
      return {
        active: toggles().find((b) => b.getAttribute("aria-pressed") === "true")?.textContent?.trim() ?? null,
        korean: /[가-힣]/.test(doc.querySelector("h1")?.textContent ?? ""),
        cookie: m ? decodeURIComponent(m[1]) : null,
        widget: !!doc.querySelector('script[src*="translate_a/element.js"]'),
        lock: doc.documentElement.getAttribute("translate") === "no" && !!doc.querySelector('meta[name="google"][content="notranslate"]'),
        htmlLang: doc.documentElement.lang,
        saved: storageBlocked ? null : w.localStorage.getItem("xconda-lang"),
      };
    };

    return {
      window: w,
      state,
      problems,
      /** 토글 클릭 → (리로드가 요청되면) 현재 창을 닫고 같은 쿠키/저장소로 새로 로드 */
      async click(code) {
        const btn = toggles().find((b) => b.textContent?.trim() === code);
        if (!btn) throw new Error(`toggle ${code} not found`);
        btn.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
        await wait(150);
        const reloaded = reloadRequested;
        if (!storageBlocked) saved = Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)]));
        if (!reloaded) return { reloaded, page: this };
        if (staticNavigationRequested) failures.push("Language toggle navigated to a static reading page");
        url = w.location.href;
        w.close();
        return { reloaded, page: await open() };
      },
      close: () => w.close(),
    };
  }

  return { open };
}

/* ------------------------------------------------------------------ */

const failures = [];
const logs = [];
function expect(name, actual, wanted) {
  const bad = Object.entries(wanted).filter(([k, v]) => actual[k] !== v);
  const ok = bad.length === 0;
  logs.push(`${ok ? "✔" : "✖"} ${name}\n    ${JSON.stringify(actual)}`);
  if (!ok) failures.push(`[${name}] ${bad.map(([k, v]) => `${k}: ${JSON.stringify(actual[k])} ≠ ${JSON.stringify(v)}`).join(", ")}`);
}
function noProblems(name, page) {
  if (page.problems.length) failures.push(`[${name}] 런타임 오류: ${page.problems.slice(0, 3).join(" | ")}`);
}

/**
 * Google 위젯 로더 계약 — 실제 element.js 대신 TranslateElement 를 스텁하고 콜백을 호출해
 * 예전 dev.html 인라인 코드와 같은 옵션(EN: 노드별 자동 감지 / JA·ZH: pageLanguage ko)으로
 * 숨김 컨테이너에 위젯을 만드는지 확인한다. (샌드박스 · CI 에서 translate.google.com 접근 불가)
 */
function widgetInit(page) {
  const w = page.window;
  const calls = [];
  w.google = { translate: { TranslateElement: class { constructor(options, id) { calls.push({ options, id }); } } } };
  w.googleTranslateElementInit?.();
  const box = w.document.getElementById("google_translate_element");
  return {
    calls: calls.length,
    id: calls[0]?.id ?? null,
    pageLanguage: calls[0]?.options.pageLanguage ?? null,
    included: calls[0]?.options.includedLanguages ?? null,
    autoDisplay: calls[0]?.options.autoDisplay,
    hidden: box?.style.display === "none",
  };
}
const WIDGET_OK = { calls: 1, id: "google_translate_element", included: "en,ja,zh-CN", autoDisplay: false, hidden: true };

const KO_LOCKED = { active: "KO", korean: true, cookie: null, widget: false, lock: true, htmlLang: "ko", saved: "ko" };

// 1) 영어 브라우저 — 실제 장애 시나리오: EN 으로 들어와 KO 를 누른다
{
  const b = browser({ language: "en-US" });
  let page = await b.open();
  expect("영어 브라우저 첫 방문 → EN (자동 감지는 저장하지 않음)", page.state(), {
    active: "EN", cookie: "/ko/en", widget: true, lock: false, htmlLang: "en", saved: null,
  });
  expect("…EN 위젯 콜백 → 숨김 컨테이너에 생성, pageLanguage 미지정(노드별 자동 감지)", widgetInit(page), { ...WIDGET_OK, pageLanguage: null });
  let r = await page.click("KO");
  page = r.page;
  if (!r.reloaded) failures.push("[영어 브라우저] KO 클릭이 리로드를 요청하지 않음");
  expect("영어 브라우저 KO 클릭 → 리로드 후에도 KO (위젯 미로드 · 브라우저 번역 잠금)", page.state(), KO_LOCKED);
  noProblems("영어 브라우저 KO", page);

  page.close();
  page = await b.open();
  expect("…한 번 더 새로고침해도 KO 유지", page.state(), KO_LOCKED);
  expect("…KO 에서는 위젯 콜백조차 등록되지 않음", widgetInit(page), { calls: 0 });

  r = await page.click("JA");
  page = r.page;
  expect("KO → JA → 리로드 후 JA (googtrans=/ko/ja · 위젯 로드)", page.state(), {
    active: "JA", korean: true, cookie: "/ko/ja", widget: true, lock: false, htmlLang: "ja", saved: "ja",
  });
  expect("…JA 위젯 콜백 → pageLanguage ko 고정", widgetInit(page), { ...WIDGET_OK, pageLanguage: "ko" });
  r = await page.click("EN");
  page = r.page;
  expect("JA → EN → 리로드 후 EN", page.state(), { active: "EN", korean: false, cookie: "/ko/en", widget: true, saved: "en" });
  r = await page.click("KO");
  page = r.page;
  expect("EN → KO → 리로드 후 KO", page.state(), KO_LOCKED);
  noProblems("영어 브라우저 왕복", page);
  page.close();
}

// 2) 버그를 이미 겪은 사용자(저장값이 en 으로 덮어써진 상태)도 KO 로 복구된다
{
  const b = browser({ language: "en-US", storage: { "xconda-lang": "en" }, cookies: [["googtrans=/ko/en; Path=/"]] });
  let page = await b.open();
  expect("기존 피해 상태(저장 en + 쿠키 /ko/en) → EN", page.state(), { active: "EN", cookie: "/ko/en" });
  page = (await page.click("KO")).page;
  expect("…KO 클릭 → 리로드 후 KO", page.state(), KO_LOCKED);
  page.close();
}

// 3) 지울 수 없는 상위 도메인 googtrans 쿠키(예: hub.xconda.ai 에서 .xconda.ai 쿠키)가 있어도 KO 유지
//  — 수정: google.ts의 강화된 clearGoogtransCookies가 부모 도메인 쿠키까지 정리하므로 이제 쿠키는 null
{
  const b = browser({
    language: "en-US",
    url: "https://hub.xconda.ai/",
    storage: { "xconda-lang": "ko" },
    cookies: [["googtrans=/ko/en; Domain=xconda.ai; Path=/", "https://www.xconda.ai/"]],
  });
  const page = await b.open();
  expect("상위 도메인 /ko/en 쿠키 잔존 + KO 선택 → KO, 위젯 미로드(번역 불가)", page.state(), {
    active: "KO", korean: true, cookie: null, widget: false, lock: true,
  });
  page.close();
}

// 4) 일본어 · 중국어 브라우저도 KO 선택이 유지된다 (같은 버그를 겪던 로케일)
for (const [language, code] of [["ja-JP", "JA"], ["zh-TW", "ZH"]]) {
  const b = browser({ language });
  let page = await b.open();
  expect(`${language} 첫 방문 → ${code}`, page.state(), { active: code, widget: true, lock: false, saved: null });
  page = (await page.click("KO")).page;
  expect(`${language} KO 클릭 → 리로드 후 KO`, page.state(), KO_LOCKED);
  page.close();
}

// 5) 한국어 브라우저 — 선호 목록에 한국어가 있으면 첫 방문부터 자체 번역 잠금(저장은 하지 않음)
{
  const b = browser({ language: "ko-KR" });
  let page = await b.open();
  expect("한국어 브라우저 첫 방문 → KO (위젯 미로드 · 자체 번역 잠금 · 자동 감지는 저장 안 함)", page.state(), {
    active: "KO", korean: true, cookie: null, widget: false, lock: true, saved: null,
  });
  const r = await page.click("KO");
  page = r.page;
  if (!r.reloaded) failures.push("[한국어 브라우저] 자동 KO → 직접 KO 고정 시 리로드가 요청되지 않음");
  expect("…활성 KO 를 직접 클릭 → 직접 선택으로 저장 + 잠금", page.state(), KO_LOCKED);
  const again = await page.click("KO");
  if (again.reloaded) failures.push("[한국어 브라우저] 이미 직접 고른 KO 를 다시 눌렀는데 리로드됨");
  page.close();
}

// 6) 지원하지 않는 언어(프랑스어) 브라우저 — 한국어 원문, 브라우저 자체 번역 제안은 막지 않는다
{
  const page = await browser({ language: "fr-FR" }).open();
  expect("프랑스어 브라우저 → KO 원문, 잠금 없음(크롬 번역 제안 유지)", page.state(), {
    active: "KO", cookie: null, widget: false, lock: false, saved: null,
  });
  page.close();
}

// 7) 이미 보고 있는 EN 을 다시 누르면 리로드 없이 직접 선택으로만 저장
{
  const page = await browser({ language: "en-US" }).open();
  const r = await page.click("EN");
  if (r.reloaded) failures.push("[EN 재클릭] 리로드가 일어남");
  expect("활성 EN 재클릭 → 리로드 없이 저장만", page.state(), { active: "EN", saved: "en" });
  page.close();
}

// 8) "한국계정인데 일본어로 들어감" 회귀 — 크롬 UI 언어(ja)와 웹 선호 목록([ko, …])이 어긋나는 경우.
//    웹사이트는 구글 계정 언어를 읽을 수 없으므로, UI 언어 하나가 아니라 선호 목록 순서로 정해야 한다.
//    또 선호 목록에 한국어가 있으면 첫 방문부터 브라우저 자체 번역 잠금이 걸려야 한다
//    (잠금이 없으면 크롬 내장 번역이 한국어 화면을 일본어 등으로 바꿔버릴 수 있음).
{
  const page = await browser({ language: "ja-JP", languages: ["ko-KR", "ko", "ja-JP"] }).open();
  expect("UI ja + 선호 [ko, ja] 첫 방문 → KO (위젯 미로드 · 자체 번역 잠금 · 저장 안 함)", page.state(), {
    active: "KO", korean: true, cookie: null, widget: false, lock: true, htmlLang: "ko", saved: null,
  });
  page.close();
}
{
  const page = await browser({ language: "ja-JP", languages: ["ja-JP", "ko-KR"] }).open();
  expect("선호 순서 [ja, ko] 첫 방문 → JA (선호 순서 존중)", page.state(), {
    active: "JA", widget: true, lock: false, saved: null,
  });
  page.close();
}

// 9) localStorage 가 차단된 환경 — googtrans 쿠키가 보조 저장소 역할
{
  const b = browser({ language: "ko-KR", storageBlocked: true });
  let page = await b.open();
  page = (await page.click("JA")).page;
  expect("저장소 차단 + JA 클릭 → 리로드 후 JA (쿠키로 유지)", page.state(), { active: "JA", cookie: "/ko/ja", widget: true });
  noProblems("저장소 차단", page);
  page.close();
}

// 10) 검색엔진 · AI 크롤러 — 같은 주소에서 언어가 흔들리면 안 됩니다 (2026-10 GEO 진단)
//     해외 데이터센터의 영어 UA 로 들어와도 **항상 한국어 원문** + 번역 위젯 없음.
const CRAWLERS = [
  ["GPTBot", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)"],
  ["OAI-SearchBot", "Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)"],
  ["PerplexityBot", "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)"],
  ["ClaudeBot", "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)"],
];
for (const [name, ua] of CRAWLERS) {
  const page = await browser({ language: "en-US", userAgent: ua }).open();
  expect(`${name} (영어 UA) → KO 원문 · 위젯 미로드 · 저장 안 함`, page.state(), {
    active: "KO", korean: true, cookie: null, widget: false, htmlLang: "ko", saved: null,
  });
  noProblems(name, page);
  page.close();
}

// 11) ?lang= 로 명시한 언어는 자동 감지보다 우선합니다
{
  const page = await browser({ language: "ko-KR", url: `${PAGES_URL}?lang=en` }).open();
  expect("?lang=en → EN (사람이 주소로 고정)", page.state(), { active: "EN", widget: true });
  page.close();
}

// A loaded translation manifest must not replace the hub with a static list.
{
  let page = await browser({ language: "ko-KR", url: `${PAGES_URL}?lang=ko`, localizedManifest: true }).open();
  for (const code of ["EN", "JA", "ZH", "KO"]) {
    const result = await page.click(code);
    page = result.page;
    expect(`manifest loaded: switch to ${code}`, page.state(), { active: code });
    const desktopNav = page.window.document.querySelector('[data-hub-desktop-nav]');
    const menuToggle = page.window.document.querySelector('[data-hub-menu-toggle]');
    if (!desktopNav?.classList.contains('xl:flex') || !menuToggle?.classList.contains('xl:hidden')) {
      failures.push(`${code}: desktop navigation and drawer must use the same roomy breakpoint`);
    }
    if (desktopNav && [...desktopNav.querySelectorAll('button')].some(button => !button.classList.contains('whitespace-nowrap'))) {
      failures.push(`${code}: translated desktop labels must not wrap inside the fixed-height header`);
    }
    for (const selector of ["#top form", "#guides", "#faq", "header"]) {
      if (!page.window.document.querySelector(selector)) failures.push(`${code}: missing hub UI ${selector}`);
    }
    noProblems(`manifest loaded: ${code}`, page);
  }
  page.close();
}

console.log(logs.join("\n"));
if (failures.length) {
  console.error("\nFAIL:\n - " + failures.join("\n - "));
  process.exit(1);
}
console.log("\nPASS — 어떤 브라우저 언어에서도 고른 언어가 리로드 후에도 유지됩니다.");
process.exit(0);
