# 테스트 서버 색인 — 캡처 판독 · 추가 캡처 요청

**받은 자료** `site:test.xconda.ai` 구글 검색 결과 화면 **2장**
**판독일** 2026-11-08 · **판독** 개발 지원 에이전트 (Arena)

| 캡처 | 파일 | 해상도 | SHA-256 | 상태 |
|---|---|---|---|---|
| #1 | `image-1.png` | 1920×1032 · 137,535 bytes | `2766e763ea4582a955d57f26aefd68f9efec725dce203d36074bbe4291260d74` | 시계 없음 |
| #2 | `image-2.png` | 1920×1080 · 219,737 bytes | `120b48f9ddf0978d4bcbebd8eac8b5617699608076f6f2217b2da7ab53a28ec3` | **시계 ✅ · 결과 개수 ❌** |
| #3 | `image-3.png` | 1920×1080 · 212,650 bytes | `306380b482de674ed179875ad22e88c349b0bd3264f53279d2bdd5b7aa8096b6` | `…/guides?t=blocking-board` 도착 |
| #4 | `image-4.png` | 1920×1080 · 452,996 bytes | `39c0819b5f9d15097b30ea9ad9fe67ef48ae203f0aa46ef0fd31a7d3ff690b36` | `/storyboards` 도착 (11:59) |
| #5 | `image-5.png` | 1920×1080 · 447,377 bytes | `d9130c64141fee3b2ed38395eef021a116e7f11ae91c5220bc19aa13f63f802d` | `/storyboards` 도착 (다른 장) |
| #6 | `image-6.png` | 1920×1080 · 201,560 bytes | `50217168caaeac3c2e91290dfa5e88fe005f07c230ad42872ddb24b74ca44679` | **`/pricing` 도착 (12:00)** |

> ⚠️ **원본은 이 저장소에 넣지 않았습니다.** 사고 증거는 공개 저장소에 두면 안 되므로(색인 차단은 접근 제어가 아님) 위 해시만 기록합니다. 원본은 증거 폴더에 보관해 주세요.

---

## 1. 결론 4줄

1. **테스트 서버는 구글에 색인되어 있습니다.** 캡처 #1·#2 모두 `site:test.xconda.ai` 결과 **4건**이 동일하게 확인됐습니다 — "색인 안 됨"이 아닙니다. 🔴
2. **노출된 4건이 전부 영문 SEO 랜딩/가이드 페이지**입니다(`/storyboards`, `/pricing`, `/guides` 2건). 테스트 서버가 **로그인 뒤가 아닌 공개 마케팅 페이지**를 서비스하고 있고, 그게 검색에 잡혔습니다.
3. **도착 호스트까지 확정됐습니다(캡처 #3~#6).** 클릭하면 **`test.xconda.ai` 에 그대로 머물고 `www.` 로 넘어가지 않으며, 로그인 없이 열립니다.** → "테스트 서버가 공개 마케팅 페이지를 서비스하고 그것이 색인됐다"로 확정. 🔴
4. **시각도 확보됐습니다** — 캡처 #2 `11:52`, 캡처 #3~#6 `11:59~12:00` (모두 시크릿 모드, 작업 표시줄 시계 포함). 결과가 4건에서 끝나 **색인 규모는 4건으로 보입니다.**
5. **남은 것은 2개뿐입니다** — ① Search Console **속성 목록**(`test.` 속성 등록 여부) ② 색인 4건의 **최초 색인일**(사고 11/06 이전/이후 판단에 필수).

---

## 2. 화면에서 확인된 사실

### 2-1. 캡처별 확인 상태

| 항목 | 캡처 #1 | 캡처 #2 | 판정 |
|---|---|---|---|
| 브라우저 | 시크릿(`Incognito`) | 시크릿(`Incognito`) | ✅ 검색 이력 영향 없음 |
| 검색어 | `site:test.xconda.ai` | `site:test.xconda.ai` | ✅ |
| 결과 4건 | ✅ | ✅ **동일 4건** | ✅ 반복 확인됨 |
| **캡처 시각** | ❌ 없음 | ✅ **2026-11-08 11:52**(작업 표시줄) | ✅ 확보 |
| **결과 개수("약 N개")** | ❌ 없음 | ❌ **없음** | 🟡 구글 표시 생략 가능성 |
| 페이지 끝("페이지 2" 링크) | ❌ | ❌ 없음 | 🟡 한 페이지에 4건 = 전체일 가능성 |

### 2-2. "결과가 4건이 전부인가?" 에 대한 판단

두 캡처 모두 **결과 4건 아래에 더 이상 결과가 없고, 페이지 하단(한국어 안내문)으로 바로 이어집니다.** 실제로 표시된 결과가 4건으로 끝나므로 **`site:test.xconda.ai` 색인은 4건이 전부일 가능성이 높습니다.**

다만 `site:` 검색은 구글 색인의 **근사치**입니다. 다음 두 가지는 여전히 Search Console 로만 확정할 수 있습니다.

- 실제 색인된 URL 총 개수(색인 > 페이지)
- **각 URL의 최초 색인일** ← 사고(11/06)와의 인과 판단에 필수

### 검색 결과 4건

| # | 경로 | 제목(검색 결과 표기) | 설명(스니펫) |
|---|---|---|---|
| 1 | `/storyboards` | AI Ad Storyboard Generator | Turn one prompt into a full ad storyboard with Xconda's AI ad storyboard generator — consistent characters, multiple frames, ready for any campaign. |
| 2 | `/pricing` | AI Storyboard Generator Pricing — Plans & Features | Compare Xconda's plans for AI storyboards, photos & video. A powerful Adobe Firefly alternative built for ad campaigns — see which plan fits your workflow. |
| 3 | `/guides` | blocking board | Explore Xconda's step-by-step guides to create consistent AI storyboards — tips, prompts & workflows for on-brand visuals across ads, photos & video. |
| 4 | `/guides` | auto angle generator | (3번과 **완전히 동일한 문구**) |

---

## 3. 캡처 진행 상황

### ✅ 완료 (증거 확보됨)

| 항목 | 결과 |
|---|---|
| `site:test.xconda.ai` 결과 | **4건 · 2회 반복 확인**(캡처 #1·#2) |
| 캡처 시각 | `2026-11-08 11:52` (#2), `11:59~12:00` (#3~#6) |
| 검색 이력 영향 | 없음 — 4장 모두 시크릿 모드 |
| **도착 호스트** | **`test.xconda.ai` 유지 · `www.` 로 리다이렉트 없음** (#3 `/guides?t=blocking-board`, #4·#5 `/storyboards`, #6 `/pricing`) |
| **로그인 없이 열람** | **가능** — 4장 모두 `Log in` / `Start free` 버튼이 **보이는 상태** = 비로그인 방문자 화면 |
| 해시 | 6장 전부 SHA-256 기록 |

> **확정된 사실**: 검색 결과를 클릭하면 **테스트 서버 화면이 그대로 열립니다.** 운영 www 로 넘겨주지도, 로그인을 요구하지도 않습니다. 즉 **비로그인 외부인이 테스트 계정 화면을 그대로 볼 수 있는 상태**입니다.

### ⬜ 남은 것 2개

**① Search Console 속성 목록** — 상단 속성 드롭다운을 **열어서** 캡처.

**② 색인 4건의 최초 색인일** — 색인 > 페이지 → 각 URL 검사 → "URL이 Google에 등록되어 있음" + 등록 날짜.
→ **사고(11/06) 이전이면** 검색으로 테스트 서버를 찾았을 가능성을 배제할 수 없고, **이후면** 그 연결이 약해집니다. 이 날짜 없이는 인과를 말할 수 없습니다.

## 4. 이 화면에서 이미 드러난 문제 4가지

### 4-1. 노출 페이지가 **저장소의 기능 페이지 패키지와 다릅니다** (확인 필요)

이 저장소 `www/feature-pages.json` 에는 20개 기능 페이지 슬러그가 있고 `auto-angle`·`blocking-board`가 포함됩니다. 그런데 **제목이 다릅니다.**

| 검색 결과 제목 | 저장소 패키지의 EN 제목 |
|---|---|
| `auto angle generator` | `Auto Angle Generator — reshoot one scene from many angles` |
| `blocking board` | `Blocking Board — digital rehearsal for camera and blocking` |
| (해당 없음) `AI Ad Storyboard Generator` | `FLEXBOARD — Shot-by-shot AI storyboard tool` |

→ **테스트 서버에는 이 저장소 패키지로 만든 페이지가 아닌 다른 버전의 영문 카피가 올라가 있습니다.** 검수되지 않은 카피가 그대로 색인된 상태일 수 있어, 어느 소스에서 나온 것인지(전유준 개발자) 확인이 필요합니다.

### 4-2. 주소 구조가 **옛 www 구조**입니다

`/storyboards`·`/pricing`·`/guides` 는 `www/README.md` 가 정리한 **기존 www 주소**이고, 계획은 이걸 `/features/<slug>` 로 옮기고 **`/storyboards` → 301 → `/features/flexboard`** 로 보내는 것입니다. 지금은 **301 이 적용되지 않은 옛 주소가 색인된 상태**입니다.

### 4-3. `/guides` 두 페이지의 메타 설명이 **완전히 동일**합니다

`blocking board` 와 `auto angle generator` 의 스니펫이 글자 단위로 같습니다. 중복 메타 설명은 구글이 스니펫을 임의로 바꾸거나 순위를 낮추는 원인입니다.

### 4-4. 제목 표기가 **소문자**이고 브랜드가 빠졌습니다

`blocking board`, `auto angle generator` — 툴 이름 표기 일관성이 없고 클릭률 손실로 이어집니다. (`/pricing` 은 `Adobe Firefly alternative` 문구를 쓰고 있어 **경쟁사 상표 사용** 검토도 필요합니다.)

> 위 4가지는 **색인 자체와 별개로 고칠 문제**입니다. 다만 **테스트 서버 작업이므로 지금은 손대지 말고**, ①~④ 증거 캡처가 끝난 뒤 운영 www 쪽에서 정리하는 것이 순서입니다.

---

## 5. "테스트 서버가 노출되면 안 되는데" — 무엇이 노출되고 있나

**맞습니다. 그리고 지금 이 순간에도 노출되고 있습니다.** 캡처 #3~#6 은 전부 **로그인하지 않은 방문자 화면**입니다(`Log in` / `Start free` 버튼이 그대로 보입니다). 즉 외부인이 구글에서 클릭 3번이면 아래 내용을 그대로 볼 수 있습니다.

### 5-1. 비로그인 상태로 확인된 노출 내용

| 화면 | 노출되는 것 | 성격 |
|---|---|---|
| `/pricing` (#6) | **전체 요금제** — Lite ₩9,900 / Plus ₩24,900 / Pro ₩49,900(정가 52,500, 5% OFF) · 월 크레딧 2,000/5,100/10,500 · 구독·크레딧팩 토글 | **가격 정책 전문** |
| `/pricing` (#6) | **도구별 생성 가능 수량** — FlexBoard 37/94/194 images, GPT Image 2 13/34/70, Turn 6/15/32 generations, Seedance 2.0·2.5의 4K/1080p/720p 초수 | **원가·마진 역산 가능한 단위 정보** |
| 전 화면 내비게이션 | **미출시로 보이는 툴 이름 전체** — Art Director Pro, Director's Sequence, Cinematic Image Blender, Expression Transformer, SceneSnap, ClothSwap, CineGrade AI, SpinAngle, Arrow View | **출시 전 로드맵·네이밍** |
| `/storyboards` (#4·#5) | 도구 카탈로그 + 기능 배지(Text Preview, Cut Grid, Cast & Face Lock, Detailed Edited / 1-Click, 2D Plan, 3D Review, Directing QA) + `Remaking a cut from 20 credits` 같은 **크레딧 정책 문구** + 작업 중으로 보이는 썸네일·영상 | **기능 명세 + 제작물** |
| `/guides` (#3) | 제품 사용 가이드 **13챕터 전체 목차** + Download 버튼 | **내부 문서** |
| 푸터 | `test.xconda.ai/studio/turn` 링크 | **스튜디오(앱) 진입 경로** |

### 5-2. 왜 문제인가 (4가지)

1. **가격·크레딧 정책이 검색에 실린다.** 가격은 나중에 바뀌는 정보인데, 한 번 색인되면 **검색 스니펫·캐시·제3자 아카이브에 옛 가격이 남습니다.** 실제로 지금 `site:` 스니펫에 가격 관련 카피가 잡혀 있습니다.
2. **미출시 기능·툴 이름이 먼저 공개된다.** `Art Director Pro` 같은 이름은 출시 전에 경쟁사가 먼저 보고 대응할 수 있고, 네이밍을 바꾸면 이미 색인된 이름과 충돌합니다.
3. **미완성 카피가 브랜드 이름으로 노출된다.** 소문자 제목(`blocking board`), `GPT Image 2`, `Detailed Edited` 같은 표기가 **검색 결과에 그대로** 나옵니다. 검수 전 문구가 공식 인상이 됩니다.
4. **테스트 서버가 스튜디오·결제 흐름과 연결돼 있다.** 캡처 하단의 `studio/turn` 링크가 이를 보여 줍니다. **이번 Stripe 사고의 전제(테스트 모드 가결제 → 운영 크레딧 적립)와 같은 표면**입니다. 여기에 결제 흐름이 열려 있다면 **노출은 정보 문제가 아니라 보안 문제**입니다.
   → 확인 필요(개발): `test.` 환경에서 **결제 버튼·Stripe 키가 어떤 모드인지**, `studio/*` 가 인증을 요구하는지.

> 정리: **이건 SEO 백로그 항목이 아니라 정보 노출(Information Disclosure) 사안**입니다. 색인은 "발견 경로"일 뿐이고, **본질은 테스트 환경이 인증 없이 공개돼 있다는 것**입니다.

### 5-3. 조치 계획 — 순서를 지켜야 합니다

색인 증거는 **이미 확보**됐지만(캡처 #1~#6), 아래 2개는 **차단하면 확인이 어려워지므로 먼저** 끝내야 합니다.

| 순서 | 할 일 | 담당 | 소요 |
|---|---|---|---|
| **0** | Search Console 속성 목록 캡처 + 색인 4건 **최초 색인일** 캡처 | 차하나 PD | 10분 |
| **0-2** | **차단 전 접속 로그 백업** — `test.` 호스트의 access log(IP·UA·시각·경로) export + SHA-256 | 개발 | 30분 |
| **1** | **인증 걸기(근본 조치)** — `test.` 호스트에 Basic 인증 또는 IP allowlist. **이게 실제 차단입니다** | 전유준 | 즉시 |
| **2** | `robots.txt` `Disallow: /` + **`X-Robots-Tag: noindex` HTTP 헤더** — 페이지 단위 색인 방지 | 전유준 | 1일 |
| **3** | Search Console **색인 제거 요청** — `test.` 속성에서 4개 URL 일시 제거 | 대표/차하나 | 24시간 내 |
| **4** | 색인된 4개 URL을 **`www` 대응 URL로 301** — 유입이 죽은 링크가 되지 않게 | 전유준 | 48시간 내 |
| **5** | **검증** — `site:test.xconda.ai` 재검색 0건 확인(반영까지 1~2주 걸릴 수 있음), 재확인 캡처 | 차하나 PD | 1~2주 |
| **6** | **재발 방지** — 테스트 배포마다 인증 + `X-Robots-Tag` **자동 부착**을 배포 파이프라인에 강제(Robots 헤더 없으면 배포 실패) | 전유준 | 2주 |

**주의 3가지**

- **`noindex` 만 걸면 부족합니다.** 이미 색인된 페이지는 `noindex` 를 읽고 나서야 빠지고, 그 사이에도 노출됩니다. **인증이 근본 조치, `noindex` 는 보조**입니다.
- **`robots.txt` `Disallow` 는 크롤러가 `noindex` 를 못 읽게 만들어 오히려 색인을 오래 유지시킬 수 있습니다.** → `Disallow` 와 `noindex` 를 동시에 쓸 때는 **이미 색인된 URL을 색인 제거 요청으로 먼저 정리**하는 순서가 안전합니다.
- **차단 전에 로그를 백업하세요.** 이번 사고의 유입 경로 판단에 필요한 자료이고, 차단 후에는 새 접속이 사라져 비교 기준이 없어집니다.

## 6. 보고할 때 쓰실 문장 (사실만)

> `site:test.xconda.ai` 검색 결과 **4건이 색인된 상태로 확인**되었습니다(2026-11-08 11:52~12:00, 시크릿 모드, `site:` 결과 2회 동일).
> 노출 페이지는 `/storyboards`, `/pricing`, `/guides`(blocking board), `/guides`(auto angle generator)이며 모두 영문 마케팅 페이지입니다.
> **검색 결과를 클릭하면 `test.xconda.ai` 화면이 로그인 없이 그대로 열립니다** — 운영 `www` 로 넘어가지 않고, 인증도 요구하지 않습니다. 즉 **비로그인 외부인이 요금제·미출시 툴 이름·가이드 목차를 볼 수 있는 상태**입니다.
> 표시된 결과가 4건으로 끝나 **색인 규모는 4건으로 보이나**, 정확한 색인 수와 **최초 색인일**은 Search Console 로 확인하겠습니다.
> 공격자가 실제로 이 경로로 유입됐는지는 **접속 로그 확인 전에는 판단하지 않습니다.**
> 조치는 **인증 → `noindex` → 색인 제거 요청 → 301** 순서로 진행하며, **차단 전 접속 로그를 먼저 백업**합니다.

## 7. 체크리스트 진행 상황

| 항목 | 상태 |
|---|---|
| `site:` 검색 결과 캡처 | ✅ **완료 (2회 · 4건 동일)** |
| 캡처 시각 | ✅ **완료 (11:52 / 11:59~12:00)** |
| 결과 개수("약 N개") | 🟡 표시 안 됨 — end-of-results 로 대체 확인 |
| **실제 도착 호스트 확인** | ✅ **완료 — `test.xconda.ai` 유지, 비로그인 열람** |
| **로그인 없이 열람 가능 여부** | ✅ **완료 — 4장 모두 비로그인 화면** |
| 해시 기록 | ✅ **6장 SHA-256 확보** |
| Search Console 속성 목록 | ⬜ 필요 (①) |
| 색인된 URL 최초 색인일 | ⬜ **필수** (②) |
| 접속 로그 백업(SHA-256) | ⬜ **차단 전 선행** (③) |
| **차단 실행** | 🔴 **즉시 착수** — 증거 확보 완료, 지연 사유 없음 |

---

*관련: `reports/test-server-index-blocking-runbook-20261108.md`(차단 런북) · `reports/test-server-index-capture-guide-20261108.md`(절차서) · `reports/seo-geo-execution-plan-20261108.md` §4-2 · `reports/xconda-stripe-abuse-incident-20261108.md`(증거 보존)*
