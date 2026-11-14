# Slack 문안 — 영어 허브 `www.xconda.ai/hub/` 프록시 요청

**작성** 2026-11-14 · **대상** 전유준(개발) · **근거** `reports/en-hub-subdirectory-handoff-20261114.md`
**사용법** 아래 블록을 그대로 복사해 슬랙에 붙여넣습니다. Slack은 `*굵게*` 만 지원하므로 마크다운(`**`)을 쓰지 않았습니다.

---

## A. 메인 메시지 (DM 또는 `#dev`) — 이걸 먼저 보냅니다

```text
전유준님, *영어 허브 하위 폴더 이전* 건으로 요청드립니다 🙏
MHW 검토 끝났고 B안으로 확정됐습니다. 허브 쪽 준비는 끝났고 *스위치만 꺼둔 상태*라 지금은 아무것도 달라지지 않습니다.

*목표*
영어 허브 전체(공지·블로그·가이드·Q&A 100페이지)를
`www.xconda.ai/hub/` 로 보이게 하는 것. 리다이렉트가 아니라 *리버스 프록시*입니다.

*먼저 답해 주실 것 (이거 하나로 나머지가 정해집니다)*
`www.xconda.ai` 와 `xconda.ai` 중 *실제로 200 을 주는 쪽*이 어디인가요?
(리다이렉트되는 쪽이면 canonical·사이트맵 주소가 틀어집니다)

*프록시 규칙 — 4가지만 지키면 됩니다*
1️⃣ 리다이렉트 아님, *프록시*  →  주소창은 `/hub/…` 그대로, 응답 200
2️⃣ 원본 요청 시 *Host 헤더를 `hub.xconda.ai` 로 교체*
     → GitHub Pages 가 Host 로 사이트를 찾습니다. `www` 그대로 보내면 *404* 납니다
3️⃣ `/hub` → `/hub/` *301*  (글 주소도 `/hub/post/abc` → `/hub/post/abc/`)
     → 페이지 안 링크가 상대 주소라 슬래시 없으면 깨집니다
4️⃣ 응답 본문은 *손대지 않기* — HTML 치환·스크립트 삽입 없이 그대로

  들어오는 주소                      →  가져올 곳
  https://www.xconda.ai/hub/         →  https://hub.xconda.ai/en/
  https://www.xconda.ai/hub/<경로>    →  https://hub.xconda.ai/en/<경로>

*같이 부탁드릴 것*
• 원본이 주는 `Location` 헤더 재작성 (`hub.xconda.ai/en/…` → `/hub/…`)
• `/hub/*` 에 `x-robots-tag: noindex` 나 로그인 미들웨어 안 걸리게
• 캐시 5~10분 (노션 동기화로 수시 재배포됩니다)
• `/hub/sitemap.xml` 도 같은 규칙으로 (→ `hub.xconda.ai/en/sitemap.xml`)

*스택별 방법*
• Cloudflare Workers → Worker `fetch` 로 위 처리 (별도 Worker 새로 만들어 주세요.
  허브 저장소의 `notion-worker` 는 *노션 API 프록시*라 라우트가 다릅니다)
• Next.js → `rewrites` 의 `beforeFiles` 에 외부 주소 재작성
• Nginx → `proxy_pass` + `proxy_set_header Host hub.xconda.ai`

*순서 (중요)*
프록시 배포 → 저희가 `npm run proxy:check` 로 전부 ✅ 확인 → 그다음 스위치 ON
→ *스위치를 먼저 켜면 영어 방문자가 없는 주소로 갑니다*

상세는 `reports/en-hub-subdirectory-handoff-20261114.md` 에 정리해뒀습니다.
막히는 부분 있으면 말씀 주세요. 감사합니다!
```

---

## B. 스레드 답글 — 프록시 열린 뒤 (개발자에게 확인 요청)

```text
프록시 열어주셔서 감사합니다! 저희 쪽 점검 결과 공유드립니다.

✅ `npm run proxy:check` — 홈·목록·글 3개 모두 200, 제목 일치, noindex 없음
✅ 끝 슬래시 없는 주소 → `/hub/` 로 301
✅ `/hub/sitemap.xml` 열림

이제 스위치를 켜고 배포하겠습니다. 켜지면 아래가 한꺼번에 바뀝니다.
• 영어 페이지 canonical·og:url·구조화 데이터 → `www.xconda.ai/hub/…`
• 모든 언어 페이지의 hreflang `en` → `www.xconda.ai/hub/…`
• 영어 주소가 `hub.xconda.ai/sitemap.xml` 에서 빠지고
  `www.xconda.ai/hub/sitemap.xml` 로 분리

*제품 사이트 쪽에서 부탁드릴 것 (스위치 켠 뒤)*
1️⃣ `robots.txt` 에 한 줄 추가
    `Sitemap: https://www.xconda.ai/hub/sitemap.xml`
    (`/hub/` 를 Disallow 하지 않는지 확인)
2️⃣ Search Console `xconda.ai` 속성에 위 사이트맵 제출
3️⃣ GA4 — 영어 허브가 제품 사이트 도메인에서 열립니다.
    허브 측정 ID 가 제품 사이트와 같은 속성인지 확인 부탁드립니다.
    (같으면 영어 허브 → 제품 페이지 이동이 같은 세션으로 이어집니다.
     그래서 영어 허브의 제품 링크에서는 UTM 을 뺐습니다)

2~4주 뒤 Search Console 에서 `hub.xconda.ai/en/` 색인이
`www.xconda.ai/hub/` 로 넘어갔는지 같이 보면 됩니다.
```

---

## C. 문제 생겼을 때 (롤백 안내)

```text
프록시 쪽에 문제가 생기면 저희가 *스위치를 끄면 바로 원래대로* 돌아갑니다.
`src/content/seo.js` 의 `LOCALE_BASE_URLS` 를 `{ en: "" }` 로 되돌리고 재배포하면
영어 페이지가 다시 `hub.xconda.ai/en/` 기준으로 돌아갑니다.
파일 위치는 그대로라 데이터 손실은 없습니다.

프록시만 잠시 내리셔도 기존 `hub.xconda.ai/en/` 주소는 계속 살아 있습니다.
다만 그 상태에서는 영어 페이지의 canonical 이 `www.xconda.ai/hub/` 를 가리키므로
*오래 두지는 마시고* 저희에게 알려 주세요.
```

---

## D. 별건 — 매 PR 마다 실패하는 체크

```text
*별건으로 하나만 더 부탁드립니다.*

GitHub 체크 `Workers Builds: xconda-info-news` 가
*PR 브랜치에서만 매번 실패*하고 `main` 에서는 성공합니다.
(#122~#132 전부 같은 상태였고, PR 은 `notion-worker/` 를 건드리지 않았습니다)

Cloudflare 대시보드의 *비프로덕션 브랜치 빌드 설정*
(빌드 명령·환경 변수)을 봐 주시면 좋겠습니다.
저장소에서는 로그가 안 보여서 확인이 어렵습니다.
머지는 계속 진행하고 있지만, 실제 실패가 섞이면 가려질 수 있어서요.
```
