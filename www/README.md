# www.xconda.ai SEO/GEO 적용 패키지 (C 그룹)

작성 2026-10-25 · XCONDA_info 저장소 `www/` 폴더 · 검사 `npm run www:check`

이 폴더는 **www.xconda.ai 소스 저장소에 그대로 옮겨 적용할 수 있게** 만든 패키지입니다.
허브(hub.xconda.ai)는 이미 정비했고, www 쪽은 소스 저장소가 이 작업 환경에 연결되어 있지 않아
**원고·코드·검증 스크립트까지 만들어 두고 적용 지점을 명시**했습니다.

---

## 0. 지금 www 의 상태 (2026-10-25 직접 확인)

| 확인한 것 | 결과 | 의미 |
|---|---|---|
| `https://www.xconda.ai/sitemap.xml` | 10개 주소 (`/`, `/images`, `/video`, `/storyboards`, `/guides`, `/pricing`, `/support/qna`, `/legal/terms`, `/legal/privacy`, `/legal/refund`) | 툴 페이지가 하나도 없음 |
| `https://www.xconda.ai/ko` | 정상 한국어 랜딩 (KBS 제작 인증, 16개 툴 카드, 크레딧 5종) | 언어별 주소는 이미 있음 |
| `https://www.xconda.ai/ko/studio/turn` | `→ /login?redirect=/ko/studio/turn` | **모든 툴 화면이 로그인 뒤** → 검색·AI 에 노출되는 툴 페이지 0개 |
| 사이트맵에 `/ko` 없음 | 한국어 페이지가 사이트맵·canonical·hreflang 에서 빠짐 | 한국어 검색 노출 손실 |

핵심 한 줄: **"flexboard", "ai 스토리보드", "ai 영상 생성" 같은 검색어를 받을 공개 페이지가 없다.**
허브 블로그가 그 자리를 일부 메우고 있지만, 제품 페이지가 없으면 구매 의도 검색은 www 로 오지 않습니다.

---

## 1. 할 일 4가지 (적용 순서)

### C1. 기능 페이지 20개 공개 (`www/feature-pages.json`)

- `www/feature-pages.json` — 20개 페이지 원고(한국어 본문 + 영문 메타)와 연결 정보
  - 툴 18종: flexboard, blocking-board, turn, directors-cut, image, video, upscale, face-swap,
    cloth-swap, scene-snap, youtube-ref, spin-angle, cine-grade, background-blend, auto-angle,
    expression, drct-seq, arw-view
  - 모델 2종: seedance-2-5, nano-banana-pro
- 주소: `www.xconda.ai/features/<slug>` · `www.xconda.ai/ko/features/<slug>`
- 각 항목: `title` · `description`(155자 이내) · `h1` · `intro` · `features[4]` · `faq[3]` · `hub`(허브 글 슬러그)
- 구현 예시: `www/snippets/features-page.tsx` (Next.js App Router)
- **스튜디오(`/studio/*`)는 그대로 로그인 뒤에 두고, 이 페이지만 공개**합니다.
  공개 페이지의 CTA 가 `/studio/<tool>` 로 보내고, 그쪽은 지금처럼 로그인으로 리다이렉트(307)됩니다.

### C2. `/ko` 메타 · canonical · hreflang

- `www/snippets/seo.tsx` 의 `alternateLanguages(path)` 를 각 페이지 `metadata.alternates` 에 연결
- 규칙: 영어는 접두사 없음(`/features/flexboard`), 한국어는 `/ko` — `x-default` 는 영어
- 지금은 한국어·영어가 서로를 가리키지 않아, 검색엔진이 "같은 문서의 두 언어"로 묶지 못합니다.

### C3. 리다이렉트 302 → 301 (`www/snippets/redirects.ts`)

- **공개 콘텐츠 주소**는 `permanent: true`(301)로 신호를 넘깁니다.
- **로그인 게이트는 301 로 바꾸지 않습니다.** 301 은 "영구 이동"이라 스튜디오 주소가 로그인 주소로
  색인되고, 로그인 후 돌아올 경로가 사라집니다. 게이트는 307 유지.
- 옛 주소(`/storyboards`, `/images`, `/video`, `/guides`)는 지우지 말고 새 기능 페이지로 301.

### C4. 구조화 데이터 · OG 카드 · 사이트맵 · llms.txt

- `Offer` 마크업: `www/snippets/seo.tsx` 의 `creditPackOffersJsonLd()` — 크레딧 패키지 5종 금액을 그대로 노출.
  **가격은 www 에만** 넣습니다(허브는 정보성 콘텐츠라 가격을 넣지 않는 원칙 유지).
- 기능 페이지 = `SoftwareApplication` + `FAQPage` + `BreadcrumbList`
- OG 카드 1200×630: `www/snippets/og-feature-image.tsx` (한글 폰트 파일 등록 필요)
- 사이트맵: `www/snippets/sitemap.ts` — 기존 10개 + 기능 40개(20×2언어) + 언어 대체 링크
- `llms.txt`: `www/snippets/llms.txt` 를 사이트 루트에 배포

---

## 2. 옮기는 방법

```bash
# www 저장소에서
mkdir -p content lib
cp <XCONDA_info>/www/feature-pages.json  content/feature-pages.json
cp <XCONDA_info>/www/snippets/seo.tsx    lib/seo.tsx
cp <XCONDA_info>/www/snippets/redirects.ts lib/redirects.ts
cp <XCONDA_info>/www/snippets/sitemap.ts app/sitemap.ts
mkdir -p "app/[lang]/features/[slug]"
cp <XCONDA_info>/www/snippets/features-page.tsx "app/[lang]/features/[slug]/page.tsx"
cp <XCONDA_info>/www/snippets/og-feature-image.tsx "app/[lang]/features/[slug]/opengraph-image.tsx"
cp <XCONDA_info>/www/snippets/llms.txt  public/llms.txt
```

1. `next.config.ts` 의 `redirects()` 에 `publicRedirects` 연결
2. 기능 목록 페이지(`/features`, `/ko/features`)도 한 장 만든다 — 사이트맵·내부 링크의 허브 역할
3. 기존 페이지 metadata 에 `alternates.languages` 추가
4. 배포 후 **Google Search Console → URL 검사**로 3개 주소 확인:
   `/features/flexboard`, `/ko/features/flexboard`, `/pricing`

---

## 3. 적용 후 확인 체크리스트

- [ ] `/features/flexboard` 200 · canonical = 자기 주소 · `hreflang` en/ko/x-default 3줄
- [ ] `/ko/features/flexboard` canonical = `/ko/features/flexboard` (영어로 가지 않음)
- [ ] `/features/flexboard` HTML 에 `SoftwareApplication` · `FAQPage` · `BreadcrumbList` JSON-LD
- [ ] `/pricing` 에 `Product` + `Offer` 5건 (금액·통화가 화면 표기와 일치)
- [ ] `/storyboards` → 301 → `/features/flexboard` (302 아님)
- [ ] `/ko/studio/turn` → 로그인 (307 유지, 301 아님)
- [ ] `/sitemap.xml` 에 기능 40개 + ko 주소 + `xhtml:link` 대체 링크
- [ ] OG 카드: 카카오톡·X·슬랙 미리보기에서 제목과 카드가 보임
- [ ] `llms.txt` 200 (`www.xconda.ai/llms.txt`)

---

## 4. 이 저장소에서 검증되는 것 / 안 되는 것

| 항목 | 상태 |
|---|---|
| 원고 20개 형식·길이·허브 링크 유효성 | ✅ `npm run www:check` (실행됨, PASS) |
| 허브 → www 내부 링크(관련 글·llms.txt) | ✅ 허브 쪽은 이미 반영 |
| www 실제 배포 결과(상태코드·JSON-LD·OG) | ⏳ www 저장소 접근 필요 — 적용 후 확인 |

---

## 5. 남은 것 (D·E 그룹, 코드 아님)

- Search Console·네이버 서치어드바이저에 기능 페이지 색인 요청, IndexNow 는 허브만 연결되어 있음
- 20개 페이지 **영문 본문** 번역(현재 영문은 제목·설명만) — `feature-pages.json` 의 `en` 에 `intro`·`features`·`faq` 를 채우면 코드 수정 없이 반영됩니다
- 기능 페이지용 제품 스크린샷·GIF(현재 OG 카드는 텍스트 카드)
- GEO 모니터링: Perplexity·ChatGPT 에서 "xconda flexboard" 류 질의 추적
