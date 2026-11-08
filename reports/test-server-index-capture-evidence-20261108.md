# 테스트 서버 색인 — 캡처 #1 판독 · 추가 캡처 요청

**받은 자료** `site:test.xconda.ai` 구글 검색 결과 화면 캡처 1장 (1920×1032 PNG · 137,535 bytes)
**원본 SHA-256** `2766e763ea4582a955d57f26aefd68f9efec725dce203d36074bbe4291260d74`
**판독일** 2026-11-08 · **판독** 개발 지원 에이전트 (Arena)

> ⚠️ **원본은 이 저장소에 넣지 않았습니다.** 사고 증거는 공개 저장소에 두면 안 되므로(색인 차단은 접근 제어가 아님) 위 해시만 기록합니다. 원본은 증거 폴더에 보관해 주세요.

---

## 1. 결론 3줄

1. **테스트 서버는 구글에 색인되어 있습니다.** `site:test.xconda.ai` 결과로 **4건**이 확인됐습니다 — "색인 안 됨"이 아닙니다. 🟢→🔴
2. **노출된 4건이 전부 영문 SEO 랜딩/가이드 페이지**입니다(`/storyboards`, `/pricing`, `/guides` 2건). 즉 테스트 서버가 **로그인 뒤가 아닌 공개 마케팅 페이지**를 서비스하고 있고, 그게 검색에 잡혔습니다.
3. **다만 증거로 쓰기엔 두 가지가 빠졌습니다** — ① **결과 개수("약 N개")** ② **캡처 시각(작업 표시줄 시계)**. 화면에 둘 다 없어서, 지금 상태로는 "언제 확인한 몇 건인지"를 증명하기 어렵습니다 → 3장에서 재캡처 요청.

---

## 2. 화면에서 확인된 사실

| 항목 | 값 | 판정 |
|---|---|---|
| 브라우저 | Chrome **시크릿 모드** (주소창 오른쪽 `Incognito`) | ✅ 검색 이력 영향 없음 |
| 검색어 | `site:test.xconda.ai` | ✅ 정상 입력 |
| 결과 개수 표시 | 화면에 없음 | ❌ **재캡처 필요** |
| 캡처 시각 표시 | 없음 (작업 표시줄 미포함) | ❌ **재캡처 필요** |
| 결과 건수 | **4건 확인** (아래 표) | 🔴 색인됨 |

### 검색 결과 4건

| # | 경로 | 제목(검색 결과 표기) | 설명(스니펫) |
|---|---|---|---|
| 1 | `/storyboards` | AI Ad Storyboard Generator | Turn one prompt into a full ad storyboard with Xconda's AI ad storyboard generator — consistent characters, multiple frames, ready for any campaign. |
| 2 | `/pricing` | AI Storyboard Generator Pricing — Plans & Features | Compare Xconda's plans for AI storyboards, photos & video. A powerful Adobe Firefly alternative built for ad campaigns — see which plan fits your workflow. |
| 3 | `/guides` | blocking board | Explore Xconda's step-by-step guides to create consistent AI storyboards — tips, prompts & workflows for on-brand visuals across ads, photos & video. |
| 4 | `/guides` | auto angle generator | (3번과 **완전히 동일한 문구**) |

---

## 3. 다시 찍어 주셔야 할 것 (우선순위 순)

### ① 같은 검색을 **결과 개수 + 시계 포함**해서 1장 더 (필수)

- 스크롤 **맨 위**로 → 결과 개수 "약 N개" 보이게
- 브라우저 창 전체 + **작업 표시줄(시계)** 까지 캡처
- 이유: **몇 건이 색인됐고, 언제 확인했는지**가 증거의 최소 요건입니다

### ② 결과 1번(`/storyboards`)을 클릭해 **실제 도착 화면** 캡처

- 최종 주소(주소창) + 화면 상단(로고·로그인·환경 배너)
- 확인할 것: **로그인 없이 열리는가**, `test.` 인가 `www.` 로 넘어가는가, "베타/테스트" 표시가 있는가
- 이유: 검색 결과에 보이는 주소와 실제 열리는 화면이 다를 수 있습니다

### ③ Search Console **속성 목록** 캡처

- 상단 속성 선택 드롭다운을 **열어서** 캡처
- 이유: `test.` 속성이 등록돼 있는지, `www.` 만 있는지에 따라 색인 주체가 갈립니다

### ④ 색인된 URL의 **최초 색인일**

- 색인 > 페이지 → 위 4개 URL 검사 → "URL이 Google에 등록되어 있음" + **날짜**
- 이유: **11/06 사고 이전인지 이후인지**가 판단의 핵심입니다

### ⑤ (선택) `site:www.xconda.ai` 도 같은 방식으로 1장

- 두 호스트를 비교하면 "테스트 서버만의 문제인지, 운영 사이트도 같은 상태인지"가 바로 갈립니다

---

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

> `site:test.xconda.ai` 검색 결과 **4건이 색인된 상태로 확인**되었습니다(2026-11-08).
> 노출 페이지는 `/storyboards`, `/pricing`, `/guides`(blocking board, auto angle generator)이며, 모두 영문 마케팅 페이지입니다.
> 결과 개수와 캡처 시각이 화면에 없어 **재캡처**하고, 각 URL의 **최초 색인일**과 Search Console **속성 목록**, 클릭 시 **실제 도착 호스트**를 추가 확인하겠습니다.
> 공격자가 실제로 이 경로로 유입됐는지는 **접속 로그 확인 전에는 판단하지 않습니다.**

---

## 6. 캡처 체크리스트 진행 상황

| 항목 | 상태 |
|---|---|
| `site:` 검색 결과 캡처 | 🟡 1차 완료 — **결과 개수·시각 누락** |
| 실제 도착 호스트 확인 | ⬜ 필요 |
| Search Console 속성 목록 | ⬜ 필요 |
| 색인된 URL 최초 색인일 | ⬜ 필요 |
| 파일명 규칙 저장 + 기록표 | ⬜ 확인 필요 |
| 해시 기록 | ✅ SHA-256 확보(위 1장) |
| **차단 진행 전달** | ⏸ **보류** — ①②③④ 확인 후 |

---

*관련: `reports/test-server-index-capture-guide-20261108.md`(절차서) · `reports/seo-geo-execution-plan-20261108.md` §4-2 · `reports/xconda-stripe-abuse-incident-20261108.md`(증거 보존)*
