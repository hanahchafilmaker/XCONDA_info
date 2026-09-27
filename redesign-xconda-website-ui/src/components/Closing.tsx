import { useState } from "react";
import { cn } from "@/utils/cn";
import { faqs, guides } from "@/data/content";
import {
  GhostButton,
  Highlight,
  IconArrow,
  IconChevron,
  IconExternal,
  IconPlus,
  Logo,
  Reveal,
  SectionHeading,
  SectionLabel,
  VoltButton,
} from "@/components/ui";

const toolLinks = [
  { label: "Director's Cut", href: "https://www.xconda.ai/studio/directors-cut" },
  { label: "360 Turn Studio", href: "https://www.xconda.ai/studio/turn" },
  { label: "Art Director Pro", href: "https://www.xconda.ai/studio/art-director" },
  { label: "Image Generator", href: "https://www.xconda.ai/studio/image" },
  { label: "Kling 3.0 Video", href: "https://www.xconda.ai/studio/video" },
  { label: "Upscaler", href: "https://www.xconda.ai/studio/upscale" },
];

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <Reveal as="div" delay={index * 55}>
      <div
        className={cn(
          "overflow-hidden rounded-2xl border transition-all duration-400",
          open ? "border-volt-400/30 bg-volt-400/[0.04]" : "border-white/[0.07] bg-ink-900/50 hover:border-white/15",
        )}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
        >
          <span
            className={cn(
              "font-mono text-[11px] font-bold transition-colors duration-300",
              open ? "text-volt-400" : "text-zinc-700",
            )}
          >
            Q{String(index + 1).padStart(2, "0")}
          </span>
          <span className="flex-1 text-[14px] font-extrabold tracking-tight text-white sm:text-[15.5px]">{q}</span>
          <span
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-all duration-400",
              open ? "rotate-45 border-volt-400 bg-volt-400 text-ink-950" : "border-white/12 text-zinc-500",
            )}
          >
            <IconPlus className="h-3.5 w-3.5" />
          </span>
        </button>
        <div
          className="grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <p className="px-5 pb-5 pl-[4.2rem] pr-6 text-[13px] leading-[1.85] text-zinc-400 sm:px-6 sm:pb-6 sm:pl-[4.9rem]">
              {a}
            </p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export default function Closing() {
  return (
    <>
      {/* FAQ */}
      <section id="faq" className="relative scroll-mt-24 border-t border-white/[0.06] py-20 sm:py-28">
        <div className="shell">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-14">
            <Reveal className="lg:sticky lg:top-28 lg:self-start">
              <SectionLabel index="04" title="FAQ" kicker="1일 내 답변" />
              <SectionHeading
                sub={
                  <>
                    가이드를 읽어도 남는 질문들입니다. 여기에 없으면 하단 문의로 보내주세요 —
                    <span className="text-zinc-200">영업일 기준 1일 내</span> 답장합니다.
                  </>
                }
              >
                자주 묻는 질문
              </SectionHeading>

              <div className="mt-8 rounded-2xl border border-white/[0.08] bg-ink-900/60 p-5">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-volt-400">
                  response time
                </p>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[1.5rem] font-extrabold leading-none text-white">3.2<span className="text-volt-400">h</span></p>
                    <p className="mt-1.5 text-[11.5px] text-zinc-500">평균 첫 응답</p>
                  </div>
                  <div>
                    <p className="text-[1.5rem] font-extrabold leading-none text-white">96<span className="text-volt-400">%</span></p>
                    <p className="mt-1.5 text-[11.5px] text-zinc-500">1차 해결율</p>
                  </div>
                </div>
              </div>
            </Reveal>

            <div className="space-y-3">
              {faqs.map((f, i) => (
                <FaqItem key={f.q} q={f.q} a={f.a} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="relative overflow-hidden border-t border-white/[0.06] py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 h-[30rem] w-[52rem] -translate-x-1/2 -translate-y-1/2 animate-drift rounded-full bg-volt-400/[0.12] blur-[120px]" />
          <div className="hatch absolute inset-x-0 bottom-0 h-40 opacity-30" />
        </div>

        <div className="shell">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-volt-400">
              start now
            </p>
            <h2 className="text-balance-tight mt-5 text-[2.1rem] font-extrabold leading-[1.06] text-white sm:text-[3rem] lg:text-[3.6rem]">
              가이드는 읽는 게 아니라
              <br />
              <Highlight>따라 하는 것.</Highlight>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[14.5px] leading-relaxed text-zinc-400">
              {guides.length}개 툴 가이드를 옆에 두고, 지금 바로 첫 9컷 스토리보드를 만들어 보세요.
              가입 즉시 2,000 크레딧이 지급됩니다.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <VoltButton href="https://www.xconda.ai" icon className="px-8 py-3.5">
                XCONDA 시작하기
              </VoltButton>
              <GhostButton href="#guides" className="px-8 py-3.5">
                가이드 다시 보기 <IconChevron className="h-4 w-4" />
              </GhostButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* footer */}
      <footer className="relative border-t border-white/[0.07] bg-ink-950 pb-10 pt-16">
        <div className="shell">
          <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div>
              <Logo />
              <p className="mt-5 max-w-xs text-[12.5px] leading-relaxed text-zinc-500">
                AI로 광고·영상을 만드는 사람들을 위한 공식 가이드 센터. 업데이트 소식, 툴 사용법,
                업계 뉴스를 한 곳에서.
              </p>
              <div className="mt-5 flex gap-2">
                {["KR", "EN"].map((l, i) => (
                  <span
                    key={l}
                    className={cn(
                      "rounded-full border px-3 py-1 font-mono text-[10px] font-bold",
                      i === 0
                        ? "border-volt-400/35 bg-volt-400/10 text-volt-300"
                        : "border-white/10 text-zinc-600",
                    )}
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">guide</p>
              <ul className="mt-4 space-y-2.5">
                {[
                  { l: "공지사항", h: "#notices" },
                  { l: "툴 사용법", h: "#guides" },
                  { l: "AI 뉴스", h: "#news" },
                  { l: "자주 묻는 질문", h: "#faq" },
                ].map((x) => (
                  <li key={x.l}>
                    <a href={x.h} className="text-[12.5px] font-medium text-zinc-400 transition-colors hover:text-volt-400">
                      {x.l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">tools</p>
              <ul className="mt-4 space-y-2.5">
                {toolLinks.map((t) => (
                  <li key={t.label}>
                    <a
                      href={t.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-400 transition-colors hover:text-volt-400"
                    >
                      {t.label}
                      <IconExternal className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">support</p>
              <ul className="mt-4 space-y-2.5">
                {[
                  { l: "support@xconda.ai", h: "mailto:support@xconda.ai" },
                  { l: "크레딧 · 결제 문의", h: "#faq" },
                  { l: "저작권 가이드", h: "#notices" },
                  { l: "서비스 상태", h: "#notices" },
                ].map((x) => (
                  <li key={x.l}>
                    <a href={x.h} className="text-[12.5px] font-medium text-zinc-400 transition-colors hover:text-volt-400">
                      {x.l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center">
            <p className="font-mono text-[10.5px] text-zinc-600">
              © 2026 XCONDA. All rights reserved. · 가이드 내용은 사전 고지 없이 업데이트됩니다.
            </p>
            <a
              href="#top"
              className="group inline-flex items-center gap-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-zinc-500 transition-colors hover:text-volt-400"
            >
              back to top
              <IconArrow className="h-3.5 w-3.5 -rotate-90 transition-transform duration-300 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
