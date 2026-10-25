# XCONDA GEO 기술진단 검증 보고서

**대상** ① 첨부 문서 `xconda_GEO기술진단_www_20261012.docx`(www.xconda.ai, 2026-10-12 진단) ② `hub.xconda.ai`(허브, 이번 신규 진단)
**검증일** 2026-10-25 · **검증 방법** ① 허브 = 저장소 `hanahchafilmaker/XCONDA_info` 빌드 산출물 직접 판독(코드·생성 HTML·사이트맵 원본) ② 두 도메인 = 실제 응답 확인
**결론 한 줄** www 진단서는 **방향과 핵심 지적은 타당하지만 범위가 www에 갇혀 있고**, 허브는 **"글 페이지는 잘 만들어졌고 홈·언어·연결이 비어 있는" 상태**입니다.

---

## 0. 이번에 적용한 수정 (2026-10-25 · 허브 저장소 반영 완료)

진단에서 나온 항목 가운데 **허브 저장소에서 직접 고칠 수 있는 것**은 코드로 반영하고 테스트로 고정했습니다.

| # | 항목 | 손댄 곳 | 적용 내용 | 검증 |
|---|---|---|---|---|
| 1 | 사이트맵 네임스페이스 | `src/content/seo.js` | `www.sitemap.org` → **`www.sitemaps.org`**(복수형) | `seo.test.mjs` 가 표준 문자열을 고정 |
| 2 | 조직·제품 명찰 | `seo.js` | Organization 에 **`brand: XCONDA`**, 로고를 **512×512 PNG**로 교체(신규 생성), **SoftwareApplication**(제품) 명찰 추가 | 홈 JSON-LD 검사 |
| 3 | 목록 명찰 | `seo.js` | 홈·섹션 목록에 **`CollectionPage` + `ItemList`** (홈 95개, `/qna/` 73개 …) | 홈·목록 JSON-LD |
| 4 | 수정일 신호 | `seo.js` · `build-seo.mjs` · `notion-snapshot.mjs` | `dateModified` · `article:modified_time` · 사이트맵 `lastmod`. 동기화가 노션 `last_edited_time` 을 `__modified` 로 기록 | 작성일과 다를 때만 출력하는 회귀 테스트 |
| 5 | 가이드 HowTo | `build-seo.mjs` | 본문 소제목에서 단계 추출(번호 붙은 소제목 우선) → `Article` + `HowTo` 병행 | 7단계 가이드로 검증 |
| 6 | **홈 정적 목록** | `build-seo.mjs` | `<div id="root">` 가 **29KB 목록**(95개 문서·링크 106개)으로 채워짐. JS 미실행 크롤러도 전체 글 확인 | 생성물 직접 판독 |
| 7 | **섹션 목록 4개 신규** | `build-seo.mjs` · `seo.js` · `App.tsx` | `/post/` `/notice/` `/qna/` `/guide/` 정적 목록 + 사이트맵 등록 + 앱 진입 시 해당 섹션으로 스크롤 | 사이트맵 96 → **100 URL** |
| 8 | **hreflang** | `build-seo.mjs` · `src/seo.ts` | 전 페이지 `ko` + `x-default` 자기 참조(런타임 메타 갱신에도 동일 규칙) | 105개 페이지 전수 확인 |
| 9 | **크롤러 언어 고정** | `src/i18n/index.tsx` | 봇 UA(GPTBot·OAI-SearchBot·PerplexityBot·ClaudeBot 등)에는 **항상 한국어 원문**, 번역 위젯 미로드. `?lang=` 지원 | 스모크 4종 + `?lang=en` 통과 |
| 10 | 문서화 | `HANDOFF.md` | §7.1 "SEO·GEO 출력물" 표로 생성 규칙·주의사항 명문화 | — |

**테스트** 단위 89개 + 스모크 48개 통과. 빌드 산출물(95개 글 + 홈 + 목록 4개 + 404) 재생성 완료.

**아직 남은 것**(허브 저장소 밖이거나 별도 결정 필요)
- 언어별 URL(`/en/` …)과 검수된 영문 — 기계번역을 대체하려면 콘텐츠 설계가 먼저 필요합니다.
- www 쪽 항목: 기능 공개 페이지 20개, `/ko` 메타·canonical, 302→301 정리, `Offer`(가격) 명찰.
- OG 이미지의 노션 프록시 의존, 페이지당 약 540KB 번들(글 페이지 무게 분리).

---

## 1. 요약 — 먼저 알아야 할 3가지

1. **첨부 문서는 허브를 진단하지 않았습니다.** 측정 대상이 `www.xconda.ai`로 한정되어 있고, 허브는 "허브로 가는 링크가 없다" 한 줄뿐입니다. 그런데 지금 XCONDA의 콘텐츠 자산(글 16 + 공지 5 + Q&A 73 + 가이드 1 = **95개 문서**)은 전부 허브에 있습니다. **GEO 관점에서 자산의 90%가 진단 범위 밖**이었습니다.
2. **허브에 대한 이전 진단("정적 HTML에 본문 있음 / JSON-LD 0건")은 절반만 맞습니다.** 개별 글 페이지는 본문·메타·구조화 데이터가 모두 첫 HTML에 들어 있습니다(우수). 그러나 **홈(`/`)은 본문이 269자(공백)뿐인 빈 React 셸**이고, **hreflang은 전 페이지 0건**입니다. JSON-LD는 현재 빌드에 존재합니다(0건 아님).
3. **가장 위험한 항목은 여전히 언어입니다.** 허브·www 모두 **같은 URL에서 접속자 언어에 따라 다른 언어가 렌더링**되고(허브는 Google 번역 위젯), `html lang`은 런타임에 바뀝니다. hreflang이 없어서 검색엔진·AI는 "이 주소의 언어가 무엇인지" 확정하지 못합니다. 첨부 문서가 1순위로 꼽은 판단은 옳습니다.

---

## 2. 첨부 문서(www 진단) 검증 결과

### 2-1. 내가 실제로 확인한 것

| 문서 주장 | 검증 결과 | 근거 |
|---|---|---|
| `/ko` 의 title·description이 영어 그대로 | **사실** | `/ko` 응답 title = “AI Storyboard for Ad Campaigns &#124; Xconda” (본문 h1만 한국어) |
| 사이트맵 10개 주소, lastmod 없음 | **사실** | www `/sitemap.xml` = 10개 URL, `<lastmod>` 0건 |
| `/support/qna` 가 로그인으로 리다이렉트 | **사실** | `/support/qna` → `/login?redirect=/support/qna` (title “Log In &#124; Xconda”) |
| 렌더링 후 본문 정상(서버 렌더링) | **사실** | `/`, `/ko` 모두 본문 텍스트 응답에 포함 |
| 기능 페이지 약 20개가 로그인 뒤 | **간접 확인** | `/studio/*` 링크가 대표 링크로 노출되나 본문 설명 페이지는 `/guides` 1건뿐 |
| `html lang` 없음 / hreflang 없음 / JSON-LD 0건 | **미확인** | 내 도구는 HTML 원문이 아닌 렌더링 텍스트를 받아 `<head>`를 판독할 수 없음 → 아래 6절 참조 |

### 2-2. 문서에서 빠졌거나 보완이 필요한 부분

- **허브 미진단** (가장 큰 누락). 허브에는 **이미 BlogPosting·FAQPage·Article JSON-LD가 붙어 있습니다.** 즉 문서의 "구조화 데이터 0건"은 www 한정 사실이고, 대표님 관점의 "XCONDA 전체"로 읽으면 틀린 결론이 됩니다.
- **사이트맵 언어 URL 0건**을 www에서 지적했지만, 허브도 동일합니다(아래 3-4). 두 사이트 공통 과제로 묶어야 합니다.
- **"KBS Production Verified" 근거 부재**는 사실이며, 허브에도 동일하게 `inLanguage`만 있고 검증 근거 링크가 없습니다. E-E-A-T 보강 항목으로 통합 권장.
- 문서 3.6의 "브랜드 표기가 Xconda/XCONDA/엑스콘다/aiconda.ai로 나뉜다"는 지적은 타당하며, 허브까지 포함하면 **JSON-LD상 회사명이 `Cubeberry Co., Ltd.`로만 선언되고 `XCONDA` 브랜드 노드가 없습니다**(3-6 참조).

### 2-3. 문서의 우선순위 평가 — 대체로 타당, 2군데 수정

| 문서 순위 | 항목 | 판정 |
|---|---|---|
| 1 | 다국어 신호(lang·hreflang·canonical·한국어 메타) | **유지(최우선)** — 두 도메인 공통 최대 리스크 |
| 2 | 구조화 데이터 | **유지하되 "허브는 이미 있음, www·연결이 문제"로 재정의** |
| 3 | 기능 공개 페이지 20개 | **유지** — AI 인용 재료가 여기에만 있음 |
| 5 | OG·트위터 카드 | **순위 하향 가능** — 공유 미리보기 효과 위주, GEO 효과는 작음 |
| 7 | llms.txt | **최하위로** — 주요 AI 검색이 공식 순위 신호로 쓴다는 근거 약함 |
| — | **허브 홈 CSR 셸 · 섹션 인덱스 부재** | **신규 상위권(4~5위)** — 아래 3-3 |

---

## 3. 허브(hub.xconda.ai) 정밀 진단

### 3-1. 인벤토리 (실측)

| 항목 | 값 |
|---|---|
| 사이트맵 URL | **96개** (홈 1 + 글 16 + 공지 5 + Q&A 73 + 가이드 1) |
| lastmod | **94개** (2026-03-03 ~ 2026-10-24) — 홈과 `post/flexboard-storyboard-7-steps` 2건 누락 |
| robots.txt | `User-agent: *` / `Allow: /` + 사이트맵 주소 → **정상** |
| 개별 글 페이지 | 제목·요약·본문이 **첫 HTML에 포함**(SSR형 정적 생성) — 예: 글 1편 본문 13,172자 |
| 구조화 데이터 | Organization + WebSite(공통) / BlogPosting / Article / FAQPage |
| OG·트위터 카드 | 있음(`og:locale` = `ko_KR` 고정) |
| hreflang | **0건** |
| llms.txt | **없음**(앱 셸 응답) |

**이전 진단(74개 URL) 대비 22개 증가** — 3일 사이 콘텐츠가 늘었습니다. 즉 "허브는 콘텐츠가 쌓이는 중"이고, 기술 부채가 콘텐츠 증가 속도를 따라가지 못하는 구조입니다.

### 3-2. 잘 된 것 (먼저 인정할 부분)

- **글 단위 정적 페이지 생성기가 이미 있습니다.** `scripts/build-seo.mjs` + `src/content/seo.js`가 노션 스냅샷 → `/post/{slug}/index.html`을 만들고, head·canonical·OG·JSON-LD를 페이지별로 넣습니다. **이 구조는 GEO 관점에서 상당히 앞선 편입니다.**
- **Q&A 73건이 각각 독립 URL + FAQPage 명찰**을 갖습니다. AI가 "엑스콘다는 뭐야"에 답할 때 인용하기 가장 좋은 형태입니다(실제로 본문이 "출처:"까지 포함해 발췌 친화적).
- **Organization `@id` = `https://www.xconda.ai/#org`** 로 두 사이트를 한 회사로 묶으려는 설계가 이미 들어가 있습니다(의도는 정확).
- `404.html`에 `noindex` + canonical 처리, 사이트맵은 발행 조건 통과 글만 — 관리 규율이 있습니다.

### 3-3. 최우선 결함 ①: 홈이 빈 셸 (AI가 목록을 못 봄) — **적용 완료**

```
index.html  <div id="root"> …내용 269자(공백)… </div>   ← 홈
post/*/index.html  <div id="root"> …13,172자… </div>   ← 글(정상)
```

- 홈의 공지·뉴스·가이드·블로그·Q&A 목록은 **JavaScript가 실행된 뒤에만** 존재합니다.
- **JS를 실행하지 않는 크롤러**에게 `hub.xconda.ai/`는 사실상 빈 페이지입니다. AI 검색이 사이트를 처음 만나는 지점이 홈이라는 점을 감안하면 손실이 큽니다.
- 부작용: 블로그·Q&A **섹션 인덱스 페이지가 없습니다**(`/post/`, `/qna/`, `/guide/` 전부 없음). 95개 문서는 **사이트맵으로만 발견**되고, 내부 링크는 "글 → 홈" 단방향뿐입니다(글 1편 본문 내 링크 = 3개: 홈·홈·www).

**권고** 홈과 `/qna/`·`/post/`·`/guide/` 목록을 **정적 HTML로 prerender**(현재 생성기를 그대로 재사용). 각 목록에 `CollectionPage` + `ItemList` 명찰. → 73개 Q&A가 크롤 1~2단계로 들어오고, AI가 "XCONDA Q&A 전체"를 하나의 개체로 인식합니다.

### 3-4. 최우선 결함 ②: 같은 URL에서 언어가 바뀜 (hreflang 0건) — **A안 적용 완료**

**실측**: 영문 브라우저(`Accept-Language: en`)로 `hub.xconda.ai/`를 요청하면 **동일 URL에서 영어 화면**이 렌더링됩니다(제목 `XCONDA Hub — Announcements · News …`). 한국어 요청 시 한국어(`XCONDA허브 — 공지사항 …`)입니다.

구조를 코드에서 확인했습니다.

| 요소 | 현재 동작 | 문제 |
|---|---|---|
| 언어 결정 | `localStorage` → 쿠키 → `navigator.languages`(`src/i18n/index.tsx`) | **접속자마다 같은 URL의 내용이 다름** |
| JA/ZH | Google 번역 위젯이 **기계번역** | 품질·일관성 통제 불가 |
| `html lang` | 정적 HTML은 `ko`, 런타임에 `en`/`ja`/`zh-CN`으로 **덮어씀** | 크롤러가 보는 값과 사용자가 보는 값이 다름 |
| hreflang | **전 페이지 0건** | 언어 버전 관계 선언 불가 |
| 사이트맵 | 언어별 URL **0건** | `/ko`·`/en`·`/ja`·`/zh` 부재 |
| JSON-LD | `inLanguage` = **항상 `ko-KR`** | 영어로 렌더된 화면과 명찰이 **모순** |

> 즉, AI·검색엔진 입장에서 허브는 **"한국어 사이트"** 로만 인식됩니다. 영어·일본어권 AI 답변에서 인용될 확률은 사실상 0입니다. 대표님이 회의에서 말씀하신 "URL이 안 찢어진다"는 상태가 그대로 GEO 손실로 이어지고 있습니다.

**권고(비용 순)**

- **A안(즉시, 개발 거의 없음)** 언어별 URL을 만들지 않되, ① 정적 HTML의 `html lang="ko"` 유지 ② **자동 언어 전환을 크롤러에 대해서는 끄기**(User-Agent 또는 `?lang=` 쿼리 기반으로만 전환) ③ 사이트맵·JSON-LD는 한국어 단일로 명시. → "일관된 한국어 사이트"로 확정.
- **B안(권장, 중간 비용)** `/en/`·`/ja/`·`/zh/` 정적 경로 + `hreflang` 상호 선언 + `x-default` → 영어 콘텐츠를 **기계번역이 아닌 검수된 문장**으로 고정. 노션이 원본이므로 "영문 제목·요약 필드"를 노션에 두고 빌드에서 뽑는 방식이 현 구조와 가장 잘 맞습니다.

### 3-5. 결함 ③: 사이트맵 XML 네임스페이스 오타 — **적용 완료**

`src/content/seo.js:269`

```
<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">     ← 현재 (오타)
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">    ← 정상
```

`sitemap**s**.org`가 정답입니다. Google은 관대하게 처리하는 편이지만, 서드파티 검증 도구·일부 AI 크롤러는 스키마 불일치로 사이트맵을 무시할 수 있습니다. **1줄 수정 + 사이트맵 재생성**으로 끝나는 항목이며, `scripts/seo.test.mjs`에도 이 값을 고정하는 단언이 없어 함께 보강을 권합니다.

### 3-6. 구조화 데이터 — "있지만 아직 반쪽" — **허브분 적용 완료**

| 항목 | 현재 | 권고 |
|---|---|---|
| Organization `name` | `Cubeberry Co., Ltd.` (+큐브베리) | **`brand: XCONDA` 추가**. 회사와 제품이 분리돼야 AI가 "XCONDA는 큐브베리의 제품"으로 연결 |
| Organization `logo` | `xconda-mark.svg` (32×32) | **PNG 112×112 이상**으로 교체. 구글 로고 규격상 SVG는 표시되지 않음 |
| `dateModified` | **전무**(`article:modified_time`도 없음) | 글 수정 시 갱신. GEO의 "최신성" 신호가 지금 비어 있음 |
| HowTo | 가이드도 `Article`로만 | `guide/` 는 **HowTo + step** 병행 (절차 인용률 상승) |
| SoftwareApplication / Offer | **없음**(허브) | 가격 페이지가 www에 있으므로 www 쪽에 두되, 허브에서는 `isRelatedTo`/`sameAs`로 연결 |
| FAQPage | Q&A 73건 각 1문항 | 유효하나, **주제별 묶음 FAQ**(예: 요금·환불 8문항) 1~2개 추가하면 인용 단위가 커짐 |
| 홈 | 명찰 없음(Organization/WebSite만) | 목록 prerender 후 `CollectionPage` + `ItemList` |
| `@id` 연결 | 허브가 `www.xconda.ai/#org`를 **참조만** 함 | **www에 같은 `@id` 선언이 없으면 끊긴 참조**가 됨 → www JSON-LD 확인 필수(6절) |

부가: `og:image`·`Article.image`가 **`www.notion.so/image/...` 프록시 URL**입니다. 노션 측 만료·정책 변경 시 카드·명찰 이미지가 한꺼번에 깨질 수 있어, 허브 정적 자산(현재 OG 이미지 1200×630 보유)으로 복사·대체를 권합니다.

### 3-7. 그 밖에 확인된 것

- **본문 소제목 계층 깨짐**: 글 1편 기준 `h1 1개 / h2 0개 / h3 14개`. 노션에서 H2 대신 H3를 쓴 결과로, AI가 문단을 **절 단위로 잘라 인용**할 때 구조 단서가 사라집니다. → 원고 작성 규칙(대주제=H2)을 운영 가이드에 명문화.
- **무목록 공개 페이지 2개**: `admin-guide.html`(콘텐츠 관리자 가이드)·`user-guide.html`이 **canonical·robots·사이트맵 없이 공개 URL**로 존재합니다. 내부 운영 문서라면 `noindex` 또는 접근 제한, 공개용이라면 정식 페이지로 편입해야 합니다.
- **페이지 무게**: 모든 글 HTML이 **약 540KB**(앱 번들이 페이지마다 인라인). 95개 페이지 × 540KB = 약 9.3MB. 크롤 예산·모바일 LCP에 불리합니다. → 글 페이지는 "본문만 정적 + 앱 번들은 공용 파일"로 분리 권장.
- **이미지 alt**: 가이드 페이지 13장이 **모두 같은 alt(글 제목)**. 중복 alt는 무효에 가깝습니다.
- **허브 → www 링크는 다수, www → 허브 링크는 확인되지 않음**(문서 주장과 일치). 상호 링크 1개(푸터)만 추가해도 두 사이트의 동일 주체 인식이 강화됩니다.

---

## 4. 우선순위 — 문서 순위를 이렇게 바꿀 것을 제안

| # | 작업 | 대상 | 난이도 | 효과 | 문서 대비 |
|---|---|---|---|---|---|
| 1 | 다국어 신호 확정 (A안 즉시 / B안 권장) | 양쪽 | 낮음~중간 | ★★★ | 문서 1번 유지 · **A안 적용 완료** |
| 2 | **허브 홈·섹션 인덱스 prerender + ItemList** | 허브 | 중간 | ★★★ | **신규** · **적용 완료** |
| 3 | 사이트맵 정비 (네임스페이스 오타, lastmod 2건, 언어 URL, www `/support/qna` 제외) | 양쪽 | 낮음 | ★★☆ | 문서 4번 확대 · **허브분 적용 완료** |
| 4 | 구조화 데이터 보강 (brand·logo·dateModified·HowTo·Offer·@id 정합) | 양쪽 | 중간 | ★★☆ | 문서 2번 재정의 · **허브분 적용 완료** |
| 5 | 기능 공개 페이지 20개 | www | 중간 | ★★★ | 문서 3번 유지 (www 담당) |
| 6 | 내부 링크(글↔글, 글↔Q&A) + www↔허브 상호 링크 | 허브 | 낮음 | ★★☆ | **신규** · 목록 페이지로 절반 해결, 글 간 링크는 남음 |
| 7 | OG·트위터 카드(이미지 자체 호스팅 포함) | www | 낮음 | ★☆☆ | 문서 5번 하향 |
| 8 | 페이지 무게 분리(번들 공용화) | 허브 | 중간 | ★☆☆ | **신규** |
| 9 | `admin-guide`·`user-guide` 공개 정책 결정 | 허브 | 낮음 | ★☆☆ | **신규** |
| 10 | llms.txt | 양쪽 | 낮음 | ☆☆☆ | 문서 7번 최하위 |

**일정 제안**
- **1주차**: 3번(사이트맵) + 1번 A안 + 4번 중 `brand`·`logo`·`dateModified` + 상호 링크 → 개발 공수 1~2일
- **2~4주차**: 2번(홈·목록 prerender) + 6번(내부 링크) + 노션 원고 규칙(H2) 정착
- **2~3개월**: 1번 B안(언어별 정적 경로 + hreflang) + 5번(기능 공개 페이지) + 7~8번

---

## 5. GEO 관점 총평

- **기술 기반은 이미 중상위권**입니다. 개별 글이 첫 HTML에 본문·명찰·OG를 갖춘 사이트는 많지 않습니다. 첨부 문서가 www를 "양호"로 본 판단과 일치합니다.
- **점수를 깎는 것은 세 가지입니다.** ① 홈이 비어 있다 ② 언어가 URL로 분리되지 않는다 ③ 문서끼리 연결되지 않는다. 셋 다 **콘텐츠를 더 쌓기 전에** 고쳐야 하는 종류입니다. 지금 속도로 글을 더 올리면, 고칠 때 재작업 범위만 커집니다.
- **가장 값싼 승부처는 Q&A 73건**입니다. 이미 질문형 제목 + 직접 답변 + 출처 형식을 갖췄습니다. 목록 페이지만 정적으로 열어 주면 AI가 "질문 묶음"으로 통째로 읽습니다.
- **가장 비싼 승부처는 다국어**입니다. 기계번역을 그대로 두면 영어권 인용은 계속 0에 가깝고, URL을 나누고 문장을 검수하면 그 자체가 경쟁 우위가 됩니다. 여기만 예산을 몰아도 됩니다.

---

## 6. 내가 확인하지 못한 것 (정직하게)

| 항목 | 이유 | 확인 방법 제안 |
|---|---|---|
| www의 `html lang`·hreflang·**JSON-LD 유무** | 내 도구는 렌더링된 텍스트를 받아 `<head>` 원문을 판독할 수 없음 | 브라우저 "페이지 소스 보기" → `ld+json` 검색 / Rich Results Test |
| AI 크롤러 8종 UA 접근 결과, 리다이렉트 302 체인 | 도구 제약 | 문서(10-12) 측정값을 그대로 신뢰할 만함 |
| 허브 배포본의 JSON-LD 실물 | 동일 제약(저장소 빌드 산출물과 배포 제목이 일치해 **배포 = 저장소 빌드**로 추정) | 소스 보기 1회로 확정 |
| GEOcare 점수(50.4, SoM 30.5)의 산정 근거 | 외부 서비스 내부 지표 | 서비스 리포트 원문 확인 |

---

## 7. 바로 적용 가능한 수정 예시 (개발 전달용)

**(1) 사이트맵 네임스페이스** — `src/content/seo.js:269`

```diff
- <urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">
+ <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
```

**(2) Organization에 브랜드 추가** — `src/content/seo.js` `siteJsonLd()`

```json
{
  "@type": "Organization",
  "@id": "https://www.xconda.ai/#org",
  "name": "Cubeberry Co., Ltd.",
  "alternateName": ["큐브베리", "주식회사 큐브베리"],
  "brand": { "@type": "Brand", "name": "XCONDA", "alternateName": ["엑스콘다"] },
  "logo": "https://hub.xconda.ai/assets/img/logo/xconda-logo-512.png",
  "url": "https://www.xconda.ai"
}
```

**(3) 글 명찰에 수정일 추가** — `articleJsonLd()`

```json
{ "@type": "BlogPosting", "datePublished": "2026-10-21", "dateModified": "2026-10-24" }
```
+ `<meta property="article:modified_time" content="2026-10-24" />` (노션 `last_edited_time`을 스냅샷에서 그대로 사용)

**(4) 가이드에 HowTo 병행** — `guide/flexboard-storyboard-guide/`

```json
{
  "@type": "HowTo",
  "name": "FLEXBOARD로 컷별 스토리보드 만드는 7단계",
  "totalTime": "PT15M",
  "step": [{ "@type": "HowToStep", "position": 1, "name": "프로젝트 만들기", "text": "..." }]
}
```

**(5) 언어 정책 A안(즉시)** — `src/i18n/index.tsx`

```ts
// 크롤러(UA에 bot/crawler 포함) 또는 ?lang= 명시가 없으면 자동 전환하지 않음
const isCrawler = /bot|crawler|spider|gptbot|claudebot|perplexity/i.test(navigator.userAgent);
if (!isCrawler && !new URLSearchParams(location.search).has("lang")) return browserTarget();
return "ko";
```
※ 자동 전환을 유지해야 한다면, 최소한 **정적 HTML의 `html lang="ko"`와 JSON-LD `inLanguage: ko-KR`는 그대로 두고**, `hreflang="ko"` + `x-default`를 홈·글 전체에 선언해 "이 URL의 기준 언어는 한국어"임을 명시하십시오.

---

### 부록 · 이번 검증에 사용한 근거

- 저장소 `XCONDA_info` @ `00f6ca7` (2026-10-25 동기화 커밋)
- 생성 산출물: `sitemap.xml`(96 URL), `index.html`, `post/*/index.html`, `qna/*/index.html`, `guide/*/index.html`, `404.html`
- 규칙 원본: `src/content/seo.js`(구조화 데이터·사이트맵), `scripts/build-seo.mjs`(head 생성), `src/i18n/index.tsx`(언어 결정)
- 실서비스 응답: `https://www.xconda.ai/`, `/ko`, `/sitemap.xml`, `/support/qna`, `https://hub.xconda.ai/`, `/llms.txt` (2026-10-25)
