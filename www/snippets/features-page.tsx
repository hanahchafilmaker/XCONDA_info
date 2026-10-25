/**
 * www.xconda.ai 기능 페이지 — Next.js App Router 기준 구현 예시
 *
 * 파일 위치(권장): `app/[lang]/features/[slug]/page.tsx`
 *   · `/features/flexboard`      → 영어(기본 언어)
 *   · `/ko/features/flexboard`   → 한국어
 *
 * 전제
 *   - `www/feature-pages.json` 을 `content/feature-pages.json` 으로 복사해 두고 아래 `getFeaturePage` 로 읽습니다.
 *   - `[lang]` 세그먼트는 기존 사이트의 언어 처리 방식에 맞춰 조정하세요(없다면 `app/features/[slug]` + `app/ko/features/[slug]` 두 파일).
 *   - 로그인 뒤 스튜디오(`/ko/studio/<tool>`)는 그대로 두고, 이 페이지만 **공개**로 엽니다.
 *     (지금은 스튜디오로 들어가는 모든 경로가 로그인으로 리다이렉트되어 검색에 잡히는 페이지가 없습니다 — 2026-10-25 확인)
 */
import type { Metadata } from "next";
import featureData from "@/content/feature-pages.json";
import {
  SITE,
  alternateLanguages,
  breadcrumbJsonLd,
  faqPageJsonLd,
  softwareApplicationJsonLd,
  JsonLd,
} from "@/lib/seo";

type Lang = "ko" | "en";
type Params = { params: Promise<{ lang: string; slug: string }> };

type FeaturePage = (typeof featureData.pages)[number];

export function generateStaticParams() {
  return featureData.pages.flatMap((p) => [
    { lang: "en", slug: p.slug },
    { lang: "ko", slug: p.slug },
  ]);
}

const getFeaturePage = (slug: string): FeaturePage | undefined =>
  (featureData.pages as FeaturePage[]).find((p) => p.slug === slug);

const asLang = (lang: string): Lang => (lang === "ko" ? "ko" : "en");

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, lang: raw } = await params;
  const page = getFeaturePage(slug);
  if (!page) return {};
  const lang = asLang(raw);
  const copy = page[lang];
  const path = `${featureData.basePath}/${page.slug}/`;

  return {
    // 사이트 공통 title template(`%s | XCONDA`)을 쓴다면 여기서 접미사를 붙이지 마세요.
    title: copy.title,
    description: copy.description,
    alternates: {
      canonical: `${SITE}${lang === "ko" ? "/ko" : ""}/${path}`,
      languages: alternateLanguages(path),
    },
    openGraph: {
      type: "website",
      siteName: "XCONDA",
      locale: lang === "ko" ? "ko_KR" : "en_US",
      title: copy.title,
      description: copy.description,
      url: `${SITE}${lang === "ko" ? "/ko" : ""}/${path}`,
      images: [{ url: `${SITE}/${path}opengraph-image`, width: 1200, height: 630, alt: page.name }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function FeaturePage({ params }: Params) {
  const { slug, lang: raw } = await params;
  const page = getFeaturePage(slug);
  if (!page) return null; // notFound() 로 바꾸세요
  const lang = asLang(raw);
  const copy = page[lang];
  const url = `${SITE}${lang === "ko" ? "/ko" : ""}/${featureData.basePath}/${page.slug}/`;
  const studioHref = `${lang === "ko" ? "/ko" : ""}/studio/${page.studio}`;
  const hubHref = `https://hub.xconda.ai/${lang === "ko" ? "" : "en/"}qna/`; // 허브 글은 `page.hub` 슬러그로 연결
  const hubPostHref = `https://hub.xconda.ai/${lang === "ko" ? "" : "en/"}post/${page.hub}/`;

  return (
    <main>
      {/* 구조화 데이터 — 기능 페이지는 SoftwareApplication, FAQ 가 있으면 FAQPage */}
      <JsonLd data={softwareApplicationJsonLd({ name: page.name, description: copy.description, url, lang })} />
      <JsonLd data={faqPageJsonLd({ faq: copy.faq, url })} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "XCONDA", url: `${SITE}${lang === "ko" ? "/ko" : ""}/` },
          { name: lang === "ko" ? "기능" : "Features", url: `${SITE}${lang === "ko" ? "/ko" : ""}/${featureData.basePath}/` },
          { name: page.name, url },
        ])}
      />

      <h1>{copy.h1}</h1>
      <p>{copy.intro}</p>

      <section aria-labelledby="features">
        <h2 id="features">{lang === "ko" ? "주요 기능" : "What it does"}</h2>
        <ul>
          {copy.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>

      <p>
        {/* 공개 페이지 → 로그인 뒤 스튜디오. 로그인 리다이렉트는 SEO 대상이 아니므로 307 그대로 둡니다. */}
        <a href={studioHref}>{featureData.cta[lang]}</a>
      </p>

      <section aria-labelledby="faq">
        <h2 id="faq">{lang === "ko" ? "자주 묻는 질문" : "FAQ"}</h2>
        {copy.faq.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </section>

      <nav aria-label={lang === "ko" ? "더 알아보기" : "Learn more"}>
        <h2>{lang === "ko" ? "더 알아보기" : "Learn more"}</h2>
        <ul>
          <li>
            <a href={hubPostHref}>{lang === "ko" ? "허브에서 자세한 제작 방법 보기" : "Read the full workflow on the hub"}</a>
          </li>
          <li>
            <a href={hubHref}>{lang === "ko" ? "자주 묻는 질문 전체" : "All Q&A"}</a>
          </li>
        </ul>
      </nav>
    </main>
  );
}
