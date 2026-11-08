/**
 * `test.xconda.ai` (및 preview 호스트) noindex — Nitro 서버 미들웨어
 *
 * 위치: www 앱 저장소의 `server/middleware/000-noindex-test-host.ts`
 *       (파일명 앞 숫자는 실행 순서입니다. 다른 미들웨어보다 먼저 돌게 000 을 붙입니다.)
 *
 * 원칙
 *   1) **호스트로 판정합니다.** 빌드 시점 env 로 판정하면, 같은 빌드 산출물을 운영과
 *      테스트에 함께 배포했을 때 한쪽이 반드시 틀립니다. 요청 호스트가 유일하게 안전한 기준입니다.
 *   2) **운영 호스트는 손대지 않습니다.** `www.xconda.ai` · `xconda.ai` · `hub.xconda.ai` 는
 *      명시적으로 제외 목록에 넣어, 규칙이 잘못 확장돼도 운영이 죽지 않게 합니다.
 *   3) `nofollow` 를 함께 보냅니다. 테스트 페이지에서 나가는 링크로 평판이 흐르지 않게 합니다.
 *      `noarchive` 는 구글 캐시본에 요금제가 남는 것을 막습니다.
 *
 * ⚠️ 이 파일은 **SSR(`nuxt build`) 에서만 동작합니다.**
 *    `nuxt generate`(정적 생성)로 배포한다면 미들웨어가 실행되지 않으므로
 *    `nuxt-noindex.config.ts` 의 meta 태그 + 호스팅 헤더(`_headers` / nginx) 를 함께 쓰세요.
 *    두 방식을 모두 넣어 두면 어느 쪽으로 배포해도 빠지지 않습니다.
 */

/** noindex 를 걸 대상 — 테스트·스테이징·미리보기 */
const NOINDEX_HOST_PATTERNS: RegExp[] = [
  /^test\./i, // test.xconda.ai
  /^staging\./i, // staging.xconda.ai
  /^dev\./i, // dev.xconda.ai
  /\.pages\.dev$/i, // Cloudflare Pages 미리보기
  /\.vercel\.app$/i, // Vercel 미리보기
  /^localhost(:\d+)?$/i,
  /^127\.0\.0\.1(:\d+)?$/i,
];

/** 절대 손대면 안 되는 호스트 — 어떤 경우에도 noindex 를 보내지 않습니다 */
const PROD_HOSTS = new Set([
  'xconda.ai',
  'www.xconda.ai',
  'hub.xconda.ai',
]);

const NOINDEX_VALUE = 'noindex, nofollow, noarchive';

export default defineEventHandler((event) => {
  const host = (getRequestHeader(event, 'host') || '').split(':')[0].toLowerCase();

  if (!host) return;
  if (PROD_HOSTS.has(host)) return;
  if (!NOINDEX_HOST_PATTERNS.some((re) => re.test(host))) return;

  // HTML·JSON·PDF·이미지 등 모든 응답에 붙입니다. 검색엔진은 헤더만 보고 판단합니다.
  setResponseHeader(event, 'X-Robots-Tag', NOINDEX_VALUE);

  // CDN·프록시가 헤더를 캐시하면 호스트별 응답이 섞일 수 있어 Vary 를 명시합니다.
  // (Cloudflare 는 기본적으로 Host 로 캐시를 분리하지만, 앞단에 다른 프록시가 있으면 필요합니다.)
  setResponseHeader(event, 'Vary', 'Host');

  // 테스트 환경에서 noindex 가 걸린 것을 운영자가 바로 알 수 있게 남깁니다.
  // (요청마다 찍히면 시끄러우니 필요 없으면 이 줄을 지우세요.)
  if (process.env.NOINDEX_LOG === '1') {
    console.log(`[noindex] ${host}${event.path} → ${NOINDEX_VALUE}`);
  }
});
