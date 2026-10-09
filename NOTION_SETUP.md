# XCONDA허브 · Notion 연동 가이드

노션에 글을 쓰고 **Published**를 체크하면 → **다음 스냅샷 생성(GitHub Actions) 직후** 가이드 사이트에 반영됩니다.
스냅샷을 얼마나 자주 만드느냐는 **워크플로를 깨우는 트리거**에 달려 있습니다.

| 트리거 | 실제 반영 시간 | 비고 |
|---|---|---|
| GitHub 기본 `schedule`(cron)만 사용 — *설정 전 기본 상태* | **수 시간** (실측 2~8시간 간격) | GitHub 가 실행을 보장하지 않음 |
| **외부 스케줄러 → `workflow_dispatch`** (아래 「⏱ 반영 속도 보장하기」) | **약 10~12분** (호출 주기 + 실행 15초 + Pages 배포 1~2분) | ✅ 권장 · 무료 · 1회 설정 |
| 수동: Actions → “Notion 동기화” → **Run workflow** | 약 2분 | 즉시 반영이 필요할 때 |
| 이 저장소에 push / PR 병합 | 약 2분 | 자동 (`push` 트리거) |

사이트는 3분마다, 탭으로 돌아올 때, 상단 배지의 🔄 버튼을 누를 때 **스냅샷 파일**(`notion-content.json`)을 새로 읽습니다.
다만 🔄 는 “이미 만들어진 스냅샷”을 다시 읽을 뿐이라, **서버에서 스냅샷이 새로 만들어지기 전에는 노션의 새 글이 나타나지 않습니다.**
상단 배지의 “n시간 전”은 스냅샷이 만들어진 시각입니다.

> ⚠️ **왜 “10분”이 지켜지지 않았나요? — GitHub `schedule` 은 정시 실행을 보장하는 스케줄러가 아닙니다.**
> 워크플로에는 10분 주기 cron 이 걸려 있지만, GitHub 는 부하가 큰 시간대에 스케줄 실행을 지연시키거나 건너뜁니다.
> 공식 문서: *“The schedule event can be delayed during periods of high loads … some queued jobs may be dropped.”*
> 이 저장소의 실측(2026-09-26~29, `schedule` 실행 16회): **간격 2.2~8.3시간, 중앙값 3.8시간** — 10분 주기였다면 이 기간(약 65시간)에 약 390회 실행돼야 합니다.
> 그래서 “노션에 글 추가 → 몇 시간 뒤에야 사이트에 반영”이 발생합니다. (실행 자체는 항상 성공하고, 늦게 실행될 뿐입니다.)
>
> **해결: 아래 「⏱ 반영 속도 보장하기」의 외부 스케줄러(무료)를 한 번만 설정하세요.**
> 지금 당장 반영하려면 저장소 **Actions → “Notion 동기화” → Run workflow** 를 실행하세요 (약 15초 + Pages 배포 1~2분).

**어떻게 동작하나요?**
`.github/workflows/notion-sync.yml` 이 (트리거될 때마다) 게시된 Notion 페이지를 **서버**에서 읽어
사이트와 같은 폴더의 `notion-content.json`(정적 스냅샷)으로 커밋하고, 사이트는 그 파일만 읽습니다.
같은 출처의 정적 파일이라 **브라우저 CORS 차단이나 외부 공개 프록시(notion-api.splitbee.io) 장애의 영향을 받지 않습니다.**
(스냅샷이 아직 없거나 6시간 이상 오래된 경우에만 실시간 공개 API 를 보조로 시도합니다.
내용이 바뀌지 않으면 파일을 다시 커밋하지 않고, 1시간마다 한 번만 갱신 시각(하트비트)을 새로 씁니다 — 자주 호출해도 빈 커밋·Pages 빌드가 쌓이지 않습니다.)

연동 방법은 두 가지입니다.

| | 방법 A · 공개 페이지 + 스냅샷 (현재 기본) | 방법 B · Worker 프록시 |
|---|---|---|
| 준비물 | 노션 페이지 **웹에 게시**만 하면 끝 | 통합 토큰 + Cloudflare Worker 배포 |
| 노션 페이지 공개 여부 | 공개(누구나 링크로 열어보기 가능) | 비공개 유지 가능 |
| 반영 지연 | 외부 스케줄러 설정 시 약 10분 / 기본 cron 만 쓰면 수 시간 | 거의 실시간 (1분 캐시) |
| 난이도 | ⭐ (설정 0분) | ⭐⭐⭐ |

---

## 방법 A. 공개 페이지 연동 (토큰 · 서버 배포 불필요) ✅ 현재 설정

사이트는 기본으로 **웹에 게시된 [XCONDA_NEWs](https://silicon-mascara-c7d.notion.site/XCONDA_NEWs-3e72ebc017ad8024a3f5ef8fb9f8c6dd) 노션 페이지**를 읽습니다 (`src/notion.ts` 의 `DEFAULT_ENDPOINT`).

1. 노션 페이지 우측 상단 **공유 → 게시(Publish)** 가 켜져 있는지 확인합니다. *(XCONDA_NEWs는 이미 게시됨)*
2. 페이지 **본문 안에 데이터베이스(표 보기)** 를 하나 만들고, 아래 「노션 데이터베이스 만들기」의 속성을 추가합니다.
3. 끝! 행을 추가하고 `Published`를 체크하면 다음 스냅샷 생성부터 사이트에 나타납니다.
   반영 시간을 ~10분으로 보장하려면 「⏱ 반영 속도 보장하기」를 설정하고, 지금 바로 반영하고 싶다면 저장소 **Actions → “Notion 동기화” → Run workflow** 를 실행하세요.

다른 공개 페이지로 바꾸려면 사이트 주소 뒤에 `?notion=<노션 페이지 URL 또는 32자리 ID>` 를 붙이면(실시간 공개 API 로 읽음) 되고,
스냅샷 대상 자체를 옮기려면 저장소 **Settings → Variables** 의 `NOTION_PAGE_ID` 를 바꾼 뒤 Actions 를 한 번 실행하세요.
`.env` 의 `VITE_NOTION_ENDPOINT` 도 여전히 사용할 수 있습니다.

> **동기화가 안 될 때 확인 순서**
> 0. **Actions → 최근 “Notion 동기화” 실행 → Summary 탭**: 어떤 글이 어느 섹션으로 들어갔는지, 왜 제외됐는지, 노션에서 무엇을 고쳐야 하는지가 표로 정리돼 있습니다. (아래 1~5번보다 이 화면이 가장 빠릅니다.)
> 1. **`Published` 체크박스 확인**: 노션 데이터베이스에서 해당 행의 `Published`(또는 `공개`) 체크박스가 체크되어 있는지 확인합니다. 체크되지 않은 행은 비공개(초안)로 간주되어 스냅샷에서 자동으로 제외됩니다.
>    *(노션의 공개 표 화면에는 미체크 행도 보이므로, “노션에는 보이는데 사이트에 없다”면 가장 먼저 이것을 확인하세요.)*
>    어떤 행이 제외됐는지는 Actions 요약의 **제외된 글** 표와 로그의 `[미공개 제외]` 줄에서 확인할 수 있습니다.
> 2. **Actions 탭에서 마지막 “Notion 동기화” 실행 시각 확인**: 마지막 실행이 몇 시간 전이라면 GitHub 스케줄 지연입니다(2026-09 실측: 실행 간격 2~8시간).
>    지금 바로 반영하려면 **Run workflow** 를 클릭하세요(약 15초). 재발을 막으려면 「⏱ 반영 속도 보장하기」를 설정하세요.
> 3. **사이트 배지 확인**: 상단 배지의 “n시간 전”은 스냅샷 생성 시각입니다. **1시간 30분 이상** 지나면 배지가 `Notion 동기화 지연`(노란 점)으로 바뀌며, 마우스를 올리면 지금 해야 할 일이 안내됩니다. 🔄 는 스냅샷 파일을 다시 읽을 뿐이라 서버 동기화(2번) 전에는 새 글이 나타나지 않습니다.
> 4. **노션 페이지 공개 상태**: 노션 페이지 우측 상단 공유에서 **웹에 게시(Publish)** 상태인지 확인합니다.
> 5. 그래도 안 되면 **방법 B(Cloudflare Worker)** 를 연결하세요. 비공개 운영·즉시 반영에도 방법 B가 필요합니다.

---

## ⏱ 반영 속도 보장하기 (권장 · 무료 · 1회 설정)

GitHub 의 `schedule` 은 정해진 시각에 실행된다고 보장하지 않습니다. 대신 **외부 스케줄러가 10분마다 GitHub API 로
“Notion 동기화” 워크플로를 직접 깨우게** 하면, 실행 시각을 스케줄러가 정하므로 지연·누락이 사라집니다.
(기존 GitHub 스케줄은 백업으로 그대로 둡니다.)

> 이 워크플로는 **내용이 바뀌지 않으면 커밋하지 않습니다.** 그래서 10분마다 불러도 빈 커밋이 쌓이지 않고,
> GitHub Pages 의 빌드 한도(브랜치 배포는 시간당 10회 soft limit)도 넘지 않습니다.

### 1) 토큰 만들기 (최소 권한)

GitHub → 프로필 사진 → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**

- **Repository access**: *Only select repositories* → `XCONDA_info` 하나만
- **Permissions → Repository permissions → Actions: Read and write** (다른 권한은 필요 없습니다. *Metadata: Read-only* 는 자동으로 추가됩니다)
- **Expiration**: 원하는 기간 (만료되면 새로 발급해 스케줄러에 교체하세요)
- 생성 직후 한 번만 보이는 `github_pat_…` 값을 복사해 둡니다.

> 이 토큰은 **워크플로 실행만** 할 수 있어 유출돼도 코드를 바꿀 수 없습니다. 그래도 비밀번호처럼 보관하세요.

### 2) 동작 확인 (터미널 한 줄)

```bash
curl -i -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer <토큰>" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/hanahchafilmaker/XCONDA_info/actions/workflows/notion-sync.yml/dispatches \
  -d '{"ref":"main"}'
```

`HTTP/2 204` 가 나오면 성공입니다. 저장소 **Actions** 탭에 `workflow_dispatch` 로 “Notion 동기화”가 바로 실행됩니다.
(`403`/`404` 라면 토큰 권한이 **Actions: Read and write** 인지, 저장소가 `XCONDA_info` 로 선택됐는지 확인하세요.)

### 3) 10분마다 자동 호출 — cron-job.org (무료 · 코드 없음)

1. https://cron-job.org 가입 → **Create cronjob**
2. **URL**: `https://api.github.com/repos/hanahchafilmaker/XCONDA_info/actions/workflows/notion-sync.yml/dispatches`
3. **Schedule**: 10분마다 (*Every 10 minutes*)
4. **Advanced**: Request method **POST**, Request body `{"ref":"main"}`, Headers
   - `Accept: application/vnd.github+json`
   - `Authorization: Bearer <토큰>`
   - `X-GitHub-Api-Version: 2022-11-28`
   - `Content-Type: application/json`
5. 저장한 뒤 실행 이력에서 응답 코드가 **204** 인지 확인합니다.

### (대안) Cloudflare Worker Cron Trigger

이미 Cloudflare 를 쓰고 있다면 Worker 하나로도 됩니다. (`wrangler secret put GITHUB_TOKEN` 으로 토큰 저장)

```js
// src/index.js
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      fetch("https://api.github.com/repos/hanahchafilmaker/XCONDA_info/actions/workflows/notion-sync.yml/dispatches", {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "xconda-notion-sync", // GitHub API 는 User-Agent 가 필수입니다
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      }).then((res) => {
        if (res.status !== 204) throw new Error(`workflow dispatch 실패: HTTP ${res.status}`);
      }),
    );
  },
};
```

```toml
# wrangler.toml
[triggers]
crons = ["*/10 * * * *"]
```

### 알아두기

- `workflow_dispatch` 는 **기본 브랜치(main)** 에 있는 워크플로만 실행합니다. 이 워크플로 변경이 main 에 병합돼 있어야 합니다.
- 실행 결과는 `main` 의 `notion-content.json` 커밋 → GitHub Pages 자동 배포로 이어지므로, 노션에서 `Published` 를 체크한 뒤 **최대 (호출 주기 + 약 2분)** 이내에 사이트에 나타납니다.
- 토큰이 만료되거나 폐기되면 호출이 `401` 로 실패하고 다시 GitHub 기본 스케줄(수 시간 간격)로 되돌아갑니다. 스케줄러의 실행 이력(또는 실패 알림)을 가끔 확인하세요.

---

## 1. 노션 데이터베이스 만들기 (방법 A · B 공통)

데이터베이스 **하나**로 공지 · 뉴스 · 가이드 · 블로그 · FAQ(Q&A)를 모두 관리합니다.

사이트 섹션 순서는 **공지사항 → 뉴스(타 SNS 정보) → 툴 사용법 → 블로그 → Q&A** 이며,
`Type` 값이 그대로 섹션을 결정합니다. (`업데이트` · `릴리스` · `release` · `changelog` 는 뉴스 섹션으로 통합되어 표시됩니다.)

| 속성 이름 | 유형 | 필수 | 설명 |
|---|---|---|---|
| `Title` (또는 `제목`) | 제목 | ✅ | 글 제목 / FAQ는 질문 |
| `Type` (또는 `유형`) | 선택 | ✅ | `공지` · `뉴스` · `가이드` · `블로그` · `FAQ` (기존 `업데이트`도 뉴스로 인식) |
| `Published` (또는 `공개`) | 체크박스 | ✅ | 체크된 글만 사이트에 노출 |
| `Date` (또는 `날짜`) | 날짜 | ✅ | 게시일 (정렬 기준) |
| `Summary` (또는 `요약`) | 텍스트 | 권장 | 목록 요약 / **FAQ는 답변** |
| `Author` (또는 `작성자`) | 텍스트 (권장) | 권장 | 작성자 이름. **블로그 카드와 상세 모달에 표시됩니다**. 사람(Person) 속성도 인식하지만 계정 참조만 들어오는 경우 이름이 표시되지 않을 수 있어 **텍스트 속성을 권장**합니다 |
| `Category` (또는 `카테고리`) | 선택 | 권장 | 공지: `공지` `점검` `이벤트` `정책` / 뉴스: `X` `Threads` `YouTube` `Instagram` `LinkedIn` `Notion` `SNS` `Release` / 가이드: `시작하기` `시나리오` … / 블로그: `워크플로우` `튜토리얼` `인터뷰` `인사이트` / FAQ: `크레딧` `사용법` … |
| `Pinned` (또는 `고정`) | 체크박스 | | 공지 상단 고정 + 히어로 배너 노출 |
| `Important` (또는 `중요`) | 체크박스 | | 빨간 점 + 굵게 표시 |
| `Version` (또는 `버전`) | 텍스트 | | 뉴스(릴리스 노트)용 (예: `v2.5.0`) |
| `Changes` (또는 `변경사항`) | 텍스트 | | 뉴스용. 한 줄에 하나씩: `[New] …` `[Improved] …` `[Fixed] …` (`신규/개선/수정`도 가능) |
| `Tool` (또는 `툴`) | 선택 | | 가이드 · 블로그용. 툴 이름(예: `Director's Cut`)과 같으면 해당 툴 카드의 사용법이 **이 노션 글로 대체**됩니다 |
| `Order` (또는 `순서`) | 숫자 | | 가이드 · FAQ(Q&A) 정렬 순서 |
| `Tags` (또는 `태그`) | 다중 선택 | | 태그 |
| `Cover` (또는 `커버`) | 파일 | | 썸네일. 비워 두면 **노션 페이지 커버 → 본문 첫 이미지** 순서로 자동으로 대신 사용합니다 |
| `Link` (또는 `링크`) | URL | | "스튜디오에서 바로 해보기" 버튼 주소 / 뉴스의 원본 SNS 게시물 링크 |
| `Title EN` | 텍스트 | | 영문 제목. 입력하면 EN 모드의 목록·검색·상세 제목에 사용 |
| `Summary EN` | 텍스트 | | 영문 요약 / FAQ 영문 답변 |
| `Category EN` | 텍스트 또는 선택 | | 영문 카테고리명 |
| `Author EN` | 텍스트 | | 영문 작성자 표기 (예: `Hana Kim`) |
| `Changes EN` | 텍스트 | | 뉴스 영문 변경사항. `Changes`와 같은 한 줄 형식 |

**페이지 본문**(제목, 목록, 번호 목록, 체크리스트, 인용, 콜아웃, 코드, 이미지, 유튜브 영상, 북마크, 토글, 구분선)은 그대로 상세 모달에 표시됩니다. UI와 정적 툴 설명은 한/영 토글에 맞춰 전환되며, Notion 본문은 작성된 원문을 그대로 표시합니다.

### 🖼️ 썸네일은 어떻게 정해지나요?

목록 카드의 썸네일은 아래 순서로 **먼저 있는 것**을 씁니다. (규칙: `src/content/fields.js`)

1. **`Cover`(커버) 속성**에 넣은 이미지 — 가장 확실합니다. 외부 이미지 호스팅의 `https://` 주소를 권장합니다.
2. **노션 페이지 커버** — 행을 페이지로 열고 상단에 지정한 커버 이미지
3. **본문에 넣은 첫 번째 이미지** — `Cover` 를 비워도 본문에 이미지가 하나라도 있으면 그것이 썸네일이 됩니다 (컬럼·토글 안에 있어도 찾습니다)

셋 다 없으면 카드에 이미지 대신 자리 표시자가 나옵니다. 어느 쪽을 썼는지는 **Actions → “Notion 동기화” → Summary** 의 `썸네일` 열에서 확인할 수 있고, 썸네일이 없는 글은 **⚠️ 확인 필요**에 따로 모아서 알려 줍니다.

> 노션에 직접 업로드한 파일은 브라우저에서 바로 열리지 않아, 사이트가 notion.so 이미지 프록시 주소를 만들어 표시합니다(만료되지 않는 주소). 그래도 가장 안정적인 것은 외부 이미지 호스팅 URL 을 `Cover` 에 넣는 방법입니다.

### ✍️ 작성자는 어떻게 표시되나요?

표에 **`Author`(또는 `작성자`)** 속성을 만들고 이름을 넣으면, 블로그 카드 하단과 상세 모달의 날짜 옆에 `✎ 이름` 으로 표시됩니다. 칸을 비우면 작성자 자리 자체가 나타나지 않습니다(레이아웃이 어긋나지 않습니다). EN 모드에서는 `Author EN` 값을 대신 씁니다.

### 🔀 글이 어느 섹션으로 들어가나요? (Type 판정 규칙)

**결론: `Type` 칸에 적은 값이 그대로 섹션을 정합니다.** 칸을 비워 두면 내용으로 추정합니다.

1. **`Type` 값이 우선** — 아래 표기를 모두 같은 뜻으로 알아봅니다. (대소문자·띄어쓰기·대괄호·전각 무시)

   | 섹션 | 쓸 수 있는 표현 |
   |---|---|
   | **공지사항** | `공지` `공지사항` `알림` `안내` `Notice` |
   | **뉴스** | `뉴스` `소식` `업데이트` `릴리스` `릴리스 노트` `패치노트` `SNS` `News` `Release` `Changelog` `[뉴스]` |
   | **툴 사용법** | `가이드` `사용법` `툴 사용법` `매뉴얼` `튜토리얼` `Tutorial` `How-to` |
   | **블로그** | `블로그` `포스트` `아티클` `칼럼` `인사이트` `Blog` `Article` |
   | **Q&A** | `FAQ` `Q&A` `QA` `질문` `자주 묻는 질문` `도움말` |

2. **`Type` 칸이 비었거나 처음 보는 값일 때만** 내용으로 추정합니다.
   `Tool`(툴) 지정 → **툴 사용법** · `Category`가 `X`/`Threads`/`YouTube`/`Release` 등 → **뉴스** ·
   `Version`·`Changes` 있음 → **뉴스** · `Link`가 X·YouTube 주소 → **뉴스** · 나머지 → **공지사항**
3. **`Type` 을 적어 두면 자동으로 옮기지 않습니다.** 예를 들어 X 링크가 있는 글이라도 `Type=공지`로 적어 두면 공지사항에 그대로 표시됩니다.

**확인하는 방법 — Actions 요약(Summary)**
저장소 **Actions → “Notion 동기화” → 가장 최근 실행 → Summary 탭**에 이런 표가 남습니다.

| 제목 | 노션 Type | → 사이트 섹션 | 분류 근거 |
|---|---|---|---|
| Claude Opus 5.5로 만든 바이럴 영상 389개 | 공지 | 공지사항 | Type '공지' |
| 서버 점검 안내 | (비어 있음) | 공지사항 | Type 이 비어 있어 기본값(공지사항) |

같은 화면의 **⚠️ 확인 필요**에는 손봐야 할 곳을 모아서 알려 줍니다.
- `Type` 이 처음 보는 값이거나 비어 있는 글 (→ 노션에서 `공지 · 뉴스 · 가이드 · 블로그 · FAQ` 중 하나로 지정)
- **SNS 링크가 있는데 공지사항에 있는 글** (→ 뉴스 섹션에 넣으려면 `Type` 을 `뉴스` 로 변경)
- `Published` 미체크로 제외된 글, 표(데이터베이스)가 2개 이상인 경우, 직전 스냅샷이 1시간 이상 오래된 경우

> 표가 2개 이상이면 **첫 번째 표만** 읽습니다. 글을 다른 표에 추가했다면 사이트에 나타나지 않으니,
> 한 표로 합치거나 저장소 **Settings → Variables** 의 `NOTION_DATABASE_ID` 를 원하는 표의 ID로 바꾸세요.

### 🎬 구글 드라이브 영상 링크 (CSP 오류 주의)

Google Drive가 응답에 설정하는 `Content-Security-Policy: frame-ancestors` 는 사이트에서 변경하거나 우회할 수 없습니다.
계정, 공유 설정, 요청 경로 등에 따라 `/preview` 파일 링크도 브라우저에서 임베드가 차단될 수 있습니다.
차단되면 다음과 같은 콘솔 메시지가 표시됩니다.

```
Framing '<URL>' violates the following Content Security Policy directive: "frame-ancestors <URL>".
The request has been blocked.
```

이 사이트는 Google Drive 영상을 iframe에 넣지 않고 **Google Drive에서 새 창으로 열기** 링크로 표시합니다.
따라서 외부 CSP에 의해 반복되는 프레이밍 오류가 발생하지 않습니다. 영상 파일은 Drive에서 열어 시청하며,
YouTube 영상과 직접 제공되는 영상 파일은 기존처럼 페이지 안에서 재생됩니다.

참고: CSP 오류가 다른 외부 서비스 URL에서 발생한다면 해당 서비스가 프레이밍을 차단하는 것입니다.
브라우저 콘솔에 표시된 실제 요청 URL과 페이지 위치를 확인해야 정확히 구분할 수 있습니다.

---

# 방법 B. Worker 프록시 연동 (비공개 데이터베이스용)

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
- **긴급 공지**: `Type=공지`, `Pinned` + `Important` 체크 → 히어로 배너와 공지 목록 최상단에 즉시 노출
- **글 공유**: 상세 모달의 "공유" 버튼 → `#post=페이지ID` 링크가 복사되어, 링크를 열면 해당 글이 바로 열립니다
- **초안 작성**: `Published` 체크를 해제해 두면 사이트에 노출되지 않습니다
- **썸네일**: `Cover` 를 비워도 노션 페이지 커버 → 본문 첫 이미지 순서로 자동 사용됩니다 (위 「🖼️ 썸네일은 어떻게 정해지나요?」 참고). 가장 확실한 방법은 `Cover` 에 외부 이미지 URL 을 넣는 것입니다
- **작성자**: `Author`(또는 `작성자`) 속성에 이름을 넣으면 블로그 카드 · 상세 모달에 표시됩니다
- 노션에 올린 이미지 파일의 *서명된 원본 주소*는 약 1시간 후 만료되지만, 사이트는 만료되지 않는 notion.so 이미지 프록시 주소를 만들어 표시합니다. 그래도 장기 노출이 중요한 커버는 외부 URL(이미지 호스팅)을 권장합니다
