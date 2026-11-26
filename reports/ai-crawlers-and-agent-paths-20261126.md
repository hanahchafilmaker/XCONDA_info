# AI 크롤러 정책 · 에이전트 경로 정리 — 2026-11-26

- 대상: `hub.xconda.ai`(이 저장소) · `www.xconda.ai`(이관 패키지 `www/`)
- 코드: `src/content/seo.js` › `AI_CRAWLERS` · `robotsTxt` / `scripts/www/build-feature-pages.mjs`(같은 `robotsTxt()` 사용)
- 검사: `npm run test:unit` (`scripts/seo.test.mjs` · `scripts/www/landing-copy.test.mjs`)

## 1. 결정 — AI 크롤러는 이름으로 명시하고, **검색용만 허용 · 학습용은 차단**한다

| 구분 | 크롤러 | robots.txt |
|---|---|---|
| AI 검색(인용용) | `OAI-SearchBot` · `ChatGPT-User` · `Claude-SearchBot` · `Claude-User` · `PerplexityBot` · `Perplexity-User` | `Allow: /` (단 `/reports/` 제외) |
| 모델 학습 | `GPTBot` · `ClaudeBot` · `Google-Extended` · `Applebot-Extended` · `CCBot` · `Amazonbot` · `meta-externalagent` | `Disallow: /` |

- **대표 결정(2026-11-26): 학습 이용 불허.** AI 검색에 인용되도록 읽는 크롤러는 열어 두고, 모델 학습용 크롤러는 이름으로 막습니다.
- `User-agent: *` 는 계속 허용입니다 — 학습 크롤러는 위에서 **이름으로** 이미 막혔고, 나머지 검색·브라우저 크롤러는 정상 동작해야 합니다.
- **검색용과 학습용을 겸하는 크롤러(`Googlebot` 등)는 막지 않습니다.** 막으면 구글 검색 노출까지 사라집니다. 학습 목적만 밝힌 이름만 대상으로 합니다.
- `/reports/` 색인 차단은 그대로 유지합니다(사고 대응 문서).
- 이름은 그룹마다 한 번만 나오게 합니다(중복 그룹은 크롤러마다 해석이 갈립니다).

### 정책을 되돌리거나 넓힐 때 (한 곳만 고치면 됩니다)

`src/content/seo.js` 의 `AI_CRAWLERS` 를 고치고 `npm run build`:

```js
// 학습용을 완전히 막고 싶지 않다면 목록에서 빼면 됩니다(그러면 `User-agent: *` 규칙을 따릅니다).
training: [],
// 막을 크롤러를 늘리려면 이름을 추가합니다.
training: ["GPTBot", "ClaudeBot", ..., "새크롤러이름"],
```

`www` 빌드는 같은 `robotsTxt()` 를 import 하므로 **두 사이트가 자동으로 같이 바뀝니다.** 바꾼 뒤 `npm run test:unit` 으로 두 사이트의 `robots.txt` 를 확인하세요(`seo.test.mjs` · `scripts/www/landing-copy.test.mjs`).

### ⚠️ 한계 — 이건 기술적 차단이 아닙니다

- robots.txt 는 **자발적 준수 신호**입니다. 이름을 바꾸거나 규칙을 무시하는 수집기에는 효력이 없습니다.
- 꼭 지켜야 하는 것(비공개 문서·유료 콘텐츠)은 **접근 제어 · 약관 · 요청 제한**으로 다루고, `reports/` 처럼 공개되면 안 되는 문서는 비공개 저장소로 옮기는 것이 원칙입니다.
- 검색 겸용 크롤러(`Googlebot` · `Bingbot`)는 계속 허용되므로, 그 경로로 수집된 내용은 학습에 쓰일 수 있습니다(구글 정책 범위). 이를 원하면 `Googlebot` 도 막아야 하지만 **검색 노출 손실**이 큽니다.

## 2. hub 404 — 없는 경로가 홈 화면으로 보이던 문제를 고쳤습니다

| 요청 | 이전 (2026-11-26 확인) | 지금 |
|---|---|---|
| `/.well-known/mcp.json` | 상태 404 + **홈 HTML**(앱이 실행됨) | 상태 404 + **정적 안내문**(앱 실행 안 함) |
| `/openapi.json` | 상태 404 + **홈 HTML** | 상태 404 + 정적 안내문 |
| `/agent.json` | 상태 404 + **홈 HTML** | 상태 404 + 정적 안내문 |

- 원인: `404.html` 이 홈과 같은 템플릿이라 `assets/app.js` 를 실행했고, 앱은 그 주소를 모르니 홈(공지·뉴스·Q&A 목록)을 그렸습니다.
- 수정: `scripts/build-seo.mjs` › `stripAppRefs()` — 404 문서에서만 앱 번들 참조를 지웁니다.
- 본문에 **"이 응답은 404 이고 본문은 HTML 이며, MCP·OpenAPI·agent.json 은 없다"** 를 한국어·영어로 적어, 에이전트가 JSON 으로 오해하지 않게 했습니다.
- 회귀 방지: `seo.test.mjs` › 「404.html 은 앱 번들을 실행하지 않는다」 — 다른 페이지(홈·글)는 계속 앱을 실행하는지도 함께 확인합니다.

> ⚠️ **남은 확인(개발·인프라)**: 응답 **헤더**의 `content-type` 은 호스팅 설정입니다. 404 응답이 `text/html` 인지, `/.well-known/*` 이 CDN·프록시에서 별도 규칙에 걸리지 않는지는 배포 후 `curl -I` 로 확인해야 합니다. 코드로 바꿀 수 있는 부분은 위 수정까지입니다.

## 3. www `llms.txt` — 짧은 안내문을 새로 만들었습니다

- 파일: `www/snippets/llms.txt` → 배포 시 `www.xconda.ai/llms.txt` (`npm run www:build` 가 `www/dist/llms.txt` 로 냅니다).
- 내용: XCONDA가 무엇인지(한 문단) · FLEXBOARD·Blocking Board·Turn 세 도구 설명 · 허브 가이드 링크 · 요금은 **숫자 없이** 요금 페이지로 연결 · 지원·정책 링크.
- 데이터 신뢰 규칙: 머리에 `Confirmed on 2026-11-26 (KST)` 를 적고, "여기 없는 값은 확인 불가로 다루라"고 밝힙니다.
- 아직 없는 것을 있다고 쓰지 않습니다 — "MCP·OpenAPI·agent.json 없음"을 명시합니다.
- 회귀 방지: `scripts/www/landing-copy.test.mjs` 가 (1) 제목·도구 3종·허브 링크 (2) **가격 숫자 없음**(`$6.90` 류·`2,020 credits` 류) (3) 기준일 (4) robots/llms 산출물과 www 사이트맵 줄을 검사합니다.

## 4. 아직 하지 않은 것 (범위 결정 필요)

| 항목 | 상태 | 먼저 정할 것 |
|---|---|---|
| **www 사이트맵 보강** | 지금 `www.xconda.ai/sitemap.xml` 은 10개 URL, 언어별 페이지·lastmod 없음. 이관 패키지의 `www/dist/sitemap.xml`(44 URL · hreflang 포함)은 준비돼 있습니다 | www 운영 소스에 적용할지, 정적 산출물로 덮을지 |
| **JSON-LD(Organization·WebSite·FAQPage)** | 허브는 있습니다. www 운영 페이지에 있는지는 **소스 확인 필요** | 확인 후 FAQPage 만 붙일지, 없는 스키마를 새로 넣을지 |
| **JS 없이 본문이 읽히는지** | 렌더링 화면은 확인됨. www 소스(Vue/Next) 기준으로는 **미확인** | www 운영 소스 접근 |
| **MCP · openapi · agent.json** | 양쪽 다 없음. **일부러 만들지 않았습니다** | 에이전트가 무엇을 할 수 있게 할지(조회만/생성까지). 생성은 크레딧이 나가므로 **사용자 확인 없이 단독 실행되지 않는 구조**여야 합니다. 조회용부터 작게 시작하는 것이 안전합니다 |
| **로그인 없이 체험 열기** | 비즈스프링 사례를 그대로 가져오지 않습니다 | XCONDA는 로그인하고 쓰는 서비스이므로 이 항목은 **해당 없음**으로 둡니다 |

### MCP 를 만들 때의 최소 순서(참고)

1. 조회 전용: 블로그·Q&A·가이드 목록/본문 검색 (`llms.txt`·`sitemap.xml` 이 이미 같은 목록을 갖고 있습니다).
2. 쓰기(생성)는 **별도 동의 화면**을 거치는 도구로만 — 크레딧이 나가는 호출은 사용자 확인 없이 실행되지 않게 합니다.
3. 그 전까지는 위 404 수정으로 "없는 경로는 404 + HTML" 이 보장됩니다.
