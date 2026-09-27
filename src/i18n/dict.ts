/**
 * XCONDA 가이드 센터 다국어(i18n) 사전.
 *
 * - UI "크롬"(내비게이션, 섹션 제목, 버튼, 안내 문구 등)의 한/영 문구를 한곳에서 관리합니다.
 * - 샘플·툴 콘텐츠는 별도 영문 번역을 제공하며, Notion 콘텐츠는 Title EN 등
 *   언어별 보조 필드가 있을 때 해당 언어로 표시합니다.
 */

export type Lang = "ko" | "en";

/* ------------------------------------------------------------------ *
 * 비(非) React 유틸(날짜 포맷 등)에서 현재 언어를 참조하기 위한 모듈 변수.
 * LanguageProvider 가 언어 변경 시 setCurrentLang 으로 동기화합니다.
 * ------------------------------------------------------------------ */
let _current: Lang = "ko";
export const getLang = (): Lang => _current;
export const setCurrentLang = (l: Lang) => {
  _current = l;
};

type Entry = { ko: string; en: string };
type Dict = Record<string, Entry>;

export const DICT: Dict = {
  /* ---------------------------- 공통 ---------------------------- */
  "common.all": { ko: "전체", en: "All" },
  "common.contact": { ko: "문의하기", en: "Contact" },
  "common.openStudio": { ko: "스튜디오에서 열기", en: "Open in Studio" },
  "common.openStudioTop": { ko: "XCONDA 스튜디오 열기", en: "Open XCONDA Studio" },
  "common.viewFullGuide": { ko: "전체 가이드 보기", en: "View full guide" },
  "common.howto": { ko: "사용법", en: "How-to" },
  "common.readMore": { ko: "자세히 보기", en: "Read more" },
  "common.read": { ko: "읽기", en: "Read" },
  "common.share": { ko: "공유", en: "Share" },
  "common.linkCopied": { ko: "링크 복사됨", en: "Link copied" },
  "common.close": { ko: "닫기", en: "Close" },
  "common.copy": { ko: "복사", en: "Copy" },
  "common.copied": { ko: "복사됨", en: "Copied" },
  "common.tool": { ko: "툴", en: "Tool" },
  "common.article": { ko: "글", en: "article" },
  "common.articles": { ko: "글", en: "articles" },

  /* --------------------------- 접근성 --------------------------- */
  "a11y.skip": { ko: "본문으로 건너뛰기", en: "Skip to content" },
  "meta.title": {
    ko: "XCONDA 가이드 센터 — 공지사항 · 업데이트 · 사용법",
    en: "XCONDA Guide Center — Notices, Updates & How-tos",
  },
  "meta.description": {
    ko: "XCONDA의 최신 공지사항, 업데이트 내역과 모든 툴의 단계별 사용법을 한곳에서 확인하세요.",
    en: "Find the latest XCONDA notices, release notes, and step-by-step guides for every tool in one place.",
  },

  /* -------------------------- 내비게이션 -------------------------- */
  "nav.primary": { ko: "주요 메뉴", en: "Primary navigation" },
  "nav.notices": { ko: "공지사항", en: "Notices" },
  "nav.updates": { ko: "업데이트", en: "Updates" },
  "nav.start": { ko: "시작하기", en: "Get Started" },
  "nav.tools": { ko: "툴 가이드", en: "Tool Guide" },
  "nav.credits": { ko: "크레딧", en: "Credits" },
  "nav.faq": { ko: "FAQ", en: "FAQ" },
  "nav.openStudioShort": { ko: "스튜디오 열기", en: "Open Studio" },
  "nav.home": { ko: "XCONDA 가이드 센터 홈", en: "XCONDA Guide Center home" },
  "nav.search": { ko: "검색", en: "Search" },
  "nav.openMenu": { ko: "메뉴 열기", en: "Open menu" },
  "nav.closeMenu": { ko: "메뉴 닫기", en: "Close menu" },
  "lang.switchAria": { ko: "언어 선택", en: "Choose language" },
  "lang.korean": { ko: "한국어", en: "Korean" },
  "lang.english": { ko: "영어", en: "English" },

  /* ---------------------------- 히어로 ---------------------------- */
  "hero.title2": { ko: "가장 빠른 업데이트, 가장 쉬운 사용법", en: "The fastest updates, the simplest how-tos" },
  "hero.subtitle": {
    ko: "매일 새로워지는 XCONDA의 공지사항과 업데이트, 툴별 사용법을 한곳에 모았습니다. 궁금한 기능을 검색해 보세요.",
    en: "Notices, updates, and per-tool guides for the ever-evolving XCONDA — all in one place. Search for any feature you're curious about.",
  },
  "hero.searchLabel": { ko: "가이드 검색", en: "Search the guide" },
  "hero.searchPlaceholder": {
    ko: "공지, 사용법, 툴 이름을 검색하세요 (예: 캐릭터, 마스크, 크레딧)",
    en: "Search notices, guides, or tools (e.g. character, mask, credits)",
  },
  "hero.quickLinks": { ko: "바로가기", en: "Quick links" },
  "hero.rechargeCredits": { ko: "크레딧 충전", en: "Buy credits" },
  "hero.pinnedNotice": { ko: "고정 공지", en: "Pinned notice" },
  "hero.latestNotice": { ko: "최신 공지", en: "Latest notice" },
  "hero.latestUpdate": { ko: "최신 업데이트", en: "Latest update" },
  "hero.statNotices": { ko: "공지", en: "Notices" },
  "hero.statGuides": { ko: "가이드", en: "Guides" },
  "hero.statReleases": { ko: "릴리스", en: "Releases" },
  "hero.lastSynced": { ko: "마지막 동기화", en: "Last synced" },
  "hero.keyMove": { ko: "이동", en: "Move" },
  "hero.keyOpen": { ko: "열기", en: "Open" },
  "hero.keyClose": { ko: "닫기", en: "Close" },

  /* ---------------------------- 공지사항 ---------------------------- */
  "notices.titleKo": { ko: "공지사항", en: "Notices &" },
  "notices.desc": {
    ko: "서비스 공지, 점검 일정, 정책 변경, 이벤트 소식을 가장 먼저 알려드립니다.",
    en: "Be the first to hear about service notices, maintenance, policy changes, and events.",
  },
  "notices.tabAria": { ko: "공지 분류", en: "Notice categories" },
  "notices.colType": { ko: "구분", en: "Type" },
  "notices.colTitle": { ko: "제목", en: "Title" },
  "notices.colDate": { ko: "등록일", en: "Date" },
  "notices.pinned": { ko: "고정", en: "Pinned" },
  "notices.important": { ko: "중요", en: "Important" },
  "notices.empty": { ko: "등록된 공지가 없습니다.", en: "No notices yet." },
  "notices.more": { ko: "공지 더보기", en: "More notices" },
  "notices.defaultCategory": { ko: "공지", en: "Notice" },

  /* ---------------------------- 업데이트 ---------------------------- */
  "updates.titleKo": { ko: "업데이트", en: "Latest" },
  "updates.desc": {
    ko: "XCONDA는 매주 새로워집니다. 새 기능, 개선 사항, 버그 수정을 버전별로 확인하세요.",
    en: "XCONDA gets better every week. Track new features, improvements, and fixes by version.",
  },
  "updates.collapse": { ko: "접기", en: "Collapse" },

  /* --------------------------- 시작하기 --------------------------- */
  "guides.titleKo": { ko: "처음이라면,", en: "New here?" },
  "guides.desc": {
    ko: "가입부터 첫 스토리보드까지 4단계면 충분합니다.",
    en: "From sign-up to your first storyboard in just four steps.",
  },
  "guides.coreTitleKo": { ko: "핵심 스튜디오", en: "Core studios" },
  "guides.coreDesc": {
    ko: "XCONDA의 세 가지 핵심 스튜디오를 단계별로 익혀 보세요.",
    en: "Master XCONDA's three core studios step by step.",
  },
  "guides.coreTabAria": { ko: "핵심 스튜디오", en: "Core studios" },
  "guides.articles": { ko: "활용 가이드", en: "How-to articles" },

  "start.account.title": { ko: "계정 만들기", en: "Create an account" },
  "start.account.desc": {
    ko: "xconda.ai에 접속해 가입하면 바로 워크스페이스가 열립니다.",
    en: "Sign up at xconda.ai and your workspace opens right away.",
  },
  "start.credits.title": { ko: "크레딧 준비", en: "Get credits" },
  "start.credits.desc": {
    ko: "1회 결제 크레딧 팩으로 시작하세요. Starter V1은 $6.90부터입니다.",
    en: "Start with a one-time credit pack. Starter V1 begins at $6.90.",
  },
  "start.tool.title": { ko: "툴 선택", en: "Pick a tool" },
  "start.tool.desc": {
    ko: "처음이라면 Director's Cut으로 9컷 스토리보드를 만들어 보세요.",
    en: "New here? Try Director's Cut to make a 9-cut storyboard.",
  },
  "start.create.title": { ko: "시나리오 입력 → 생성", en: "Write a scenario → Generate" },
  "start.create.desc": {
    ko: "시나리오를 쓰고 생성하세요. 마음에 안 드는 컷만 다시 만들 수 있습니다.",
    en: "Write your scenario and generate. Regenerate only the cuts you don't like.",
  },
  "start.creditsLink": { ko: "크레딧 안내", en: "Credit details" },

  /* -------------------------- 툴 가이드 -------------------------- */
  "tools.titleKo": { ko: "툴별 사용법", en: "Explore the" },
  "tools.tabAria": { ko: "툴 분류", en: "Tool categories" },
  "tools.searchLabel": { ko: "툴 검색", en: "Search tools" },
  "tools.searchPlaceholder": { ko: "툴 이름 검색", en: "Search by tool name" },

  /* ---------------------------- 크레딧 ---------------------------- */
  "credits.titleKo": { ko: "크레딧 안내", en: "Simple" },
  "credits.desc": {
    ko: "원하는 팩을 골라 한 번만 결제하면 바로 창작을 시작할 수 있습니다.",
    en: "Pick a pack, pay once, and start creating right away.",
  },
  "credits.unit": { ko: "크레딧", en: "credits" },
  "credits.buy": { ko: "구매하기", en: "Buy now" },
  "credits.popular": { ko: "가장 인기", en: "Most Popular" },
  "credits.notePre": { ko: "모든 팩은 ", en: "Every pack is " },
  "credits.noteStrong": { ko: "1회 결제", en: "a one-time payment" },
  "credits.notePost": {
    ko: "이며, 구독 플랜은 곧 출시됩니다. 툴별 소모 크레딧은 스튜디오의 생성 버튼에서 확인할 수 있습니다. 가격은 변경될 수 있으며 최신 정보는 공지사항을 확인해 주세요.",
    en: "; subscription plans are coming soon. You can check each tool's credit cost on its Generate button in the studio. Prices may change — see Notices for the latest.",
  },
  "pack.starter1.desc": { ko: "AI 창작을 처음 탐색하는 분께", en: "For those first exploring AI creation" },
  "pack.starter2.desc": { ko: "꾸준히 창작하는 크리에이터의 시작", en: "A starting point for steady creators" },
  "pack.pro1.desc": { ko: "빠른 작업이 필요한 라이트 옵션", en: "A light option when you need speed" },
  "pack.pro2.desc": { ko: "가장 인기 있는 선택. 상상하는 모든 것을", en: "The most popular choice — everything you imagine" },
  "pack.master.desc": { ko: "한계 없이, 모든 것을 만드세요", en: "Create everything, without limits" },

  /* ------------------------------ FAQ ------------------------------ */
  "faq.titleKo": { ko: "자주 묻는 질문", en: "Answers in" },
  "faq.desc": {
    ko: "가장 많이 받는 질문을 모았습니다. 원하는 답이 없다면 언제든 문의해 주세요.",
    en: "The questions we hear most. If you can't find your answer, reach out anytime.",
  },
  "faq.contact": { ko: "1:1 문의하기", en: "Contact us" },
  "faq.empty": { ko: "등록된 질문이 없습니다.", en: "No questions yet." },

  /* ------------------------------ CTA ------------------------------ */
  "cta.subtitle": {
    ko: "가이드를 다 읽으셨다면, 이제 직접 만들어 볼 차례입니다.",
    en: "Done reading the guide? Now it's your turn to create.",
  },
  "cta.adTemplate": { ko: "Ad Storyboard 템플릿", en: "Ad Storyboard template" },
  "cta.subscribe.title": { ko: "업데이트 알림 받기", en: "Get update alerts" },
  "cta.subscribe.desc": {
    ko: "새 기능과 중요 공지를 메일로 가장 먼저 받아보세요.",
    en: "Be the first to get new features and key notices by email.",
  },
  "cta.subscribe.emailLabel": { ko: "이메일", en: "Email" },
  "cta.subscribe.submit": { ko: "구독", en: "Subscribe" },
  "cta.subscribe.done": { ko: "완료", en: "Done" },
  "cta.subscribe.errHelp": { ko: "올바른 이메일을 입력해 주세요.", en: "Please enter a valid email." },
  "cta.subscribe.doneHelp": { ko: "구독이 완료되었습니다.", en: "You're subscribed." },
  "cta.subscribe.idleHelp": { ko: "언제든 구독을 해지할 수 있습니다.", en: "You can unsubscribe anytime." },
  "cta.contact.title": { ko: "원하는 답을 찾지 못하셨나요?", en: "Didn't find what you need?" },
  "cta.contact.email": { ko: "이메일 문의", en: "Email support" },
  "cta.contact.studio": { ko: "스튜디오 내 문의", en: "In-studio chat" },
  "cta.contact.studioSub": { ko: "로그인 후 채팅", en: "Chat after signing in" },

  /* ----------------------------- 푸터 ----------------------------- */
  "footer.tagline": {
    ko: "AI Storyboard for Ad Campaigns. XCONDA의 모든 소식과 사용법을 가장 빠르게 전합니다.",
    en: "AI Storyboard for Ad Campaigns. The fastest way to get all XCONDA news and how-tos.",
  },
  "footer.navAria": { ko: "푸터", en: "Footer" },
  "footer.poweredNotion": { ko: "Powered by Notion", en: "Powered by Notion" },
  "footer.col.guide": { ko: "가이드 센터", en: "Guide Center" },
  "footer.col.studio": { ko: "핵심 스튜디오", en: "Core Studios" },
  "footer.link.allTools": { ko: "전체 툴", en: "All tools" },
  "footer.link.openStudio": { ko: "스튜디오 열기", en: "Open Studio" },
  "footer.link.buyCredits": { ko: "크레딧 구매", en: "Buy credits" },
  "footer.link.email": { ko: "이메일", en: "Email" },

  /* -------------------------- 동기화 상태 -------------------------- */
  "sync.loading": { ko: "Notion 불러오는 중…", en: "Loading from Notion…" },
  "sync.syncing": { ko: "동기화 중…", en: "Syncing…" },
  "sync.error": { ko: "Notion 연결 오류 · 캐시 표시", en: "Notion connection error · showing cache" },
  "sync.sample": { ko: "샘플 콘텐츠 · Notion 미연결", en: "Sample content · Notion not connected" },
  "sync.now": { ko: "지금 동기화", en: "Sync now" },

  /* -------------------------- 아티클 모달 -------------------------- */
  "modal.pinnedNotice": { ko: "고정 공지", en: "Pinned notice" },
  "modal.related": { ko: "관련 글", en: "Related" },
  "modal.tryInStudio": { ko: "스튜디오에서 바로 해보기", en: "Try it in the studio" },
  "modal.loadingAria": { ko: "본문 불러오는 중", en: "Loading content" },

  /* ------------------------- 툴 가이드 본문 ------------------------- */
  "toolentry.howTo": { ko: "사용 방법", en: "How to use" },
  "toolentry.tips": { ko: "팁", en: "Tips" },

  /* ------------------------- 상대 시간 ------------------------- */
  "time.justNow": { ko: "방금 전", en: "just now" },

  /* ================================================================== *
   * volt 리디자인 — 섹션/카피
   * ================================================================== */
  "v.nav.search": { ko: "통합 검색", en: "Search" },
  "v.nav.open": { ko: "XCONDA 열기", en: "Open XCONDA" },
  "v.nav.menu": { ko: "메뉴", en: "Menu" },
  "v.lang.ko": { ko: "한국어", en: "Korean" },
  "v.lang.en": { ko: "English", en: "English" },
  "v.lang.toggleAria": { ko: "언어 변경", en: "Change language" },

  "v.hero.badge": { ko: "XCONDA 공식 가이드 센터", en: "XCONDA Official Guide Center" },
  "v.hero.lead": { ko: "빠른 공지, 쉬운 툴 가이드,", en: "Fast notices, easy tool guides," },
  "v.hero.accent": { ko: "핵심 업데이트로 한발 앞서가세요.", en: "stay ahead with key updates." },
  "v.hero.desc": {
    ko: "XCONDA의 모든 업데이트 소식과 툴별 사용법, 자주 묻는 질문을 한 곳에 모았습니다. 검색으로 시간을 쓰지 말고, 이 페이지에서 답을 찾으세요.",
    en: "Every XCONDA update, per-tool walkthrough, and common question in one place. Stop searching — the answer is on this page.",
  },
  "v.hero.cta1": { ko: "툴 사용법 바로 보기", en: "Browse tool guides" },
  "v.hero.cta2": { ko: "통합 검색으로 찾기", en: "Search everything" },

  "v.notices.kicker": { ko: "매주 업데이트", en: "Updated weekly" },
  "v.notices.lead": { ko: "공지사항 —", en: "Notices —" },
  "v.notices.accent": { ko: "시행착오를 줄이는", en: "the fastest intel" },
  "v.notices.accentTail": { ko: "가장 빠른 정보", en: "with less trial and error." },
  "v.notices.subA": { ko: "서비스 변경, 점검 일정, 정책 개정은 이 페이지 하나로", en: "Service changes, maintenance windows and policy revisions — all on" },
  "v.notices.subB": { ko: "확인하세요. 고정 공지는 항상 상단에 유지됩니다.", en: "one page. Pinned notices always stay on top." },
  "v.notices.subStrong": { ko: "이 페이지 하나", en: "this one page" },
  "v.notices.latest": { ko: "최신", en: "LATEST" },
  "v.notices.important": { ko: "중요 공지", en: "Featured" },
  "v.notices.detail": { ko: "자세히 보기", en: "Read more" },
  "v.notices.showing": { ko: "표시 중", en: "showing" },
  "v.notices.empty": { ko: "해당 분류의 공지가 없습니다.", en: "No notices in this category." },
  "v.notices.changes": { ko: "주요 내용", en: "Key points" },

  "v.guides.kicker": { ko: "개 툴", en: "tools" },
  "v.guides.lead": { ko: "툴 사용법 —", en: "Tool guides —" },
  "v.guides.accent": { ko: "흐름이 끊기지 않는", en: "uninterrupted flow," },
  "v.guides.accentTail": { ko: "직관적 매뉴얼", en: "an intuitive manual." },
  "v.guides.subA": { ko: "단계별로, 툴별로. 어디서 막혔는지만 찾아 읽으세요. 모든 가이드에는", en: "By step, by tool — read the exact place you got stuck. Every guide includes" },
  "v.guides.subB": { ko: "실제로 통하는 프롬프트와 순서가 들어 있습니다.", en: "the prompt and sequence that actually works." },
  "v.guides.subStrong": { ko: "실제로 통하는 프롬프트 예시", en: "a working prompt example" },
  "v.guides.explorer": { ko: "툴별 상세 가이드", en: "Detailed guides by tool" },
  "v.guides.updated": { ko: "최종 수정", en: "updated" },
  "v.guides.howTo": { ko: "사용 순서", en: "How to use" },
  "v.guides.stepCount": { ko: "단계", en: "steps" },
  "v.guides.tip": { ko: "디렉터의 팁", en: "Director’s tip" },
  "v.guides.prompt": { ko: "프롬프트 예시", en: "Prompt example" },
  "v.guides.run": { ko: "실행하기", en: "Open tool" },
  "v.guides.next": { ko: "다음 툴 가이드", en: "Next tool" },
  "v.guides.openFull": { ko: "전체 가이드 열기", en: "Open full guide" },
  "v.guides.video": { ko: "공식 영상 가이드", en: "Official video guide" },
  "v.guides.footnote": {
    ko: "가이드는 실제 서비스 화면 기준으로 작성되었으며, UI 변경 시 함께 업데이트됩니다.",
    en: "Guides follow the real product screens and are updated alongside UI changes.",
  },
  "v.guides.noTip": { ko: "추가 팁이 없습니다.", en: "No extra tips for this tool." },

  "v.updates.kicker": { ko: "릴리스 노트", en: "Release notes" },
  "v.updates.lead": { ko: "업데이트 —", en: "Updates —" },
  "v.updates.accent": { ko: "현업에 바로 적용할", en: "practical recaps" },
  "v.updates.accentTail": { ko: "실속 기능 요약", en: "you can apply today." },
  "v.updates.subA": { ko: "새 기능과 개선, 수정 내역만 선별합니다. 홍보성 소식은 걸러 내고,", en: "Only new features, improvements and fixes. We filter out marketing noise and keep" },
  "v.updates.subB": { ko: "실무에 바로 영향을 주는 것", en: "what actually changes your workflow" },
  "v.updates.subStrong": { ko: "실무에 바로 영향을 주는 것", en: "what actually changes your workflow" },
  "v.updates.featured": { ko: "최신 릴리스", en: "Latest release" },
  "v.updates.readMore": { ko: "전문 보기", en: "Open notes" },
  "v.updates.empty": { ko: "아직 등록된 업데이트가 없습니다.", en: "No updates published yet." },
  "v.updates.syncAria": { ko: "Notion 연동 상태", en: "Notion sync status" },
  "v.updates.syncTitle": { ko: "이 페이지는 Notion에서 자동 동기화됩니다.", en: "This page syncs automatically from Notion." },
  "v.updates.syncDesc": {
    ko: "운영팀이 Notion에서 글을 발행하는 즉시 이 화면에 반영됩니다. 새로고침 버튼을 누르면 캐시를 무효화하고 최신 스냅샷을 읽어옵니다.",
    en: "Whatever the team publishes in Notion shows up here immediately. Hit refresh to invalidate the cache and pull the newest snapshot.",
  },
  "v.updates.syncCta": { ko: "XCONDA 스튜디오 열기", en: "Open XCONDA Studio" },

  "v.credits.kicker": { ko: "요금제", en: "Pricing" },
  "v.credits.lead": { ko: "크레딧 —", en: "Credits —" },
  "v.credits.accent": { ko: "쓰는 만큼만", en: "pay for what you use" },
  "v.credits.accentTail": { ko: "지불하세요.", en: "." },
  "v.credits.subA": { ko: "생성 횟수가 늘수록 1K당 단가가 내려갑니다. 모든 팩은 구매 후 ", en: "The more you generate, the lower the per-1K rate. Every pack includes " },
  "v.credits.subB": { ko: "일 회차만 유효합니다.", en: " with no expiry on the purchase itself." },
  "v.credits.unit": { ko: "크레딧", en: "credits" },
  "v.credits.popular": { ko: "인기", en: "Popular" },
  "v.credits.buy": { ko: "구매", en: "Buy" },
  "v.credits.save": { ko: "절약", en: "Save" },
  "v.credits.perK": { ko: "1K당", en: "per 1K" },
  "v.credits.note": {
    ko: "크레딧은 Tool별 실행 버튼 옆에서 실시간으로 확인되며, 사용하지 않은 크레딧은 다음 결제일로 이월됩니다.",
    en: "You can see your credit balance live next to each tool’s run button, and unused credits roll over to the next billing date.",
  },
  "v.credits.noteTitle": { ko: "크레딧 안내", en: "How credits work" },

  "v.faq.kicker": { ko: "모두", en: "answers" },
  "v.faq.lead": { ko: "자주 묻는 질문", en: "Frequently asked questions" },
  "v.faq.subA": { ko: "가이드를 읽어도 남는 질문들입니다. 여기에 없으면 하단 문의로 보내주세요 —", en: "The questions that survive reading every guide. If yours isn’t here, send it below — we answer" },
  "v.faq.subB": { ko: "영업일 기준 1일 내", en: "within one business day" },
  "v.faq.subStrong": { ko: "영업일 기준 1일 내", en: "within one business day" },
  "v.faq.count": { ko: "개 문항", en: "questions" },
  "v.faq.full": { ko: "전체 답변 보기", en: "Open full answer" },
  "v.faq.empty": { ko: "등록된 질문이 없습니다.", en: "No questions published yet." },

  "v.cta.kicker": { ko: "시작하세요", en: "Start now" },
  "v.cta.line1": { ko: "가이드는 읽는 게 아니라", en: "A guide is not read." },
  "v.cta.line2": { ko: "따라 하는 것.", en: "It is followed." },
  "v.cta.desc": {
    ko: "가이드를 옆에 두고, 지금 바로 첫 스토리보드를 만들어 보세요. 가입 즉시 크레딧이 지급됩니다.",
    en: "Keep a guide open and make your first storyboard right now. Credits land in your account as soon as you sign up.",
  },
  "v.cta.start": { ko: "XCONDA 시작하기", en: "Start with XCONDA" },
  "v.cta.again": { ko: "가이드 다시 보기", en: "Back to guides" },

  "v.footer.desc": {
    ko: "AI로 광고·영상을 만드는 사람들을 위한 공식 가이드 센터. 업데이트 소식, 툴 사용법, 업계 뉴스를 한 곳에서.",
    en: "The official guide center for people making ads and film with AI — release notes, tool walkthroughs, and industry news in one place.",
  },
  "v.footer.guide": { ko: "가이드", en: "Guide" },
  "v.footer.tools": { ko: "툴", en: "Tools" },
  "v.footer.support": { ko: "지원", en: "Support" },
  "v.footer.rights": {
    ko: "© 2026 XCONDA. All rights reserved. · 가이드 내용은 사전 고지 없이 업데이트됩니다.",
    en: "© 2026 XCONDA. All rights reserved. · Guides may change without prior notice.",
  },
  "v.footer.backToTop": { ko: "맨 위로", en: "Back to top" },

  "v.search.placeholder": {
    ko: "공지 · 툴 · 업데이트를 검색하세요 (예: 크레딧, Kling, 컨티뉴이티)",
    en: "Search notices, tools and updates (try: credits, Kling, continuity)",
  },
  "v.search.empty": { ko: "검색 결과가 없습니다.", en: "No results." },
  "v.search.emptyHint": {
    ko: "‘크레딧’, ‘점검’, ‘스토리보드’, ‘업스케일’ 같은 키워드를 시도해 보세요.",
    en: "Try keywords like “credits”, “maintenance”, “storyboard” or “upscale”.",
  },
  "v.search.results": { ko: "results", en: "results" },
  "v.search.close": { ko: "닫기", en: "Close" },
  "v.search.all": { ko: "전체", en: "All" },

  "v.ticker.brand": { ko: "가이드 센터", en: "Guide Center" },
};

export function translate(key: string, lang: Lang): string {
  const e = DICT[key];
  if (!e) return key;
  return e[lang] ?? e.ko ?? key;
}

/* ------------------------------------------------------------------ *
 * 열거형(타입/그룹) 라벨 — 값(한국어)은 필터 키로 유지하고 표시만 번역.
 * ------------------------------------------------------------------ */
export const TYPE_LABELS: Record<string, Entry> = {
  notice: { ko: "공지", en: "Notice" },
  update: { ko: "업데이트", en: "Update" },
  guide: { ko: "가이드", en: "Guide" },
  faq: { ko: "FAQ", en: "FAQ" },
};

export const GROUP_LABELS: Record<string, Entry> = {
  전체: { ko: "전체", en: "All" },
  "핵심 스튜디오": { ko: "핵심 스튜디오", en: "Core Studios" },
  스토리보드: { ko: "스토리보드", en: "Storyboard" },
  "카메라 · 앵글": { ko: "카메라 · 앵글", en: "Camera · Angle" },
  "이미지 편집": { ko: "이미지 편집", en: "Image Editing" },
  "생성 · 보정": { ko: "생성 · 보정", en: "Generate · Enhance" },
};

export const CATEGORY_LABELS: Record<string, Entry> = {
  공지: { ko: "공지", en: "Notice" },
  점검: { ko: "점검", en: "Maintenance" },
  이벤트: { ko: "이벤트", en: "Event" },
  정책: { ko: "정책", en: "Policy" },
  시작하기: { ko: "시작하기", en: "Getting Started" },
  시나리오: { ko: "시나리오", en: "Scenario" },
  캐릭터: { ko: "캐릭터", en: "Character" },
  크레딧: { ko: "크레딧", en: "Credits" },
  사용법: { ko: "사용법", en: "How-to" },
};

const CHANGE_LABELS: Record<string, Entry> = {
  New: { ko: "신규", en: "New" },
  Improved: { ko: "개선", en: "Improved" },
  Fixed: { ko: "수정", en: "Fixed" },
};

export function typeLabel(type: string, lang: Lang): string {
  return TYPE_LABELS[type]?.[lang] ?? type;
}

export function groupLabel(group: string, lang: Lang): string {
  return GROUP_LABELS[group]?.[lang] ?? group;
}

export function categoryLabel(category: string, lang: Lang): string {
  return CATEGORY_LABELS[category]?.[lang] ?? category;
}

export function changeLabel(kind: string, lang: Lang): string {
  return CHANGE_LABELS[kind]?.[lang] ?? kind;
}
