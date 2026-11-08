# `test.xconda.ai` noindex 부착 — 적용 패키지

**작성** 2026-11-08 · **요청** 개발팀 3번 항목(`X-Robots-Tag: noindex, nofollow, noarchive`) 직접 처리
**관련** `reports/test-server-index-blocking-runbook-20261108.md` §2-2 · `reports/slack-dev-request-20261108.md`

---

## 0. 먼저 분명히 — 제가 직접 배포할 수는 없습니다

이 저장소는 **`hub.xconda.ai` 정적 사이트**입니다(`CNAME` = `hub.xconda.ai`). `test.xconda.ai` 는 여기서 서비스되지 않습니다.

- 이 저장소 전체에서 `test.xconda.ai` 문자열 검색 → **0건**
- `www/README.md` 9행: *"www 쪽은 현재 운영 소스 저장소가 이 작업 환경에 연결되어 있지 않습니다"*
- www/스튜디오 앱은 **Nuxt 4/Vue** (`xconda-fullstack-main`), 이 환경에 체크아웃돼 있지 않습니다
- 이 환경은 외부 네트워크가 `github.com` 등으로 제한돼 있어 `test.xconda.ai` 응답을 직접 확인할 수도 없습니다

**권한 문제가 아니라 접근 문제입니다.** 다만 헤더는 **배포 없이도 오늘 바로** 붙일 수 있는 경로가 있고, 코드로 넣을 패치도 준비했습니다. 아래 두 가지 중 하나를 쓰시면 됩니다.

| 경로 | 소요 | 배포 필요 | 권장 |
|---|---|---|---|
| **A. Cloudflare Transform Rule** | **2분** | ❌ 없음 | ✅ **지금 바로** |
| **B. 코드(미들웨어) 패치** | 30분 | ✅ 있음 | 재발 방지용으로 병행 |

---

## A. 가장 빠른 길 — Cloudflare Transform Rule (배포 없음, 2분)

색인 4건을 지금 당장 멈추려면 이게 가장 빠릅니다. **호스트 조건을 걸 수 있어 운영에 절대 안 걸립니다.**

1. Cloudflare 대시보드 → 해당 존(`xconda.ai`) 선택
2. **Rules → Transform Rules → Modify Response Header → Create rule**
3. 입력값

| 항목 | 넣을 값 |
|---|---|
| Rule name | `noindex test host` |
| When incoming requests match | **Custom filter expression** |
| 조건 | `Hostname` **equals** `test.xconda.ai` |
| Then | **Set static** |
| Header name | `X-Robots-Tag` |
| Header value | `noindex, nofollow, noarchive` |
| (선택) 추가 | `Cache-Control` 은 건드리지 마세요 |

4. **Deploy** → 즉시 적용

> **왜 Transform Rule 인가**: 호스트 조건을 걸 수 있는 몇 안 되는 지점입니다. `_headers` 파일이나 nginx `add_header` 는 그 프로젝트/서버에 붙은 **모든 도메인**에 걸려서, test 가 운영과 같은 프로젝트의 커스텀 도메인이면 **운영 www 까지 noindex** 가 됩니다. 그러면 복구에 몇 주가 걸립니다.

### A-1. 확인 (배포 후 1분 내)

```bash
curl -sI https://test.xconda.ai/pricing | grep -i x-robots-tag
# 기대: X-Robots-Tag: noindex, nofollow, noarchive

curl -sI https://www.xconda.ai/pricing | grep -i x-robots-tag
# 기대: 아무것도 안 나와야 정상 ← 이걸 꼭 확인하세요
```

> Cloudflare 캐시에 이미 올라간 HTML 은 헤더가 안 붙을 수 있습니다. `curl` 에 `-H 'Cache-Control: no-cache'` 를 붙이거나 대시보드에서 **Caching → Purge Everything** 후 확인하세요.

---

## B. 코드로 넣는 길 — 재발 방지 (권장 병행)

호스트 판정은 요청 시점에 해야 정확합니다. 같은 빌드를 운영·테스트에 함께 배포해도 안전해집니다.
**준비된 파일 두 개**를 www 앱 저장소에 그대로 복사하세요.

| 이 저장소 파일 | www 앱 저장소 위치 |
|---|---|
| `www/snippets/noindex-test-host.ts` | `server/middleware/000-noindex-test-host.ts` |
| `www/snippets/nuxt-noindex.config.ts` | `nuxt.config.ts` 에 **키만 병합**(덮어쓰기 금지) |

### B-1. 동작 방식

- **호스트 판정** — `test.` · `staging.` · `dev.` · `*.pages.dev` · `*.vercel.app` · `localhost`. 운영(`xconda.ai`·`www.xconda.ai`·`hub.xconda.ai`)은 **명시적 제외 목록**으로 손대지 않습니다.
- **SSR** — `nuxt build` 로 서빙하면 미들웨어가 모든 응답에 헤더를 붙입니다.
- **SSG** — `nuxt generate` 로 정적 배포하면 미들웨어는 **실행되지 않습니다.** 그 경우 `nuxt.config.ts` 조각이 `app.head.meta` 로 `<meta name="robots" content="noindex...">` 를 심습니다. 판정은 빌드 env(`NUXT_PUBLIC_SITE_ENV=test`)입니다.
  → **정적 배포라면 A안(Transform Rule)이 사실상 필수**입니다. meta 태그는 크롤러가 읽긴 하지만, `X-Robots-Tag` 헤더가 더 확실하고 PDF·이미지까지 커버합니다.

### B-2. CI 에 넣을 것

```yaml
# 테스트 배포 job 에만
env:
  NUXT_PUBLIC_SITE_ENV: test
```

### B-3. 비밀번호 보호와의 관계

`X-Robots-Tag` 는 **색인만** 막습니다. **URL 을 아는 사람에게는 여전히 열립니다.**
→ 인증(Basic 인증/IP allowlist)이 근본 조치이고, 이건 그 위에 얹는 보조입니다. 둘 다 필요합니다.

---

## C. 절대 하면 안 되는 것 3가지

| ❌ | 결과 |
|---|---|
| `robots.txt` 에 `Disallow: /` 만 걸기 | 크롤러가 **페이지의 noindex 를 읽지 못해** 이미 색인된 4건이 더 오래 남습니다. **noindex 가 먼저**, Disallow 는 색인 제거 확인 후에. |
| 공용 `_headers` / nginx `add_header` / `routeRules: {'/**': ...}` 에 무조건 적용 | 운영 `www` 까지 noindex → **검색 유입 99%가 `/` 에서 나오는 구조라 치명적** (Search Console: 클릭 988 중 `/` 가 976). |
| `test.` 환경 canonical 을 자기 자신으로 두기 | 자기 자신이 "정식 페이지"가 되어 색인이 강화됩니다. canonical 은 `www` 대응 URL 을 가리키게 하거나 제거하세요. |

---

## D. 적용 후 제가 이어서 할 일

- [ ] **색인 제거 요청** — 헤더 부착 확인 후 4개 URL 등록 (`/pricing`, `/storyboards`, `/guides`×2). `test.` Search Console 속성 등록 여부 선행 확인 필요.
- [ ] **`site:test.xconda.ai` 추적** — 주 1회, 0건까지. 반영은 보통 1~2주.
- [ ] **재확인 캡처** — 헤더 부착 직후 1장, 색인 0건 확인 시 1장. 해시 기록 후 런북 §5 「현재 차단 상태」 갱신.
- [ ] **301 준비** — 색인된 URL 클릭이 401/빈 화면이 되지 않도록 `www` 대응 URL 매핑.

---

## E. 필요한 확인 (제가 알 수 없는 것)

1. `test.xconda.ai` 가 **Cloudflare 존에 있는지** (있으면 A안 2분)
2. 테스트 배포가 **SSR 인지 SSG 인지** (`nuxt build` / `nuxt generate`)
3. `test.` 가 **별도 Cloudflare Pages 프로젝트인지**, 운영과 같은 프로젝트의 커스텀 도메인인지
4. www 앱 저장소(`xconda-fullstack-main` 추정)를 이 환경에 연결해 줄 수 있는지 → 연결되면 **제가 B안을 직접 패치·커밋까지 하겠습니다**

> 1~3번 중 하나만 알려주시면 그 경로에 맞춰 패치를 확정하겠습니다. 4번이 되면 코드 적용도 제가 직접 합니다.

---

*본 문서는 공개 저장소에 포함됩니다. 계정·토큰·비밀번호는 기록하지 않습니다.*
