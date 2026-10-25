/**
 * www.xconda.ai SEO 도우미 — `lib/seo.ts` 로 복사해 쓰세요.
 *
 * 목적(2026-10-25 감사 C 그룹)
 *   1) `/ko` 이하 페이지에 **자기 canonical** 과 hreflang 묶음 부여 (지금은 영어·한국어가 각자 기준 없이 존재)
 *   2) 기능 페이지 구조화 데이터(SoftwareApplication + FAQPage + BreadcrumbList)
 *   3) 요금 페이지의 **Offer**(크레딧 패키지 5종) — 허브에는 가격을 넣지 않고 여기만 넣습니다
 *
 * ⚠️ 가격·통화는 실제 청구 기준으로 확인해 넣으세요. 아래 값은 2026-10-25 사이트에 표시된
 *    "$6.90 / 2,020 Credits" 등 **화면 표기 기준**입니다(원화 청구·부가세 10% 별도 안내 있음).
 */

export const SITE = "https://www.xconda.ai";

export type Lang = "ko" | "en";

/** 사이트 안 경로 → 언어별 절대 주소 (영어는 접두사 없음, 한국어는 /ko) */
export function localeUrl(lang: Lang, path = ""): string {
  const clean = String(path).replace(/^\/+/, "");
  return `${SITE}${lang === "ko" ? "/ko/" : "/"}${clean}`;
}

/**
 * hreflang 묶음 + x-default(영어 = 기본 언어).
 * Next.js metadata.alternates.languages 에 그대로 넣습니다.
 */
export function alternateLanguages(path = ""): Record<string, string> {
  return {
    en: localeUrl("en", path),
    ko: localeUrl("ko", path),
    "x-default": localeUrl("en", path),
  };
}

/* ------------------------------ 구조화 데이터 ------------------------------ */

type JsonLdNode = Record<string, unknown>;

/**
 * 기능 페이지 — SoftwareApplication.
 * 허브의 Organization·Brand 와 **같은 회사**를 가리키도록 이름·URL 을 맞춥니다.
 */
export function softwareApplicationJsonLd({
  name,
  description,
  url,
  lang,
}: {
  name: string;
  description: string;
  url: string;
  lang: Lang;
}): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${url}#app`,
    name,
    description,
    url,
    applicationCategory: "MultimediaApplication",
    applicationSubCategory: "AI video and storyboard production",
    operatingSystem: "Web",
    inLanguage: lang === "ko" ? "ko-KR" : "en-US",
    publisher: {
      "@type": "Organization",
      name: "Cubeberry Co., Ltd.",
      alternateName: "주식회사 큐브베리",
      url: `${SITE}/`,
    },
    // 무료로 시작할 수 있는 범위가 있으면 넣습니다(스튜디오 진입 자체는 무료).
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: lang === "ko" ? "무료로 시작하고 크레딧을 구매해 사용" : "Start free, buy credits as you go",
      url: localeUrl(lang, "pricing"),
    },
  };
}

/** FAQPage — 기능 페이지의 Q&A 를 그대로 구조화합니다. */
export function faqPageJsonLd({ faq, url }: { faq: { q: string; a: string }[]; url: string }): JsonLdNode | null {
  if (!faq?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** BreadcrumbList */
export function breadcrumbJsonLd(items: { name: string; url: string }[]): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

/* ------------------------------ 요금 페이지(Offer) ------------------------------ */

/** 2026-10-25 www 화면 표기 기준. 청구 통화가 KRW 라면 priceCurrency 를 바꾸고 금액을 원화로 넣으세요. */
export const CREDIT_PACKS = [
  { id: "starter-v1", name: "Starter Pack V1", credits: 2020, price: "6.90", currency: "USD" },
  { id: "starter-v2", name: "Starter Pack V2", credits: 6200, price: "20.90", currency: "USD" },
  { id: "pro-v1", name: "Pro Pack V1", credits: 10500, price: "34.90", currency: "USD" },
  { id: "pro-v2", name: "Pro Pack V2", credits: 21500, price: "67.90", currency: "USD" },
  { id: "master", name: "Master Pack", credits: 114000, price: "369.90", currency: "USD" },
] as const;

/**
 * 요금 페이지용 Product + Offer 묶음.
 * `AggregateOffer` 대신 패키지별 `Offer` 를 각각 내보내 검색·AI 가 금액을 그대로 인용하게 합니다.
 */
export function creditPackOffersJsonLd(lang: Lang): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${localeUrl(lang, "pricing")}#credits`,
    name: lang === "ko" ? "XCONDA 크레딧 패키지" : "XCONDA credit packs",
    description:
      lang === "ko"
        ? "1회성 결제 크레딧 패키지. 결제일로부터 1년간 유효하며, 국내 결제는 부가세 10% 포함 원화로 청구됩니다."
        : "One-time credit packs, valid for one year from purchase. Korean billing includes 10% VAT and is charged in KRW.",
    brand: { "@type": "Brand", name: "XCONDA" },
    offers: CREDIT_PACKS.map((p) => ({
      "@type": "Offer",
      name: p.name,
      price: p.price,
      priceCurrency: p.currency,
      availability: "https://schema.org/InStock",
      url: localeUrl(lang, "pricing"),
      eligibleQuantity: { "@type": "QuantitativeValue", value: p.credits, unitText: "credits" },
    })),
  };
}

/* ------------------------------ React 헬퍼 ------------------------------ */

/**
 * JSON-LD 를 <script> 로 넣는 컴포넌트.
 *   <JsonLd data={...} />
 * 문자열은 `</script>` 로 깨지지 않게 `<` 를 이스케이프합니다.
 */
export function JsonLd({ data }: { data: JsonLdNode | null }): JSX.Element | null {
  if (!data) return null;
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  // eslint-disable-next-line react/no-danger
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
