# XCONDA허브 · 개발자 핸드오프 문서

> **이 문서는 저장소를 처음 인수받는 개발자를 위한 단일 진입점입니다.**
> 여기만 읽으면 "무엇을 만드는 서비스인지 → 어떻게 돌아가는지 → 어디를 고치면 되는지 → 사고가 났을 때 무엇을 해야 하는지"까지 판단할 수 있도록 작성했습니다.

| 항목 | 값 |
|---|---|
| 문서 작성일 | 2026-10-10 |
| 대상 | XCONDA허브(`XCONDA_info`)를 이어받는 프런트엔드/풀스택 개발자 |
| 저장소 | https://github.com/hanahchafilmaker/XCONDA_info |
| 운영 사이트 | https://hanahchafilmaker.github.io/XCONDA_info/ |
| 기본 브랜치 | `main` |
| 관련 문서 | [`NOTION_SETUP.md`](./NOTION_SETUP.md) (노션 연동 · 콘텐츠 운영자용), [`admin-guide.html`](./admin-guide.html), [`user-guide.html`](./user-guide.html) (사용자용 가이드 페이지) |
| 읽는 데 걸리는 시간 | 전체 30~40분 / 실무 투입은 「2. 30분 온보딩」까지만 읽고 시작 가능 |

---

## 목차

1. [10초 요약](#1-10초-요약)
2. [30분 온보딩](#2-30분-온보딩)
3. [서비스 개요](#3-서비스-개요)
4. [기술 스택과 버전 정책](#4-기술-스택과-버전-정책)
5. [저장소 구조](#5-저장소-구조)
6. [아키텍처와 데이터 흐름](#6-아키텍처와-데이터-흐름)
7. [핵심 모듈 맵](#7-핵심-모듈-맵)
8. [데이터 모델](#8-데이터-모델)
9. [Notion 동기화 파이프라인](#9-notion-동기화-파이프라인)
10. [빌드 · 배포](#10-빌드--배포)
11. [환경 변수와 설정값](#11-환경-변수와-설정값)
12. [테스트 전략](#12-테스트-전략)
13. [개발 워크플로와 코드 컨벤션](#13-개발-워크플로와-코드-컨벤션)
14. [자주 하는 작업 레시피](#14-자주-하는-작업-레시피)
15. [알려진 이슈와 함정](#15-알려진-이슈와-함정)
16. [트러블슈팅 플레이북](#16-트러블슈팅-플레이북)
17. [운영 런북](#17-운영-런북)
18. [인수인계 체크리스트](#18-인수인계-체크리스트)
19. [백로그 · 개선 제안](#19-백로그--개선-제안)
20. [용어집](#20-용어집)
21. [부록 · 명령어 치트시트](#21-부록--명령어-치트시트)

---

## 1. 10초 요약

- **정적 단일 HTML 사이트**입니다. React + Vite + Tailwind로 개발하고, 빌드 결과를 **하나의 `index.html`로 합쳐 저장소에 커밋**하며, GitHub Pages가 그 파일을 그대로 서빙합니다. (서버·DB·백엔드 없음)
- **콘텐츠는 Notion이 원본**입니다. Notion 데이터베이스에 글을 쓰고 `Published`를 체크하면, GitHub Actions가 **서버에서 Notion을 읽어 `notion-content.json` 스냅샷으로 커밋**하고, 사이트는 같은 출처의 그 JSON만 읽습니다.
- 따라서 이 저장소에는 **커밋된 산출물 2개**가 있습니다 → `index.html`(빌드 결과), `notion-content.json`(동기화 결과). **직접 수정 금지.**
- 운영자가 할 일은 거의 없습니다. "노션에 쓰면 사이트에 뜬다"가 이 프로젝트의 핵심 계약입니다.

---

## 2. 30분 온보딩

### 2.1 준비물

| 항목 | 버전 / 값 | 비고 |
|---|---|---|
| Node.js | **22.x (22.18 이상 권장)** | 22.18 미만이면 `scripts/smoke-sections.mjs`가 조용히 SKIP됩니다(실패 아님). 워크플로는 Node 22 고정 |
| npm | 10.x 이상 (저장소는 npm 10.9.8 기준) | `npm ci`만 사용 (`npm install`로 lockfile 갱신 금지) |
| Git | 최신 | — |
| 계정 권한 | GitHub 저장소 write, Notion 워크스페이스(편집 권한) | Actions 재실행 · 노션 속성 편집에 필요 |

### 2.2 첫 실행

```bash
git clone https://github.com/hanahchafilmaker/XCONDA_info.git
cd XCONDA_info
npm ci

npm run dev        # http://localhost:5173/dev.html 이 자동으로 열립니다
npm run test:unit  # 0.5초 — 분류 · 필드 · 섹션 배정 규칙
npm run test:smoke # 16초 — 실제 번들을 jsdom에서 실행하는 런타임 스모크
npm run build      # dist/dev.html 생성 → postbuild 가 루트 index.html 로 복사
```

> ⚠️ **`npm run dev` 후 브라우저에 `/` (루트)가 열리면 `dev.html`로 직접 이동하세요.**
> 루트 `index.html`은 *빌드 결과물*이라 소스를 고쳐도 반영되지 않습니다. 개발 진입점은 항상 `dev.html`입니다.

### 2.3 온보딩 체크리스트

- [ ] `npm ci` 성공, `npm run dev`로 `dev.html`이 뜬다
- [ ] 상단 배지가 `Notion 동기화 · n분 전`(초록 점)으로 표시된다
- [ ] `npm run test:unit` · `npm run test:smoke` 둘 다 `PASS`
- [ ] `npm run build` 후 `git status`가 **깨끗하다**(빌드 재현성 확인 — 더러우면 산출물 불일치, 원인 파악 필요)
- [ ] 노션 [XCONDA_NEWs](https://silicon-mascara-c7d.notion.site/XCONDA_NEWs-3e72ebc017ad8024a3f5ef8fb9f8c6dd) 페이지를 열람할 수 있다
- [ ] Actions → **Notion 동기화** → `Run workflow`를 직접 실행해 본다 (약 15초)
- [ ] Actions → 가장 최근 **Notion 동기화** 실행 → **Summary** 탭의 "글 → 섹션" 표를 읽어 본다

---

## 3. 서비스 개요

**XCONDA허브**는 AI 영상 제작 스튜디오 [XCONDA](https://www.xconda.ai)의 **공지 · 뉴스 · 툴 사용법 · 블로그 · Q&A를 한 페이지에 모아 보여주는 허브**입니다.

- **사용자**: 공지 확인, 툴별 사용법(스토리보드·카메라·편집 등 19개 툴) 조회, 검색, 한/영 전환
- **운영자**: 노션 데이터베이스에 글 작성 → 사이트 자동 반영 (개발자 개입 0)
- **섹션 순서**(고정): 공지사항 → 뉴스(타 SNS 정보) → 툴 사용법 → 블로그 → Q&A

### 3.1 두 가지 콘텐츠 원천

| 원천 | 설명 | 코드 위치 |
|---|---|---|
| **Notion(동적)** | 공지 · 뉴스 · 블로그 · Q&A · (툴 가이드 대체 가능) | `scripts/notion-snapshot.mjs` → `notion-content.json` → `src/notionPublic.ts` |
| **정적 코드(하드코딩)** | 19개 툴 카드 + 툴별 상세 매뉴얼 + 샘플 콘텐츠(Notion 미연동 시 폴백) | `src/content/tools.ts`, `toolGuides.ts`, `toolVideos.ts`, `sample.ts` |

> 툴 카드는 기본적으로 정적 데이터입니다. 단, Notion에 `Type=가이드`이고 `Tool` 값이 툴 이름과 **정확히 일치**하는 글이 있으면, 그 툴 카드를 열었을 때 **노션 글이 정적 가이드를 대체**합니다(`ContentContext.openTool`).

### 3.2 주요 기능

| 기능 | 키 / 진입점 | 구현 |
|---|---|---|
| 전체 검색 | `Cmd/Ctrl + K` 또는 `/` | `src/components/SearchOverlay.tsx` |
| 상세 모달 | 카드 클릭 | `src/components/ArticleModal.tsx` |
| 글 딥링크 | `#post=<페이지ID>` (공유 버튼) | `ContentContext` |
| 한/영 전환 | 내비 KO/EN 토글 (`localStorage: xconda-lang`) | `src/i18n/` |
| 수동 동기화 | 상단 배지의 🔄 | `src/components/common.tsx` `SyncButton` |

---

## 4. 기술 스택과 버전 정책

| 계층 | 선택 | 버전 | 비고 |
|---|---|---|---|
| UI | React | 19.2.6 | 함수 컴포넌트 · 훅만 사용 |
| 빌드 | Vite | 7.3.2 | 진입점 `dev.html` |
| 번들 | `vite-plugin-singlefile` | 2.3.0 | **JS/CSS를 HTML 한 장에 인라인** (Pages는 정적 1파일만 서빙) |
| 스타일 | Tailwind CSS v4 | 4.1.17 | `@tailwindcss/vite`, CSS-first 설정(토큰은 `src/index.css`의 `@theme`) |
| 언어 | TypeScript | 5.9.3 | `strict`, `noUnusedLocals`, `noUnusedParameters` |
| 아이콘 | lucide-react | ^1.47.0 | + 자체 아이콘은 `src/components/volt.tsx` |
| 테스트 | `node --test` + jsdom | 내장 / ^30.1.1 | 외부 테스트 프레임워크 **없음** |
| 배포 | GitHub Pages (브랜치 배포) | — | `main` 브랜치 루트(`/`) |
| 폰트 | Pretendard · Geist Mono · Instrument Serif | CDN | `dev.html`의 `<link>` |

**버전 정책**
- 의존성 버전은 **exact pin**(캐럿 거의 없음)입니다. 업데이트는 `npm ci` 재현성이 깨지지 않도록 PR로 분리해 진행하세요.
- Node는 워크플로(`setup-node` v22)와 로컬을 맞추세요.

---

## 5. 저장소 구조

```
XCONDA_info/
├── index.html                  ⚠️ 빌드 산출물 (커밋됨 · Pages가 서빙) — 직접 수정 금지
├── notion-content.json         ⚠️ 동기화 산출물 (커밋됨 · 사이트가 읽는 스냅샷) — 직접 수정 금지
├── dev.html                    ✅ 개발/빌드 진입점 (이 파일을 수정)
├── package.json  vite.config.ts  tsconfig.json
│
├── src/
│   ├── main.tsx                React 루트 (StrictMode + LanguageProvider)
│   ├── App.tsx                 섹션 배치 · 전역 키보드 단축키
│   ├── index.css               디자인 토큰(@theme) · 전역 스타일 · 애니메이션
│   ├── notion.ts               Notion 어댑터 진입점: 엔드포인트 결정 · 속성→Entry 변환 · 캐시
│   ├── notionPublic.ts         공개(게시된) Notion 페이지 어댑터 — 스냅샷 우선, 공개 프록시 보조
│   ├── notionSnapshot.ts       정적 스냅샷(notion-content.json) 리더 · TTL · 낡음 판정
│   ├── components/             UI (화면 단위 + 공통 프리미티브)
│   ├── content/                데이터 모델 · 분류/필드 규칙 · 정적 콘텐츠
│   ├── i18n/                   한/영 사전과 Provider · 콘텐츠 로컬라이즈
│   └── utils/cn.ts             clsx + tailwind-merge
│
├── scripts/                    Node 실행 스크립트 (동기화 · 테스트)
├── notion-worker/worker.js     (선택) Cloudflare Worker 프록시 — 비공개 Notion DB용
├── .github/workflows/          notion-sync.yml · build-site.yml
├── assets/img/                 로고 · 툴 커버 이미지
├── admin-guide.html  user-guide.html   운영자/사용자용 정적 가이드 페이지
└── redesign-xconda-website-ui/ ⚠️ 과거 UI 프로토타입 — 빌드에 포함되지 않음(참고용)
```

### 5.1 커밋된 산출물 vs 소스 (가장 흔한 실수)

| 파일 | 성격 | 누가 만드나 | 수정 방법 |
|---|---|---|---|
| `index.html` | 빌드 결과 (단일 파일 번들, 약 500 KB) | `npm run build` → `postbuild` | `src/**` · `dev.html` 수정 후 빌드, 또는 main 푸시(자동 워크플로) |
| `notion-content.json` | 동기화 스냅샷 (약 180 KB) | `scripts/notion-snapshot.mjs` (Actions) | 노션에서 글 수정 후 동기화 실행 |
| `dev.html` | 소스 진입점 | 개발자 | 직접 수정 |
| `src/**` | 소스 | 개발자 | 직접 수정 |

---

## 6. 아키텍처와 데이터 흐름

### 6.1 전체 흐름

```
[운영자]  Notion DB에 글 작성 + Published 체크
             │
             │  (트리거: push / cron / workflow_dispatch / 외부 스케줄러)
             ▼
[GitHub Actions · notion-sync.yml]
   npm run test:unit  ── 실패 시 중단 (엉뚱한 섹션 배정 방지)
   node scripts/notion-snapshot.mjs --out notion-content.json
      · 서버에서 www.notion.so/api/v3 호출 (CORS 없음, 3회 재시도)
      · 행(row) + 본문(record map)을 슬림화해 저장
      · 내용이 같으면 쓰지 않음(하트비트 60분) → 빈 커밋 방지
      · Summary 탭에 "글→섹션" 분류표 + 확인 필요 항목 기록
             │
             ▼  (변경 있을 때만 커밋)
[notion-content.json  @ main]
             │
             ▼  GitHub Pages 자동 배포
[브라우저 · index.html]
   1) 스냅샷 우선:  같은 출처의 notion-content.json (항상 성공, CORS 무관)
   2) 보조:         공개 프록시 notion-api.splitbee.io (수동 동기화 시 먼저 시도, 8초 타임아웃)
      └ 변환: src/notionPublic.ts → src/notion.ts(mapPage/mapBlocks) → Entry[]
             │
             ▼
   ContentProvider(React Context) → 섹션별 분류/정렬 → 화면 렌더
```

### 6.2 런타임 갱신 주기 (`src/content/ContentContext.tsx`)

| 이벤트 | 동작 |
|---|---|
| 최초 로드 | `localStorage: xconda:notion-cache:v1` 캐시 허용 |
| 3분 폴링 (`POLL_MS`) | 탭이 보이는 상태일 때만 `refresh(force=true)` |
| 탭 복귀(`visibilitychange`) | 마지막 동기화가 30초 이상 지났으면 재동기화 |
| 🔄 수동 동기화 | 스냅샷·브라우저 캐시 무효화 + 공개 프록시를 **먼저** 시도 → 실패 시 스냅샷 폴백 |

> **"지금 동기화"는 서버를 깨우지 않습니다.** 이미 만들어진 스냅샷을 다시 읽을 뿐입니다. 노션의 새 글을 올리려면 **서버에서 스냅샷이 새로 생성**되어야 합니다(→ Actions 실행 또는 외부 스케줄러).

### 6.3 엔드포인트 결정 우선순위 (`src/notion.ts` `resolveEndpoint`)

1. URL 파라미터 `?notion=<노션 URL|32자리 ID|Worker URL>` — 브라우저에 저장됨. `?notion=off` 로 해제(샘플 모드)
2. 환경 변수 `VITE_NOTION_ENDPOINT`
3. 기본값 `public:3e72ebc017ad8024a3f5ef8fb9f8c6dd` (XCONDA_NEWs 공개 페이지)

과거에 쓰던 Splitbee/구 Worker 주소는 `STALE_ENDPOINTS`에 등록되어 **자동으로 무시되고 기본값으로 승격**됩니다. 브라우저에 남은 옛 설정 때문에 장애가 재발하는 것을 막기 위한 장치입니다.

---

## 7. 핵심 모듈 맵

| 파일 | 책임 | 손댈 때 주의 |
|---|---|---|
| `src/content/classify.js` (+`.d.ts`) | **`Type` 값 → 섹션(notice/news/guide/blog/faq) 판정의 유일한 원천.** 동의어 표, 채널(X·YouTube 등) 판별, `Published` 판정 | 사이트와 동기화 스크립트가 **같은 규칙**을 씁니다. 여기만 고치면 양쪽에 반영됩니다. 수정 후 `npm run test:unit` 필수 |
| `src/content/fields.js` (+`.d.ts`) | 노션 속성 별칭(`Cover`/`커버`), 썸네일 파생(페이지 커버 → 본문 첫 이미지), 작성자, 노션 이미지 프록시 서명 | 위와 동일 |
| `src/notion.ts` | 엔드포인트 결정, 속성→`Entry` 변환(`mapPage`), Notion 블록→`Block[]`(`mapBlocks`), 로컬 캐시, 날짜/시간 포맷 | Worker(비공개) 경로와 공개 경로를 모두 처리 |
| `src/notionPublic.ts` | 공개 페이지 어댑터. **스냅샷 우선 → 공개 프록시 보조**, 구 record-map 디코딩, 스냅샷 `__type` 우선 적용 | 여기가 "노션엔 뉴스인데 사이트엔 공지"가 갈리는 지점. `scripts/smoke-sections.mjs`가 실제 코드로 검증 |
| `src/notionSnapshot.ts` | 스냅샷 fetch/TTL(60초)/낡음 판정(6시간)/페이지 본문 조회 | `SNAPSHOT_STALE_MS`는 하트비트(60분)보다 충분히 커야 함 |
| `src/content/ContentContext.tsx` | 데이터 소유. 동기화·폴링·섹션 분류·정렬·모달 상태·딥링크 | 정렬 규칙은 여기(공지는 `pinned` 우선, 가이드·FAQ는 `order`, 나머지는 날짜 내림차순) |
| `src/i18n/dict.ts` (222키) | UI 문구 한/영 사전 + 비 React 유틸용 전역 언어 변수 | 키는 `ko`/`en` **항상 동시 추가** |
| `src/i18n/content.ts` | `localizeEntry` / `localizeTool` — 노션 EN 보조 필드를 현재 언어에 반영 | — |
| `src/content/tools.ts` (19개 툴) | 툴 카드 메타데이터 + `TOOLS` / `toolToEntry` | 툴 이미지는 `assets/img/tools`(상대경로) 또는 스튜디오 랜딩 URL |
| `src/content/toolGuides.ts` (1,499줄) | 툴 상세 매뉴얼 본문(`Block[]`) — `flexboard`, `turn`, `image`, `upscale`, `video`, `expression` | 제품 매뉴얼 원문. 내용 수정은 제품팀 확인 후 |
| `src/content/sample.ts` / `sample.en.ts` | Notion 미연동(샘플 모드)일 때 보여줄 23개 예시 글 | `?notion=off`로 확인 가능 |
| `src/components/volt.tsx` | 디자인 시스템 프리미티브(Logo, SectionHeader, Reveal, Tabs, Pill, FilterChip, VoltButton, GhostButton, Modal, 아이콘) | 새 UI는 여기의 컴포넌트 조합으로 만듭니다 |
| `src/components/common.tsx` | 콘텐츠 공용 컴포넌트(`CategoryBadge`, `TypeLabel`, `Byline`, `NewBadge`, `SyncButton`, `SyncStatus`, `SmartImage`, `RichText`, `Blocks`) | `SyncStatus`가 동기화 배지 |
| `scripts/notion-snapshot.mjs` (720줄) | 스냅샷 생성기 + Actions Summary 리포트 + 하트비트 판정(`shouldWriteSnapshot`) | Notion 비공개 API(`www.notion.so/api/v3`) 사용 → 노션 변경 시 깨질 수 있는 **유일한 취약 지점** |

---

## 8. 데이터 모델

### 8.1 `Entry` (`src/content/types.ts`) — 화면에 표시되는 글 한 건

```ts
type EntryType = "notice" | "news" | "guide" | "blog" | "faq";

type Entry = {
  id: string;            // 노션 페이지 ID (딥링크 #post=ID)
  type: EntryType;       // 섹션
  title: string;
  summary: string;       // FAQ는 답변
  category: string;      // 비어 있으면 공지='공지', 뉴스=링크 채널명
  date: string;          // ISO (정렬 기준)
  tags: string[];
  cover?: string;        // Cover 속성 → 페이지 커버 → 본문 첫 이미지
  coverFallback?: string;// 노션 첨부 이미지용 보조 주소
  author?: string;       // 노션 Author(작성자)
  url?: string;          // Link(링크) — "스튜디오에서 열기" / 원본 SNS
  pinned?: boolean; important?: boolean;
  version?: string;      // 뉴스(릴리스)
  tool?: string;         // 가이드가 대체할 툴 이름
  order?: number;        // 가이드 · FAQ 정렬
  changes?: { kind: "New" | "Improved" | "Fixed"; text: string }[];
  blocks?: Block[];      // 정적 콘텐츠 본문
  remote?: boolean;      // true면 본문을 노션에서 지연 로딩
  translations?: { ko?: EntryTranslation; en?: EntryTranslation };
};
```

### 8.2 `Block` — 본문 블록 (노션 블록을 그대로 축약)

`p` · `h2` · `h3` · `ul` · `ol` · `todo` · `quote` · `callout` · `code` · `img` · `video` · `link` · `toggle` · `divider`
→ 렌더링은 `src/components/common.tsx`의 `Blocks` / `RichText`.

### 8.3 `Tool` — 툴 카드

`slug`, `name`, `group`(핵심 스튜디오 / 스토리보드 / 카메라·앵글 / 이미지 편집 / 생성·보정), `tagline`, `desc`, `href`, `image`, `badge`, `steps[]`, `tips[]`, `translations`.
**19개**: turn · flexboard · blocking-board · directors-cut · art-director-pro · scene-snap · youtube-ref · drct-seq · spin-angle · arw-view · auto-angle · cloth-swap · expression · face-swap · background-blend · cine-grade · image · video · upscale

### 8.4 스냅샷 포맷 (`notion-content.json`)

```jsonc
{
  "generatedAt": "2026-10-10T02:05:22.026Z",   // 배지의 "n분 전" · 낡음 판정 기준
  "source": {
    "pageId": "3e72ebc0-17ad-8024-a3f5-ef8fb9f8c6dd",
    "collectionViewId": "3b54d2ea-0d5e-4ab5-b33c-ff12de807517",
    "collectionId": "284d44e9-a4eb-4c55-99b5-35815748bad0"
  },
  "rows": [ { "id": "...", "Title": "...", "Type": "Q&A", "Published": true,
              "Date": "2026-10-02", "Summary": "...", "Author": "...",
              "__type": "faq" /* 스냅샷이 확정한 섹션 */ } ],
  "pages": { "<pageId>": { "<blockId>": { /* 슬림화된 노션 블록 */ } } }
}
```

- `rows[*].__type`은 **스냅샷이 미리 계산한 섹션**으로, 브라우저 추론보다 우선합니다(분류 규칙이 바뀌어도 노션-사이트가 어긋나지 않도록).
- **직접 수정 금지.** 수동으로 고치면 다음 동기화 때 덮어써집니다.

### 8.5 노션 속성 스키마 (요약 · 전체는 `NOTION_SETUP.md`)

| 속성 | 유형 | 필수 | 설명 |
|---|---|---|---|
| `Title` / `제목` | 제목 | ✅ | FAQ는 질문 |
| `Type` / `유형` | 선택 | ✅ | `공지` `뉴스` `가이드` `블로그` `FAQ` (+ 동의어 다수, `classify.js`) |
| `Published` / `공개` | 체크박스 | ✅ | 미체크 = 초안(사이트 제외) |
| `Date` / `날짜` | 날짜 | ✅ | 정렬 기준 |
| `Summary` / `요약` | 텍스트 | 권장 | FAQ는 답변 |
| `Author` / `작성자` | 텍스트(권장) | 권장 | 블로그 카드·모달에 `✎ 이름` |
| `Category` / `카테고리` | 선택 | 권장 | 비우면 공지=`공지`, 뉴스=링크 채널명 자동 |
| `Pinned` / `Important` | 체크박스 | | 상단 고정 · 히어로 배너 / 빨간 점 |
| `Version` · `Changes` | 텍스트 | | 뉴스(릴리스 노트). `[New] …` `[Improved] …` `[Fixed] …` |
| `Tool` / `툴` | 선택 | | 값이 툴 이름과 같으면 해당 툴 가이드를 이 글로 대체 |
| `Order` | 숫자 | | 가이드 · FAQ 정렬 |
| `Cover` · `Link` · `Tags` | 파일/URL/다중선택 | | — |
| `Title EN` · `Summary EN` · `Category EN` · `Author EN` · `Changes EN` | 텍스트 | | EN 모드 표기 |

---

## 9. Notion 동기화 파이프라인

### 9.1 워크플로: `.github/workflows/notion-sync.yml`

| 항목 | 값 |
|---|---|
| 트리거 | `schedule`(cron `7,17,27,37,47,57 * * * *`), `workflow_dispatch`, `repository_dispatch(notion-sync|sync)`, `push`(main · `arena/**`) |
| 동시성 | `group: notion-sync-${{ github.ref }}`, `cancel-in-progress: true` |
| 권한 | `contents: write` |
| 순서 | `npm run test:unit` → 스냅샷 생성 → 아티팩트 업로드(보관 1일) → 변경 시에만 커밋 |
| 실행 시간 | 약 13~19초 |

### 9.2 반영 속도 (중요)

| 트리거 구성 | 실제 반영 시간 |
|---|---|
| GitHub 기본 `schedule`만 | **수 시간** (2026-09 실측: 간격 2.2~8.3시간, 중앙값 3.8시간) |
| **외부 스케줄러 → `workflow_dispatch`** (권장) | **약 10~12분** (호출 주기 + 실행 15초 + Pages 1~2분) |
| `Run workflow` 수동 실행 | 약 2분 |
| 저장소 push / PR 병합 | 약 2분 (자동) |

> GitHub의 `schedule`은 **최선 노력(best effort)** 트리거입니다. 부하가 큰 시간대에는 지연·누락됩니다.
> **현재 이 저장소는 `workflow_dispatch`가 5분 간격으로 꾸준히 호출되고 있습니다**(최근 실행 이력 확인). 이 호출을 만드는 외부 스케줄러 계정/토큰은 반드시 인수인계 대상입니다 → [18. 인수인계 체크리스트](#18-인수인계-체크리스트).

### 9.3 빈 커밋 방지 3중 장치

1. **내용 지문 비교** (`stableStringify` → `snapshotContentKey`): `source` · `rows` · `pages`가 같으면 파일을 쓰지 않습니다.
2. **하트비트** (`HEARTBEAT_MS = 60분`): 내용이 같아도 1시간 지나면 한 번 갱신 — 배지의 "n분 전"과 낡음 판정이 `generatedAt`에 의존하기 때문입니다.
3. **커밋 전 `git status` 확인**: 변경 없으면 커밋 생략 → GitHub Pages 빌드(시간당 10회 soft limit)를 소모하지 않습니다.

### 9.4 낡음(stale) 판정과 폴백

| 상수 | 값 | 위치 |
|---|---|---|
| 스냅샷 캐시 TTL | 60초 | `notionSnapshot.ts` |
| `SNAPSHOT_STALE_MS` | 6시간 | `notionSnapshot.ts` — 넘으면 공개 프록시를 먼저 시도 |
| `SYNC_DELAY_MS` | 90분 | `common.tsx` — 넘으면 배지가 노란 점 `Notion 동기화 지연` |
| 공개 프록시 타임아웃 | 8초 | `notionPublic.ts` `LIVE_TIMEOUT_MS` |
| Worker 엣지 캐시 | 60초 | `notion-worker/worker.js` |

### 9.5 Actions Summary 리포트 (운영자가 가장 먼저 볼 화면)

`scripts/notion-snapshot.mjs`가 Summary 탭에 남깁니다.

- **"글 → 섹션" 표**: 제목 · 노션 `Type` · 확정 섹션 · 판정 근거
- **⚠️ 확인 필요**: `Type`이 비었거나 처음 보는 값 / SNS 링크가 있는데 공지사항인 글 / `Published` 미체크로 제외된 글 / 표가 2개 이상 / 직전 스냅샷이 1시간 이상 경과
- **갱신 여부**: `갱신 (내용 변경)` / `유지 (변경 없음)` / `갱신 (하트비트 갱신)`
- 실패 시: 원인 + 확인 순서 4단계

---

## 10. 빌드 · 배포

### 10.1 두 개의 워크플로

| 워크플로 | 트리거 | 하는 일 |
|---|---|---|
| **사이트 빌드 (index.html 갱신)** | `main` push 중 `src/**`, `dev.html`, `package*.json`, `vite.config.ts`, `tsconfig.json` 변경 + 수동 | `npm ci` → `test:unit` → `npm run build` → `index.html` 변경 시에만 커밋/푸시 |
| **Notion 동기화** | 위 표 참조 | `test:unit` → 스냅샷 생성 → `notion-content.json` 변경 시에만 커밋/푸시 |

둘 다 **변경이 없으면 커밋하지 않고**, 푸시 직전 `git pull --rebase`로 최신 상태에 재적용합니다(서로 경주하다 거절되는 것 방지).

### 10.2 로컬 빌드

```bash
npm run build
# vite build (진입점: dev.html, 플러그인: react + tailwind + singlefile)
# → dist/dev.html (~519 KB)
# → postbuild: dist/dev.html 을 루트 index.html 로 복사
```

- **`postbuild`가 루트 `index.html`을 덮어씁니다.** 빌드 후 `git status`에서 `index.html`이 더럽게 나오면 = 소스와 커밋된 산출물이 어긋난 상태입니다. 의도한 변경이라면 그대로 커밋, 아니라면 원인 확인.
- 빌드는 **재현적**입니다(동일 소스 → 동일 `index.html`, 로컬 검증 완료).

### 10.3 배포

- GitHub Pages: **브랜치 배포** (`main` 루트 `/`), 빌드 타입 `legacy`, `https://hanahchafilmaker.github.io/XCONDA_info/` (커스텀 도메인 없음)
- 저장소 커밋 → Pages가 자동 배포 (통상 1~2분)
- `dist/`, `dist-test/`는 `.gitignore` 처리

---

## 11. 환경 변수와 설정값

### 11.1 GitHub 저장소 Variables (Settings → Secrets and variables → Actions → Variables)

| 이름 | 현재 값 | 용도 |
|---|---|---|
| `NOTION_PAGE_ID` | `3e72ebc0…c6dd` (XCONDA_NEWs) | 스냅샷 대상 공개 페이지 |
| `NOTION_DATABASE_ID` | `3b54d2ea…7517` | 페이지 안 표(데이터베이스)가 여러 개일 때 지정 |

> **Secrets는 없습니다.** Notion 토큰을 쓰는 방식(Worker)을 쓰지 않으므로 저장소에 비밀을 둘 필요가 없습니다.

### 11.2 로컬 `.env` (`.gitignore` 처리됨)

| 이름 | 용도 |
|---|---|
| `VITE_NOTION_ENDPOINT` | 기본 연동 대상 override (Worker URL 또는 노션 페이지 URL/ID). **빌드 타임**에 주입되므로 변경 후 재빌드 필요 |

### 11.3 Cloudflare Worker (선택 · 방법 B)

`NOTION_TOKEN`, `NOTION_DB_ID`, `ALLOW_ORIGIN` — 모두 **wrangler secret / Dashboard 변수**(저장소 밖).

### 11.4 브라우저 저장소 키

| 키 | 값 |
|---|---|
| `xconda-lang` | `ko` \| `en` |
| `xconda:notion-endpoint` | `?notion=` 으로 지정한 엔드포인트 |
| `xconda:notion-cache:v1` | 마지막으로 받은 글 목록(오프라인/첫 페인트용) |

### 11.5 하드코딩 상수 (바꿀 때 코드 수정 필요)

| 값 | 위치 |
|---|---|
| `DEFAULT_ENDPOINT = "public:3e72…c6dd"` | `src/notion.ts` |
| `DEFAULT_PAGE_ID` / `DEFAULT_DATABASE_ID` | `scripts/notion-snapshot.mjs` |
| `STUDIO_URL = "https://www.xconda.ai"` | `src/content/tools.ts` |
| `NOTION_NEWS_URL` | `src/content/channels.tsx` |
| SNS 채널 카드 링크(`href: ""` = 준비 중) | `src/content/channels.tsx` |

---

## 12. 테스트 전략

프레임워크 없이 **Node 내장 test runner + jsdom**만 씁니다.

| 명령 | 내용 | 소요 |
|---|---|---|
| `npm run test:unit` | `node --test` (notion-snapshot / classify / fields) **+** `scripts/smoke-sections.mjs` | ~0.5초 |
| `npm run test:smoke` | `vite build --config scripts/vite.smoke.config.ts` (IIFE 번들 → `dist-test/`) → `smoke.mjs` + `smoke-sync.mjs` | ~16초 |

### 12.1 각 테스트가 지키는 것

| 파일 | 검증 |
|---|---|
| `scripts/classify.test.mjs` | `Type` 동의어 → 섹션 판정, SNS 링크 채널 인식, `Published` 미체크 제외 |
| `scripts/fields.test.mjs` | 썸네일 우선순위(Cover → 페이지 커버 → 본문 첫 이미지), 노션 이미지 프록시·폴백 주소, `Author`/`Author EN` |
| `scripts/notion-snapshot.test.mjs` | 하트비트 판정(`shouldWriteSnapshot`), 안정 직렬화(`stableStringify`) |
| `scripts/smoke-sections.mjs` | **실제 `src/notionPublic.ts`를 import**해 노션 행을 흘려보내고 섹션 배정을 확인. Node 22.18+ 의 TypeScript 타입 제거 기능 사용(미지원 버전은 SKIP) |
| `scripts/smoke.mjs` | 실제 번들을 jsdom에서 마운트 → 모든 섹션 렌더 + 콘솔 에러 0 + 검색 동작 |
| `scripts/smoke-sync.mjs` | **"지금 동기화" 정직성 회귀**: 프록시 사망 시 스냅샷 생성 시각을 표시해야지 "방금 전"을 표시하면 안 됨 |

### 12.2 새 규칙을 추가했다면

`src/content/classify.js` 또는 `fields.js`를 고쳤다면 **반드시 해당 `.test.mjs`에 케이스를 추가**하세요.
동기화 워크플로가 `test:unit`을 먼저 돌리므로, 테스트가 곧 **배포 안전장치**입니다.

---

## 13. 개발 워크플로와 코드 컨벤션

### 13.1 브랜치 · 커밋

- 작업 브랜치 → PR → `main` 병합(squash). 병합되면 워크플로가 자동으로 `index.html`을 갱신합니다.
- 커밋 메시지는 `feat:`, `fix:`, `chore:`, `build:`, `design:`, `docs:` 접두어를 사용하고 있습니다.
- **산출물 커밋에는 `[skip ci]`** 를 붙입니다(`chore: Notion 콘텐츠 동기화 [skip ci]`).

### 13.2 코드 규칙

- **TypeScript strict**. `noUnusedLocals` / `noUnusedParameters` 켜져 있음 → 미사용 변수는 빌드 실패.
- 컴포넌트는 **함수 + 훅**, 파일당 기본 export 1개(`export default function X`).
- 경로 별칭 `@/*` → `src/*` 사용 가능.
- 클래스명 조합은 `cn()` (`clsx` + `tailwind-merge`).
- **분류·필드 규칙은 `.js` 구현 + `.d.ts` 선언** 쌍으로 관리합니다. 이유: 브라우저(TS)와 Node 스크립트(JS)가 **같은 구현**을 import 해야 하기 때문입니다. 규칙을 TS 파일로 옮기면 이 공유가 깨집니다.
- UI 문구는 **하드코딩하지 말고** `src/i18n/dict.ts`에 `ko`/`en` 동시 추가 후 `t("key")`.
- 디자인 토큰은 `src/index.css`의 `@theme`에 추가하고 Tailwind 클래스로 사용(`bg-ink-950`, `text-volt-400` …).
- 새 컴포넌트는 `volt.tsx`(프리미티브)와 `common.tsx`(콘텐츠 공용) 중 맞는 쪽에 넣고, 없을 때만 새 파일.

### 13.3 Tailwind 주의사항

`src/index.css` 첫 줄:

```css
@import "tailwindcss" source("../src");
```

루트의 `redesign-xconda-website-ui/`(참고용 프로토타입) 클래스가 CSS에 섞이지 않도록 **스캔 범위를 `src/`로 제한**하고 있습니다. 이 줄을 지우거나 범위를 넓히면 CSS가 비대해집니다.

---

## 14. 자주 하는 작업 레시피

| 작업 | 고치는 곳 |
|---|---|
| **UI 문구 추가/수정** | `src/i18n/dict.ts` (ko·en 동시) → `t("키")` 사용 |
| **새 툴 카드 추가** | `src/content/tools.ts`(`BASE_TOOLS`) + `src/content/tools.en.ts`(`TOOL_EN`), 커버 이미지는 `assets/img/tools/`(상대경로) |
| **툴 상세 매뉴얼 추가** | `src/content/toolGuides.ts` (`TOOL_GUIDES[slug] = { ko: Block[], en: Block[] }`) |
| **툴 공식 영상 연결** | `src/content/toolVideos.ts` (Google Drive 파일 ID → `drive(id)`) |
| **툴 사용법 섹션에 노션 글 반영** | 노션에 `Type=가이드`, `Tool` = 툴 이름(`tools.ts`의 `name`과 대소문자 무시 비교) 으로 글 작성 |
| **섹션 추가** | ① `src/content/types.ts` `EntryType` ② `classify.js`(`TYPE_ALIASES`·`SECTION_LABELS`) ③ `ContentContext`(그룹·정렬) ④ `App.tsx`(배치) ⑤ `Nav.tsx` `LINKS` ⑥ `SearchOverlay.tsx` `Kind` ⑦ `dict.ts`(`nav.*`, `section.*`) ⑧ 테스트 |
| **노션 속성 추가** | ① `src/content/fields.js`(별칭 키) 또는 `classify.js`(분류 관련) ② `src/notion.ts` `mapPage` ③ `scripts/notion-snapshot.mjs`(행 추출 · 요약) ④ `src/content/types.ts` `Entry` ⑤ 테스트 + `NOTION_SETUP.md` 표 갱신 |
| **분류 규칙 변경** | `src/content/classify.js` **한 곳만** → `npm run test:unit` (사이트·스크립트 동시 반영) |
| **디자인 토큰/색 변경** | `src/index.css` `@theme` |
| **디버그: 노션 없이 보기** | `?notion=off` (샘플 모드) |
| **디버그: 다른 노션 페이지로 보기** | `?notion=<페이지 URL 또는 32자리 ID>` |
| **스냅샷만 강제 재생성** | `node scripts/notion-snapshot.mjs --out notion-content.json --force` (`--heartbeat-min <분>` 으로 하트비트 조절) |

---

## 15. 알려진 이슈와 함정

| # | 이슈 | 상태 / 대응 |
|---|---|---|
| 1 | **GitHub `schedule`이 정시 실행을 보장하지 않음** (실측 2~8시간 간격) | 외부 스케줄러 → `workflow_dispatch` 5~10분 호출로 우회 중. 스케줄러/토큰 만료 시 수 시간 지연으로 **되돌아감** |
| 2 | **무료 공개 프록시 `notion-api.splitbee.io`의 `/table` 경로가 500** | 서버 스냅샷 방식으로 전환 완료. 프록시는 보조 수단(8초 타임아웃)으로만 사용 |
| 3 | **Google Drive 영상의 CSP 차단** (`frame-ancestors`) — 서버에서 우회 불가 | iframe 미사용, **새 창으로 열기** 링크로 처리 (`toolVideos.ts` + 모달) |
| 4 | `scripts/notion-snapshot.mjs`가 **Notion 비공개 API**(`www.notion.so/api/v3`)에 의존 | 공식 지원 API가 아님 → 노션이 바꾸면 동기화가 깨질 수 있는 **단일 취약점**. 증상: 스냅샷 실패, Summary에 HTTP 오류 |
| 5 | 표(데이터베이스)가 **2개 이상이면 첫 번째만** 읽음 | `NOTION_DATABASE_ID`로 지정하거나 표를 하나로 합치기 |
| 6 | 노션에 직접 업로드한 이미지의 서명 URL은 약 1시간 후 만료 | 만료되지 않는 notion.so 프록시 주소로 변환(`fields.js` `signNotionImage`) + `coverFallback`. 장기 노출 커버는 외부 URL 권장 |
| 7 | `redesign-xconda-website-ui/`는 **미사용 프로토타입** | 삭제해도 무방하나, Tailwind 스캔에서 제외되어 있으므로 혼동 주의. 우선순위 낮음 |
| 8 | 저장소에 `README.md`가 없음 | 본 문서(`HANDOFF.md`)가 개발자 진입점, `NOTION_SETUP.md`가 운영자 진입점 |
| 9 | `src/i18n/dict.ts`가 모듈 전역 `_current` 언어를 둠 | 비 React 유틸(날짜 포맷)이 언어를 참조하기 위한 의도된 설계. SSR 없음 |
| 10 | 루트 `index.html`(약 507 KB)이 저장소에 커밋됨 | 의도된 설계(Pages 브랜치 배포). 히스토리가 커지면 Pages Actions 배포로 전환 검토 |

---

## 16. 트러블슈팅 플레이북

| 증상 | 가장 흔한 원인 | 조치 |
|---|---|---|
| 노션에 썼는데 사이트에 안 나옴 | ① `Published` 미체크 ② 스냅샷이 아직 안 만들어짐 ③ 다른 표에 작성 | Actions → 최근 **Notion 동기화** → **Summary** 확인 → `Run workflow` |
| 배지가 `Notion 동기화 지연`(노란 점) | 마지막 스냅샷이 90분 이상 경과 (스케줄러 중단 또는 cron 지연) | `Run workflow`로 즉시 반영 + 외부 스케줄러 상태/토큰 만료 확인 |
| 🔄 "지금 동기화"를 눌러도 새 글이 안 옴 | 정상 동작입니다. 🔄는 **만들어진 스냅샷을 다시 읽을 뿐** | 서버 동기화(Actions) 실행 필요 |
| 사이트가 샘플 콘텐츠로 보임 | 연동 실패(스냅샷 없음 + 프록시 장애) 또는 `?notion=off` 상태 | `?notion=off` 해제, `notion-content.json` 존재 확인, Actions 로그 |
| 글이 엉뚱한 섹션에 들어감 | 노션 `Type` 값이 그대로 반영된 것(자동 이동 안 함) | 노션에서 `Type`을 `공지·뉴스·가이드·블로그·FAQ`로 지정. 규칙 자체를 바꾸려면 `classify.js` |
| 썸네일이 안 나옴 | `Cover` · 페이지 커버 · 본문 이미지 모두 없음 | Summary의 `썸네일` 열 / `⚠️ 확인 필요` 확인 → `Cover`에 외부 이미지 URL |
| 작성자가 안 보임 | `Author` 속성 누락 또는 사람(Person) 속성에 계정 참조만 있음 | **텍스트** 속성의 `Author`(또는 `작성자`) 사용 |
| 소스를 고쳤는데 사이트가 그대로 | `index.html` 갱신 안 됨 | main에 push했는지, **사이트 빌드** 워크플로가 성공했는지 확인. 로컬은 `npm run build` |
| 스냅샷 생성 실패(Summary에 HTTP 오류) | 노션 비공개 API 변경 / 페이지 미게시 / 표 없음 | Summary의 확인 순서 1~4 수행. 지속 시 #4 취약점 점검(Notion API 응답 확인) |
| Actions가 커밋을 안 만듦 | **정상** — 내용이 같으면 커밋하지 않음 | 요약의 `유지 (변경 없음)` 확인. 강제 갱신은 `--force` |
| `npm run build` 후 `index.html`이 더러워짐 | 커밋된 산출물이 소스와 달랐음 | 의도된 변경이면 커밋, 아니면 이전 산출물이 어떤 소스에서 만들어졌는지 확인 |
| Google Drive 영상이 안 열림 | Drive 공유 설정 / CSP | 새 창 열기 링크로 동작하므로 Drive 공유 권한 확인. YouTube·직접 제공 파일은 인페이지 재생 |

---

## 17. 운영 런북

### 17.1 일상 (콘텐츠 운영자)

1. 노션에 글 작성 → `Type` 지정 → `Published` 체크
2. 사이트 상단 배지 확인(초록 점 + 최근 시각)
3. 즉시 반영이 필요하면 Actions → **Notion 동기화** → `Run workflow`

### 17.2 주간 (개발자)

- [ ] Actions 실행 이력에 **실패**가 없는지
- [ ] 외부 스케줄러(예: cron-job.org) 최근 응답이 **204**인지 (401이면 토큰 만료 → 재발급)
- [ ] Summary의 `⚠️ 확인 필요` 항목이 줄고 있는지(운영자에게 전달)
- [ ] Pages 사이트가 최신 `index.html`을 서빙하는지

### 17.3 월간

- [ ] GitHub PAT 만료일 확인(스케줄러용)
- [ ] 의존성 업데이트 검토(PR로 분리, `npm ci` 재현성 확인)
- [ ] `notion-content.json` 용량 추이(현재 약 180 KB / 글 15건)

### 17.4 장애 대응 우선순위

1. **사이트가 아예 안 뜸** → `index.html` 커밋 상태 / Pages 워크플로(`pages build and deployment`) 확인
2. **콘텐츠가 안 바뀜** → Notion 동기화 워크플로 마지막 성공 시각 → 실패면 Summary 확인
3. **분류/표시 이상** → `npm run test:unit` → `smoke-sections` 결과 확인
4. **스타일 깨짐** → Tailwind 스캔 범위(`source("../src")`)와 `vite-plugin-singlefile` 인라인 결과 확인

### 17.5 긴급 롤백

```bash
git revert <문제 커밋>       # src 변경 롤백 → main 푸시 → 워크플로가 index.html 재생성
# 산출물만 되돌려야 한다면
git checkout <정상 커밋> -- index.html notion-content.json
```

---

## 18. 인수인계 체크리스트

### 18.1 계정 · 접근 권한

| 항목 | 내용 | 상태 |
|---|---|---|
| GitHub 저장소 `hanahchafilmaker/XCONDA_info` | write 권한(Actions 재실행, Variables 편집) | ☐ |
| Notion 워크스페이스 `silicon-mascara-c7d` | XCONDA_NEWs 페이지 편집 + **웹 게시(Publish)** 권한 | ☐ |
| GitHub **Fine-grained PAT** (Actions: Read and write, `XCONDA_info` 한정) | 외부 스케줄러가 `workflow_dispatch`를 호출하는 데 사용. **만료일 필수 기재** | ☐ |
| 외부 스케줄러 계정(예: cron-job.org) | 5~10분 주기 크론 잡 목록 · 최근 응답 로그 | ☐ |
| Cloudflare 계정 / `xconda-notion` Worker | **현재 미사용**(방법 A 운영). 사용 전환 시에만 필요 | ☐ (해당 없음) |
| 노션 Integration 토큰 | 방법 B 전환 시에만 필요(저장소에 없음) | ☐ (해당 없음) |

### 18.2 인수 시 반드시 확인할 것

- [ ] **외부 스케줄러가 실제로 살아 있는지** — Actions의 최근 실행이 `workflow_dispatch`로 규칙적(5~10분 간격)인가. (죽어 있으면 수 시간 지연 모드로 되돌아갑니다)
- [ ] 스케줄러 PAT의 만료일과 갱신 담당자
- [ ] 노션 XCONDA_NEWs 페이지의 **웹 게시** 상태와 편집 권한자
- [ ] `NOTION_PAGE_ID` / `NOTION_DATABASE_ID` Variables가 현재 페이지와 일치하는가
- [ ] Actions 두 워크플로의 최근 성공 실행

### 18.3 인계 문서 목록

| 문서 | 대상 |
|---|---|
| `HANDOFF.md` (본 문서) | 개발자 |
| `NOTION_SETUP.md` | 콘텐츠 운영자 (노션 연동 · 반영 속도 · 확인 순서) |
| `admin-guide.html`, `user-guide.html` | 관리자 / 최종 사용자 |

### 18.4 확인해야 할 미기재 사항 (인계자에게 물어볼 것)

- [ ] 제품/콘텐츠 의사결정자 연락처(공지 내용·툴 매뉴얼 승인권자)
- [ ] XCONDA 스튜디오 공식 SNS 채널 주소(`src/content/channels.tsx`에 `href: ""`로 비어 있는 항목들)
- [ ] Google Drive 영상 공유 폴더 접근 권한
- [ ] 커스텀 도메인 도입 계획 여부(현재 `hanahchafilmaker.github.io/XCONDA_info/`)

---

## 19. 백로그 · 개선 제안

우선순위 높은 순(인수 후 검토 권장).

| 우선순위 | 항목 | 이유 |
|---|---|---|
| 높음 | **스냅샷 생성의 비공개 API 의존 제거** — 공식 Notion API + Integration 토큰을 Actions Secret으로 쓰는 방식으로 전환 | 현재 구조의 단일 취약점(#4). 토큰은 Secret이라 유출 위험 낮고, 스케줄러는 그대로 사용 가능 |
| 높음 | `README.md` 신설 (본 문서로 리다이렉트되는 3줄 요약 + 링크) | 저장소 첫 화면에 진입점이 없음 |
| 중간 | `redesign-xconda-website-ui/` 정리(삭제 또는 `docs/` 이동) | 혼동 방지 |
| 중간 | `notion-content.json` 히스토리 비대화 → Pages를 **Actions 배포**로 전환 검토 | 저장소 용량 · 산출물 커밋 노이즈 제거 |
| 중간 | 스모크 테스트를 CI에 연결(`test:smoke`는 현재 로컬 전용) | 회귀 방지 자동화 |
| 낮음 | SNS 채널 `href` 채우기(제품팀 확인 필요) | `channels.tsx`의 "링크 준비 중" 카드 해소 |
| 낮음 | 툴 상세 매뉴얼(`toolGuides.ts`)을 노션으로 이관 검토 | 운영자가 직접 수정 가능해짐(단, Notion 이미 19개 툴 구조와 중복 관리 이슈) |

---

## 20. 용어집

| 용어 | 뜻 |
|---|---|
| **허브(Hub)** | 이 사이트. 공지·뉴스·가이드·블로그·Q&A를 모아 보여주는 단일 페이지 |
| **스냅샷** | `notion-content.json`. Actions가 서버에서 노션을 읽어 만든 정적 JSON |
| **하트비트** | 내용이 같아도 60분에 한 번 `generatedAt`만 갱신하는 것(배지/낡음 판정용) |
| **낡음(stale)** | 스냅샷이 6시간 이상 경과 → 공개 프록시를 먼저 시도 |
| **지연(delayed)** | 마지막 동기화가 90분 이상 경과 → 배지가 노란 점 |
| **샘플 모드** | `?notion=off` 또는 연동 실패 시 `src/content/sample.ts`의 예시 콘텐츠로 동작 |
| **volt** | 브랜드 옐로 계열 디자인 토큰(`--color-volt-*`, `#ffd60a`) |
| **ink** | 다크 배경 토큰(`--color-ink-950` … `#0b0b0b`) |
| **공개 페이지(방법 A)** | 노션 페이지를 웹에 게시(Publish)해 토큰 없이 읽는 방식 — **현재 운영 방식** |
| **Worker 프록시(방법 B)** | Cloudflare Worker + Integration 토큰으로 비공개 DB를 읽는 방식 — 미사용 |

---

## 21. 부록 · 명령어 치트시트

```bash
# 개발
npm ci
npm run dev            # /dev.html
npm run build          # dist/dev.html → index.html (postbuild)
npm run preview        # 빌드 결과 미리보기

# 테스트
npm run test:unit      # 분류·필드·하트비트 + 섹션 배정 스모크
npm run test:smoke     # IIFE 번들 → jsdom 런타임 스모크

# 동기화
node scripts/notion-snapshot.mjs --out notion-content.json            # 변경 시에만 기록
node scripts/notion-snapshot.mjs --force --heartbeat-min 0            # 강제 재생성
gh workflow run notion-sync.yml --ref main                            # 원격에서 즉시 동기화
gh run list --workflow "Notion 동기화" --limit 10                      # 최근 실행
gh run view <run-id> --log-failed                                     # 실패 로그

# 사이트 확인
open https://hanahchafilmaker.github.io/XCONDA_info/
#   ?notion=off                     → 샘플 모드
#   ?notion=<노션 URL 또는 32자리 ID> → 다른 공개 페이지로 보기
#   #post=<페이지ID>                 → 해당 글 모달로 열기
```

### 참고: 되돌려야 하는 것을 되돌리는 순간

- **노션 글 하나만 숨기고 싶다** → 노션에서 `Published` 체크 해제 → 다음 동기화(최대 호출 주기 + 2분)
- **사이트 전체를 예전 상태로** → `git revert` 후 main 푸시(자동 재빌드)
- **연동을 완전히 끄고 싶다** → `?notion=off`(브라우저 로컬) 또는 `VITE_NOTION_ENDPOINT` 제거 후 재빌드

---

**문서 끝.** 궁금한 점은 이 저장소의 Issues 또는 PR로 남겨 주세요. 코드에서 답을 찾아야 할 때는 먼저 `src/content/classify.js`(분류) → `src/notionPublic.ts`(읽기 경로) → `scripts/notion-snapshot.mjs`(서버 동기화) 순서로 보면 대부분 해결됩니다.
