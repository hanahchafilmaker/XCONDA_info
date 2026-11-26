# `xconda.ai` DNS 전수 조사표 (Cloudflare 이전 기준선)

- 작성 2026-11-26 · 근거 2가지
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
| `xconda.ai` | TXT | `"fah-claim=002-02-24064398-7c2e-4287-a5e9-e1ae6ec2fcf7"`<br>`"google-site-verification=3YmL3d-bt_mxD6m9txYcpIyQnA_qn57Vd1uxrFI2Et4"` | 300 | 2건 모두 보존. 앞의 것은 **후이즈(FinderA) 도메인 소유확인** |
| `xconda.ai` | AAAA | *(없음)* | — | IPv6 미사용 |
| `xconda.ai` | MX | *(없음)* | — | **MX 없음 = 이 도메인으로 오는 메일은 현재 없음** |
| `xconda.ai` | CAA | *(없음)* | — | 인증서 발급 제한 없음 → 이전 후에도 그대로 두는 게 안전 |
| `xconda.ai` | SPF (`v=spf1`) | *(없음)* | — | SendGrid 는 DKIM(CNAME)로 인증 중. SPF 없음 |
| `_dmarc.xconda.ai` | TXT | `"v=DMARC1; p=none;"` | 300 | **모니터링만** — 정책 `none` |
| `s1._domainkey.xconda.ai` | CNAME | `s1.domainkey.u61585962.wl213.sendgrid.net` | 300 | **SendGrid DKIM 1** |
| `s2._domainkey.xconda.ai` | CNAME | `s2.domainkey.u61585962.wl213.sendgrid.net` | 300 | **SendGrid DKIM 2** |
| `em3890.xconda.ai` | CNAME | `u61585962.wl213.sendgrid.net` | 300 | **SendGrid 링크 브랜딩(클릭 추적)** — 메일 본문 링크가 이 호스트를 씀 |
| `hub.xconda.ai` | CNAME | `hanahchafilmaker.github.io` | 300 | 허브(GitHub Pages). **B안의 대상** |
| `media.xconda.ai` | A (Alias) | `d1vtuvuzrisdnm.cloudfront.net` (Route 53 alias, `Z2FDTNDATAQYW2`) | alias | **CloudFront**. 실측 A = `3.169.173.31/.49/.79/.81`, AAAA = `2600:9000:…` |
| `media.xconda.ai` | AAAA (Alias) | `d1vtuvuzrisdnm.cloudfront.net` | alias | 위와 동일 |
| `_3bcc7d41….media.xconda.ai` | CNAME | `_edba3a06….jkddzztszm.acm-validations.aws` | 300 | **media 의 ACM 인증서 검증** |
| `ml.xconda.ai` | A (Alias) | `dualstack.cuberry-ml-alb-900449763.us-east-1.elb.amazonaws.com` (Route 53 alias, `Z35SXDOTRQ7X7K`, **EvaluateTargetHealth=true**) | alias | ML 서비스 ALB. 실측 `52.45.153.238` `54.167.65.239` |
| `test.xconda.ai` | A | `35.219.200.15` | 86400 | 테스트 서버 (apex·www 와 같은 IP) |
| `test.xconda.ai` | TXT | `"fah-claim=002-02-dd3d09c5-157e-4b09-af77-912292ec1ed5"` | 86400 | 후이즈 소유확인(테스트) |
| `_acme-challenge_gvsrh3lss5wifiym.test.xconda.ai` | CNAME | `ec21f696-….11.authorize.certificatemanager.goog` | 86400 | **test 의 Google 관리 인증서 검증** |
| `www.xconda.ai` | A | `35.219.200.15` | 86400 | 제품 사이트. **CNAME 아님** |
| `www.xconda.ai` | TXT | `"fah-claim=002-02-408363c1-0087-4fd9-85c8-55fa900e6036"` | 86400 | 후이즈 소유확인(www) |
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
| `media` A/AAAA | **Alias 를 그대로 옮길 수 없음** → `CNAME d1vtuvuzrisdnm.cloudfront.net` + **주황 구름(프록시)** 로 넣어야 함 (Cloudflare CNAME flattening 이 apex/서브도메인 모두 처리) | CloudFront 는 SNI 로 인증서를 고르므로 **SSL 모드 `Full (strict)`** 필요. `Flexible` 이면 521/526 |
| `ml` A alias | ALB DNS 이름을 **CNAME** 으로 (`dualstack.cuberry-ml-alb-900449763.us-east-1.elb.amazonaws.com`) | Cloudflare 는 `dualstack.` 제거한 이름을 권장. ALB 가 `xconda.ai` 인증서를 쓰면 **Full (strict)**. `EvaluateTargetHealth` 는 Cloudflare 에 없는 개념 → 헬스체크로 대체(선택) |
| ACM/Google 검증 CNAME 4+2건 | CNAME 그대로, **회색 구름 필수** | **주황 구름이면 검증이 깨져 인증서 갱신 실패.** 특히 `_acme-challenge*` 는 와일드카드가 아니라 이름이 고정된 값이라 그대로 옮겨야 함 |
| `_dmarc` · `fah-claim` · `google-site-verification` | TXT 그대로 | `fah-claim` 이 빠지면 **후이즈 도메인 소유확인이 풀릴 수 있음** |
| `hub` | CNAME `hanahchafilmaker.github.io` | 이전 단계에서는 **회색 구름**. 5단계에서만 주황 구름 + `Full` |
| `test` | A 그대로 | 2026-11-08 noindex 사고 관련. 레코드는 유지, **사이트 자체는 손대지 않음** |
| NS/SOA | Cloudflare 가 자동 생성 | 옮길 필요 없음 |

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

> **NS·SOA 줄만 다르고 나머지가 같으면 성공입니다.** (`Resolve-DnsName` 은 캐시를 보므로 `Clear-DnsClientCache` 후 실행. 전파 확인은 `https://dnschecker.org` 로 8.8.8.8 · 1.1.1.1 · 국내 통신사 3곳 이상.)

---

## 4. 이전하면 깨지는 레코드 — 반드시 먼저 결정

### 4-1. `media.xconda.ai` — CloudFront 인증서가 Route 53 alias 에 묶여 있음

- 지금 구조: `media` → **Route 53 alias** → CloudFront `d1vtuvuzrisdnm`. 인증서는 ACM(`_edba3a06….acm-validations.aws` 로 검증 중).
- Cloudflare 로 옮기면 alias 를 쓸 수 없어 **CNAME(주황 구름)** 으로 넣게 되고, 그러면 **Cloudflare ↔ CloudFront 구간 TLS** 가 새로 생깁니다.
- 확인 필요: CloudFront 배포의 **Alternate Domain Names(CNAMEs)** 에 `media.xconda.ai` 가 등록돼 있는지, 인증서가 `us-east-1` ACM 인지, **Origin 이 S3 인지 커스텀인지**.
- 실패하면 이미지·영상 CDN 이 죽습니다 → **가장 위험한 레코드.**

### 4-2. `ml.xconda.ai` — ALB 헬스체크·인증서

- 지금: Route 53 alias + `EvaluateTargetHealth=true` → ALB 가 죽으면 레코드가 자동으로 빠집니다.
- Cloudflare 로 옮기면 **그 동작이 사라집니다**(CNAME 은 대상이 죽어도 계속 응답).
- 확인 필요: ALB 리스너 인증서가 `xconda.ai`/`*.xconda.ai` 인지, Cloudflare SSL 모드, 그리고 **ALB 보안그룹이 Cloudflare IP 대역을 허용하는지**(원래 Cloudflare 만 받던 ALB 라면 IP 제한 때문에 503).

### 4-3. `_github-pages-challenge-hanahchafilmaker.hub` TXT 가 **없음**

- HANDOFF 10.3 ④(도메인 인증)가 미완입니다. 지금 `hub.xconda.ai` 는 **아무 GitHub 계정이나 가져갈 수 있는 상태**입니다(서브도메인 탈취 위험).
- **이전 전에 만드는 편이 안전합니다.** Cloudflare 에서 TXT 추가는 1분이고, GitHub 계정 Settings → Pages → Add a domain 에서 값을 받아 넣으면 됩니다.
- 단, 값은 GitHub 가 알려 주는 것이라 제가 만들 수 없습니다 → **태윤 님이 아니라 GitHub 계정 소유자(저희 쪽) 작업**입니다. 제가 절차를 정리해 드릴 수 있습니다.

### 4-4. `em3890` (SendGrid 링크 브랜딩) — **철자 확인 필요**

- 값이 `u61585962.wl213.sendgrid.net` 입니다. SendGrid 링크 브랜딩은 보통 `url<숫자>.도메인` 형태이고, 실제 추적 호스트는 `em<숫자>` 가 아니라 **`url<숫자>`** 인 경우가 많습니다.
- 지금 `em3890` 레코드가 **실제로 쓰이는지** 확인이 필요합니다: SendGrid 대시보드 → Settings → Sender Authentication → Link Branding 에 표시된 호스트와 대조.
- 안 쓰는 레코드면 옮기지 않아도 되고, 쓰는 레코드면 **반드시 그대로** 옮겨야 메일 링크가 살아 있습니다.
- (SendGrid 화면을 볼 수 있는 사람: 태윤 님 또는 메일 발송 담당.)

### 4-5. 메일 — SPF·MX 가 **없다**는 사실을 기록

- `xconda.ai` 에 **MX 없음 / SPF 없음**. 메일 수신은 안 하고, 발신은 SendGrid DKIM(`s1`/`s2`)로만 인증합니다.
- 이전 후 `_dmarc p=none` 이 그대로면 DMARC 리포트만 오고 차단은 없습니다.
- **여기서 SPF 를 새로 넣지 마세요.** 넣으면 지금까지와 다른 인증 경로가 생겨 오히려 스팸 판정이 흔들릴 수 있습니다. (필요하면 별도 작업으로 `v=spf1 include:sendgrid.net ~all` 검토)

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
| **도메인 등록(소유권)** | 후이즈(Findera?) | **바꿀 필요 없음.** 등록기관은 그대로 두고 NS 만 바꾸는 게 정석 |
| **DNS 존(네임서버)** | AWS Route 53 (`ns-*.awsdns-*`) | Cloudflare 존 추가 → **NS 2개**(`xxx.ns.cloudflare.com`)를 **등록기관(후이즈) 화면에서** 교체 |

즉 "AWS 에서 등록 → 후이즈에서 다시 옮긴다" 가 아니라:

1. Cloudflare 에 `xconda.ai` 존 추가 (무료 플랜, **레코드는 회색 구름으로 먼저 전부 입력**)
2. Cloudflare 가 준 NS 2개를 **후이즈 관리 화면의 네임서버 항목**에 입력 (Route 53 NS 4개와 교체)
3. 전파 1~24h (TTL 172800 이라 최대 48h 까지 여유)
4. Route 53 hosted zone 은 **최소 2주간 그대로 두세요** — 롤백은 NS 를 Route 53 값으로 되돌리는 것 한 번이면 됩니다.

> **후이즈의 네임서버 변경 화면 위치**: 후이즈 로그인 → 도메인 관리 → `xconda.ai` → **네임서버(NS) 변경**. 여기서 Route 53 NS 4개를 Cloudflare NS 2개로 바꿉니다. `fah-claim` TXT 는 **그대로 두세요**(후이즈 소유확인).
>
> **주의**: 후이즈가 "DNS 관리는 후이즈에서" 모드로 잠겨 있으면 NS 변경이 막힙니다. 그 경우 후이즈 고객센터에 "네임서버를 외부(Cloudflare)로 위임" 요청해야 합니다. 이게 "또 옮기는 작업"의 실체일 수 있습니다 — **먼저 후이즈 화면에서 NS 수정이 가능한지 확인**해 주세요.

---

## 7. 범위에 포함되는 서비스 (태윤 님 언급분)

| 서비스 | 레코드 | 이전 시 체크 |
|---|---|---|
| `media.xconda.ai` | A/AAAA alias + ACM 검증 CNAME | §4-1. CloudFront alternate domain·인증서·SSL 모드 |
| **SendGrid** | `s1`, `s2` DKIM · `em3890` 링크브랜딩 | §4-4. **회색 구름 필수**, 이전 후 테스트 메일 1통 발송해 링크 클릭까지 확인 |
| `ml.xconda.ai` | A alias → ALB | §4-2. 보안그룹·인증서 |
| 제품 사이트 | apex · `www` A | 회색 유지. `/hub/*` 프록시가 계속 200 인지 |
| 허브 | `hub` CNAME | 4단계 Pages 이전 후 5단계에서만 주황 구름 |
| 인증서 검증 CNAME 4건 | `_acme-challenge_*` · `_d5f4…` · `_3bcc…` | **회색 구름 필수.** 주황이면 갱신 실패 |
| `test` | A + TXT | 유지. 사이트 자체는 이번 범위 아님 |

**이전 후 반드시 확인할 3가지 (제가 실행)**
1. `npm run hub:headers` → 실패 0
2. `npm run proxy:check` → `www.xconda.ai/hub/` 200
3. `npm run redirect:check` → observe → "켜도 안전합니다"

**태윤 님 쪽에서 확인 부탁드릴 3가지**
1. `media` CloudFront 의 alternate domain / 인증서 / origin
2. `ml` ALB 인증서 + 보안그룹이 Cloudflare IP 를 허용하는지
3. SendGrid 링크 브랜딩 실제 호스트 (`em3890` 이 맞는지)

---

## 8. 남은 미결 (제가 준비할 것)

- [ ] `_github-pages-challenge-…hub` TXT — GitHub 계정 소유자가 값 발급 → Cloudflare 입력 (이전 전 권장)
- [ ] `ORIGIN_KEY` 값 생성·전달 (§5)
- [ ] `npm run hub:headers` 실행 결과 (Node 설치 후 — 태윤 님 PC 또는 저희 쪽 네트워크)
- [ ] Cloudflare **Web Analytics** 사용 여부 (허브는 GA4 사용 중 — 중복 집계 방지)
- [ ] 이전 후 `dns-before.txt` / `dns-after.txt` diff 공유
