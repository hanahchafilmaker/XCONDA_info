# 제품 사이트 프록시 요청 2건 — 2026-11-17

- 대상: `www.xconda.ai` 프록시 담당 개발자
- 근거: 영어 허브가 `www.xconda.ai/hub/` 로 이전 완료(2026-11-17). 이후 실측에서 나온 문제 2건
- 급함: **1번은 이미지가 계속 깨진 채 노출됩니다.** 2번은 링크 동선 문제입니다.
- 이전 배경·조건: `reports/en-hub-subdirectory-handoff-20261114.md`
- 갱신: 2026-11-17 — 영어 홈을 앱 화면으로 되돌린 PR #146 반영(자산 요청 범위가 좁아짐)

---

## 1. `/hub/assets/*` 가 HTML 을 돌려줍니다 (썸네일·OG 카드 깨짐의 원인)

### 증상

영어 허브 화면에서 **도구 썸네일·블로그 커버·공유 카드(OG) 이미지가 깨집니다**.
글자가 있는 레이아웃·로고는 정상입니다.

### 원인 (실측)

| 요청 | 기대 | 실제 응답 |
| --- | --- | --- |
| `/hub/assets/img/logo/xconda-wordmark-official.png` | `image/png` | **HTML (앱 셸)** |
| `/hub/assets/img/tools/tool-flexboard.jpg` | `image/jpeg` | **HTML (앱 셸)** |
| `/hub/assets/img/og/xconda-hub-1200x630.png` | `image/png` | **HTML (앱 셸)** |

프록시 규칙이 `/hub/*` → `hub.xconda.ai/en/*` 인데, **`en/` 폴더는 정적 영어 문서 폴더라
`assets/` 가 원래 없습니다.** 그래서 원본이 404 를 내고, 그 404 가 사이트의 catch-all 로 떨어져
**200 + 앱 셸 HTML** 이 이미지 자리에 들어갑니다.

`<img>` 가 HTML 을 받으면 브라우저는 그림이 아니라 깨진 아이콘을 그립니다.

> **2026-11-17 갱신 — 하이브리드 적용(PR #146) 후 달라진 점**
>
> - 영어 홈(`/hub/`)이 **앱 화면**으로 바뀌었습니다. 그래서 위 증상이 "로고"에서
>   **"본문 썸네일·OG 카드"** 로 좁혀졌습니다. 로고는 아래 복사본으로 살아납니다.
> - **`/hub/assets/app.css` 는 이제 요청되지 않습니다.** 앱은 `app.js`·`app.css` 를
>   `https://hub.xconda.ai/assets/…` **절대 주소**로 불러옵니다(프록시를 거치지 않음).
> - 앱 안의 이미지 경로는 `hubBase()` 기준이라 `/hub/en/` 에서는 `/hub/en/assets/…` 로 갑니다.
>   아래 `en/assets/` 복사본이 이 요청을 받아 냅니다.

### 요청

`/hub/assets/*` 만 원본 루트에서 가져오게 해 주세요.

```
들어오는 주소                          → 가져올 곳
https://www.xconda.ai/hub/assets/…     → https://hub.xconda.ai/assets/…
```

다른 규칙은 그대로 두시면 됩니다:
`/hub/<그 밖의 경로>` → `https://hub.xconda.ai/en/<경로>`

### 허브 쪽에서 이미 해 둔 것 (2026-11-17)

프록시를 안 고쳐도 **화면에 바로 쓰이는 가벼운 자산은 살아나도록** 해 뒀습니다.
스위치가 켜진 언어 폴더(`en/`)에 아래를 복사합니다.

- `en/assets/img/logo/` — 워드마크·파비콘 (약 44KB)
- `en/assets/img/tools/` — 홈 첫 화면 도구 이미지 (약 684KB)
- `en/notion-content.json` — 콘텐츠 스냅샷 (약 1.9MB, 2026-11-17 추가)
- 합계 13개 파일 · 약 2.6MB

**복사하지 않은 것**: `assets/img/og/`(약 20MB), `assets/img/covers/`(약 15MB).
OG 공유 카드와 본문 커버는 위 프록시 수정이 있어야 정상 표시됩니다. 35MB 를 저장소에
중복 배포하는 건 피했습니다.

### 스냅샷도 함께 복사한 이유 (2026-11-17)

앱은 스냅샷을 **자기 주소 기준**으로 찾습니다(`src/notionSnapshot.ts`). 그래서 `/hub/` 에서는
`/hub/notion-content.json` 을 부르고, 프록시가 그걸 `hub.xconda.ai/en/notion-content.json` 으로
넘깁니다. 그 파일이 없으면 404 가 catch-all 로 떨어져 **200 + 앱 셸 HTML** 이 오고, JSON 파싱이
실패해 앱이 무료 공개 프록시(`notion-api.splitbee.io`)로 폴백합니다. 그 폴백은 `/table` 8초 +
`/page` 8초 = **최대 16초**를 기다린 뒤에야 "Notion 연결 오류 · 캐시 표시" 로 끝납니다.
영어 허브가 유독 느리던 직접적인 원인이었습니다.

같은 이유로 **앱 번들 참조도 절대 주소**로 바꿨습니다. `/hub/assets/app.js` 는 `en/` 에 사본이
없어 404 → HTML 이 오는데, 모듈 스크립트로 HTML 은 실행되지 않으므로 화면이 비어 버립니다.
이제 언어 페이지는 `https://hub.xconda.ai/assets/app.js` 를 직접 부릅니다.

정리하면:
- **프록시를 고치지 않아도** 로고·홈 도구 이미지·**콘텐츠 전체**가 정상입니다.
- **고쳐야** OG 공유 카드·본문 커버가 정상입니다.

---

## 2. 제품 사이트 헤더의 Hub 링크가 `hub.` 로 갑니다

### 증상

`xconda.ai` 상단 내비게이션에서 **HUB** 를 누르면 `hub.xconda.ai` 로 이동합니다.
영어 허브가 이미 `www.xconda.ai/hub/` 로 이전했으므로 **`/hub/` 로 보내야** 합니다.

### 요청

헤더의 Hub 링크를 사이트 안 경로로 바꿔 주세요.

```diff
- <a href="https://hub.xconda.ai/en/">HUB</a>
+ <a href="/hub/">HUB</a>
```

언어별로 나눠야 한다면:

| 방문자 언어 | 보낼 곳 |
| --- | --- |
| 영어 | `/hub/` |
| 한국어 | `https://hub.xconda.ai/` (한국어 허브는 그대로) |
| 일본어·중국어 | `https://hub.xconda.ai/ja/` · `/zh/` |

이 링크는 **제품 사이트 소스에 있습니다.** 허브 저장소의 `www` 빌드 스크립트는 기능 페이지
하단 링크만 만들고(`scripts/www/build-feature-pages.mjs`), 상단 헤더는 만들지 않습니다.

---

## 3. 같이 부탁드릴 것 (변경 없음, 재확인)

1. `robots.txt` 에 한 줄: `Sitemap: https://www.xconda.ai/hub/sitemap.xml`
2. Search Console `xconda.ai` 속성에서 `/hub/sitemap.xml` 재수집 (96개)
3. `/hub/*` 에 `x-robots-tag: noindex` 나 로그인 미들웨어가 걸리지 않게
4. 캐시 5~10분 (노션 동기화로 수시 재배포)

---

## 4. 확인 방법

프록시 수정 후 아래가 **이미지 응답**이어야 합니다. (핵심은 `content-type` 입니다 —
HTML 이 200 으로 와도 브라우저는 그림을 그리지 못합니다.)

```
curl -I https://www.xconda.ai/hub/assets/img/og/xconda-hub-1200x630.png
# 기대: 200, content-type: image/png   (지금은 text/html)

curl -I https://www.xconda.ai/hub/assets/img/logo/xconda-wordmark-official.png
# 기대: 200, content-type: image/png
```

허브 저장소에서 한 번에:

```
npm run proxy:check
```

이 스크립트는 주소 응답·제목 일치·끝 슬래시·**자산 content-type**·사이트맵·robots 를 함께 봅니다.
(2026-11-17 에 자산 점검을 추가했습니다.)
