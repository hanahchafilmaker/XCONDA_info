# 영어 허브를 제품 사이트 하위 폴더로 — 개발자 전달 사항

- 작성일: 2026-11-14
- 근거: MHW 허브·블로그 이의 제기 검토 의견서 B안 (`reports/mhw-hub-blog-objection-review-20261114.md`)
- 대상: 제품 사이트(www.xconda.ai) 담당 개발자
- 범위: **영어만** 옮깁니다. 한국어·일본어·중국어는 `hub.xconda.ai` 그대로입니다.

## 1. 한 줄 요약

`www.xconda.ai/hub/*` 요청을 `hub.xconda.ai/en/*` 로 **리버스 프록시**해 주시면, 허브 쪽은 스위치 한 줄만 켜면 됩니다. 허브 쪽 준비는 끝났고 스위치는 꺼진 채 배포돼 있어 지금은 아무것도 달라지지 않습니다.

## 2. 제품 사이트 쪽에서 해 주실 일

### 2-1. 프록시 규칙 (필수)

| 들어오는 주소 | 가져올 곳 |
| --- | --- |
| `https://www.xconda.ai/hub/` | `https://hub.xconda.ai/en/` |
| `https://www.xconda.ai/hub/<경로>` | `https://hub.xconda.ai/en/<경로>` |

조건:

1. **리다이렉트가 아니라 프록시**여야 합니다. 주소창에는 `www.xconda.ai/hub/…` 가 남고 응답은 200 이어야 합니다.
2. 원본으로 보낼 때 **Host 헤더는 `hub.xconda.ai`** 로 바꿔 주세요. GitHub Pages 는 Host 로 사이트를 찾기 때문에 `www.xconda.ai` 그대로 보내면 404 가 납니다.
3. **끝 슬래시**: `/hub` → `/hub/` 로 301 해 주세요. 페이지 안 링크가 상대 주소(`./qna/…`, `../../`)라서 슬래시가 없으면 링크가 깨집니다. 글 주소도 같습니다(`/hub/post/abc` → `/hub/post/abc/`).
4. 원본이 주는 `Location` 헤더를 고쳐 주세요. GitHub Pages 는 슬래시 없는 폴더 주소를 `hub.xconda.ai/en/…/` 로 301 하는데, 그대로 넘기면 방문자가 예전 주소로 샙니다. 3번을 프록시 앞단에서 처리하면 이 경우는 거의 생기지 않습니다.
5. 응답 본문은 **고치지 않습니다**. HTML 치환·스크립트 삽입 없이 그대로 넘겨 주세요. (제품 사이트의 GA4·태그를 넣어야 하면 4번 항목을 먼저 정한 뒤 알려 주세요. 허브에서 넣는 쪽이 안전합니다.)
6. `x-robots-tag: noindex` 나 로그인 미들웨어가 `/hub/*` 에 걸리지 않게 해 주세요.
7. 캐시는 짧게(5~10분 권장). 허브는 Notion 동기화로 수시로 다시 배포됩니다.
8. `/hub/sitemap.xml` 도 같은 규칙으로 넘어가면 됩니다(→ `hub.xconda.ai/en/sitemap.xml`). 별도 처리 없음.

Next.js 라면 `rewrites` 의 외부 주소 재작성, Cloudflare 라면 Worker 의 `fetch` 로 충분합니다. 예시(Cloudflare Worker):

```js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/hub") return Response.redirect(`${url.origin}/hub/${url.search}`, 301);
    const target = new URL(`/en/${url.pathname.slice("/hub/".length)}${url.search}`, "https://hub.xconda.ai");
    const res = await fetch(target, { method: request.method, headers: { accept: request.headers.get("accept") ?? "*/*" }, redirect: "manual" });
    const location = res.headers.get("location");
    if (location) {
      // hub.xconda.ai/en/… → www.xconda.ai/hub/…
      const next = new URL(location, target);
      if (next.hostname === "hub.xconda.ai" && next.pathname.startsWith("/en/")) {
        return Response.redirect(`${url.origin}/hub/${next.pathname.slice(4)}${next.search}`, 301);
      }
    }
    return new Response(res.body, res);
  },
};
```

### 2-2. 주소 확정 (필수 · 답변 필요)

허브 스위치에 넣을 주소가 **`https://www.xconda.ai/hub/`** 인지 **`https://xconda.ai/hub/`** 인지 알려 주세요. 제품 사이트가 실제로 응답하는(리다이렉트되지 않는) 쪽이어야 합니다. 허브의 제품 링크는 지금 `www.xconda.ai` 를 씁니다.

### 2-3. 프록시가 열린 뒤 확인

허브 저장소에서 아래를 돌리면 됩니다. 전부 ✅ 가 나와야 스위치를 켭니다.

```
npm run proxy:check                       # https://www.xconda.ai/hub/ 점검
npm run proxy:check -- https://xconda.ai/hub/
```

### 2-4. 검색·분석 (스위치를 켠 뒤)

1. **robots.txt**: 제품 사이트 `robots.txt` 에 `Sitemap: https://www.xconda.ai/hub/sitemap.xml` 한 줄 추가. `/hub/` 를 Disallow 하지 않는지 확인.
2. **Search Console**: `xconda.ai` 속성에 위 사이트맵 제출.
3. **GA4**: 영어 허브 페이지가 제품 사이트 도메인에서 열리게 됩니다. 허브의 GA4 측정 ID 가 제품 사이트와 같은 속성인지, 다르면 어느 쪽으로 볼지 나서영 님과 정해 주세요. 같은 속성이면 영어 허브 → 제품 페이지 이동이 같은 세션으로 이어집니다(그래서 영어 허브의 제품 링크에서는 UTM 을 뺐습니다).
4. **쿠키 동의 배너·공통 헤더**: 허브 페이지는 제품 사이트의 헤더·푸터·배너를 쓰지 않는 독립 HTML 입니다. 같은 도메인에서 열리니 배너가 필요하면 알려 주세요.

### 2-5. 예전 주소의 301 (선택 · 가능하면)

`hub.xconda.ai` 는 GitHub Pages 라 서버 301 을 못 냅니다. 허브는 대신 **canonical + 스크립트 이동**으로 처리합니다(3번 참고). `hub.xconda.ai` 앞에 Cloudflare 프록시(주황 구름)를 둘 수 있으면 `hub.xconda.ai/en/*` → `www.xconda.ai/hub/*` 301 규칙을 거는 편이 검색엔진에 더 분명합니다. **이때 프록시가 원본을 가져오는 요청까지 301 되면 무한 반복**이 되니, 프록시 요청은 규칙에서 빼야 합니다(예: Worker 가 붙이는 비밀 헤더가 있으면 통과).

### 2-6. 별건: 브랜치 빌드 실패

GitHub 체크 **"Workers Builds: xconda-info-news"** 가 PR 브랜치(#122~#126)에서 매번 실패하고 `main` 에서는 성공합니다. PR 은 `notion-worker/` 를 건드리지 않았습니다. Cloudflare 대시보드의 브랜치 빌드 설정(비프로덕션 브랜치 빌드 명령·환경 변수)을 봐 주세요. 저장소에서는 로그를 볼 수 없습니다.

## 3. 허브 쪽에서 이미 해 둔 것

스위치: `src/content/seo.js` 의 `LOCALE_BASE_URLS`

```js
export const LOCALE_BASE_URLS = { en: "" };                              // 지금 (꺼짐)
export const LOCALE_BASE_URLS = { en: "https://www.xconda.ai/hub/" };    // 켬
```

켜고 `npm run build` 후 커밋하면 아래가 한꺼번에 바뀝니다.

| 항목 | 켠 뒤 |
| --- | --- |
| 영어 페이지 canonical · og:url · 구조화 데이터 주소 | `www.xconda.ai/hub/…` |
| 모든 언어 페이지의 hreflang `en` · 언어 전환 링크(정적 페이지와 앱 모두) | `www.xconda.ai/hub/…` |
| 사이트맵 | 영어 주소는 `hub.xconda.ai/sitemap.xml` 에서 빠지고 `en/sitemap.xml`(= `www.xconda.ai/hub/sitemap.xml`)로 분리 |
| `llms.txt` 의 영어 허브 주소 | `www.xconda.ai/hub/` |
| 예전 주소 `hub.xconda.ai/en/…` 로 직접 온 방문자 | 같은 글의 새 주소로 이동(쿼리·해시 유지 → 공유 링크의 UTM 보존) |
| 영어 홈·목록 페이지 | 허브 앱으로 넘기지 않고 정적 페이지 그대로 표시 |
| 영어 페이지의 제품 링크(무료로 시작·요금제 등) | UTM 없음(같은 사이트 안 이동). 한·일·중은 `utm_source=hub…` 유지 |

파일 위치는 바뀌지 않습니다. 영어 페이지는 계속 `en/` 폴더에 만들어지고 프록시가 그걸 가져갑니다. 그래서 스위치를 끄면 바로 원래대로 돌아갑니다.

알아 둘 점:

- 예전 주소의 이동은 **스크립트**(호스트가 `hub.xconda.ai` 일 때만 실행)입니다. 같은 파일이 프록시로도 읽히므로 meta refresh 는 쓸 수 없습니다(무한 반복). 검색엔진에는 canonical 이 신호입니다.
- 영어 홈의 "XCONDA Hub / English" 경로 표시와 "한국어" 링크는 `hub.xconda.ai` 로 갑니다(의도된 동작).
- 영어 페이지의 이미지는 Notion 주소, 글꼴은 CDN 입니다. `hub.xconda.ai` 의 CSS·JS 파일을 불러오지 않으므로 프록시에서 자산 경로를 따로 열 필요가 없습니다.
- 영어 Q&A 는 지금처럼 사이트맵에 넣지 않습니다(`SITEMAP_SKIP_LOCALIZED_SECTIONS`).

## 4. 순서

1. (개발자) 주소 확정 → 프록시 배포
2. (허브) `npm run proxy:check` 전부 ✅
3. (허브) 스위치 켬 → 빌드 → 배포
4. (개발자) robots.txt · Search Console 사이트맵 제출 · GA4 확인
5. 2~4주 뒤 Search Console 에서 `hub.xconda.ai/en/` 색인이 `www.xconda.ai/hub/` 로 넘어갔는지 확인

**프록시보다 스위치를 먼저 켜면 안 됩니다.** 영어 방문자가 없는 주소로 보내집니다. 문제가 생기면 스위치를 `""` 로 되돌려 다시 배포하면 됩니다.
