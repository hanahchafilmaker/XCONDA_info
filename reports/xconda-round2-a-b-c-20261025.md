# A·B·C 실행 결과 — 허브 정비 + 언어별 주소 + www 패키지

작성 2026-10-25 · XCONDA허브(`XCONDA_info`) · PR #58

이전 보고서(`xconda-hub-geo-audit-20261025.md`)에서 남겨 둔 작업을 **A(코드) → B(다국어) → C(www)** 순서로 처리했습니다. 아래 수치는 모두 이 작업 환경에서 직접 빌드·검사한 결과입니다.

---

## 0. 한 줄 요약

| 그룹 | 한 일 | 눈에 보이는 결과 |
|---|---|---|
| **A** | 페이지 무게 분리 · OG 자체 호스팅 · 색인 정책 · 글↔글 링크 · `llms.txt` · 동기화 트리거 | 홈 **592KB → 68KB**, 글 **553KB → 30KB**, 95개 글 전부 관련 글 링크 보유, `llms.txt` 생성 |
| **B** | 언어별 주소 `/en/` + 검수 영어 Q&A + hreflang | `/en/` **17페이지**, 사이트맵 **101 → 118 URL**, ko↔en 상호 연결 |
| **C** | www 기능 페이지 20개 패키지 | 원고 20개 + 구현 코드 + 검증 스크립트 (**소스 저장소 접근 필요**) |

테스트: 단위 **102/102**, 스모크 **48/48**, `tsc` clean, 빌드 95글·118 URL.

---

## 1. A 그룹 — 코드

### A1. 동기화 트리거 (PR 충돌 재발 방지)
- `notion-sync.yml` 이 `main` 브랜치에서만 실행됩니다.
- 생성 산출물(`post/**`, `notice/**`, `qna/**`, `guide/**`, `sitemap.xml`, `robots.txt`, `llms.txt`, `index.html`, `404.html`, `notion-content.json`)만 바뀐 커밋으로는 다시 돌지 않습니다.
- 효과: #57 에서 5번 반복된 "봇 커밋 ↔ PR 충돌" 루프가 구조적으로 사라집니다.

### A2. 페이지 무게 분리
| 페이지 | 이전 | 이후 |
|---|---|---|
| 홈 `index.html` | 592 KB | **67.6 KB** |
| 글 페이지 | 553 KB | **29.9 KB** |
| Q&A 글 | 531 KB | **8.2 KB** |

- 글마다 복사되던 인라인 번들(JS 447KB + CSS 46KB)을 `assets/app.js` · `assets/app.css` 한 벌로 분리했습니다.
- 100개 페이지 + `404.html` 전부 새 자산을 가리키며, 인라인 번들은 남아 있지 않습니다.
- 저장소·전송 바이트 약 **49MB 감소**.

### A3. 공유 이미지(OG) 자체 호스팅
- `scripts/localize-og-images.mjs` 신규 — 노션 커버/OG 이미지를 `assets/img/og/posts/` 로 내려받고 `manifest.json` 을 갱신합니다.
- 우선순위: **로컬 사본 → `OG 이미지` 속성 → Cover(노션 프록시) → 기본 이미지**.
- 동기화(`notion-sync.yml`) 때 자동 실행되고, 네트워크 실패는 경고만 남기고 빌드를 막지 않습니다.
- 손으로 돌리려면 `npm run og:localize`.
- ⚠️ 이 작업 환경은 외부 네트워크가 막혀 있어 **실제 다운로드는 로컬 서버로 기능 검증만** 했습니다. 첫 동기화 실행 로그에서 `OG 이미지: 새로 받음 N` 을 확인해 주세요.

### A4. 색인 정책 결정
| 페이지 | 결정 | 근거 |
|---|---|---|
| `user-guide.html` (스튜디오 19개 툴 완전 가이드) | **공개·색인** — canonical + 사이트맵 + `/guide/` 목록에서 링크 | 실제 사용법 콘텐츠라 검색 유입 가치가 큼 |
| `admin-guide.html` (노션 운영 매뉴얼) | **noindex, nofollow** | 내부 운영 문서. 크롤링은 허용하고 색인만 막는 방식(noindex 가 실제로 읽히려면 robots.txt 에서 막으면 안 됨) |

### A5. 글 ↔ 글 내부 링크
- 노션의 `Category`(+6) · `Tool`(+4) · `Tags`(+4) 를 1순위 신호로, 제목 2-gram 겹침을 보조로 관련 글 최대 4건을 붙입니다.
- Q&A 는 같은 Q&A 보다 가이드·블로그로 먼저 연결합니다.
- 후보가 없으면 같은 섹션 최신 글로 채워 **막다른 문서를 만들지 않습니다**.
- 결과: **95/95 글 페이지가 관련 링크 1건 이상**, 자기 자신 링크 0건, 빌드 결과 내부 링크 깨짐 0건.

### A6. `llms.txt`
- 사이트 요약 + 섹션 + 대표 글 48개 링크(절대 주소, 요약 160자).
- 사이트맵과 같은 목록에서 만들어 두 파일이 어긋나지 않습니다.

---

## 2. B 그룹 — 언어별 주소

### 왜
전에는 한 주소에서 번역 위젯으로 언어만 바뀌어서, 영어 화면을 공유해도 주소가 한국어였습니다("URL 이 안 찢어짐"). 이제 언어마다 주소가 있습니다.

```
한국어(기준)  https://hub.xconda.ai/qna/contact-inquiry/
영어          https://hub.xconda.ai/en/qna/contact-inquiry/
```

### 무엇을 만들었나
| 항목 | 내용 |
|---|---|
| 번역 원본 | `content/i18n/en.json` — **사람이 검수한** 영어 Q&A 15건(문의·결제·개인정보·저작권·툴 소개) + 사이트/섹션 문구 |
| 생성 규칙 | 번역이 **있는 글만** `/en/` 주소 생성. 원문이 사라지면 빌드가 경고하고 주소를 만들지 않음 |
| 페이지 수 | `/en/` **17개** (홈 + Q&A 목록 + Q&A 15) |
| 언어 신호 | ko ↔ en 상호 `hreflang` + `x-default`(=한국어), 자기 canonical, `og:locale` |
| 사이트맵 | **101 → 118 URL** |
| 앱 연동 | `assets/i18n-paths.json` + `localizedHrefFor` — 언어를 고를 때 번역 주소가 있으면 그리로 이동, 없으면 기존 Google 번역 위젯으로 폴백 |

### 주의해서 설계한 두 가지
1. **번역 페이지에는 앱 번들을 넣지 않습니다.** 넣으면 React 가 정적 번역문을 지우고 한국어 화면을 그려서 `/en/` 주소에 한국어가 뜹니다. 영어 페이지는 5KB 안팎의 정적 HTML 입니다.
2. **기계번역을 넣지 않았습니다.** 같은 내용이 두 주소에 있으면 검색에서 중복으로 처리됩니다. 블로그·가이드는 본문 번역이 없어 아직 영어 주소가 없고, 노션에 `Title EN`/본문 번역이 생기면 같은 구조로 확장됩니다.

---

## 3. C 그룹 — www.xconda.ai

### 현재 상태 (2026-10-25 직접 확인)
| 확인 | 결과 |
|---|---|
| `www.xconda.ai/sitemap.xml` | **10개 주소** — `/`, `/images`, `/video`, `/storyboards`, `/guides`, `/pricing`, `/support/qna`, `/legal/*` |
| `www.xconda.ai/ko` | 정상 한국어 랜딩(툴 16개 카드, 크레딧 5종) |
| `www.xconda.ai/ko/studio/turn` | **→ `/login?redirect=...`** |

**핵심**: 모든 툴 화면이 로그인 뒤에 있어서, "flexboard", "ai 스토리보드" 같은 검색어를 받을 **공개 제품 페이지가 0개**입니다.

### 만든 패키지 (`www/`)
| 파일 | 내용 |
|---|---|
| `feature-pages.json` | **20개 기능 페이지 원고** — 툴 18종 + 모델 2종, 한국어 본문(title·description·h1·intro·features·faq3) + 영문 메타 + 연결할 허브 글 |
| `snippets/features-page.tsx` | Next.js App Router 페이지 구현(metadata·JSON-LD·허브 내부 링크) |
| `snippets/seo.tsx` | canonical·hreflang(ko/en/x-default), `SoftwareApplication`·`FAQPage`·`BreadcrumbList`, 크레딧 5종 `Offer` |
| `snippets/redirects.ts` | 공개 주소는 **301**, 로그인 게이트는 **307 유지** 원칙과 매핑 |
| `snippets/sitemap.ts` | 기존 10개 + 기능 40개(20×2언어) + 언어 대체 링크 |
| `snippets/og-feature-image.tsx` | 1200×630 공유 카드(한글 폰트 등록 필요) |
| `snippets/llms.txt` | www 용 llms.txt |
| `README.md` | 실측 상태 · 적용 절차 · 확인 체크리스트 |
| `scripts/www/validate-feature-pages.mjs` | `npm run www:check` — 20개·slug 중복·길이·허브 링크 유효성 (**PASS**) |

**왜 코드를 바로 반영하지 못했나**: www.xconda.ai 소스 저장소가 이 작업 환경에 연결되어 있지 않습니다(공개 저장소 `Landing_Cuberry` 는 www.cuberry.kr, `cubeberry_xconda` 는 메일러). 저장소를 연결해 주시면 같은 방식으로 직접 적용·배포 확인까지 진행하겠습니다.

---

## 4. 남은 일

### 적용/확인 필요
- [ ] www 저장소 연결 → 기능 페이지 20개 실제 적용(C 그룹 마무리)
- [ ] 첫 동기화 실행 후 `assets/img/og/posts/` 채워지는지 확인
- [ ] Cloudflare `Workers Builds: xconda-info-news` — main 이 아닌 브랜치에서 실패(환경 문제, 이번 변경과 무관)

### 콘텐츠(코드 아님)
- 영어 본문 번역 확대: Q&A 15건 외 블로그·가이드(노션 EN 필드 또는 `content/i18n/en.json` 확장)
- 기능 페이지 영문 본문(현재 영문은 제목·설명만)
- 기능 페이지 제품 스크린샷·GIF

### 관측
- Search Console·네이버 서치어드바이저에 `/features/*` 색인 요청
- Perplexity·ChatGPT 에서 "xconda flexboard", "ai 스토리보드 추천" 류 질의 추적
- 노션 데이터 정리 1건: Q&A 제목 `사운드와 편집은 어떻게 하나요?답변` (제목에 "답변"이 붙어 있음)
