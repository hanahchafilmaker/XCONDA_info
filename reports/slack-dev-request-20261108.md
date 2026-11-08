# Slack 요청 문안 — `test.xconda.ai` 노출 차단 (개발팀)

**작성** 2026-11-08 · **대상** 전유준(개발) · **근거** `reports/test-server-index-blocking-runbook-20261108.md` §4-1
**사용법** 아래 블록을 그대로 복사해 슬랙에 붙여넣습니다. Slack은 `*굵게*` 만 지원하므로 마크다운(`**`)을 쓰지 않았습니다.

---

## A. 메인 메시지 (DM 또는 `#dev` — 이걸 먼저 보냅니다)

```text
전유준님, *test.xconda.ai 노출 건* 으로 급하게 요청드립니다 🙏

*상황* (오늘 11:52~12:00, 시크릿 모드 2회 확인)
• `site:test.xconda.ai` 검색 시 *4건 색인* — /pricing, /storyboards, /guides ×2
• 검색 결과 클릭하면 *www 로 안 넘어가고 test 서버가 그대로 열림*
• *로그인 없이* 열람 가능 — 요금제(Lite 9,900 / Plus 24,900 / Pro 49,900), 미출시 툴명(Art Director Pro, ClothSwap 등), 가이드 13챕터 전체 목차
• 증거 캡처 6장 확보 완료(해시 기록), 절차서 정리됨

*요청 — 오늘 중, 이 순서로*
1️⃣ *차단 전에* access log export
   시각·IP·UA·경로·Referer / 사내 보관 + SHA-256
   → 차단하면 신규 접속이 사라져서 유입 경로를 다시 못 만듭니다
2️⃣ *인증* — `test.` 전체(/, /pricing, /storyboards, /guides, /studio/*)에
   Basic 인증 또는 IP allowlist → *이게 진짜 차단*입니다
3️⃣ *noindex* — 모든 HTML 응답에
   `X-Robots-Tag: noindex, nofollow, noarchive` 부착
   + canonical 이 test 자기 자신을 가리키지 않게, sitemap 에서 test URL 제거
4️⃣ *같이 확인 부탁* — `test.` 의 Stripe 키가 `sk_test_` 인지,
   `studio/*` 가 인증을 요구하는지
   → 이번 결제 사고의 전제(테스트 가결제 → 운영 크레딧 적립)와 같은 표면이라 최우선입니다

*주의 2가지*
• `robots.txt Disallow` 를 *먼저* 걸면 크롤러가 noindex 를 못 읽어서
  기존 색인이 오히려 더 오래 남습니다. *인증 → noindex* 순서 부탁드립니다
• Stripe 웹훅 엔드포인트는 인증에서 제외 부탁드립니다 (테스트 결제 검증 막힘)

상세 절차: `reports/test-server-index-blocking-runbook-20261108.md`
검증 명령은 스레드에 남깁니다 👇
```

---

## B. 스레드 후속 (검증용 — A에 이어서)

```text
완료 확인용 명령입니다. 결과만 캡처해서 주시면 제가 검증·기록하겠습니다 ✅

*① 인증 확인 (비로그인)*
```
curl -sI https://test.xconda.ai/pricing | head -1
```
→ 기대: `HTTP/2 401` 또는 `HTTP/2 403`

*② noindex 확인*
```
curl -sI https://test.xconda.ai/pricing | grep -i x-robots-tag
```
→ 기대: `X-Robots-Tag: noindex, nofollow, noarchive`

*③ 색인 확인 (제가 1~2주간 주 1회 추적)*
`site:test.xconda.ai` → 0건까지

1️⃣(로그)은 제가 별도로 받아 두겠습니다. 차단 *전에* export 된 것 맞는지만 확인 부탁드립니다 🙏
```

> ⚠️ 위 코드블록은 슬랙에서 ``` 로 감싸야 복사 버튼이 생깁니다. 위 예시는 중첩 표기라 그대로 붙이면 깨지므로, 슬랙에는 아래처럼 보냅니다.
>
> ````text
> *① 인증 확인 (비로그인)*
> ```
> curl -sI https://test.xconda.ai/pricing | head -1
> ```
> → 기대: HTTP/2 401 또는 403
> ````

---

## C. 긴급 짧은 버전 (바쁠 때 / 3줄만 필요할 때)

```text
전유준님, 급한 건 하나입니다 🙏
`test.xconda.ai` 가 구글에 4건 색인돼 있고 *로그인 없이* 요금제·미출시 툴명까지 열립니다(캡처 확보).
*오늘 안에 ① 접속 로그 export ② test 전체 인증 ③ X-Robots-Tag: noindex* 부탁드립니다 — 순서 중요합니다(로그 → 인증 → noindex). 상세는 `reports/test-server-index-blocking-runbook-20261108.md`.
```

---

## D. 보내기 전 체크

- [ ] **수신자 확인** — 인프라 담당이 전유준님이 맞는지, 아니면 인프라 채널이 맞는지
- [ ] **채널 선택** — 사내 보안 이슈이므로 공개 채널보다 **DM 또는 `#dev-private`** 권장
- [ ] **비밀번호·IP·키 값은 슬랙에 쓰지 않기** — "1Password 에 올려 두겠습니다"로 대체
- [ ] **로그 export 담당**이 개발팀인지 확인 (인프라가 따로 있으면 그쪽에 요청)
- [ ] 발송 후 **1시간 내 회신 없으면** 전화/구두로 1단계(로그+인증)만 재확인

---

*본 문서는 공개 저장소에 포함됩니다. 실제 로그·IP·키 값은 기록하지 않습니다.*
