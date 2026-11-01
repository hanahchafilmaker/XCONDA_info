# Xconda SEO·GEO 실행계획 개정 초안

**차하나 PD 작업 초안 · 2026-11-01 · 팀 검토용**  
1단계 마감: 2026-11-08(일) · MHW 역할 확정: 11/13 계획 수신 후

> 이 문서는 대표님 요청서와 대화에서 확인한 진행 상황을 바탕으로 만든 **초안**이다. 아직 팀 채널이나 MHW에 발송하지 않았으며, 일정·역할·목표는 담당자와 대표님 확인 전 확정 사항이 아니다.

## 1. 현재 상태와 우선순위

| 항목 | 상태 | 다음 행동 / 담당 |
|---|---|---|
| 허브 Google | URL 접두어 소유확인 및 사이트맵 제출 성공. Search Console 화면에서 393개 발견 | 주요 URL의 실제 색인 상태 확인·필요 시 요청 / 나서영 |
| 허브 네이버 | 등록·사이트맵 제출·수집 요청 완료 — 사용자 확인. robots.txt 재조회 정상 | 노출 및 수집 결과 추적 / 나서영 |
| Bing | 등록 확인 완료 — 사용자 확인 | 허브 IndexNow의 실제 접수 상태 확인 / 나서영 |
| IndexNow | 허브의 공개 키와 자동 알림 단계 확인. 실행 단계 성공 표시는 실제 접수 성공의 확정 근거가 아님 | Bing IndexNow 화면이나 실행 로그에서 접수 결과 확인 / 나서영 |
| 허브 기술 개선 | hreflang·JSON-LD·Q&A 편집 문구 개선 PR 병합. 전 페이지 운영 검증은 미완료 | 대표 페이지별 소스·상호 링크·구조화 데이터 검증 / 개발 |
| 허브 Cover | 수정 PR 병합 후 동기화·빌드 성공. DeepSeek·FLUX 두 글의 최신 스냅샷에 로컬 커버 경로 생성 확인 | 운영 화면에서 두 이미지 실제 표시 확인 / 개발·차하나 |
| Google 도메인 속성 | DNS TXT 인증 실패 이력. MSP 반영·전파 상태 미확인 | MSP 회신 확인 후 Search Console 재인증 / MSP·나서영 |
| www 검색엔진 | 허브와 별도. 등록·인증 완료 미확인 | 네이버 인증 파일 웹 루트 배포 요청, Google 소유확인 후 사이트맵 제출 / 개발·나서영 |
| www A2·A3·A4 | 배포일 및 적용 완료 미확인 | v2.6 날짜 확정. 지연 시 기술 작업 분리 배포 검토 / 개발·나서영 |

Google 사이트맵 제출 성공은 색인 완료가 아니며, Bing 등록은 IndexNow 접수나 색인 완료를 뜻하지 않는다. 393개는 당시 Search Console 화면 수치로 현재 URL 수와 다를 수 있다.

## 2. 11/8까지 실행 순서

| 우선 | 작업·완료 기준 | 담당 |
|---|---|---|
| 1 | v2.6 날짜 확정. A2 공개 URL 301, A3 언어별 canonical·hreflang, A4 사이트맵을 같은 배포에 포함하거나 분리 배포 결정 | 개발, 나서영 |
| 2 | www Google·네이버 소유확인과 사이트맵 제출. 로그인 페이지 `/auth`, `/support/qna`는 접근 방식 확인 후 noindex 및 사이트맵 제외 | 개발, 나서영, MSP |
| 3 | 허브 대표 Q&A·글·가이드 및 존재하는 번역판에서 canonical·상호 hreflang·유형별 JSON-LD·내부 메모 제거·실제 수정일 검증. 번역이 없는 페이지에 존재하지 않는 대체 URL을 만들지 않음 | 개발 |
| 4 | 대표 두 예시 글의 Cover 표시를 운영 브라우저에서 확인. 실패하면 동기화 실행 결과와 이미지 접근 권한 확인 | 개발, 차하나 |
| 5 | GEOcare 이용 조건(E1), 경쟁사 7곳(E2) 및 질문 세트(E3) 확정. SNS 이름 통일(D1) | 대표(E1), 나서영(E2·D1), 차하나(E3) |
| 6 | 이 개정 초안을 담당자·대표님이 검토하고 팀 채널에 공유. 숫자 목표와 MHW 역할은 승인 전까지 미확정으로 표기 | 차하나(초안), 나서영(취합), 대표(감수) |

개발 작업은 위 1단계 배포·검색 신호를 우선한다. A0~A9, B1~B5·B7, C1, D3, F1·F3·F4 등 나머지 작업은 개발 담당자의 실제 투입 가능 시간을 확인한 뒤 재배치한다. 이 문서는 개별 항목의 완료를 추정하지 않는다.

## 3. 기존 계획서에 반영할 변경안

### A6·C6·로드맵: 허브 다국어

기존의 ‘허브는 한국어 유지, 영어는 www, 허브 언어 경로는 4단계 재검토’ 문구를 현재 운영 구조에 맞게 수정한다. 허브에 존재하는 한국어·영어·일본어·중국어 페이지는 각자 정본을 사용하고, **실제 대응 번역이 존재하는 페이지끼리만** 상호 hreflang을 연결한다. 번역 검수 상태와 페이지 존재 여부를 별도 추적한다. www의 언어 신호는 별도 배포·검증한다.

### 측정 기준과 목표

- 참고 기준선: 사이트 GEO 50.4, AI SoM 30.5. 10/22의 32.5와 차이는 표본이 15회 중 2회로 적어 하락으로 단정하지 않는다.
- E1 서비스 조건, E2 경쟁사 7곳, E3 질문·언어·측정 방법을 확정한 뒤 기준선을 다시 기록한다. 기존 30.5와 측정 조건이 다르면 직접 비교하지 않는다.
- 변경 후 2~4주에 같은 조건으로 첫 재측정, 90일 지점에 다시 평가한다. **목표 수치는 미확정**이며 대표 승인 후 기록한다. ‘90일 뒤 SoM 35 이상’은 승인된 목표가 아닌 예시다.
- 검색엔진 색인·사이트맵, 유입·가입, GEOcare 지표는 별도 지표로 기록한다. 색인이나 인용은 보장하지 않는다.

### UTM·GA4 초안 — 나서영 검토

소문자와 밑줄을 사용하고 공백·한글을 쓰지 않는다. 제안 허용값: `utm_source` = `instagram`, `youtube`, `threads`, `x`, `naver_blog` 등 실제 채널명; `utm_medium` = `social`, `email`, `referral`; `utm_campaign` = 승인된 캠페인명(예: `mhw_us_launch`). 유료 매체 여부 및 최종 목록은 운영팀이 확정한다.

예: `https://www.xconda.ai/?utm_source=instagram&utm_medium=social&utm_campaign=mhw_us_launch`

테스트: UTM 링크로 유입 → 동의·추적 설정 확인 → 가입 완료 → GA4에서 실제 가입 이벤트와 유입 경로가 연결되는지 점검한다. AI 유입 보고서는 E6에서 별도로 정의·검증한다. 테스트 링크와 개인정보를 팀에 공개할 때 주의한다.

### 팩트시트 — 나서영 초안·대표 승인

공식 회사·제품명, 도구 표기, 검증 가능한 실적, 출처와 기준일, 가격·제작 단가를 한 문서에서 관리한다. 요청서상 공식 가격은 크레딧 팩, 완성 1분당 제작 단가는 USD 690부터이나 **대외 인용 전 최신 공식 근거와 범위를 확인**한다. 검증되지 않은 실적이나 예시 목표는 확정 사실처럼 쓰지 않는다.

## 4. GEO 질문 세트(E3) 초안 — 승인 전

목적은 질문을 바꾸지 않고 같은 조건에서 Xconda와 경쟁사 언급을 추적하는 것이다. 아래는 **질문 후보**이며 GEOcare 지원 언어·질문 수·측정 조건을 확인한 뒤 대표·나서영과 확정한다. 괄호의 주제는 내부 분류이며 질문에 붙이지 않는다.

| ID | 언어 | 질문 |
|---|---|---|
| KR01 | 한국어 | 영화 제작자가 영상 생성 전에 스토리보드를 만들 때 쓸 수 있는 AI 도구는 무엇인가요? |
| KR02 | 한국어 | 여러 장면에서 인물과 배경의 일관성을 유지하며 AI 영상 제작을 준비하려면 어떤 도구가 있나요? |
| KR03 | 한국어 | 시나리오를 컷별 스토리보드로 바꾸는 AI 프리프로덕션 서비스에는 어떤 것들이 있나요? |
| KR04 | 한국어 | 영상 생성 전에 카메라 구도와 인물 동선을 계획할 수 있는 도구를 추천해 주세요. |
| KR05 | 한국어 | 영화나 광고 제작팀이 공간을 고정하고 여러 컷을 기획할 때 비교해 볼 AI 제작 도구는 무엇인가요? |
| KR06 | 한국어 | AI 스토리보드 및 영상 프리프로덕션 도구를 선택할 때 어떤 기준을 비교해야 하나요? |
| EN01 | 영어 | What AI tools can filmmakers use to create storyboards before generating video? |
| EN02 | 영어 | Which tools help maintain character and background consistency across shots in AI video pre-production? |
| EN03 | 영어 | What AI pre-production platforms can turn a script into shot-by-shot storyboards? |
| EN04 | 영어 | Which tools help plan camera angles and actor blocking before video generation? |
| EN05 | 영어 | What AI tools can production teams compare for planning multiple shots in a consistent environment? |
| EN06 | 영어 | What criteria should a production team compare when choosing an AI storyboarding and pre-production tool? |

질문은 브랜드명을 넣지 않은 탐색형으로 구성했다. 브랜드 직접 검색형은 별도 그룹으로 추가하되 결과를 혼합하지 않는다. 검색엔진·모델, 지역, 언어, 날짜, 질문 문구·순서, 반복 횟수, 계정·개인화 설정, 측정 도구 버전, 경쟁사 목록, 원문 응답·출처를 기록한다. 도구에서 통제할 수 없는 조건은 미통제로 표시한다. 반복 횟수는 이용 조건 확인 후 확정하고, 적은 표본의 변화는 방향을 단정하지 않는다.

경쟁사 후보: Higgsfield, LTX Studio, Katalist, 매그니픽, 에이크론, 원테이크, 탑뷰. 공식 표기와 실제 등록 여부는 나서영이 확인한다. 사이트 GEO와 SoM의 산식은 GEOcare 정의를 따르며, 외부 응답을 임의로 같은 점수로 환산하지 않는다.

## 5. MHW 협업 제안 — 11/13 확인 후 확정

| 항목 | 제안 역할 | 상태 |
|---|---|---|
| C6 영어 콘텐츠 | MHW 영문 검수·현지화 | 제안, 미확정 |
| C3·C4 심층 영문 글 | MHW 작성, 큐브베리 실측 데이터·사례 제공 | 제안, 미확정 |
| D2 영상 | 큐브베리 제작, MHW 영어 채널 배포 | 제안, 미확정 |
| D4 디렉터리 | MHW 수행 가능성 검토 | 제안, 미확정 |
| A·B·E | 큐브베리 기술 기반·측정 유지 | 제안, 미확정 |

계정 소유 법인·이메일은 큐브베리, 공개 표시 이름은 Xconda로 정리한다는 원칙을 대표님이 MHW에 전달한다. 11/13에 일정·승인권자·성과 측정·자료 전달 방식까지 합의한 뒤 위 표를 확정한다.

### MHW에 보낼 C5 공유 초안

> We publish original content on Xconda Hub and may adapt it for other channels. Please tailor the opening, copy and format to each channel and audience rather than publishing identical text everywhere at the same time. Stagger publication times where practical, link to the original Hub article when appropriate, and use the approved campaign UTM parameters. Please send proposed copy and timing to Cuberry for review before publishing; claims and numbers must match the approved fact sheet.

‘시간 간격’의 구체적 시간은 채널 성격·MHW 계획을 확인한 뒤 정한다. 위 영문은 차하나 PD가 공유할 수 있는 초안이며 아직 발송하지 않았다.

## 6. www 인증 파일 배포 요청문 초안

**수신: 태훈 또는 전유준 개발자 — 담당자 확인 후 전달**

> 안녕하세요. 네이버 서치어드바이저의 `https://www.xconda.ai/` 소유확인을 위해 별도로 전달한 인증 HTML 파일을 **www 사이트 웹 루트**에 원본 그대로 배포 부탁드립니다. 허브가 아닌 www 사이트에 적용해야 합니다. 배포 후 `https://www.xconda.ai/<네이버가 발급한 파일명>` 주소가 외부에서 열리는지 확인하고 알려주세요. 인증 완료 후에도 파일을 삭제하지 말아 주세요. 파일명과 내용은 수정하지 않습니다.

인증 파일은 이 대화에 첨부된 www용 파일을 함께 전달한다. 전달 여부와 배포 완료는 아직 확인되지 않았다. Google 도메인 TXT는 별도로 MSP가 처리하며, 인증 방식 간 진행 상태를 혼동하지 않는다.

## 7. 검토·공유 체크

- [ ] 차하나: 이 초안의 질문 세트와 계획서 변경 내용을 검토
- [ ] 나서영: 경쟁사·UTM 허용값·검색엔진 및 GA4 상태 확인
- [ ] 개발: 배포일·www 인증 파일·허브 실제 운영 결과 확인
- [ ] 대표: GEOcare 조건·숫자 목표·팩트시트·최종 개정판 승인
- [ ] 승인 후 팀 채널에 공유 — 아직 공유하지 않음
- [ ] 11/13 MHW 계획 수신 후 역할·일정 확정 및 개정판 갱신
