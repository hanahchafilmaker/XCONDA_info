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

## 문서

| 문서 | 대상 | 내용 |
|---|---|---|
| [`HANDOFF.md`](./HANDOFF.md) | 개발자 | 서비스 개요 · 아키텍처 · 모듈 맵 · 배포 · 테스트 전략 · 함정 · 런북 |
| [`NOTION_SETUP.md`](./NOTION_SETUP.md) | 콘텐츠 운영자 | 노션 연동 · 글 작성/게시 · 반영 속도 |
| [`admin-guide.html`](./admin-guide.html) | 운영자 | 콘텐츠 관리 실무 매뉴얼(색인 제외) |
| [`user-guide.html`](./user-guide.html) | 사용자 | 스튜디오 19개 툴 사용 가이드(공개·색인) |
| [`www/README.md`](./www/README.md) | 개발자 | www.xconda.ai 기능 페이지 원고·산출물·이관 절차 |
| [`reports/`](./reports) | 의사결정자 | SEO/GEO 감사 · 개선 리포트 · 번역 QC |

## 자동화

| 워크플로 | 트리거 | 하는 일 |
|---|---|---|
| **Notion 동기화** | 10분 스케줄 + 수동 | 노션 → `notion-content.json` · 글별 페이지 · 사이트맵(내용이 같으면 커밋 안 함) |
| **사이트 빌드 (index.html 갱신)** | main 의 `src/**`·`www/**`·`content/i18n/**` 변경 | `test:unit` → `test:smoke` → `www:check`·`www:build` → `npm run build` → 산출물 커밋 |
| **www 기능 페이지 산출물** | main 의 `www/**` 변경 | `www:check`·`www:build` 후 `www-dist` 아티팩트(30일) 업로드 |
| **pages build and deployment** | main 푸시 | GitHub Pages 배포 |

`npm run i18n:qc` 는 번역 초안의 연락처·숫자·통화·제목 중복을 점검합니다(`-- --write` 로 `reports/` 갱신).

## 언어별 주소

| 언어 | 주소 | 범위 |
|---|---|---|
| 한국어 | `/` | 전체 |
| English | `/en/` | Q&A 73건 + 목록/홈 |
| 日本語 | `/ja/` | Q&A 73건 + 목록/홈 |
| 中文 | `/zh/` | Q&A 73건 + 목록/홈 |

번역문은 `content/i18n/<언어>.json` 에 사람이 넣습니다(키 = `qna/<slug>` · `post/<slug>`). 파일만 추가하면 페이지 · 사이트맵 · hreflang · `llms.txt` 가 같은 빌드에서 함께 만들어집니다.
Q&A 는 `summary`(답변 전문)만 있고, 블로그·가이드·공지는 `blocks` 로 **본문**까지 번역합니다(`p`·`h2`·`h3`·`ul`·`ol`·`quote` 6종, 이미지는 원문 위치를 따라 자동 삽입).
**현재 3개 언어 모두 AI 1차 번역 초안**이라 원어민 검수가 남아 있습니다 — 검수한 항목부터 `review` 값을 바꿔 주세요.

## 라이선스 · 문의

비공개 저장소입니다. 운영 주체: 주식회사 큐브베리(Cubeberry Co., Ltd.) · 문의 cubeberry@cuberry.kr
