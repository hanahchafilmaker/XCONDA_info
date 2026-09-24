import { ArrowUpRight } from "lucide-react";
import { Container, Logo } from "./ui";
import { STUDIO_URL } from "../content/tools";
import { NotionMark } from "./common";
import { useContent } from "../content/ContentContext";
import { timeAgo } from "../notion";

const cols = [
  {
    title: "가이드 센터",
    links: [
      { l: "공지사항", h: "#notices" },
      { l: "업데이트", h: "#updates" },
      { l: "시작하기", h: "#start" },
      { l: "FAQ", h: "#faq" },
    ],
  },
  {
    title: "핵심 스튜디오",
    links: [
      { l: "360 Turn Studio", h: `${STUDIO_URL}/studio/turn` },
      { l: "Director's Cut", h: `${STUDIO_URL}/studio/directors-cut` },
      { l: "Art Director Pro", h: STUDIO_URL },
      { l: "전체 툴", h: "#tools" },
    ],
  },
  {
    title: "XCONDA",
    links: [
      { l: "스튜디오 열기", h: STUDIO_URL },
      { l: "크레딧 구매", h: "#credits" },
      { l: "문의하기", h: "#support" },
      { l: "이메일", h: "mailto:support@xconda.ai" },
    ],
  },
];

export default function Footer() {
  const { source, syncedAt } = useContent();
  return (
    <footer className="relative border-t border-white/[0.06] pt-16">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <div className="flex items-center gap-2">
              <Logo />
              <span className="rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[11px] font-semibold text-zinc-300 ring-1 ring-inset ring-white/10">Guide</span>
            </div>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-zinc-400">
              AI Storyboard for Ad Campaigns. XCONDA의 모든 소식과 사용법을 가장 빠르게 전합니다.
            </p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-400 ring-1 ring-inset ring-white/10">
              <NotionMark className="h-3.5 w-3.5 text-zinc-300" />
              {source === "notion" ? `Powered by Notion · ${syncedAt ? timeAgo(syncedAt) : ""} 동기화` : "Powered by Notion"}
            </p>
          </div>
          <nav aria-label="푸터" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {cols.map((c) => (
              <div key={c.title}>
                <h3 className="text-sm font-semibold text-white">{c.title}</h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {c.links.map((x) => {
                    const ext = x.h.startsWith("http");
                    return (
                      <li key={x.l}>
                        <a
                          href={x.h}
                          {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          className="group inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-white"
                        >
                          {x.l}
                          {ext && <ArrowUpRight className="h-3 w-3 opacity-50 transition group-hover:opacity-100" />}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] py-8 text-xs text-zinc-500 sm:flex-row">
          <p>© {new Date().getFullYear()} XCONDA. All rights reserved.</p>
          <p>KBS Production Verified · Causality-Driven AI</p>
        </div>
      </Container>
      <div aria-hidden className="pointer-events-none select-none overflow-hidden">
        <p className="text-gradient-soft -mb-[0.2em] text-center text-[20vw] font-bold leading-none tracking-[-0.04em] opacity-[0.06]">XCONDA</p>
      </div>
    </footer>
  );
}
