# `xconda.ai` → Cloudflare 이전 지시서 (태윤 님용 · A4 한 장)

- 2026-11-26 · 목적: **`hub.xconda.ai/en/*` → `www.xconda.ai/hub/*` 서버 301** 을 켜기 위한 DNS 이전
- 이 한 장만 보시면 됩니다. 레코드 값·위험 상세는 맨 아래 "필요할 때 보는 문서" 참고
- 확정된 사실: **레코드 23개 전수 조사 완료**(Route 53 내보내기 + 실측 대조, 빠진 것 0)

---

## 0. 먼저 확인 — 여기가 막히면 나머지가 전부 막힙니다

**후이즈 관리 화면에서 "네임서버(NS) 변경" 이 열리는지** 확인 부탁드립니다.

- 도메인 **등록기관은 후이즈 그대로** 둡니다. 바꾸는 건 **NS 값만**입니다
- 잠겨 있으면 → 후이즈 고객센터에 "Cloudflare 로 NS 위임하겠다" 요청 1회
- 이게 되면 나머지는 아래 순서대로 1시간 안에 끝납니다

---

## 1. 순서 (6단계)

| # | 할 일 | 담당 | 위험 |
|---|---|---|---|
| 1 | **Cloudflare 에 `xconda.ai` 존 추가** (무료 플랜). 자동 스캔 결과는 믿지 말고 **아래 레코드 표 끝까지 입력** | 태윤 | 낮음 |
| 2 | 입력한 레코드는 **전부 DNS only(회색 구름)**. 주황 구름은 `hub` 하나만, 그것도 4단계에서 | 태윤 | 낮음 |
| 3 | **후이즈에서 NS 교체** (Route 53 NS 4개 → Cloudflare NS 2개). 전파 1~24h | 태윤 | 중 — 전파 중 혼재 |
| 4 | **허브를 Cloudflare Pages 로 이전** (저장소 연결). GitHub Pages 설정·`CNAME` 파일은 **그대로 두기** | 태윤 + 허브 | 중 — 언제든 복귀 가능 |
| 5 | **`hub` 레코드만 주황 구름 + SSL `Full`** ⚠️ **여기만 위험.** 저희가 `npm run redirect:check` 로 "켜도 안전합니다" 확인한 **뒤에** 켜 주세요 | 태윤 (저희 확인 후) | **높음** |
| 6 | Worker 시크릿 `ORIGIN_KEY` — **찾으실 필요 없습니다.** 저희가 값 만들어서 `www` 프록시 헤더 + Worker 시크릿에 넣습니다 | 허브 | 낮음 |

> **Route 53 존은 2주간 지우지 마세요.** 롤백 = NS 를 Route 53 값으로 되돌리기 한 번.
> **DNSSEC 는 이번에 켜지 마세요.** 이전 중에 켜면 해석 실패 구간이 생깁니다.

---

## 2. 레코드 23개 — 입력 방식 요약

전체 값 표는 `reports/dns/xconda-ai-dns-inventory-20261126.md` §1 (그대로 복사 입력). 여기서는 **주의가 필요한 것만**:

| 레코드 | 입력 방식 | 주의 |
|---|---|---|
| apex · `www` · `test` A | 그대로 | **회색 구름** |
| `hub` CNAME | `hanahchafilmaker.github.io` | **회색 구름** → 5단계에서만 주황 |
| **`media`** A/AAAA | alias 는 못 옮김 → **CNAME `d1vtuvuzrisdnm.cloudfront.net` + 주황 구름 + SSL `Full (strict)`** | ❌ **가장 위험.** 이미지·영상 CDN |
| **`ml`** A | alias 는 못 옮김 → **CNAME `dualstack.cuberry-ml-alb-900449763.us-east-1.elb.amazonaws.com`** | ❌ ALB 보안그룹이 Cloudflare IP 를 막으면 503 |
| `s1`·`s2._domainkey`, `em3890` | CNAME 그대로 | ❌ **회색 구름 필수.** 옮긴 뒤 테스트 메일 1통 **링크 클릭까지** 확인 |
| `_acme-challenge_*` 4건, `_d5f4…`, `_3bcc…` | CNAME 그대로 | ❌ **회색 구름 필수.** 주황이면 인증서 갱신이 60~90일 뒤 **조용히** 실패 |
| apex TXT `fah-claim=…` | TXT 그대로 | 후이즈 소유확인 — 빠지면 소유권 확인이 풀릴 수 있음 |
| `_dmarc` TXT | `v=DMARC1; p=none;` | 그대로 |
| MX · SPF · CAA | **없음** | **새로 만들지 마세요.** 지금이 정상 |
| NS · SOA | Cloudflare 자동 | 옮길 필요 없음 |

---

## 3. 확인 부탁드릴 것 3가지 (이전 전에 알아야 합니다)

1. **`media` CloudFront** — alternate domain / 인증서 / origin(S3 인지 커스텀인지)
2. **`ml` ALB** — 인증서, 그리고 보안그룹이 Cloudflare IP 대역을 허용하는지
3. **SendGrid 링크 브랜딩** — 실제 호스트가 `em3890` 이 맞는지 (`s1`/`s2` DKIM 은 표에 있는 값 그대로)

---

## 4. 저희가 하는 일 (태윤 님은 알려만 주세요)

- 이전 후: `npm run hub:headers` (리다이렉트·WAF·캐시·noindex 점검) → 실패 0
- `npm run proxy:check` → `www.xconda.ai/hub/` 200
- `npm run redirect:check` → observe 단계 **"켜도 안전합니다"** → 그때 5단계 승인 요청
- `dns-before.txt` / `dns-after.txt` diff 로 **빠진 레코드 0** 증명 (NS·SOA 줄만 달라야 정상)

---

## 5. 필요할 때 보는 문서

| 문서 | 내용 |
|---|---|
| `reports/dns/xconda-ai-dns-inventory-20261126.md` | 레코드 23개 실제 값 · Cloudflare 입력 방식 · 위험 상세 · diff 절차 |
| `reports/cloudflare-migration-request-to-taeyun-20261126.md` | 요청 배경 · 일정/롤백 · 슬랙 문안 |
| `reports/dns/route53-export-20261126.json` | Route 53 내보내기 원본 (대조용) |

**급하지 않습니다. 0번(후이즈 NS 변경 가능 여부)만 먼저 알려 주세요.**
