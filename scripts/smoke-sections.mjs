/**
 * "노션 행 → 사이트 섹션" 배정을 **실제 사이트 코드로** 검증하는 스모크 테스트.
 *
 *   node scripts/smoke-sections.mjs        (npm run test:unit 에 포함)
 *
 * 왜 필요한가
 *   분류 규칙은 `src/content/classify.js` 한 곳에 있지만, 그 규칙을 **어떻게 쓰는지**는
 *   사이트 코드(src/notionPublic.ts — 스냅샷을 읽어 목록을 만드는 곳)에 있습니다.
 *   "노션엔 뉴스라고 썼는데 사이트는 공지사항에 나온다" 같은 불일치를 배포 전에 잡으려면
 *   행을 실제로 흘려보내 섹션을 확인해야 합니다.
 *
 * 어떻게 동작하나
 *   Node 22.18+ 의 TypeScript 타입 제거(process.features.typescript)를 이용해
 *   `src/notionPublic.ts` 를 그대로 import 하고, fetch 를 스텁해 스냅샷을 먹입니다.
 *   (확장자 없는 상대 경로 import 를 .ts/.tsx/.js 로 풀어 주는 훅을 함께 등록합니다.)
 *   타입 제거를 지원하지 않는 Node(20.x 등)에서는 조용히 SKIP 하고 성공으로 끝냅니다.
 */
import { pathToFileURL } from "node:url";

const PAGE_ID = "3e72ebc017ad8024a3f5ef8fb9f8c6dd"; // src/notion.ts DEFAULT_ENDPOINT 와 동일

if (!process.features?.typescript) {
  console.log("SKIP — 이 검사는 Node 22.18+ (TypeScript 타입 제거 지원) 에서 실행됩니다.");
  process.exit(0);
}

/* ---------------------- 확장자 없는 import 해석 훅 ---------------------- */

const { registerHooks } = await import("node:module").catch(() => ({ registerHooks: undefined }));
if (!registerHooks) {
  console.log("SKIP — module.registerHooks 를 사용할 수 없는 Node 버전입니다 (22.15+ 필요).");
  process.exit(0);
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!String(error?.code ?? "").startsWith("ERR_MODULE_NOT_FOUND")) throw error;
      for (const ext of [".ts", ".tsx", ".js", ".mjs"]) {
        try {
          return nextResolve(specifier + ext, context);
        } catch {
          /* 다음 확장자 시도 */
        }
      }
      throw error;
    }
  },
});

const { fetchPublicEntries } = await import(new URL("../src/notionPublic.ts", import.meta.url).href);

/* ------------------------------ 도우미 ------------------------------ */

/** 스냅샷(표 행 + 본문 블록)을 스텁 fetch 로 먹이고, 사이트가 만든 Entry 목록을 돌려줍니다. */
async function sectionsOf(rows, pages = {}) {
  const snapshot = {
    generatedAt: new Date().toISOString(),
    source: { pageId: PAGE_ID, collectionViewId: null, collectionId: null },
    rows,
    pages,
  };
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => snapshot,
    text: async () => JSON.stringify(snapshot),
  });
  // force=true → 스냅샷 캐시(60초)를 무시하고 방금 넣은 행을 읽습니다.
  const entries = await fetchPublicEntries(PAGE_ID, undefined, true);
  const sections = { notice: [], news: [], guide: [], blog: [], faq: [] };
  for (const entry of entries) sections[entry.type]?.push(entry);
  return { entries, sections };
}

const failures = [];
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "✔" : "✖"} ${label} — ${JSON.stringify(actual)}`);
  if (!ok) failures.push(label);
}

/** Entry(사이트 형태)와 노션 행(Row) 어느 쪽을 넣어도 제목 목록을 만듭니다. */
const titles = (items) => items.map((item) => item.title ?? item.Title);
const row = (over = {}) => ({ Published: true, Date: "2026-09-29", ...over });

/* ------------------------------ 1. 지금 노션 상태 ------------------------------ */

const CURRENT = [
  row({ id: "r1", Title: "콘텐츠관리방법", Type: "공지" }),
  row({ id: "r2", Title: "피디님들 새 콘텐츠 올려주세요.", Type: "공지" }),
  row({
    id: "r3",
    Title: "Claude Opus 5.5로 만든 바이럴 영상 389개",
    Type: "공지",
    Link: "https://x.com/VibeEverything/status/2104539752016076956",
  }),
];

const current = await sectionsOf(CURRENT);
check("Type=공지 글은 공지사항으로 (SNS 링크가 있어도 자동 이동하지 않음)", titles(current.sections.notice), titles(CURRENT));
check("뉴스 섹션은 비어 있음", current.sections.news.length, 0);

/* ------------------------------ 2. Type 만 바꾸면 이동 ------------------------------ */

const changed = await sectionsOf(CURRENT.map((r) => (r.id === "r3" ? { ...r, Type: "뉴스" } : r)));
check("노션에서 Type=뉴스 로 바꾸면 뉴스 섹션으로 이동", titles(changed.sections.news), ["Claude Opus 5.5로 만든 바이럴 영상 389개"]);
check("SNS 링크로 채널(X)도 자동 인식", changed.sections.news[0]?.category, "X");
check("나머지 글은 공지사항 유지", titles(changed.sections.notice), ["콘텐츠관리방법", "피디님들 새 콘텐츠 올려주세요."]);

/* ------------------------------ 3. 표기 · 추론 · 예외 ------------------------------ */

const mixed = await sectionsOf([
  row({ id: "a", Title: "공지 사항", Type: "공지 사항" }),
  row({ id: "b", Title: "릴리스 노트", Type: "릴리스 노트" }),
  row({ id: "c", Title: "튜토리얼", Type: "Tutorial" }),
  row({ id: "d", Title: "아티클", Type: "아티클" }),
  row({ id: "e", Title: "Q&A", Type: "Q&A" }),
  row({ id: "f", Title: "타입 없는 SNS 소식", Type: "", Link: "https://youtu.be/abc" }),
  row({ id: "g", Title: "스냅샷이 정한 섹션", Type: "재밌는글", __type: "blog" }),
  row({ id: "h", Title: "초안", Type: "뉴스", Published: false }),
]);

check("공지 사항(띄어쓰기) → 공지사항", titles(mixed.sections.notice), ["공지 사항"]);
check("릴리스 노트 → 뉴스", titles(mixed.sections.news), ["릴리스 노트", "타입 없는 SNS 소식"]);
check("Tutorial → 툴 사용법", titles(mixed.sections.guide), ["튜토리얼"]);
check("아티클 → 블로그", titles(mixed.sections.blog), ["아티클", "스냅샷이 정한 섹션"]);
check("Q&A → Q&A", titles(mixed.sections.faq), ["Q&A"]);
check("Type 이 비면 링크(YouTube)로 뉴스 추론", mixed.sections.news[1]?.category, "YouTube");
check("Published 미체크 글은 어느 섹션에도 없음", titles(mixed.entries).includes("초안"), false);
check("스냅샷 __type(blog)이 추론보다 우선", mixed.entries.find((e) => e.title === "스냅샷이 정한 섹션")?.type, "blog");

/* --------------------------- 4. 썸네일 · 작성자 --------------------------- */
/*
 * "블로그 카드에 썸네일이 안 나온다" · "작성자가 안 보인다" 문제를 막기 위한 검사.
 * 실제 notion-content.json 과 같은 형태(행 + 본문 record map)를 흘려보냅니다.
 */
const PAGE_A = "aaaaaaaa-0000-0000-0000-000000000001";
const IMG_A = "aaaaaaaa-0000-0000-0000-00000000000a";
/** 노션이 저장하는 그대로의 본문: 페이지 → 컬럼 → 이미지(attachment:) */
const PAGES = {
  [PAGE_A]: {
    [PAGE_A]: { value: { id: PAGE_A, type: "page", content: ["col-list"] } },
    "col-list": { value: { id: "col-list", type: "column_list", content: ["col-1"] } },
    "col-1": { value: { id: "col-1", type: "column", content: [IMG_A] } },
    [IMG_A]: {
      value: {
        id: IMG_A,
        type: "image",
        space_id: "19e2ebc0-17ad-8144-8210-0003d7523b95",
        properties: { source: [["attachment:3b0838cd-93d6-419d-9e62-3512276b26f8:image.png"]] },
      },
    },
  },
};

const thumbs = await sectionsOf(
  [
    row({ id: PAGE_A, Title: "본문에 이미지만 있는 블로그 글", Type: "블로그", 작성자: "김하나 PD" }),
    row({ id: "no-img", Title: "이미지가 없는 블로그 글", Type: "블로그" }),
    row({
      id: "with-cover",
      Title: "Cover 속성을 채운 블로그 글",
      Type: "블로그",
      Author: "XCONDA 팀",
      Cover: [{ name: "cover.png", url: "https://cdn.example.com/cover.png", rawUrl: "https://cdn.example.com/cover.png" }],
    }),
  ],
  PAGES
);

const byTitle = (t) => thumbs.entries.find((e) => e.title === t);
const bodyCover = byTitle("본문에 이미지만 있는 블로그 글")?.cover ?? "";
check("Cover 칸이 비어도 본문 첫 이미지가 썸네일이 된다", bodyCover.startsWith("https://www.notion.so/image/"), true);
check("노션 첨부 이미지는 notion.so 프록시 주소로 바뀐다", bodyCover.startsWith("https://www.notion.so/image/https%3A%2F%2Fprod-files-secure"), true);
check("첨부 이미지는 폴백 주소(attachment 프록시)도 함께 가진다", byTitle("본문에 이미지만 있는 블로그 글")?.coverFallback?.includes("attachment%3A"), true);
check("Cover 속성이 있으면 그것을 우선한다", byTitle("Cover 속성을 채운 블로그 글")?.cover, "https://cdn.example.com/cover.png");
check("이미지가 아예 없으면 썸네일은 비어 있다(자리 표시자)", byTitle("이미지가 없는 블로그 글")?.cover, undefined);
check("`작성자` 속성 → Entry.author", byTitle("본문에 이미지만 있는 블로그 글")?.author, "김하나 PD");
check("`Author` 속성 → Entry.author", byTitle("Cover 속성을 채운 블로그 글")?.author, "XCONDA 팀");

// 동기화가 받아 둔 뉴스 링크 og:image(scripts/link-preview.mjs → 행.__linkImage) → 목록 썸네일
const linkThumb = await sectionsOf([
  row({ id: "n-link", Title: "링크 이미지가 있는 뉴스", Type: "뉴스", Link: "https://news.example.com/a", __linkImage: "/assets/img/og/link/abc.jpg" }),
  row({ id: "n-none", Title: "이미지 없는 뉴스", Type: "뉴스", Link: "https://news.example.com/b" }),
  row({
    id: "n-cover-wins",
    Title: "커버가 있는 뉴스",
    Type: "뉴스",
    Link: "https://news.example.com/c",
    __linkImage: "/assets/img/og/link/stale.jpg",
    Cover: [{ name: "c.png", url: "https://cdn.example.com/real.png", rawUrl: "https://cdn.example.com/real.png" }],
  }),
]);
const linkBy = (t) => linkThumb.entries.find((e) => e.title === t);
check("`__linkImage` 만 있으면 그대로 썸네일이 된다", linkBy("링크 이미지가 있는 뉴스")?.cover, "/assets/img/og/link/abc.jpg");
check("이미지가 없는 뉴스는 썸네일이 비어 있다(사이트가 채널 타일로 표시)", linkBy("이미지 없는 뉴스")?.cover, undefined);
check("Cover 속성이 있으면 링크 이미지보다 우선한다", linkBy("커버가 있는 뉴스")?.cover, "https://cdn.example.com/real.png");

const authorEn = await sectionsOf([
  row({ id: "a1", Title: "작성자 영문 표기", Type: "블로그", Author: "김하나 PD", "Author EN": "Hana Kim" }),
]);
check("Author EN 이 있으면 EN 번역으로 실린다", authorEn.entries[0]?.translations?.en?.author, "Hana Kim");

/* --------------------------- 5. 허브 Q&A 표 (상태 · 허브 게시) --------------------------- */
/*
 * 동기화가 만든 스냅샷 행(__source=hub-qna)을 사이트가 **다시 한 번** 검사합니다.
 * 스냅샷을 손으로 고치거나 노션 규칙이 바뀌어도, 확인이 필요한 문항이 사이트로 나가지 않도록.
 */
const hubRow = (over = {}) => ({
  Published: true,
  Date: "2026-10-11",
  __type: "faq",
  __source: "hub-qna",
  상태: "초안 완료",
  "허브 게시": "미게시",
  No: 1,
  우선순위: 1,
  ...over,
});

const hub = await sectionsOf([
  hubRow({ id: "h1", Title: "지금 게시되는 질문", Summary: "답변", Order: 1001 }),
  hubRow({ id: "h2", Title: "확인이 더 필요한 질문", 상태: "일부 확인 필요", No: 2 }),
  hubRow({ id: "h3", Title: "보류된 질문", "허브 게시": "보류", No: 3 }),
  hubRow({ id: "h4", Title: "강제 게시 질문", 상태: "일부 확인 필요", "허브 게시": "게시", No: 4, 우선순위: 2, Order: 2004 }),
]);

check("허브 Q&A — 게시 규칙을 통과한 문항만 Q&A 로", titles(hub.sections.faq), ["지금 게시되는 질문", "강제 게시 질문"]);
check(
  "허브 Q&A — 확인 필요 · 보류 문항은 어느 섹션에도 없음",
  ["확인이 더 필요한 질문", "보류된 질문"].filter((t) => titles(hub.entries).includes(t)),
  []
);
check("허브 Q&A — Order(우선순위 × 1000 + No) 를 그대로 쓴다", hub.sections.faq.map((f) => f.order), [1001, 2004]);

/* ------------------------------ 결과 ------------------------------ */

if (failures.length) {
  console.error(`\nFAIL — ${failures.length}건 실패:\n - ${failures.join("\n - ")}`);
  process.exit(1);
}
console.log("\nPASS — 실제 사이트 코드가 노션 행을 올바른 섹션으로 배정합니다.");
process.exit(0);
