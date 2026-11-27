# `xconda.ai` → Cloudflare 이전 지시서 (태윤 님용 · A4 한 장)

- 2026-11-26 작성 · **2026-11-27 태윤 님 회신 반영(전부 회색 구름 이관 확정)**
- 목적: **`hub.xconda.ai/en/*` → `www.xconda.ai/hub/*` 서버 301** 을 켜기 위한 DNS 이전
- 이 한 장만 보시면 됩니다. 레코드 값·위험 상세는 맨 아래 "필요할 때 보는 문서" 참고
- 확정된 사실: **레코드 23개 전수 조사 완료**(빠진 것 0) + **사전 확인 3건 모두 해소(`media`·`ml`·`em3890` 전부 회색 구름 CNAME 이관)**

---

## 0. 후이즈 NS 변경 — ✅ 가능 확인됨 (실제 입력 시 호스트명·IP 확인)

- 도메인 **등록기관은 후이즈 그대로** 두고 **NS 값만** 교체합니다
- 경로: 후이즈 로그인 → **마이후이즈 → 내 도메인 자산 관리** → 도메인 선택 → **네임서버 변경** → `네임서버 정보 직접 입력`
- **IP 주소 입력칸 팁**: `.ai` + 외부 네임서버(`xxx.ns.cloudflare.com`)는 보통 **호스트명만** 넣으면 되지만, 후이즈 화면에서 IP 주소 입력까지 요구하면 1단계에서 배정받은 Cloudflare NS 2개의 IPv4를 조회해 함께 넣으면 됩니다:
  ```powershell
  nslookup <배정받은NS1>.ns.cloudflare.com 8.8.8.8
  nslookup <배정받은NS2>.ns.cloudflare.com 8.8.8.8
  ```
- 등록기관 상태 `clientTransferProhibited`(도메인 이전 잠금)는 **NS 변경과 무관**합니다. 그대로 두세요

---

## 1. 순서 (6단계)

| # | 할 일 | 담당 | 위험 |
|---|---|---|---|
| 1 | **Cloudflare 에 `xconda.ai` 존 추가** (무료 플랜). 자동 스캔 결과는 믿지 말고 **아래 레코드 표 끝까지 입력** | 태윤 | 낮음 |
| 2 | 입력한 레코드는 **`media`·`ml`·`em3890` 포함 전부 DNS only(회색 구름)**. 주황 구름은 `hub` 하나만, 그것도 5단계에서 | 태윤 | 낮음 |
| 3 | **후이즈에서 NS 교체** (Route 53 NS 4개 → Cloudflare NS 2개, 필요 시 NS IP 함께 입력). 전파 1~24h | 태윤 | 중 — 전파 중 혼재 |
| 4 | **허브를 Cloudflare Pages 로 이전** (저장소 연결). GitHub Pages 설정·`CNAME` 파일은 **그대로 두기** | 태윤 + 허브 | 중 — 언제든 복귀 가능 |
| 5 | **`hub` 레코드만 주황 구름 + SSL `Full`** ⚠️ **여기만 위험.** 저희가 `npm run redirect:check` 로 "켜도 안전합니다" 확인한 **뒤에** 켜 주세요 | 태윤 (저희 확인 후) | **높음** |
| 6 | Worker 시크릿 `ORIGIN_KEY` — **찾으실 필요 없습니다.** 저희가 값 만들어서 `www` 프록시 헤더 + Worker 시크릿에 넣습니다 | 허브 | 낮음 |

> **Route 53 존은 2주간 지우지 마세요.** 롤백 = NS 를 Route 53 값으로 되돌리기 한 번.
> **DNSSEC 는 이번에 켜지 마세요.** 이전 중에 켜면 해석 실패 구간이 생깁니다.

---

## 2. 레코드 23개 — 입력 방식 요약 (1~4단계에서는 100% 회색 구름)

전체 값 표는 `reports/dns/xconda-ai-dns-inventory-20261126.md` §1 (그대로 복사 입력). 여기서는 **주의가 필요한 것만**:

| 레코드 | 입력 방식 (전부 **회색 구름**) | 주의 |
|---|---|---|
| apex · `www` · `test` A | A `35.219.200.15` 그대로 | **회색 구름** 유지 |
| `hub` CNAME | `hanahchafilmaker.github.io` | 처음엔 **회색 구름** → **5단계에서만 주황** |
| **`media`** CNAME | Route 53 alias 대신 **회색 CNAME → `d1vtuvuzrisdnm.cloudfront.net`** | 회색 구름이면 브라우저가 CloudFront로 직행하므로 기존 ACM 인증서 그대로 동작(TLS 충돌 없음) |
| **`ml`** CNAME | Route 53 alias 대신 **회색 CNAME → `dualstack.cuberry-ml-alb-900449763.us-east-1.elb.amazonaws.com`** | 회색 구름이라 보안그룹/SSL 무관. **원래 이전 전부터 `503` 상태**이므로 이전 후 503이 나와도 정상(롤백 사유 아님) |
| `s1`·`s2._domainkey`, **`em3890`** | **회색 CNAME 그대로** | SendGrid 도메인 인증 3종 세트. **회색 구름 필수** |
| `_acme-challenge_*` 4건, `_d5f4…`, `_3bcc…` | **회색 CNAME 그대로** | ❌ **회색 구름 필수.** 주황이면 인증서 갱신이 60~90일 뒤 **조용히** 실패 |
| apex · `www` · `test` TXT `fah-claim=…` | TXT 그대로 | **제품 사이트(Firebase App Hosting) 커스텀 도메인 소유확인** — 빠지면 사이트 도메인 연결이 풀림 |
| `_dmarc` TXT | `v=DMARC1; p=none;` | 그대로 |
| MX · SPF · CAA | **없음** | **새로 만들지 마세요.** 지금이 정상 |
| NS · SOA | Cloudflare 자동 | 옮길 필요 없음 |

---

## 3. 사전 확인 3가지 — ✅ 전부 해소됨 (2026-11-27 태윤 님 회신)

1. **`media` CloudFront** → **회색 CNAME(`d1vtuvuzrisdnm.cloudfront.net`)** 으로 이관 확정. Cloudflare 프록시를 안 거치므로 CloudFront 인증서·Origin 추가 확인 불필요.
2. **`ml` ALB** → **회색 CNAME(`dualstack.cuberry-ml-alb-…`)** 으로 이관 확정. 기존부터 `503` 상태였음을 기준선에 기록(롤백 오판 방지).
3. **`em3890` (SendGrid)** → **회색 CNAME 그대로** 이관 확정(`s1`/`s2` DKIM 과 함께 유지).

---

## 4. 저희가 하는 일 (태윤 님은 알려만 주세요)

- 이전 후: `npm run hub:headers` (리다이렉트·WAF·캐시·noindex 점검) → 실패 0
- `npm run proxy:check` → `www.xconda.ai/hub/` 200
- `npm run redirect:check` → observe 단계 **"켜도 안전합니다"** → 그때 5단계 승인 요청
- `dns-before.txt` / `dns-after.txt` diff 로 **빠진 레코드 0** 증명 (`NS`·`SOA` 교체 및 `media`·`ml` 이 Alias → `CNAME` 표시로 바뀌는 것만 다르면 정상)

---

## 5. 필요할 때 보는 문서

| 문서 | 내용 |
|---|---|
| `reports/dns/xconda-ai-dns-inventory-20261126.md` | 레코드 23개 실제 값 · Cloudflare 입력 방식 · 위험 상세 · diff 절차 |
| `reports/cloudflare-migration-request-to-taeyun-20261126.md` | 요청 배경 · 일정/롤백 · 슬랙 문안 |
| `reports/dns/route53-export-20261126.json` | Route 53 내보내기 원본 (대조용) |

**사전 블로커가 모두 풀렸으니 편하신 일정에 1~3단계(존 생성 · 전 레코드 회색 구름 입력 · 후이즈 NS 교체)부터 진행해 주시면 됩니다.**
