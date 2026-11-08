# 테스트 서버 색인 — 캡처 판독 · 추가 캡처 요청

**받은 자료** `site:test.xconda.ai` 구글 검색 결과 화면 **2장**
**판독일** 2026-11-08 · **판독** 개발 지원 에이전트 (Arena)

| 캡처 | 파일 | 해상도 | SHA-256 | 상태 |
|---|---|---|---|---|
| #1 | `image-1.png` | 1920×1032 · 137,535 bytes | `2766e763ea4582a955d57f26aefd68f9efec725dce203d36074bbe4291260d74` | 시계 없음 |
| #2 | `image-2.png` | 1920×1080 · 219,737 bytes | `120b48f9ddf0978d4bcbebd8eac8b5617699608076f6f2217b2da7ab53a28ec3` | **시계 ✅ · 결과 개수 ❌** |

> ⚠️ **원본은 이 저장소에 넣지 않았습니다.** 사고 증거는 공개 저장소에 두면 안 되므로(색인 차단은 접근 제어가 아님) 위 해시만 기록합니다. 원본은 증거 폴더에 보관해 주세요.

---

## 1. 결론 3줄

1. **테스트 서버는 구글에 색인되어 있습니다.** 캡처 #1·#2 모두 `site:test.xconda.ai` 결과 **4건**이 동일하게 확인됐습니다 — "색인 안 됨"이 아닙니다. 🔴
2. **노출된 4건이 전부 영문 SEO 랜딩/가이드 페이지**입니다(`/storyboards`, `/pricing`, `/guides` 2건). 테스트 서버가 **로그인 뒤가 아닌 공개 마케팅 페이지**를 서비스하고 있고, 그게 검색에 잡혔습니다.
3. **캡처 #2로 시각은 확보됐습니다**(`2026-11-08 11:52`, 오전). 다만 **결과 개수("약 N개")는 두 장 모두 없습니다** — 구글이 표시를 생략했을 가능성이 높지만, 이건 화면을 봐야 확정됩니다. → 3장 ①만 남았습니다.

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

## 3. 남은 캡처 (우선순위 순)

### ✅ 완료된 것

- `site:test.xconda.ai` 결과 4건 — **2회 반복 확인**(캡처 #1·#2)
- 캡처 시각 — `2026-11-08 11:52` (캡처 #2)
- 검색 이력 영향 없음 — 시크릿 모드
- 해시 기록 — 2장 모두 SHA-256 확보

### ① 결과 1번(`/storyboards`) 클릭 → 실제 도착 화면 캡처 **(다음 순서)**

- 최종 주소(주소창) + 화면 상단(로고·로그인 버튼·환경 배너)
- 확인할 것: **`test.` 인가 `www.` 인가**, **로그인 없이 열리는가**, "베타/테스트" 표시가 있는가
- 이유: 검색 결과 호스트와 실제 서비스 호스트가 다를 수 있습니다. **이게 확정되어야 "테스트 서버 노출"인지 "운영 사이트 노출"인지가 갈립니다.**

### ② Search Console **속성 목록** 캡처

- 상단 속성 선택 드롭다운을 **열어서** 캡처
- 이유: `test.` 속성이 등록돼 있는지, `www.` 만 있는지에 따라 색인 주체가 달라집니다

### ③ 색인된 URL의 **최초 색인일**

- 색인 > 페이지 → 4개 URL 각각 URL 검사 → "URL이 Google에 등록되어 있음" + **등록 날짜**
- 이유: **11/06 사고 이전인지 이후인지**가 판단의 핵심입니다. 이 날짜 없이는 인과를 말할 수 없습니다

### ④ (선택) `site:www.xconda.ai` 도 같은 방식으로 1장

- 두 호스트를 비교하면 "테스트 서버만의 문제인지, 운영 사이트도 같은 상태인지"가 바로 갈립니다

### ⑤ (선택) 결과 개수 보강

- 검색창에서 **엔터를 한 번 더** 눌러 새로 검색하면 "약 N개"가 표시되는 경우가 있습니다
- 표시되지 않으면 **"표시되지 않음"으로 기록**하고 ②③ 으로 확정하면 됩니다(억지로 만들 필요 없음)

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

## 5. 보고할 때 쓰실 문장 (사실만)

> `site:test.xconda.ai` 검색 결과 **4건이 색인된 상태로 확인**되었습니다(2026-11-08 11:52, 시크릿 모드, 동일 결과 2회 확인).
> 노출 페이지는 `/storyboards`, `/pricing`, `/guides`(blocking board), `/guides`(auto angle generator)이며 모두 영문 마케팅 페이지입니다.
> 표시된 결과가 4건으로 끝나 **색인 규모는 4건으로 보이나**, 정확한 색인 수와 **최초 색인일**은 Search Console 로 확인하겠습니다. 함께 **클릭 시 실제 도착 호스트(`test.`/`www.`)** 와 **속성 등록 여부**도 확인합니다.
> 공격자가 실제로 이 경로로 유입됐는지는 **접속 로그 확인 전에는 판단하지 않습니다.**

## 6. 캡처 체크리스트 진행 상황

| 항목 | 상태 |
|---|---|
| `site:` 검색 결과 캡처 | ✅ **완료 (2회 · 4건 동일)** |
| 캡처 시각 | ✅ **완료 (2026-11-08 11:52)** |
| 결과 개수("약 N개") | 🟡 표시 안 됨 — 선택 보강 |
| 실제 도착 호스트 확인 | ⬜ **다음 순서 (①)** |
| Search Console 속성 목록 | ⬜ 필요 (②) |
| 색인된 URL 최초 색인일 | ⬜ **필수** (③) |
| 파일명 규칙 저장 + 기록표 | ⬜ 확인 필요 |
| 해시 기록 | ✅ 2장 SHA-256 확보 |
| **차단 진행 전달** | ⏸ **보류** — ①②③ 확인 후 |

---

*관련: `reports/test-server-index-capture-guide-20261108.md`(절차서) · `reports/seo-geo-execution-plan-20261108.md` §4-2 · `reports/xconda-stripe-abuse-incident-20261108.md`(증거 보존)*
