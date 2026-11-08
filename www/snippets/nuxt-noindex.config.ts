/**
 * `test.xconda.ai` noindex — `nuxt.config.ts` 에 **키만** 병합하는 조각
 *
 * 위의 `noindex-test-host.ts`(Nitro 미들웨어)와 함께 쓰는 두 번째 방어선입니다.
 *   - 미들웨어 : SSR 응답의 `X-Robots-Tag` 헤더 (서버가 렌더링할 때)
 *   - 이 파일   : 정적 생성(SSG) 에서도 남는 `<meta name="robots">` 태그
 *
 * 정적 생성은 요청 시점 호스트를 모르므로 **빌드 env** 로 판정합니다.
 *   → 테스트 배포는 반드시 `NUXT_PUBLIC_SITE_ENV=test` 로 빌드하세요.
 *   → 같은 산출물을 운영·테스트에 함께 배포한다면 이 방법은 쓸 수 없습니다.
 *      그때는 호스트를 요청 시점에 보는 A안(Cloudflare Transform Rule)만 정확합니다.
 *
 * ⚠️ 절대 하지 말 것: `routeRules: { '/**': { headers: { 'X-Robots-Tag': ... } } }` 를
 *    조건 없이 넣는 것. 그 순간 운영 www 가 색인에서 빠집니다.
 *    (Search Console 기준 클릭 988 중 976 이 `/` 한 페이지에서 나오는 구조라 치명적입니다)
 */

const SITE_ENV = process.env.NUXT_PUBLIC_SITE_ENV || 'production';
const IS_NON_PROD = SITE_ENV !== 'production';

export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      // 앱 코드에서 분기할 때: const { siteEnv } = useRuntimeConfig().public
      siteEnv: SITE_ENV,
    },
  },

  app: {
    head: {
      // 운영(production)에서는 빈 배열 → 기존 동작에 아무 영향 없음
      meta: IS_NON_PROD
        ? [{ name: 'robots', content: 'noindex, nofollow, noarchive' }]
        : [],
      // titleTemplate 등 기존 설정은 건드리지 마세요. meta 키만 추가합니다.
    },
  },
});

/**
 * 적용 순서
 *
 * 1) 기존 `nuxt.config.ts` 의 `defineNuxtConfig({ ... })` 안에
 *    `runtimeConfig.public.siteEnv` 와 `app.head.meta` 두 키만 추가합니다(덮어쓰기 금지).
 * 2) `server/middleware/000-noindex-test-host.ts` 를 추가합니다.
 * 3) 테스트 배포 CI 에 `NUXT_PUBLIC_SITE_ENV=test` 를 넣습니다.
 * 4) 호스팅 앞단에서 헤더를 보강합니다(해당하는 것 하나).
 *
 *    Cloudflare Transform Rule — 가장 안전. 호스트 조건을 지정할 수 있습니다.
 *      hostname equals "test.xconda.ai"
 *      → Set static header  X-Robots-Tag = noindex, nofollow, noarchive
 *
 *    Cloudflare Pages `_headers` — **테스트가 별도 프로젝트일 때만**
 *      ```
 *      /*
 *        X-Robots-Tag: noindex, nofollow, noarchive
 *      ```
 *      같은 프로젝트의 커스텀 도메인으로 붙였다면 운영까지 걸리므로 쓰지 마세요.
 *
 *    nginx — 이 server 블록이 test 만 서비스할 때만
 *      ```
 *      add_header X-Robots-Tag "noindex, nofollow, noarchive" always;
 *      ```
 *
 * 5) 확인
 *      curl -sI https://test.xconda.ai/pricing | grep -i x-robots-tag   # → noindex...
 *      curl -sI https://www.xconda.ai/pricing  | grep -i x-robots-tag   # → 아무것도 없어야 정상
 *
 * ※ 이 파일은 robots.txt·canonical 을 건드리지 않습니다.
 *    - robots.txt : 지금은 `Disallow` 를 넣지 마세요. 크롤러가 페이지의 noindex 를 읽지 못해
 *                   이미 색인된 4건이 더 오래 남습니다. 색인 0건 확인 후에 다룹니다.
 *    - canonical   : 페이지별 `useHead` 에서 자기 자신을 가리키는 설정을 제거하고
 *                   `https://www.xconda.ai/...` 대응 주소로 바꿉니다(별도 작업).
 */
