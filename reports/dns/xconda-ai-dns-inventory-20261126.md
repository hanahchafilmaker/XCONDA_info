# `xconda.ai` DNS 전수 조사표 (Cloudflare 이전 기준선)

- 작성 2026-11-26 · **갱신 2026-11-27 (태윤 님 회신 반영: `media`·`ml`·`em3890` 전부 회색 CNAME 이관 확정, `ml` 기존 503 기준선 기록)** · 근거 2가지
  1. **Route 53 내보내기** — 태윤 님이 준 `xconda-ai-records.json` (보관: `reports/dns/route53-export-20261126.json`)
  2. **권한 네임서버 실측** — 2026-11-26 `8.8.8.8` 에 직접 질의(`A`·`AAAA`·`CAA`·`CNAME`·`MX`·`NS`·`SOA`·`TXT`)
- 목적: ① Cloudflare 존에 **빠짐없이** 옮겨 적기 ② 이전 뒤 diff 로 "빠진 레코드 0" 증명 ③ **옮기면 깨지는 것** 미리 표시
- 이 문서는 **읽기 전용 조사표**입니다. 레코드를 바꾸지 않습니다.

> ⚠️ 이전 전에 반드시 볼 것: [§4 이전하면 깨지는 레코드 3+1건](#4-이전하면-깨지는-레코드--반드시-먼저-결정)

---

## 1. 실측 스냅샷 (2026-11-26)

| 이름 | 타입 | 값 / 대상 | TTL | 비고 |
|---|---|---|---|---|
| `xconda.ai` (apex) | A | `35.219.200.15` | 86400 | 제품 사이트 (GCLB 대역) |
| `xconda.ai` | NS | `ns-1548.awsdns-01.co.uk` `ns-1491.awsdns-58.org` `ns-166.awsdns-20.com` `ns-954.awsdns-55.net` | 172800 | **Route 53** — Cloudflare 이전 시 교체 대상 |
| `xconda.ai` | SOA | `ns-1548.awsdns-01.co.uk. awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400` | 900 | Cloudflare 가 자기 값으로 대체 |
| `xconda.ai` | TXT | `"fah-claim=002-02-24064398-7c2e-4287-a5e9-e1ae6ec2fcf7"`<br>`"google-site-verification=3YmL3d-bt_mxD6m9txYcpIyQnA_qn57Vd1uxrFI2Et4"` | 300 | 2건 모두 보존. 앞의 것은 **Firebase App Hosting 커스텀 도메인 소유확인**(`fah-claim`, Google). 뒤는 Search Console |
| `xconda.ai` | AAAA | *(없음)* | — | IPv6 미사용 |
| `xconda.ai` | MX | *(없음)* | — | **MX 없음 = 이 도메인으로 오는 메일은 현재 없음** |
| `xconda.ai` | CAA | *(없음)* | — | 인증서 발급 제한 없음 → 이전 후에도 그대로 두는 게 안전 |
| `xconda.ai` | SPF (`v=spf1`) | *(없음)* | — | SendGrid 는 DKIM(CNAME)로 인증 중. SPF 없음 |
| `_dmarc.xconda.ai` | TXT | `"v=DMARC1; p=none;"` | 300 | **모니터링만** — 정책 `none` |
| `s1._domainkey.xconda.ai` | CNAME | `s1.domainkey.u61585962.wl213.sendgrid.net` | 300 | **SendGrid DKIM 1** |
| `s2._domainkey.xconda.ai` | CNAME | `s2.domainkey.u61585962.wl213.sendgrid.net` | 300 | **SendGrid DKIM 2** |
| `em3890.xconda.ai` | CNAME | `u61585962.wl213.sendgrid.net` | 300 | **SendGrid 도메인 인증 Return-Path(봉투 SPF 위임)** — `s1`·`s2` 와 3종 세트 |
| `hub.xconda.ai` | CNAME | `hanahchafilmaker.github.io` | 300 | 허브(GitHub Pages). **B안의 대상** |
| `media.xconda.ai` | A (Alias) | `d1vtuvuzrisdnm.cloudfront.net` (Route 53 alias, `Z2FDTNDATAQYW2`) | alias | **CloudFront**. 실측 A = `3.169.173.31/.49/.79/.81`, AAAA = `2600:9000:…` |
| `media.xconda.ai` | AAAA (Alias) | `d1vtuvuzrisdnm.cloudfront.net` | alias | 위와 동일 (Cloudflare 에서는 회색 CNAME 1건으로 통합) |
| `_3bcc7d41….media.xconda.ai` | CNAME | `_edba3a06….jkddzztszm.acm-validations.aws` | 300 | **media 의 ACM 인증서 검증** |
| `ml.xconda.ai` | A (Alias) | `dualstack.cuberry-ml-alb-900449763.us-east-1.elb.amazonaws.com` (Route 53 alias, `Z35SXDOTRQ7X7K`, **EvaluateTargetHealth=true**) | alias | ML 서비스 ALB (**이전 전부터 503 상태**). 실측 `52.45.153.238` `54.167.65.239` |
| `test.xconda.ai` | A | `35.219.200.15` | 86400 | 테스트 서버 (apex·www 와 같은 IP) |
| `test.xconda.ai` | TXT | `"fah-claim=002-02-dd3d09c5-157e-4b09-af77-912292ec1ed5"` | 86400 | **Firebase App Hosting 소유확인**(test) |
| `_acme-challenge_gvsrh3lss5wifiym.test.xconda.ai` | CNAME | `ec21f696-….11.authorize.certificatemanager.goog` | 86400 | **test 의 Google 관리 인증서 검증** |
| `www.xconda.ai` | A | `35.219.200.15` | 86400 | 제품 사이트. **CNAME 아님** |
| `www.xconda.ai` | TXT | `"fah-claim=002-02-408363c1-0087-4fd9-85c8-55fa900e6036"` | 86400 | **Firebase App Hosting 소유확인**(www) |
| `_acme-challenge_gvsrh3lss5wifiym.www.xconda.ai` | CNAME | `7a1a45f8-….3.authorize.certificatemanager.goog` | 86400 | **www 의 Google 관리 인증서 검증** |
| `_acme-challenge_gvsrh3lss5wifiym.xconda.ai` | CNAME | `f9d0b41d-….7.authorize.certificatemanager.goog` | 300 | **apex 의 Google 관리 인증서 검증** |
| `_d5f4d2abb0f253a011a8705780480ec8.xconda.ai` | CNAME | `_04c5066cab7b1a15c1d919cb58bebe83.jkddzztszm.acm-validations.aws` | 300 | **apex/www 용 ACM 인증서 검증(레거시로 보임)** |
| `_github-pages-challenge-hanahchafilmaker.hub.xconda.ai` | TXT | *(없음 — NXDOMAIN)* | — | **없습니다.** HANDOFF 10.3 ④ 미완. 이전 전에 만들지 여부 결정 (§4-3) |

**총 23레코드** (Route 53 내보내기 기준: A 4 · AAAA 1 · CNAME 9 · NS 1 · SOA 1 · TXT 6 — alias 2쌍 포함).

### 내보내기 vs 실측 차이

| 항목 | 결과 |
|---|---|
| Route 53 내보내기의 모든 레코드 | 실측에서 **전부 확인됨** (누락 없음) |
| 실측에만 있는 레코드 | **없음** |
| TTL 차이 | `test`·`www` TTL 86400 인데 실측 21600 → **Route 53 최소 TTL 정책/캐시**. 문제 아님 |
| `media` A/AAAA | alias 라서 실측에는 CloudFront IP 가 보임. **정상** |

→ 즉 **이 표는 완전합니다.** 이전 후 같은 방식으로 다시 떠서 diff 가 비면 "빠진 레코드 0" 입니다.

---

## 2. Cloudflare 로 옮길 때 레코드별 주의

| 레코드 | Cloudflare 입력 방식 | 주의 |
|---|---|---|
| apex `A` | A 레코드 그대로 (`35.219.200.15`) | 프록시 끄기(회색). apex 를 주황 구름으로 켜면 GCLB 인증서와 충돌 가능 |
| `www` `A` | A 레코드 그대로 | `www` 를 주황 구름으로 켜면 `www.xconda.ai/hub/` 프록시 동작이 달라짐 → **회색 유지** |
| `media` A/AAAA | **회색 구름(DNS only)** `CNAME` → `d1vtuvuzrisdnm.cloudfront.net` (2026-11-27 태윤 님 회신으로 확정) | 서브도메인이므로 프록시(주황 구름) 없이 회색 CNAME 으로 두면 브라우저가 CloudFront 로 직행. TLS·인증서·IPv4/IPv6 모두 기존과 동일하게 동작 |
| `ml` A alias | **회색 구름(DNS only)** `CNAME` → `dualstack.cuberry-ml-alb-900449763.us-east-1.elb.amazonaws.com` | 회색 구름이므로 Cloudflare IP 대역 허용·SSL 모드 무관. **이전 전부터 이미 503 상태**이므로 이전 후 503 응답을 장애(롤백 사유)로 오판하지 말 것 |
| `s1`·`s2._domainkey` · `em3890` | CNAME 그대로, **회색 구름 필수** | SendGrid 도메인 인증 3종 세트(DKIM 2건 + Return-Path 1건). 주황 구름이면 메일 인증이 깨짐 |
| ACM/Google 검증 CNAME 4+2건 | CNAME 그대로, **회색 구름 필수** | **주황 구름이면 검증이 깨져 인증서 갱신 실패.** 특히 `_acme-challenge*` 는 와일드카드가 아니라 이름이 고정된 값이라 그대로 옮겨야 함 |
| `_dmarc` · `fah-claim` · `google-site-verification` | TXT 그대로 | `fah-claim` 이 빠지면 **제품 사이트(Firebase App Hosting) 커스텀 도메인 연결이 풀릴 수 있음** |
| `hub` | CNAME `hanahchafilmaker.github.io` | 이전 단계에서는 **회색 구름**. 5단계에서만 주황 구름 + `Full` |
| `test` | A 그대로 | 2026-11-08 noindex 사고 관련. 레코드는 유지, **사이트 자체는 손대지 않음** |
| NS/SOA | Cloudflare 가 자동 생성 | 옮길 필요 없음 |

### 2-0. 등록기관 확인 (RDAP · 2026-11-26)

| 항목 | 값 |
|---|---|
| 등록기관 | **Whois Corp. (후이즈)** — IANA Registrar ID 100 |
| 등록 / 만료 | 2025-10-14 / **2027-10-14** |
| 상태 | `clientTransferProhibited` (= **도메인 이전 잠금**, NS 변경에는 영향 없음) |
| DNSSEC | `delegationSigned: false` — **DS 레코드 없음**. 이전 중에 켜지 마세요 |
| 등록자 | Cubeberry Co., Ltd (연락처는 공개 정보이지만 **저장소에 옮겨 적지 않음**) |

→ **DNS 존(Route 53)과 위임(등록기관)은 다른 층입니다.** 레코드 23개는 Cloudflare 에 다시 만들고, 위임은 **후이즈 화면에서만** 바꿀 수 있습니다. Route 53 콘솔에서는 NS 위임을 바꿀 수 없습니다(ICANN 규칙).

### 2-1. Cloudflare 의 "자동 추가" 함정 3개

1. **존 추가 시 자동 스캔 결과를 그대로 믿지 마세요.** Cloudflare 는 apex·`www`·MX·흔한 서브도메인만 긁습니다. 위 표의 `em3890`, `s1/s2._domainkey`, `ml`, `media`, `_d5f4…` 는 **자동으로 안 들어올 가능성이 큽니다** → 손으로 넣으세요.
2. **`_acme-challenge_…` 처럼 밑줄(`_`)이 들어간 이름**은 Cloudflare 대시보드에서 그대로 입력됩니다(문제 없음). 다만 **프록시(주황)로 켜지 마세요.**
3. **DNSSEC**: Route 53 에서 켜져 있지 않음(DS 레코드 없음). Cloudflare 에서 켜지 **마세요** — 이전 중에 켜면 해석 실패 구간이 생깁니다. 이전이 끝나고 안정된 뒤 별도 작업으로.

---

## 3. 이전 후 diff 절차 (태윤 님용)

```powershell
# 이전 전 (지금) — PowerShell 5.1
$names = @('xconda.ai','www.xconda.ai','hub.xconda.ai','media.xconda.ai','ml.xconda.ai',
           'test.xconda.ai','_dmarc.xconda.ai','s1._domainkey.xconda.ai','s2._domainkey.xconda.ai',
           'em3890.xconda.ai','_d5f4d2abb0f253a011a8705780480ec8.xconda.ai',
           '_3bcc7d416c0aada3907e3b3955fbe52a.media.xconda.ai',
           '_acme-challenge_gvsrh3lss5wifiym.xconda.ai',
           '_acme-challenge_gvsrh3lss5wifiym.test.xconda.ai',
           '_acme-challenge_gvsrh3lss5wifiym.www.xconda.ai')
$names | ForEach-Object {
  "== $_"
  Resolve-DnsName -Name $_ -Server 8.8.8.8 -ErrorAction SilentlyContinue |
    Select-Object Name,Type,IPAddress,NameHost,String,TTL | Format-Table -AutoSize | Out-String
} | Out-File -Encoding utf8 dns-before.txt
```

NS 교체 **뒤에** 같은 명령을 `dns-after.txt` 로 떠서 `Compare-Object`:

```powershell
Compare-Object (Get-Content dns-before.txt) (Get-Content dns-after.txt)
```

> **`NS`·`SOA` 교체 + `media`·`ml` 이 Alias 에서 `CNAME` 행으로 표시되는 것(+ CloudFront/ALB 동적 엣지 IP 회전)만 다르고 나머지가 같으면 성공입니다.** (`Resolve-DnsName` 은 캐시를 보므로 `Clear-DnsClientCache` 후 실행. 전파 확인은 `https://dnschecker.org` 로 8.8.8.8 · 1.1.1.1 · 국내 통신사 3곳 이상.)

---

## 4. 이전하면 깨지는 레코드 — 2026-11-27 결정 반영

### 4-1. `media.xconda.ai` — ✅ **회색 구름 CNAME 이관 확정** (`d1vtuvuzrisdnm.cloudfront.net`)

- 초안에서는 주황 구름(프록시) + `SSL Full(strict)` 를 가정해 위험도가 높았으나, `media` 는 apex 가 아닌 서브도메인이므로 **DNS only(회색 구름) CNAME** 으로 그대로 옮기면 됩니다(2026-11-27 태윤 님 확인).
- 회색 구름이면 Cloudflare 가 TLS 를 가로채지 않고 브라우저가 CloudFront(`d1vtuvuzrisdnm.cloudfront.net`)로 직접 붙으므로 기존 ACM 인증서(`_3bcc7d41….media` CNAME, 회색 구름 유지)와 A/AAAA 응답이 그대로 유지됩니다.

### 4-2. `ml.xconda.ai` — ✅ **회색 구름 CNAME 이관 확정** + **기존 503 상태 기록**

- ALB DNS 이름(`dualstack.cuberry-ml-alb-900449763.us-east-1.elb.amazonaws.com`)을 **DNS only(회색 구름) CNAME** 으로 옮깁니다.
- 회색 구름이므로 ALB 보안그룹에 Cloudflare IP 대역을 열 필요가 없고 Cloudflare SSL 설정의 영향도 받지 않습니다.
- **중요 기준선**: 태윤 님 확인 결과 **`ml` 은 이전 전부터 이미 `503` 응답 상태**였습니다. 따라서 이전 후 점검에서 `ml.xconda.ai` 가 503 을 내더라도 DNS 이전 장애가 아니므로 **롤백 사유로 삼지 않습니다**(DNS 질의 시 ALB 주소로 CNAME 해석만 되면 정상).

### 4-3. `_github-pages-challenge-hanahchafilmaker.hub` TXT 가 **없음**

- HANDOFF 10.3 ④(도메인 인증)가 미완입니다. 지금 `hub.xconda.ai` 는 **아무 GitHub 계정이나 가져갈 수 있는 상태**입니다(서브도메인 탈취 위험).
- **이전 전후 언제든 만들면 안전합니다.** Cloudflare 에서 TXT 추가는 1분이고, GitHub 계정 Settings → Pages → Add a domain 에서 값을 받아 넣으면 됩니다.
- 단, 값은 GitHub 가 알려 주는 것이라 **GitHub 계정 소유자(저희 쪽) 작업**입니다.

### 4-4. `em3890` (SendGrid 도메인 인증 Return-Path) — ✅ **회색 구름 CNAME 그대로 이관 확정**

- `em3890.xconda.ai` → `u61585962.wl213.sendgrid.net` 은 `s1._domainkey` · `s2._domainkey` 와 함께 SendGrid Domain Authentication 이 발급하는 표준 3종 CNAME(봉투 Return-Path SPF 위임 + DKIM 2종)입니다.
- **회색 구름 CNAME 그대로** 옮깁니다(2026-11-27 태윤 님 확인).

### 4-5. 메일 — SPF·MX 가 **없다**는 사실을 기록

- `xconda.ai` apex 에 수동 MX / SPF TXT 는 없고, 발신 인증은 위 SendGrid CNAME 3종(`em3890`, `s1`, `s2`)으로 자동 위임되어 있습니다.
- 이전 후 `_dmarc p=none` 이 그대로면 DMARC 리포트만 오고 차단은 없습니다.
- **여기서 apex 에 SPF TXT 를 새로 넣지 마세요.** 지금 구성을 그대로 유지하는 것이 가장 안전합니다.

---

## 5. Worker 시크릿 `ORIGIN_KEY` — "저장된 값 없음" 확인

- **정상입니다.** 저장소에도, Route 53 에도, 지금은 어디에도 없습니다.
  - `hub-redirect-worker/wrangler.toml` 에 일부러 넣지 않았습니다(`scripts/hub-redirect-worker.test.mjs` 가 `wrangler.toml` 에 `ORIGIN_KEY =` 가 있으면 실패시킵니다).
  - `worker.js` 는 `env.ORIGIN_KEY` **시크릿이 있을 때만** 프록시 요청 통과 판정을 합니다.
- **그래서 지금은 새로 정하면 됩니다.** 값을 "찾는" 작업이 아니라 **만드는** 작업입니다.
- 정하는 순서(⑤ 주황 구름 이후):

  ```bash
  # 1) 임의의 긴 문자열 생성 (예: 48바이트)
  openssl rand -base64 48
  #   또는 PowerShell:  -join ((48..122) | Get-Random -Count 32 | % {[char]$_})
  ```

  1. 그 값을 **제품 사이트(`www`) 쪽 프록시 설정**에 `x-hub-origin-key` 헤더로 넣습니다 (담당: 제품 사이트/프록시 관리자).
  2. 같은 값을 Cloudflare Worker 시크릿으로 넣습니다: `npx wrangler secret put ORIGIN_KEY`
  3. `MODE = "observe"` 로 배포 → `npm run redirect:check` 가 **"켜도 안전합니다"** 를 낼 때까지 반복.
  4. 그때만 `MODE = "on"`.

- **순서를 바꾸면 영어 허브 전체가 무한 리다이렉트로 멈춥니다.** (HANDOFF 14장 · 700행 런북)

---

## 6. AWS → Cloudflare 로 **"또"** 옮기는 문제 (등록기관 = 후이즈)

여기서 헷갈리기 쉬운 지점을 정리합니다.

| 무엇 | 지금 | Cloudflare 로 바꿀 때 |
|---|---|---|
| **도메인 등록(소유권)** | **후이즈(Whois Corp., IANA ID 100)** — 만료 2027-10-14, `clientTransferProhibited` | **바꿀 필요 없음.** 등록기관은 그대로 두고 NS 만 바꾸는 게 정석 |
| **DNS 존(네임서버)** | AWS Route 53 (`ns-*.awsdns-*`) | Cloudflare 존 추가 → **NS 2개**(`xxx.ns.cloudflare.com`)를 **등록기관(후이즈) 화면에서** 교체 |

즉 "AWS 에서 등록 → 후이즈에서 다시 옮긴다" 가 아니라:

1. Cloudflare 에 `xconda.ai` 존 추가 (무료 플랜, **레코드는 회색 구름으로 먼저 전부 입력**)
2. Cloudflare 가 준 NS 2개를 **후이즈 관리 화면의 네임서버 항목**에 입력 (Route 53 NS 4개와 교체)
3. 전파 1~24h (TTL 172800 이라 최대 48h 까지 여유)
4. Route 53 hosted zone 은 **최소 2주간 그대로 두세요** — 롤백은 NS 를 Route 53 값으로 되돌리는 것 한 번이면 됩니다.

> **후이즈의 네임서버 변경 화면 위치**: 후이즈 로그인 → **마이후이즈 → 내 도메인 자산 관리** → 도메인 선택(체크) → **네임서버 변경** → `네임서버 정보 직접 입력` → 기존 값 삭제 후 Cloudflare NS 1·2차 입력 → 다음 → **신청하기**. 반영까지 **최대 24~48시간**(후이즈 안내).
> **IP 주소 입력란 주의(2026-11-27 태윤 님 확인)**: 외부 도메인 네임서버(`xxx.ns.cloudflare.com`)는 보통 호스트명만 넣으면 되지만, 후이즈 UI 에서 IP 주소 칸까지 요구할 경우에는 배정받은 Cloudflare NS 2개의 IPv4(`nslookup <배정NS>.ns.cloudflare.com 8.8.8.8`)를 조회해 짝지어 넣으면 됩니다.
> `fah-claim` TXT 는 **그대로 두세요** — 이건 후이즈 것이 아니라 **제품 사이트(Firebase App Hosting) 커스텀 도메인 소유확인** 값입니다.
> 등록기관 상태 `clientTransferProhibited`(도메인 이전 잠금)는 **NS 변경과 무관**합니다. 그대로 두세요.

---

## 7. 범위에 포함되는 서비스 (2026-11-27 이관 형태 확정)

| 서비스 | 레코드 | 이전 시 방식 (전부 **회색 구름**) |
|---|---|---|
| `media.xconda.ai` | CNAME `d1vtuvuzrisdnm.cloudfront.net` + ACM 검증 CNAME | **회색 구름 CNAME** (CloudFront 직결, TLS 충돌 없음) |
| **SendGrid** | `s1`, `s2` DKIM · `em3890` Return-Path | **회색 구름 CNAME 그대로** |
| `ml.xconda.ai` | CNAME `dualstack.cuberry-ml-alb-900449763.us-east-1.elb.amazonaws.com` | **회색 구름 CNAME** (**이전 전부터 503** — 503 유지가 정상) |
| 제품 사이트 | apex · `www` A | **회색 구름** 유지. `/hub/*` 프록시가 계속 200 인지 |
| 허브 | `hub` CNAME | 1~4단계는 **회색 구름** → 5단계에서만 주황 구름 + SSL `Full` |
| 인증서 검증 CNAME 4+2건 | `_acme-challenge_*` · `_d5f4…` · `_3bcc…` | **회색 구름 필수.** 주황이면 갱신 실패 |
| `test` | A + TXT | **회색 구름** 유지. 사이트 자체는 이번 범위 아님 |

**이전 후 반드시 확인할 3가지 (제가 실행)**
1. `npm run hub:headers` → 실패 0
2. `npm run proxy:check` → `www.xconda.ai/hub/` 200
3. `npm run redirect:check` → observe → "켜도 안전합니다"

**사전 확인 3가지 (✅ 2026-11-27 태윤 님 회신으로 모두 확정 완료)**
1. ✅ `media` → 회색 CNAME (`d1vtuvuzrisdnm.cloudfront.net`)
2. ✅ `ml` → 회색 CNAME (ALB 주소, 기존부터 503 상태)
3. ✅ `em3890` → 회색 CNAME 그대로

---

## 8. 남은 미결 (제가 준비할 것)

- [ ] `_github-pages-challenge-…hub` TXT — GitHub 계정 소유자가 값 발급 → Cloudflare 입력 (이전 전 권장)
- [ ] `ORIGIN_KEY` 값 생성·전달 (§5)
- [ ] `npm run hub:headers` 실행 결과 (Node 설치 후 — 태윤 님 PC 또는 저희 쪽 네트워크)
- [ ] Cloudflare **Web Analytics** 사용 여부 (허브는 GA4 사용 중 — 중복 집계 방지)
- [ ] 이전 후 `dns-before.txt` / `dns-after.txt` diff 공유
