# XCONDA 가이드 센터 · Notion 연동 가이드

노션에 글을 쓰고 **Published**를 체크하면 → 가이드 사이트에 자동 반영됩니다.
사이트는 3분마다, 탭으로 돌아올 때, 그리고 상단 배지의 🔄 버튼으로 다시 불러옵니다.

연동 방법은 세 가지이며, **A + B(기본값)** 조합으로 이미 동작하도록 설정되어 있습니다.

| | 방법 A · 자동 스냅샷 (기본 · 권장) | 방법 B · 공개 프록시 | 방법 C · Worker 프록시 |
|---|---|---|---|
| 준비물 | 노션 페이지 **웹에 게시** + 깃허브 액션(이미 포함) | 노션 페이지 **웹에 게시** | 통합 토큰 + Cloudflare Worker 배포 |
| 반영 속도 | 약 10분 (워크플로 주기) | 즉시 | 약 1분 |
| 외부 서비스 의존 | 없음 (깃허브만) | `notion-api.splitbee.io` | Cloudflare |
| 노션 페이지 공개 | 공개 | 공개 | 비공개 유지 가능 |
| 난이도 | ⭐ (설정 완료) | ⭐ | ⭐⭐⭐ |

사이트는 **B를 먼저 시도하고, 실패하면 A(스냅샷)** 로 자동 전환합니다.
그래서 공개 프록시가 죽어도 글은 계속 표시됩니다.

---

## 방법 A. 자동 스냅샷 연동 ✅ 현재 기본값

브라우저에서 노션 API를 직접 부르면 CORS로 막히기 때문에, 지금까지는 무료 공개 프록시에 의존했습니다.
그런데 `notion-api.splitbee.io` 의 `/table` 경로가 **HTTP 500** 으로 죽으면서
`Failed to fetch` / `페이지 안에서 표(데이터베이스)를 찾지 못했습니다` 오류가 발생했습니다.

이를 없애기 위해 **깃허브 액션이 서버에서 노션을 대신 읽어** 사이트와 같은 폴더에
`notion-content.json` 을 만들어 둡니다. 서버에는 CORS가 없으므로 항상 성공하고,
사이트는 같은 출처의 정적 파일만 읽으면 됩니다.

| 파일 | 역할 |
|---|---|
| `.github/workflows/notion-sync.yml` | 10분마다(및 수동 실행 시) 노션을 읽어 커밋 |
| `scripts/notion-snapshot.mjs` | 게시된 페이지 → `notion-content.json` 변환 |
| `notion-content.json` | 글 목록 + 각 글 본문 (사이트가 읽는 파일) |
| `src/notionSnapshot.ts` | 사이트 쪽 스냅샷 리더 |

### 확인 · 수동 실행
1. 깃허브 저장소 → **Actions → “Notion 동기화” → Run workflow**
2. 로컬에서 바로 확인하려면:
   ```bash
   node scripts/notion-snapshot.mjs --print
   ```

### 다른 노션 페이지/DB로 바꾸기
저장소 **Settings → Secrets and variables → Actions → Variables** 에 추가하세요.

| 변수 | 값 예시 |
|---|---|
| `NOTION_PAGE_ID` | 게시된 페이지 URL 또는 32자리 ID |
| `NOTION_DATABASE_ID` | 페이지 안 데이터베이스 URL 또는 ID |

현재 기본값은 `scripts/notion-snapshot.mjs` 상단 상수입니다.
- 페이지: [XCONDA_NEWs](https://silicon-mascara-c7d.notion.site/XCONDA_NEWs-3e72ebc017ad8024a3f5ef8fb9f8c6dd) — `3e72ebc017ad8024a3f5ef8fb9f8c6dd`
- 데이터베이스: `3b54d2ea0d5e4ab5b33cff12de807517`

> ⚠️ 노션 페이지의 **게시(Publish)** 를 끄면 스냅샷 생성도 실패합니다. 비공개로 운영하려면 방법 C를 쓰세요.
> ⚠️ `Published` 체크가 없는 행은 스냅샷 파일에 아예 담기지 않습니다. (초안 유출 방지)

---

## 방법 B. 공개 프록시 (실시간, 설정 0분)

사이트는 기본으로 웹에 게시된 XCONDA_NEWs 페이지를 공개 프록시로 먼저 읽습니다
(`src/notion.ts` 의 `DEFAULT_ENDPOINT`).

1. 노션 페이지 우측 상단 **공유 → 게시(Publish)** 확인
2. 페이지 **본문 안에 데이터베이스(표 보기)** 를 만들고 아래 속성을 추가
3. 행을 추가하고 `Published` 체크 → 사이트에 노출

다른 공개 페이지로 바꾸려면 주소 뒤에 `?notion=<노션 페이지 URL 또는 ID>` 를 붙이거나,
`.env` 에 `VITE_NOTION_ENDPOINT=<페이지 URL>` 을 넣고 다시 빌드하세요. (`?notion=off` → 샘플 모드)

> 이 경로가 실패해도 오류 화면 대신 방법 A의 스냅샷이 사용됩니다.

---

## 1. 노션 데이터베이스 만들기 (공통)

데이터베이스 **하나**로 공지 · 업데이트 · 가이드 · FAQ를 모두 관리합니다.

| 속성 이름 | 유형 | 필수 | 설명 |
|---|---|---|---|
| `Title` (또는 `제목`) | 제목 | ✅ | 글 제목 / FAQ는 질문 |
| `Type` (또는 `유형`) | 선택 | ✅ | `공지` · `업데이트` · `가이드` · `FAQ` |
| `Published` (또는 `공개`) | 체크박스 | ✅ | 체크된 글만 사이트에 노출 |
| `Date` (또는 `날짜`) | 날짜 | ✅ | 게시일 (정렬 기준) |
| `Summary` (또는 `요약`) | 텍스트 | 권장 | 목록 요약 / **FAQ는 답변** |
| `Category` (또는 `카테고리`) | 선택 | 권장 | 공지: `공지` `점검` `이벤트` `정책` / 가이드: `시작하기` `시나리오` … / FAQ: `크레딧` `사용법` … |
| `Pinned` (또는 `고정`) | 체크박스 | | 공지 상단 고정 + 히어로 배너 노출 |
| `Important` (또는 `중요`) | 체크박스 | | 빨간 점 + 굵게 표시 |
| `Version` (또는 `버전`) | 텍스트 | | 업데이트용 (예: `v2.5.0`) |
| `Changes` (또는 `변경사항`) | 텍스트 | | 업데이트용. 한 줄에 하나씩: `[New] …` `[Improved] …` `[Fixed] …` (`신규/개선/수정`도 가능) |
| `Tool` (또는 `툴`) | 선택 | | 가이드용. 툴 이름(예: `Director's Cut`)과 같으면 해당 툴 카드의 사용법이 **이 노션 글로 대체**됩니다 |
| `Order` (또는 `순서`) | 숫자 | | 가이드 · FAQ 정렬 순서 |
| `Tags` (또는 `태그`) | 다중 선택 | | 태그 |
| `Cover` (또는 `커버`) | 파일 | | 썸네일 (없으면 페이지 커버 사용) |
| `Link` (또는 `링크`) | URL | | "스튜디오에서 바로 해보기" 버튼 주소 |
| `Title EN` | 텍스트 | | 영문 제목. 입력하면 EN 모드의 목록·검색·상세 제목에 사용 |
| `Summary EN` | 텍스트 | | 영문 요약 / FAQ 영문 답변 |
| `Category EN` | 텍스트 또는 선택 | | 영문 카테고리명 |
| `Changes EN` | 텍스트 | | 업데이트 영문 변경사항. `Changes`와 같은 한 줄 형식 |

**페이지 본문**(제목, 목록, 번호 목록, 체크리스트, 인용, 콜아웃, 코드, 이미지, 유튜브 영상, 북마크, 토글, 구분선)은 그대로 상세 모달에 표시됩니다. UI와 정적 툴 설명은 한/영 토글에 맞춰 전환되며, Notion 본문은 작성된 원문을 그대로 표시합니다.

---

# 방법 C. Worker 프록시 연동 (비공개 데이터베이스용)

## 2. 노션 통합(Integration) 만들기

1. https://www.notion.so/my-integrations → **새 통합** → Internal
2. 권한: **콘텐츠 읽기**만 체크 → 시크릿 토큰 복사
3. 데이터베이스 페이지 우측 상단 `···` → **연결(Connections)** → 방금 만든 통합 추가
4. 데이터베이스 URL에서 ID 복사: `notion.so/워크스페이스/`**`a1b2c3...32자리`**`?v=...`

## 3. 프록시 배포 (Cloudflare Worker · 무료)

```bash
npm i -g wrangler
cd notion-worker
wrangler init xconda-notion --yes   # 생성된 src/index.js 를 worker.js 내용으로 교체
wrangler secret put NOTION_TOKEN     # 시크릿 붙여넣기
wrangler secret put NOTION_DB_ID     # DB ID 붙여넣기
wrangler deploy
```
배포 후 `https://xconda-notion.<계정>.workers.dev` 주소를 복사합니다.
(선택) `ALLOW_ORIGIN` 변수에 가이드 사이트 도메인을 넣으면 해당 도메인에서만 호출할 수 있습니다.

## 4. 사이트에 연결

프로젝트 루트에 `.env` 파일:
```
VITE_NOTION_ENDPOINT=https://xconda-notion.<계정>.workers.dev
```
다시 빌드하면 상단 배지가 🟢 **Notion 실시간 연동**으로 바뀝니다.

**빌드 없이 테스트하기:** 사이트 주소 뒤에 `?notion=https://xconda-notion.<계정>.workers.dev` 를 붙이면 해당 브라우저에 저장되어 바로 연동됩니다. (`?notion=off` 로 해제)

## 운영 팁
- **동기화가 안 될 때**: Actions → “Notion 동기화” 워크플로가 초록불인지 확인 → 실패했다면 노션 페이지 게시 상태 확인 → `node scripts/notion-snapshot.mjs --print` 로 로컬 재현
- **긴급 공지**: `Type=공지`, `Pinned` + `Important` 체크 → 히어로 배너와 공지 목록 최상단에 즉시 노출
- **글 공유**: 상세 모달의 "공유" 버튼 → `#post=페이지ID` 링크가 복사되어, 링크를 열면 해당 글이 바로 열립니다
- **초안 작성**: `Published` 체크를 해제해 두면 사이트에 노출되지 않습니다
- 노션에 올린 이미지 파일 URL은 1시간 후 만료됩니다. 오래 노출할 이미지는 외부 URL(이미지 호스팅)로 삽입하는 것을 권장합니다
