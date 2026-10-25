/**
 * 기능 페이지 공유 카드(1200×630) — Next.js `opengraph-image.tsx` (ImageResponse)
 *
 * 파일 위치: `app/[lang]/features/[slug]/opengraph-image.tsx`
 *   → `/features/flexboard/opengraph-image` 가 자동으로 og:image 가 됩니다.
 *   → metadata 에서 `images: [{ url: ".../opengraph-image", width: 1200, height: 630 }]` 로 지정하면 확실합니다.
 *
 * 왜 필요한가
 *   지금 공유 카드가 없으면 링크 미리보기가 사이트 기본 이미지로만 나옵니다.
 *   기능 페이지는 검색 결과·AI 인용·SNS 공유에서 **제목이 보이는 카드**가 유리합니다.
 *
 * ⚠️ 한글 폰트는 기본 제공되지 않습니다. `assets/fonts/Pretendard-Bold.otf` 를 저장소에 두고
 *    아래 fonts 배열에 넣으세요(없으면 한글이 네모로 나옵니다).
 */
import { ImageResponse } from "next/og";
import featureData from "@/content/feature-pages.json";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "XCONDA feature";

export default async function Image({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug, lang } = await params;
  const page = (featureData.pages as any[]).find((p) => p.slug === slug);
  const copy = page?.[lang === "ko" ? "ko" : "en"] ?? { h1: page?.name ?? "XCONDA", intro: "" };
  const kicker = lang === "ko" ? "XCONDA 기능" : "XCONDA feature";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0b0b",
          color: "#ffffff",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, color: "#facc15" }}>
          <span style={{ fontWeight: 800 }}>XCONDA</span>
          <span style={{ color: "#71717a" }}>·</span>
          <span style={{ color: "#a1a1aa" }}>{kicker}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em" }}>{copy.h1}</div>
          <div style={{ fontSize: 34, color: "#a1a1aa", lineHeight: 1.4, maxWidth: 980 }}>
            {(copy.intro ?? "").slice(0, 110)}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#71717a" }}>
          <span>www.xconda.ai/{lang === "ko" ? "ko/" : ""}features/{slug}</span>
          <span style={{ color: "#facc15" }}>hub.xconda.ai</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
