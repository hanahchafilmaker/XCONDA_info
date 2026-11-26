# B안(Cloudflare 이전) — 태윤 님에게 요청할 것

- 작성 2026-11-26 · 대상: **태윤 님** (`xconda.ai` DNS · AWS Route 53 담당)
- 결정: **B안 — 허브 호스팅을 Cloudflare로 옮기고, 지금 준비된 Worker로 301을 낸다**
- 이 문서는 **요청서**입니다. 허브 저장소 코드는 이미 준비돼 있고(`hub-redirect-worker/`), DNS·존 작업만 남았습니다.
- 슬랙에 그대로 붙일 문안: 맨 아래 [§7](#7-슬랙-문안-복사용) — Slack은 `*굵게*` 만 지원하므로 마크다운(`**`)을 쓰지 않았습니다.

---

## 1. 왜 DNS 를 옮겨야 하나 (한 문장)

`hub.xconda.ai/en/*` → `www.xconda.ai/hub/*` 를 **서버 301** 로 보내려면 `hub` 응답 앞에 Cloudflare Worker 라우트를 걸어야 하는데, 라우트는 **Cloudflare 존에만** 걸립니다. 지금 `xconda.ai` 는 Route 53 이라 `wrangler deploy` 를 해도 라우트가 붙지 않습니다. (허브가 GitHub Pages 라서 서버 301 을 직접 낼 수는 없습니다.)

**지금 상태(301 없음)** — 옮기기 전까지 이렇게 동작합니다.

| 요청 | 지금 |
|---|---|
| `hub.xconda.ai/en/…` (브라우저) | 200 + `<script data-hub-moved>` 로 `www.xconda.ai/hub/…` 이동 |
| `hub.xconda.ai/en/…` (크롤러·curl) | **200 + HTML**, 이동 없음 (JS 미실행) |
| 검색엔진 신호 | 영어 페이지 `canonical` = `https://www.xconda.ai/hub/…` |

---

## 2. 요청 목록 (우선순위 순)

| # | 요청 | 담당 | 왜 필요한가 | 되돌리기 |
|---|---|---|---|---|
| **1** | `xconda.ai` 존을 **Cloudflare로 이전**(네임서버 교체) 또는 `xconda.ai` 존을 Cloudflare에 **추가하고 NS 위임** | 태윤 | Worker 라우트를 걸려면 Cloudflare 존이어야 함 | NS를 Route 53 값으로 되돌리면 원복(전파 최대 24~48h) |
| **2** | **이전 전 DNS 레코드 전수 조사·기록** (A · CNAME · MX · TXT · 서브도메인) | 태윤 | 옮기면서 하나라도 빠지면 메일·서브도메인이 죽습니다. **아래 §3-A는 반드시 값까지 보존** | 기록해 둔 표로 복원 |
| **3** | Cloudflare **DNS only(회색 구름)** 로 먼저 전부 옮겨 트래픽 영향 0 확인 | 태윤 | 프록시(주황 구름)는 SSL·IP 노출이 바뀝니다. DNS만 옮겨도 301 라우트는 걸 수 있습니다 | 레코드 단위로 원복 |
| **4** | 허브 호스팅을 **Cloudflare Pages** 로 이전(저장소 연결 또는 `main` 산출물 업로드) | 태윤 + 허브 | `hub.xconda.ai` 가 Cloudflare 안에 있어야 Worker 라우트·Pages 커스텀 도메인이 한 곳에서 끝납니다 | GitHub Pages 설정은 그대로 두므로 `CNAME`·`Settings→Pages` 로 즉시 복귀 |
| **5** | `hub` 레코드를 **프록시(주황 구름) + SSL/TLS `Full`** 로 | 태윤 | Worker 라우트는 프록시된 레코드에만 적용. `Flexible` 이면 GitHub/Pages HTTPS 강제와 맞물려 **리다이렉트 반복** | 회색 구름으로 되돌리면 301만 사라지고 사이트는 유지 |
| **6** | Worker 시크릿 `ORIGIN_KEY` 값 전달 (임의의 긴 문자열) | 태윤 ↔ 허브 | 301 Worker 가 **제품 사이트 프록시의 요청은 통과**시켜야 `/hub/` 무한 반복을 막습니다. 이 값이 없으면 301을 켤 수 없습니다 | 값 교체 후 재배포 |
| **7** | 기존 리다이렉트·WAF·캐시 규칙이 `hub` 에 걸려 있지 않은지 확인 | 태윤 | `x-robots-tag: noindex`·로그인 미들웨어·캐시 규칙이 걸리면 허브가 검색에서 빠지거나 옛 화면이 남습니다 | — |
| **8** | Cloudflare **Web Analytics** 사용 여부 알려 주기 | 태윤 | 허브는 지금 GA4 를 씁니다. 같은 방문을 두 번 세지 않게 하나만 씁니다 | — |

> **순서 주의**: ⑥(키 전달)과 허브 쪽 `MODE=observe` 배포·`npm run redirect:check` 통과 **전에는** `MODE=on` 을 켜지 않습니다. 켜면 영어 허브 전체가 리다이렉트 반복으로 멈춥니다.

---

## 3. A. 반드시 값까지 보존할 레코드

> **이 표는 추정입니다.** 실제 값은 `dig` 로 뽑아 채워 주세요. 하나라도 빠지면 그 서비스가 죽습니다.

| 이름 | 타입 | 용도 | 옮길 때 주의 | 실제 값(태윤 님이 채움) |
|---|---|---|---|---|
| `xconda.ai` (apex) | A/AAAA 또는 ALIAS | 제품 사이트 | apex 는 Cloudflare 가 **CNAME flattening** 으로 처리. 값 그대로 옮기기 | |
| `www` | CNAME/A | 제품 사이트(200 응답 쪽) | 프록시 규칙이 여기서 `hub` 를 가져갑니다 | |
| `hub` | CNAME → `hanahchafilmaker.github.io` | 허브 | CNAME 파일(`CNAME`)·Settings→Pages 와 세트. 이전 후에는 Pages 쪽으로 | |
| `_dmarc` | TXT | 메일 인증 | 값 그대로. 빠지면 메일이 스팸 처리 | |
| SPF 가 있는 도메인 | TXT | 메일 발송 | `v=spf1 …` **한 줄 유지**(여러 줄이면 무효) | |
| DKIM 선택자 (예: `google._domainkey`) | TXT/CNAME | 메일 인증 | 선택자 이름을 모르면 §3-B 로 찾기 | |
| MX (있다면) | MX | 메일 수신 | 우선순위 숫자까지 동일하게 | |
| `test` | — | 테스트 서버 | 2026-11-08 noindex 사고 관련. 레코드가 있으면 유지 | |
| `_github-pages-challenge-hanahchafilmaker.hub` | TXT | **서브도메인 탈취 방지** | 옮기면서 빠지면 다른 GitHub 계정이 `hub` 를 가로챌 수 있음 | |
| `_acme-challenge.*` | TXT | 인증서 발급 | 이전 중 인증서 갱신과 겹치면 발급 실패 | |
| `_indexnow` / `b431e2c…txt` 관련 | — | IndexNow 검증 파일은 **저장소 루트 파일** | DNS 아님. 옮겨도 그대로 동작(§5) | |

### 3-B. 값을 모를 때 확인 명령 (태윤 님이 실행)

```bash
# 전체 레코드 훑기 (Route 53 콘솔의 Hosted zone → Export 도 가능)
dig +short NS   xconda.ai
dig +short A    xconda.ai;  dig +short A www.xconda.ai
dig +short CNAME hub.xconda.ai
dig +short MX   xconda.ai
dig +short TXT  xconda.ai

# 메일 인증(DKIM) 선택자 찾기 — 자주 쓰는 이름들
for s in google selector1 selector2 s1 s2 k1 default mail dkim; do
  printf '%s: ' "$s"; dig +short TXT "$s._domainkey.xconda.ai"
done
dig +short TXT _dmarc.xconda.ai

# 이전 전후 비교용 스냅샷
for q in "NS" "A" "CNAME" "MX" "TXT"; do echo "== $q"; dig +short $q xconda.ai; done > dns-before.txt
```

**이전 후 같은 명령을 `dns-after.txt` 로 떠서 diff 가 비면 성공입니다.**

---

## 4. B. 이전 후 제가 확인할 것 (태윤 님은 알려만 주세요)

①~⑦ 완료되면 알려 주세요. 허브 쪽에서 아래를 돌립니다.

```bash
# 1) 사이트가 그대로 열리는가 (한국어·영어·일본어·중국어)
curl -sI https://hub.xconda.ai/ | head -1          # 200
curl -sI https://hub.xconda.ai/ja/ | head -1       # 200
curl -sI https://hub.xconda.ai/en/qna/commercial-use/ | head -1   # 지금은 200(301 아님)

# 2) 프록시(제품 사이트)가 살아 있는가 — 여기가 깨지면 영어 허브 전체가 멈춥니다
curl -sI https://www.xconda.ai/hub/ | head -1      # 200

# 3) Worker 관찰 단계(301 안 냄)에서 "켜도 안전한가"
npm run redirect:check                             # observe → "켜도 안전합니다"

# 4) 켠 뒤 전부 ✅ 인지
npm run redirect:check                             # on → 모든 항목 ✅
```

---

## 5. 옮겨도 **그대로** 동작해야 하는 것 (체크리스트)

Cloudflare 로 옮긴 뒤 아래가 하나라도 깨지면 롤백 대상입니다.

- [ ] 저장소 루트 **`CNAME`** 파일(`hub.xconda.ai`) — GitHub Pages 설정값. Pages 를 계속 쓸 경우 지우면 도메인이 풀립니다
- [ ] **IndexNow key 파일** `b431e2c7231b6a5e01aa9e2b8402d0ec.txt` — `https://hub.xconda.ai/b431e2c….txt` 가 200 이고 **내용이 파일명과 같아야** 합니다(`scripts/indexnow.mjs` 가 검사)
- [ ] **사이트 소유확인 파일** — `google0e3cdf…html`(구글) · `naver5af…html`(네이버). 도메인을 옮겨도 파일은 저장소에 있으므로 200 이어야 합니다
- [ ] `https://hub.xconda.ai/robots.txt` — 이번에 넣은 AI 크롤러 정책(검색 허용·학습 차단)이 그대로
- [ ] `https://hub.xconda.ai/llms.txt` · `/sitemap.xml` 200
- [ ] `https://hub.xconda.ai/assets/app.js` · `/assets/app.css` 200 + **`content-type` 이 JS/CSS**(HTML 이면 영어 허브가 빈 화면 — 2026-11-17 사고와 같은 증상)
- [ ] `x-robots-tag: noindex` **없음**
- [ ] 로그인 미들웨어에 안 걸림(비로그인 200)
- [ ] 캐시 5~10분 (노션 동기화로 수시 재배포 — 길면 옛 화면)
- [ ] `www.xconda.ai/hub/` 프록시 200 (제품 사이트 쪽 규칙)
- [ ] TLS 인증서: `hub` · `www` · apex 모두 유효, `http → https` 301

---

## 6. 일정 · 위험 · 롤백

| 단계 | 예상 | 위험 | 되돌리기 |
|---|---|---|---|
| DNS 전수 조사·기록 | 30분 | 낮음 | — |
| Cloudflare 존 추가 · 레코드 입력(회색 구름) | 1시간 | 중 — 값 누락 시 메일·서브도메인 장애 | 표 보고 복원 |
| NS 교체 | 전파 1~24h | 중 — 전파 중 혼재 | NS 를 Route 53 값으로 |
| 허브 Pages 이전 | 1~2시간 | 중 — 빌드·자산 경로 | Settings→Pages + `CNAME` 으로 복귀 |
| `hub` 주황 구름 + Full | 10분 | **높음** — HTTPS 반복 가능 | 회색 구름 |
| Worker `observe` → 점검 | 30분 | 낮음(301 안 냄) | `MODE="off"` 배포 |
| Worker `on` | 10분 | **높음** — `/hub/` 무한 반복 시 영어 허브 전체 정지 | `MODE="off"` 배포(또는 대시보드에서 라우트 삭제) |

**긴급 롤백 3단계**
1. Cloudflare 대시보드 → Workers Routes 에서 `hub.xconda.ai/en*` 라우트 **삭제** (가장 빠름)
2. `hub-redirect-worker/wrangler.toml` `MODE = "off"` → `npx wrangler deploy`
3. 그래도 안 되면 `hub` 레코드를 **회색 구름**으로 → Cloudflare 를 거치지 않고 원본으로 직행

> `/hub/` 무한 반복은 **301을 켠 뒤에만** 생깁니다. `observe` 단계에서는 301을 내지 않으므로 안전합니다.

---

## 7. 슬랙 문안 (복사용)

```text
태윤님, *허브 301(영어 예전 주소) 배포* 때문에 DNS 작업 하나 부탁드립니다 🙏
B안(Cloudflare 이전)으로 확정됐습니다.

*왜 DNS 인가*
hub.xconda.ai/en/* → www.xconda.ai/hub/* 를 *서버 301* 로 보내려면 Worker 라우트가 필요한데,
라우트는 *Cloudflare 존에만* 걸립니다. 지금은 Route 53 이라 wrangler deploy 를 해도 안 붙습니다.
(허브가 GitHub Pages 라서 서버 301 을 직접 낼 수는 없습니다)

지금은 301 이 아니라 *브라우저 JS 이동*(data-hub-moved) + canonical 로만 돌고 있어서,
크롤러는 계속 200 을 받습니다.

*부탁드릴 것 (순서대로)*
1️⃣ DNS 레코드 *전수 조사해서 값까지 표로* 공유 — A · CNAME · MX · TXT · DKIM 선택자 · _dmarc
   ⚠️ 여기서 빠지는 게 있으면 메일·서브도메인이 죽습니다
2️⃣ xconda.ai 존을 Cloudflare 로 이전(NS 교체). 처음엔 전부 *DNS only(회색 구름)*
   → 트래픽 영향 0 확인
3️⃣ 허브 호스팅을 Cloudflare Pages 로 이전
   (GitHub Pages 설정·CNAME 파일은 그대로 두시면 언제든 되돌릴 수 있습니다)
4️⃣ hub 레코드만 *프록시(주황 구름) + SSL/TLS Full*
   ⚠️ Flexible 이면 리다이렉트가 반복됩니다
5️⃣ Worker 시크릿 *ORIGIN_KEY* 값 하나 정해서 저희에게 전달
   → 제품 사이트 프록시 요청을 통과시키는 표식입니다. 이게 없으면 301 을 켤 수 없습니다
   (없이 켜면 /hub/ 가 무한 반복으로 영어 허브 전체가 멈춥니다)
6️⃣ hub 에 걸린 리다이렉트·WAF·캐시 규칙 없는지 확인
   (x-robots-tag: noindex 나 로그인 미들웨어가 걸리면 허브가 검색에서 빠집니다)
7️⃣ Cloudflare Web Analytics 쓸지 알려 주세요 (허브는 지금 GA4 — 중복 집계 방지)

*옮긴 뒤 제가 확인할 것* (알려만 주시면 됩니다)
• hub / ja / en 주소 200, www.xconda.ai/hub/ 프록시 200
• npm run redirect:check 로 observe → "켜도 안전" → on 전부 ✅

*그대로 동작해야 하는 것*
IndexNow key 파일(b431e2c….txt), 구글·네이버 소유확인 파일, robots.txt(이번에 학습 크롤러 차단 추가),
llms.txt, sitemap.xml, assets/app.js 의 content-type(HTML 이면 영어 허브가 빈 화면) — 이건 제가 다 확인합니다.

정리본: reports/cloudflare-migration-request-to-taeyun-20261126.md
급한 것 아니고, 1번(레코드 표)부터 주시면 제가 옮길 준비 다 해두겠습니다. 감사합니다!
```

---

## 8. 태윤 님이 "지금은 어렵다"고 하실 때 (대안)

| 대안 | 필요한 작업 | 301 이 되나 |
|---|---|---|
| **A. CloudFront** | `hub` 앞에 CloudFront 배포 + CloudFront Function 에 `hub-redirect-worker/worker.js` 의 `decide()` 이식. DNS 는 Route 53 유지 | ✅ (코드는 거의 그대로) |
| **C. 현행 유지** | 없음. canonical + `data-hub-moved` | ❌ (브라우저만 이동) |
| **D. apex 만 Cloudflare** | apex 만 옮겨도 `hub` 라우트는 못 걸어서 효과 없음 | ❌ |

A안으로 갈 경우 이 문서의 §5 체크리스트와 §6 롤백은 그대로 씁니다(라우트 삭제 대신 CloudFront 배포 비활성화).
