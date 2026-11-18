# XCONDA허브 (XCONDA_info)

XCONDA(엑스콘다)의 **공지 · 뉴스 · 툴 사용법 · 블로그 · Q&A** 를 한곳에 모은 정적 사이트입니다.
운영: https://hub.xconda.ai/ · 한국어 원문 + `/en/` · `/ja/` · `/zh/` 번역 주소

## 10초 요약

- **정적 단일 HTML 사이트** — React + Vite + Tailwind 로 개발하고, 빌드 결과(`index.html`)를 저장소에 커밋하면 GitHub Pages 가 그대로 서빙합니다. 서버·DB 없음.
- **콘텐츠 원본은 Notion** — 노션에 쓰고 `Published` 를 체크하면 Actions 가 `notion-content.json` 스냅샷을 만들고, 사이트는 그 JSON 만 읽습니다.
- **커밋된 산출물은 직접 고치지 마세요** — `index.html`, `notion-content.json`, `post/ notice/ qna/ guide/ en/ ja/ zh/`, `sitemap.xml`, `robots.txt`, `assets/` 는 모두 생성물입니다. 소스(`src/**`, `dev.html`, `scripts/**`)를 고치고 빌드하세요.

전체 설명(아키텍처 · 함정 · 런북 · 트러블슈팅)은 **[`HANDOFF.md`](./HANDOFF.md)** 한 문서에 있습니다.

## 빠른 시작

```bash
npm ci
npm run dev          # http://localhost:5173/dev.html  ← 개발 진입점 (루트 index.html 아님)

npm run test:unit    # ~3초   규칙·SEO·번역 커버리지·워크플로·문서 회귀
npm run test:smoke   # ~40초  실제 번들을 jsdom 에서 실행하는 런타임 회귀 (CI 에서도 실행)
npm run build        # dist/dev.html → index.html + 글별 페이지 · sitemap · robots
```

- Node **22.x**(22.18 이상 권장), npm 10.x. 의존성은 `npm ci` 만 사용합니다.
- 루트 `index.html` 은 **빌드 결과물**입니다. 소스를 고쳐도 반영되지 않으니 개발은 항상 `dev.html` 로 합니다.

## UI 컴포넌트 · 접근성 검사

- `src/components/ui/`: shadcn/ui에서 가져와 기존 XCONDA 테마에 맞춘 Button · Dialog · Command · Sonner 래퍼. 원본 MIT 고지는 같은 폴더의 `LICENSE.shadcn.md`에 있습니다.
- 통합검색은 cmdk로 키보드 탐색을 제공하며, 콘텐츠 검색·정렬은 `SearchOverlay.tsx`에서 처리합니다. React/Vite 앱이므로 Next.js나 서버는 필요하지 않습니다.
- 새 UI를 추가할 때 `components.json`의 경로를 사용하되, CLI의 `--overwrite`로 기존 커스텀 스타일을 덮어쓰지 마세요.
- PR에서 `.github/workflows/ui-checks.yml`이 UI 상호작용·axe-core 검사를 실행합니다. 상세 범위와 제한은 [UI 개선 검증 기록](./reports/ui-ux-2026-11-15.md)을 참고하세요.

```bash
npx playwright install --with-deps chromium  # 브라우저 최초 설치
npm run test:ui                             # 검색·공유·모바일·접근성 전체
npm run test:a11y                           # axe-core 검사만
```

외부 번역·이미지·분석 서비스 요청은 브라우저 테스트에서 차단합니다. `CHROMIUM_EXECUTABLE_PATH`를 지정하면 기존 Chromium을 사용할 수 있습니다. 테스트 결과와 실패 trace는 `.playwright-results/`에 저장되며 Git에서 제외합니다.

## 문서

| 문서 | 대상 | 내용 |
|---|---|---|
| [`HANDOFF.md`](./HANDOFF.md) | 개발자 | 서비스 개요 · 아키텍처 · 모듈 맵 · 배포 · 테스트 전략 · 함정 · 런북 |
| [`NOTION_SETUP.md`](./NOTION_SETUP.md) | 콘텐츠 운영자 | 노션 연동 · 글 작성/게시 · 반영 속도 |
| [`admin-guide.html`](./admin-guide.html) | 운영자 | 콘텐츠 관리 실무 매뉴얼(색인 제외) |
| [`user-guide.html`](./user-guide.html) | 사용자 | 스튜디오 19개 툴 사용 가이드(공개·색인) |
| [`www/README.md`](./www/README.md) | 개발자 | www.xconda.ai 기능 페이지 원고·산출물·이관 절차 |
| [`reports/`](./reports) | 의사결정자 | SEO/GEO 감사 · 개선 리포트 · 번역 QC · 사고 대응 보고(색인 차단) |

## 자동화

| 워크플로 | 트리거 | 하는 일 |
|---|---|---|
| **Notion 동기화** | 10분 스케줄 + 수동 | 노션 → `notion-content.json` · 글별 페이지 · 사이트맵(내용이 같으면 커밋 안 함) |
| **사이트 빌드 (index.html 갱신)** | main 의 `src/**`·`www/**`·`content/i18n/**` 변경 | `test:unit` → `test:smoke` → `www:check`·`www:build` → `npm run build` → 산출물 커밋 |
| **www 기능 페이지 산출물** | main 의 `www/**` 변경 | `www:check`·`www:build` 후 `www-dist` 아티팩트(30일) 업로드 |
| **pages build and deployment** | main 푸시 | GitHub Pages 배포 |

`npm run content:audit` 는 **발행 전 점검**입니다 — 노션 스냅샷만 읽어(읽기 전용) 게시된 글의 `Slug`·`SEO 제목`·`SEO 설명`·커버 누락과 중복 후보를 표로 보여 줍니다. 대시보드 없이 114건을 30초에 확인할 수 있고, 판정 기준은 빌드와 같은 `src/content/seo.js`·`src/content/classify.js` 를 씁니다(`-- --check` 는 오류가 있으면 exit 1).
`npm run i18n:qc` 는 번역 초안의 연락처·숫자·통화·제목 중복을 점검합니다(`-- --write` 로 `reports/` 갱신).
`npm run i18n:progress` 는 **검수 진행률**을 셉니다 — 현재 `notion-content.json` 의 원문 수 × 3언어를 기준으로 `YYYY-MM-DD 검수 완료(검수자)` 로 표시된 항목 수와, 기계 점검이 문제를 찾은 항목을 묶어 `reports/i18n-progress-<날짜>.md` 로 남깁니다. CI(`build-site.yml`)는 이 스크립트를 `-- --summary` 로 불러 **실행 요약에 진행률과 "번역이 없는 원문(새 글)"** 을 남깁니다.
공유 미리보기 카드는 언어별로 따로 있습니다 — `npm run og:cards` 가 언어 홈 · 목록 · 커버 없는 글의 1200×630 카드를 `assets/img/og/lang/` 에 그리고 목록(manifest)을 갱신합니다(카드는 커밋되는 산출물이라 CI 에 Pillow 가 필요 없습니다).

## 현재 가이드 자산 (2026-11-18)

허브의 가이드는 공유 Drive의 **2026-11-18 현재판**을 이 저장소로 sanitize해 커밋한 같은 출처 자산입니다. [`src/content/driveGuides.json`](./src/content/driveGuides.json) 은 24주제 × 4개 언어 문서 96개와 KO/EN 영상 65편의 원본 파일 ID·슬러그를 담은 카탈로그입니다. 문서 KO/EN은 `00_XCONDA_가이드_통합관리.html`의 「현재판」, JA/ZH는 `00_Guide_Index.html`, 영상은 `xconda_video_guide`의 현재 8개 폴더를 기준으로 했습니다. **Drive `/view`·`/preview` 링크와 구버전 보관 항목, 원본 `google_drive/` 다운로드는 사이트나 커밋에 넣지 않습니다.**

- `assets/guides/current/`에는 안전하게 정리한 HTML 96개, 재생 가능한 MP4 65편, 중복 제거한 스크린샷 284개, `manifest.json`, 언어별 색인과 로컬 CSS/JS가 들어 있습니다. 외부 스크립트·폰트·Drive 주소·인라인 데이터 이미지는 제거했습니다.
- 허브 `#guides`의 툴 상세 영역 전체가 선택한 언어의 현재 HTML을 같은 출처 `<iframe>`으로 보여 줍니다. 상단 오른쪽의 옛 `전체 최신 가이드 보기` 버튼과 `#latest-guides` 라이브러리는 제거했습니다. 툴 모달도 같은 HTML과 MP4를 페이지 안에서 재생하며, JA/ZH는 자국어 HTML + 영어 MP4를 씁니다.
- `src/content/siteAssets.ts`의 `siteAssetUrl()`·`currentGuidePath()`·`currentVideoPath()`가 GitHub Pages 프로젝트 경로와 제품 사이트 `/hub/*` 프록시에서 자산 주소를 맞춥니다. `htmlGuides.ts`·`toolVideos.ts`는 Drive URL을 만들지 않습니다.
- `user-guide.html`의 19개 링크, `manuals/{ko,en,ja,zh}/index.html`, 보관된 2026-11-03 정적 사본의 현재판 배너도 `assets/guides/current/`의 같은 출처 문서로 연결합니다.
- 재생성은 `scripts/import-current-guides.mjs <downloaded-raw-dir> assets/guides/current`로 staged 검증 후 교체합니다. `scripts/import-html-guides.mjs`는 오래된 정적 사본을 다시 만들 때도 같은 현재판 경로를 씁니다. 두 스크립트 모두 Drive 원본은 수정하지 않습니다.

```bash
npm ci
node scripts/import-current-guides.mjs /path/to/downloaded-raw-guides assets/guides/current
npm run test:unit
npm run test:smoke
npm run build
```

`npm run build`는 `assets/app.js`·`index.html` 등 커밋된 산출물을 다시 만듭니다. 원본 다운로드 폴더는 sanitize와 검증이 끝나면 저장소에서 제거하고, 커밋에는 `assets/guides/current/`만 포함합니다.

## 허브 Q&A No 81–91 (2026-11-18)

워크스페이스·크레딧·블로킹보드와 Seedance 2.5 Draft 정책 문항 11건을 [`content/notion-qna-81-91.json`](./content/notion-qna-81-91.json) 에 read-only 커넥터 스냅샷으로 보관합니다. `node scripts/apply-notion-qna-connector.mjs` 가 저장소의 `loadHubQna()` 발행·본문 분리 규칙을 통해 `notion-content.json` 을 갱신하고, `node scripts/apply-qna-translations.mjs` 가 en/ja/zh 번역 **초안**을 넣으며, `node scripts/apply-qna-qc-allow.mjs` 가 짧은 한국어 답변에서 의도적으로 생긴 길이 경고만 허용 목록에 기록합니다. 번역은 검수 완료로 표시하지 않으므로 사람이 원어민 검수를 마친 뒤에만 항목별 `review` 를 `YYYY-MM-DD 검수 완료(검수자)` 로 바꿔야 합니다.

Q&A 표에서 `2d3c8b52…eab9` 는 공개 페이지의 컬렉션 **뷰 ID**(`?v=`), `d04aa2a0…21e6` 은 커넥터·공식 API의 **데이터 소스 ID**, `15d20857…40a2` 는 데이터베이스 페이지 ID입니다. 셋을 서로 바꿔 쓰지 마세요. (자세한 표: [`HANDOFF.md`](./HANDOFF.md) 11.1)

`npm run build` 뒤 `node scripts/build-seo.mjs` 로 `/qna/{slug}/` 정적 페이지와 `sitemap.xml` 이 함께 갱신됩니다. 생성물은 직접 수정하지 마세요.

## 언어별 주소

**화면의 언어 목록은 영어가 먼저, 한국어가 두 번째**입니다(2026-11-15 대표 결정 — 제품 사이트 xconda.ai 와 같은 순서).
콘텐츠 원문과 대표 주소(`x-default`)는 아직 한국어이고, 영어 원문 발행은 내년 정식버전부터입니다
([`reports/language-policy-20261115.md`](./reports/language-policy-20261115.md)).

| 언어 | 주소 | 범위 |
|---|---|---|
| English | `/en/` | Q&A 84건 + 목록/홈 (허브에서는 첫 번째) |
| 한국어 | `/` | 전체 (원문 · 대표 주소) |
| 日本語 | `/ja/` | Q&A 84건 + 목록/홈 |
| 中文 | `/zh/` | Q&A 84건 + 목록/홈 |

번역문은 `content/i18n/<언어>.json` 에 사람이 넣습니다(키 = `qna/<slug>` · `post/<slug>`). 파일만 추가하면 페이지 · 사이트맵 · hreflang · `llms.txt` 가 같은 빌드에서 함께 만들어집니다.
Q&A 는 `summary`(답변 전문)만 있고, 블로그·가이드·공지는 `blocks` 로 **본문**까지 번역합니다(`p`·`h2`·`h3`·`ul`·`ol`·`quote`·`callout`·`table` 8종, 강조는 `**굵게**`, 이미지는 원문 위치를 따라 자동 삽입). 블록 구조가 원문과 다르면 빌드가 경고합니다.
**현재 3개 언어 모두 AI 1차 번역 초안**이라 원어민 검수가 남아 있습니다 — 검수한 항목부터 `review` 값을 바꿔 주세요.

## 라이선스 · 문의

비공개 저장소입니다. 운영 주체: 주식회사 큐브베리(Cubeberry Co., Ltd.) · 문의 cubeberry@cuberry.kr
