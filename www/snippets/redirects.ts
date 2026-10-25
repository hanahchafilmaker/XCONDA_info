/**
 * www.xconda.ai 리다이렉트 정리 — `next.config.ts` 의 redirects() 에 붙여 넣으세요.
 *
 * 원칙
 *   1) **검색에 잡혀야 하는 옛 주소 → 새 공개 주소** 는 `permanent: true`(301).
 *      → 검색엔진이 색인·링크 신호를 새 주소로 넘깁니다. 302 는 "임시"라 신호가 넘어가지 않습니다.
 *   2) **로그인 게이트** 는 301 로 바꾸지 마세요. 사람·봇 모두에게 "영구 이동"을 알리면
 *      스튜디오 주소가 로그인 주소로 색인되어, 로그인 후 돌아올 경로가 사라집니다. → 307 유지.
 *   3) 옛 주소를 지우지 말고 301 로 남깁니다(외부 링크·광고 소재가 그 주소를 가리킬 수 있음).
 *
 * ⚠️ 아래 매핑은 2026-10-25 기준 `sitemap.xml`(10개 주소)과 홈 링크 구조에서 확인한 것입니다.
 *    실제 리다이렉트 규칙이 이미 있다면 그 규칙과 합치고, 겹치는 항목은 하나만 남기세요.
 */
export type Redirect = {
  source: string;
  destination: string;
  permanent: boolean;
};

/** 공개 페이지 — 301 */
export const publicRedirects: Redirect[] = [
  // 옛 기능 랜딩 → 기능 페이지(같은 내용을 가리키는 경우만)
  { source: "/storyboards", destination: "/features/flexboard", permanent: true },
  { source: "/ko/storyboards", destination: "/ko/features/flexboard", permanent: true },
  { source: "/images", destination: "/features/image", permanent: true },
  { source: "/ko/images", destination: "/ko/features/image", permanent: true },
  { source: "/video", destination: "/features/video", permanent: true },
  { source: "/ko/video", destination: "/ko/features/video", permanent: true },
  // 옛 가이드 모음 → 기능 목록
  { source: "/guides", destination: "/features", permanent: true },
  { source: "/ko/guides", destination: "/ko/features", permanent: true },
  // 언어 접두사 없이 들어온 한국어 문서(있다면) → /ko
  { source: "/terms", destination: "/legal/terms", permanent: true },
  { source: "/privacy", destination: "/legal/privacy", permanent: true },
  { source: "/refund", destination: "/legal/refund", permanent: true },
];

/**
 * 로그인 게이트 — 여기는 손대지 않습니다(참고용으로만 기록).
 *   /studio/:tool        → /login?redirect=/studio/:tool        (302/307 유지)
 *   /ko/studio/:tool     → /login?redirect=/ko/studio/:tool     (302/307 유지, 2026-10-25 확인)
 *   /support/qna         → /login?redirect=/support/qna         (302/307 유지)
 */
export const gatedPaths = ["/studio/:tool*", "/ko/studio/:tool*", "/support/qna", "/ko/support/qna"];

/**
 * next.config.ts 에 붙이는 예:
 *
 *   import { publicRedirects } from "./www/snippets/redirects";
 *
 *   const nextConfig: NextConfig = {
 *     async redirects() {
 *       return publicRedirects;
 *     },
 *   };
 *
 * Vercel 에서 직접 관리한다면 `vercel.json` 의 `redirects` 배열에 같은 값을 넣고
 * `"permanent": true`(308) 대신 `"statusCode": 301` 을 명시하세요.
 */
