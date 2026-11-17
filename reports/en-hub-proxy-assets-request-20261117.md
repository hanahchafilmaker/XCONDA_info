# 제품 사이트 프록시 요청 2건 — 2026-11-17

- 대상: `www.xconda.ai` 프록시 담당 개발자
- 근거: 영어 허브가 `www.xconda.ai/hub/` 로 이전 완료(2026-11-17). 이후 실측에서 나온 문제 2건
- 이전 배경·조건: `reports/en-hub-subdirectory-handoff-20261114.md`

---

## 1. `/hub/assets/*` 가 HTML 을 돌려줍니다 (로고 깨짐의 원인)

### 증상

영어 허브 화면에서 **로고·도구 이미지가 깨집니다**. CSS 는 정상입니다(인라인).

### 원인 (실측)

| 요청 | 기대 | 실제 응답 |
| --- | --- | --- |
| `/hub/assets/img/logo/xconda-wordmark-official.png` | `image/png` | **HTML (앱 셸)** |
| `/hub/assets/img/tools/tool-flexboard.jpg` | `image/jpeg` | **HTML (앱 셸)** |
| `/hub/assets/app.css` | `text/css` | **HTML (앱 셸)** |
| `/hub/assets/img/og/xconda-hub-1200x630.png` | `image/png` | **HTML (앱 셸)** |

프록시 규칙이 `/hub/*` → `hub.xconda.ai/en/*` 인데, **`en/` 폴더는 정적 영어 문서 폴더라
`assets/` 가 없습니다.** 그래서 원본이 404 를 내고, 그 404 가 사이트의 catch-all 로 떨어져
**200 + 앱 셸 HTML** 이 이미지 자리에 들어갑니다.

`<img>` 가 HTML 을 받으면 브라우저는 그림이 아니라 깨진 아이콘을 그립니다.

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
- 합계 12개 파일·728KB

**복사하지 않은 것**: `assets/img/og/`(약 20MB), `assets/img/covers/`(약 15MB).
OG 공유 카드와 본문 커버는 위 프록시 수정이 있어야 정상 표시됩니다. 35MB 를 저장소에
중복 배포하는 건 피했습니다.

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

프록시 수정 후 아래가 **이미지 응답**이어야 합니다.

```
curl -I https://www.xconda.ai/hub/assets/img/logo/xconda-wordmark-official.png
# 기대: 200, content-type: image/png

curl -I https://www.xconda.ai/hub/assets/app.css
# 기대: 200, content-type: text/css
```

허브 저장소에서: `npm run proxy:check`
