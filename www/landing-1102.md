# 메인·허브 개선 요청 — 적용 현황과 메인 이관 안내

확인일: 2026-11-03 (KST). 이 저장소는 **허브**와 별도 www 이관 패키지입니다. **www.xconda.ai 메인 소스가 포함돼 있지 않아 아래 이관 코드는 운영 메인에 아직 적용되지 않았습니다.** 메인 담당자가 즉시 적용하고 운영 환경에서 확인해야 합니다.

### 11/3 추가 확인 — 운영본이 아닌 소스 사본

- 드라이브에서 2026-09-30 기준 `xconda-fullstack-main` 사본을 확인했습니다. Nuxt 4/Vue 앱이며 `app/pages/index.vue`에 `<NoticePopup />`, `app/components/NoticePopup.vue`에 중앙 팝업, `app/components/navs/TopNav.vue`에 내비게이션이 있었습니다. 이 사본의 랜딩 제목은 현재 운영 화면과 달라 **최신 운영 소스라고 볼 수 없습니다.** 전체를 덮어쓰지 말고 운영 저장소의 현재 코드를 먼저 확인합니다.
- 11/3 공개 엔드포인트 `https://www.xconda.ai/api/v1/comm/popup`은 **활성 팝업 한 건**을 반환했습니다. 레코드의 종료 시각은 11/6 11:00 KST이고 링크는 비어 있습니다. 이미지 내용을 이 환경에서 확인하지 못했으므로, 관리자 화면에서 해당 레코드가 할인 팝업인지 이미지·환경·ID를 먼저 대조합니다. API 응답은 시점에 따라 바뀔 수 있습니다.
- 중앙 할인 팝업을 긴급히 내리는 임시 조치가 필요하면, 운영 권한자가 실제 관리자 팝업 관리 화면에서 **확인된 할인 건만** 비활성화하고 공개 화면을 검증합니다. 9월 사본에는 `/admin/popup` 화면과 활성화 스위치가 있었으나 운영 화면은 확인하지 못했습니다. 그 사본의 날짜 입력은 일 단위로 저장하므로 저장 과정에서 기존 **11:00 종료 시각이 하루 끝으로 바뀔 위험**이 있습니다. 실제 UI·저장 결과를 확인하고, 다른 공지와 종료 설정을 덮어쓰지 마세요. 비활성화만으로 새 카드가 생기지는 않습니다.
- 이 사본에는 환경 설정 파일도 있으므로 전체를 공개 저장소에 복사하지 않습니다. 비밀 값이나 운영 설정은 이 이관 패키지에 포함하지 않았습니다.

## 1. 우선: 할인 카드

- 기존 **할인 중앙 팝업과 배경 오버레이, 스크롤 잠금**을 메인 소스에서 제거합니다. 새 카드만 추가하면 기존 팝업이 그대로 남을 수 있습니다. 9월 사본의 `NoticePopup`은 다른 공지도 표시하는 공용 컴포넌트이므로 할인 건만 분리·비활성화하고 전체 공지 기능을 무조건 삭제하지 않습니다. 현재 운영 구현은 별도 확인이 필요합니다.
- [`snippets/sale-card.js`](./snippets/sale-card.js)와 [`snippets/sale-card.css`](./snippets/sale-card.css)는 이관용 구현입니다. 두 파일을 메인 사이트의 공개 자산으로 복사해 연결합니다. **코드에 들어 있는 문구는 이관용 임시 문구**이므로 기존 행사 원문·번역과 대조하여 승인받은 내용으로 교체한 후 배포합니다.
- 카드 슬롯은 **헤더 바로 뒤, 본문 바로 앞의 일반 문서 흐름**에 둡니다. 카드는 오른쪽으로 정렬되고 최대 320px이며, 본문을 덮는 고정 오버레이가 아닙니다. 헤더가 `position: fixed`라면 레이아웃이 헤더 높이를 확보한 영역에 슬롯을 배치합니다. 9월 사본의 `TopNav`는 작은 화면 이상에서 고정되어 있으므로 슬롯만 추가하면 헤더와 겹칠 수 있습니다. 실제 운영 레이아웃에서 여백을 맞추고 로그인한 상태의 크레딧·프로필, 모바일 메뉴까지 확인합니다.

메인 사이트의 실제 경로와 템플릿에 맞춰 조정할 연결 예시:

```html
<link rel="stylesheet" href="/assets/sale-card.css">
<!-- 기존 헤더가 끝나는 위치 -->
<div id="sale-card-slot"></div>
<!-- 기존 본문 시작 -->
<script type="module">
  import { mountSaleCard } from '/assets/sale-card.js';
  mountSaleCard(document.getElementById('sale-card-slot'));
</script>
```

**Nuxt 4/Vue 참고 예시:** 9월 사본의 구조를 바탕으로 [`snippets/SaleCard.vue`](./snippets/SaleCard.vue)를 준비했습니다. 현재 운영 코드도 Nuxt인지 확인한 다음 세 파일(`SaleCard.vue`, `sale-card.js`, `sale-card.css`)을 메인의 같은 컴포넌트 디렉터리에 복사합니다. 홈 레이아웃에서 헤더 높이가 확보된 본문 시작점에 `<SaleCard />`를 배치합니다. 언어가 바뀌면 `useLocalePath('/pricing')`로 다시 연결하고 언마운트 때 이벤트를 정리합니다. 기존 공용 `<NoticePopup />`을 무조건 지우는 예시는 아닙니다.

- 카드 클릭은 언어별 Pricing으로, 별도의 X 버튼은 이동 없이 닫기만 합니다. 한국어·영어·일본어·중국어 가격 경로를 사용합니다.
- 종료 시각은 **2026-11-06 11:00 KST = 02:00 UTC**입니다. 열린 화면에서도 타이머와 화면 복귀 시 확인으로 숨깁니다. 브라우저의 시스템 시각이 틀리거나 백그라운드 타이머가 지연될 수 있으므로, 정확한 종료 보장이 필요하면 서버/CDN에서도 같은 UTC 시각을 기준으로 노출을 차단합니다.
- 새 X 닫힘은 `localStorage`의 `xconda-seedance-sale-2026-11-06-dismissed`에 `1`로 기억합니다. 로컬 저장이 차단된 경우에는 가능한 동안 현재 탭의 `sessionStorage`만 사용하며, 모든 저장소가 차단되면 현재 카드만 숨기며 재초기화·재방문 시 닫힘을 기억할 수 없습니다.
- 9월 사본의 기존 **N일간 다시 보지 않기** 기록은 `popupHide:<팝업 ID>`의 밀리초 타임스탬프입니다. 운영 구현과 같은 행사 ID를 확인했다면 Vue 예시에 `previous-notice-id`를 전달하거나, 직접 호출 시 `legacyHideUntilKey: 'popupHide:<확인한 ID>'`를 넘겨 이전 숨김 기한을 존중합니다. 기간제 기록을 새 카드의 영구 닫힘으로 바꾸지 않습니다. 사본에서 일반 `닫기`는 저장하지 않았습니다. 운영 구현이 다르면 그 규칙을 확인해 조정합니다.
- SPA에서는 언마운트 시 `mountSaleCard`가 반환한 정리 함수를 호출합니다. 노출 조건·종료 경계·닫기·기존 팝업 기록·다른 탭·저장소 차단은 `scripts/www/sale-card.test.mjs`, Vue SSR·언어 전환·언마운트는 `scripts/www/sale-card-vue.test.mjs`로 검증합니다. **실제 메인의 헤더·모바일 화면과 겹침 여부는 이관 후 브라우저에서 별도로 확인해야 합니다.**

## 2. 메인 메타데이터와 주소

2026-11-03 운영 화면에서 메인 제목은 요청한 `Directing Tools for AI Video — Storyboard & Blocking | Xconda`로 표시됐습니다. 기존 Google 검색 결과에는 이전 제목·설명이 남아 있을 수 있습니다. 화면 확인만으로는 HTML의 description, OG, Twitter, favicon, canonical 또는 hreflang을 검증할 수 없었습니다.

메인 담당자 확인·적용값:

```html
<title>Directing Tools for AI Video — Storyboard &amp; Blocking | Xconda</title>
<meta name="description" content="Turn scripts into 6–36 cut storyboards and rehearse actors and cameras in 2D/3D before you generate. Direct first, then generate with Seedance 2.5 and more.">
<meta property="og:title" content="Directing Tools for AI Video — Storyboard &amp; Blocking | Xconda">
<meta property="og:description" content="Turn scripts into 6–36 cut storyboards and rehearse actors and cameras in 2D/3D before you generate. Direct first, then generate with Seedance 2.5 and more.">
<meta name="twitter:card" content="summary_large_image">
```

- `og:image`는 **실제 메인 히어로 스토리보드**를 1200×630으로 만든 공개 이미지의 절대 URL로 지정하고, `twitter:image`도 같은 이미지로 맞춥니다. 실제 원본이 이 저장소에 없으므로 임의 이미지나 가짜 경로를 넣지 않았습니다.
- 파비콘 후보 [`assets/xconda-favicon-96.png`](./assets/xconda-favicon-96.png)는 이 저장소의 기존 XCONDA 512px 로고에서 만든 96×96 정사각형 PNG입니다. 브랜드 이미지 확인 후 www의 공개 루트에 `favicon-96.png`로 복사하고 아래 태그를 추가합니다.

```html
<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png">
```

- 11/3 메인 홈의 실제 언어 화면은 영어 `/`, 한국어 `/ko`, 일본어 `/ja`, 간체 중국어 `/zh`로 확인했습니다. `/en`은 404 화면입니다. 사이트맵은 여전히 기존 10개 URL만 표시했습니다. 홈에 적용할 hreflang 후보는 아래와 같으며, **각 URL의 HTTP 상태·자기 canonical·상호 링크를 원본 HTML에서 확인한 후** 네 페이지에 동일하게 넣습니다. 다른 경로는 언어별 페이지의 존재를 따로 확인해야 합니다.

```html
<link rel="alternate" hreflang="en" href="https://www.xconda.ai/">
<link rel="alternate" hreflang="ko" href="https://www.xconda.ai/ko">
<link rel="alternate" hreflang="ja" href="https://www.xconda.ai/ja">
<link rel="alternate" hreflang="zh-Hans" href="https://www.xconda.ai/zh">
<link rel="alternate" hreflang="x-default" href="https://www.xconda.ai/">
```

- 기능 페이지 이관 패키지는 실제로 작성된 **한국어·영어 두 언어**만 다루므로 일본어·중국어 대체 주소를 일괄 생성하지 않습니다. 홈의 hreflang·사이트맵은 기존 v2.6/A3 작업과 함께 처리합니다.
- 배포 후 Google Search Console의 **www 속성**에서 URL 검사 → 색인 생성 요청을 수행합니다. 이 작업과 검색 결과 갱신은 이 저장소에서 완료할 수 없습니다.

## 3. 링크·문구

- 메인 푸터의 Hub는 `https://hub.xconda.ai`, Instagram은 `https://www.instagram.com/xconda_official/`로 확인·변경합니다. 11/3 텍스트 조회로는 메인 푸터를 확인하지 못했습니다. 허브가 별도로 쓰는 Instagram은 `xconda_ai`, Threads는 `xconda_official`이므로 계정을 혼동해 일괄 변경하지 않습니다.
- 11/3 메인 화면에는 `Director's Cut`, `Director's Sequence`, 보조 도구의 Turn “사진 1장이면 충분, 방향별로 최대 4장까지”, `Connects directly to Seedance 2.5 and other leading video models`가 이미 표시됐습니다. 이 저장소의 허브 도구 카드·가이드와 이관 원고도 이에 맞췄습니다. 다만 `FLEX BOARD`와 `Flex Board` 등 메뉴 대소문자의 최종 기준은 확인되지 않았으므로 임의로 일괄 치환하지 않았습니다.
- 별도 확인: 메인 `/ko/guides`와 허브 `guide/flexboard-storyboard-guide/`, `post/seedance-storyboard-before-render/`에는 ‘Seedance 2.5에 최적화된’ 카드 문구가 **화면 사용법 설명**으로 남아 있습니다. 실제 스튜디오 카드 표기를 확인하고, 변경이 필요하면 Notion 원문과 해당 번역을 함께 수정합니다.
- 메인 Workflow의 Output 문구와 크레딧 안내의 색·크기, 반응형 화면은 메인 소스에서 직접 조정·검증해야 합니다. 이 저장소의 카드 스타일은 그 작업을 대신하지 않습니다.
- www 기능 페이지 패키지의 허브 링크는 스냅샷에 맞춰 `post`, `guide`, `qna` 구분을 기록합니다. FLEXBOARD는 현재 공개된 `guide/flexboard-storyboard-guide/`로 연결합니다. 이는 **메인 랜딩의 FAQ 추가와 별개**입니다.

## 4. 결정과 운영자 작업이 필요한 항목

1. **허브 할인 Q&A:** `qna/current-discount-events/`는 11/6 11:00 KST가 지나면 현재 진행형 문구가 오래됩니다. 종료 문구로 수정할지, 항목을 내릴지 아직 결정되지 않아 변경하지 않았습니다. 이 항목은 Notion Q&A 표에서 `허브 게시=게시`로 강제 공개 중입니다. 결정 후 Notion 원문과 `content/i18n/en.json`, `ja.json`, `zh.json`을 함께 처리하고, 한국어·번역 페이지의 본문·메타·FAQ JSON-LD·사이트맵·직접 URL을 확인해야 합니다. 숨김만으로 기존 정적 URL까지 자동 삭제된다고 가정하지 마세요.
   추가 발견: 허브의 `guide/flexboard-storyboard-guide/`, `post/seedance-storyboard-before-render/`, `post/scenario-to-final-video/`, `post/ai-video-9-cut-curse-fix/`, `post/physics-inversion-patent-verify-before-render/`, `post/ontology-patent-cut-continuity/`에도 시댄스 할인 진행형 문구가 있습니다. 같은 행사인지와 별도 FLEXBOARD 프로모션의 종료일을 확인한 뒤 원문·번역을 함께 점검해야 합니다. 요청되지 않은 문구를 임의로 변경하지 않았습니다.
2. **메인 FAQ 5개:** 질문과 답변 원문이 없어 작성하지 않았습니다. 원문을 받은 뒤 메인에 추가하고 `https://hub.xconda.ai/qna/`로 더 보기 링크를 연결합니다.
3. **메인 배포:** 중앙 팝업 제거, 카드 이관, 푸터 및 메타 확인·수정, 실제 히어로 공유 이미지, 보조 텍스트 가독성은 www 담당자의 작업이 필요합니다.
4. 기존 `xconda-seo-geo-1108-checklist.md` 파일은 이 저장소에서 찾지 못했습니다. A3·색인 요청은 기존 담당자 체크리스트와 중복하지 않도록 함께 관리합니다.
