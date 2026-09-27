import { useMemo, useState } from "react";
import { cn } from "@/utils/cn";
import type { Notice, NoticeCategory } from "@/data/content";
import { notices } from "@/data/content";
import {
  GhostButton,
  Highlight,
  IconArrow,
  IconBullhorn,
  IconClock,
  IconClose,
  IconEye,
  IconExternal,
  IconPin,
  Modal,
  Pill,
  Reveal,
  SectionHeading,
  SectionLabel,
} from "@/components/ui";

const toneForCategory: Record<NoticeCategory, string> = {
  업데이트: "volt",
  점검: "red",
  정책: "blue",
  이벤트: "green",
  안내: "violet",
};

const categories: (NoticeCategory | "전체")[] = [
  "전체",
  "업데이트",
  "점검",
  "정책",
  "이벤트",
  "안내",
];

function NoticeRow({ n, onOpen, index }: { n: Notice; onOpen: () => void; index: number }) {
  return (
    <Reveal as="li" delay={index * 45}>
      <button
        onClick={onOpen}
        className="group grid w-full grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 rounded-2xl border border-transparent px-4 py-4 text-left transition-all duration-400 hover:border-white/10 hover:bg-white/[0.035] sm:grid-cols-[86px_1fr_auto] sm:items-center sm:px-5"
      >
        <span className="font-mono text-[11px] font-semibold text-zinc-600 sm:text-[12px]">
          {String(n.no).padStart(3, "0")}
        </span>

        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <Pill tone={toneForCategory[n.category]}>{n.category}</Pill>
            {n.pinned && (
              <Pill tone="volt" className="border-volt-400/45 bg-volt-400/15">
                <IconPin className="h-3 w-3" /> 고정
              </Pill>
            )}
            <span className="truncate text-[14px] font-bold text-zinc-100 transition-colors duration-300 group-hover:text-white sm:text-[15px]">
              {n.title}
            </span>
          </span>
          <span className="mt-1.5 line-clamp-1 block text-[12px] text-zinc-500">{n.summary}</span>
          <span className="mt-1.5 flex items-center gap-3 font-mono text-[10px] text-zinc-600 sm:hidden">
            {n.date} · 조회 {n.views.toLocaleString()}
          </span>
        </span>

        <span className="hidden items-center gap-4 sm:flex">
          <span className="font-mono text-[11px] text-zinc-600">{n.date}</span>
          <span className="flex items-center gap-1 font-mono text-[11px] text-zinc-600">
            <IconEye className="h-3 w-3" />
            {n.views.toLocaleString()}
          </span>
          <span className="grid h-7 w-7 place-items-center rounded-full border border-white/10 text-zinc-500 transition-all duration-300 group-hover:border-volt-400 group-hover:bg-volt-400 group-hover:text-ink-950">
            <IconArrow className="h-3.5 w-3.5" />
          </span>
        </span>
      </button>
    </Reveal>
  );
}

function Featured({ n, onOpen }: { n: Notice; onOpen: () => void }) {
  return (
    <Reveal className="lg:sticky lg:top-28">
      <div className="group relative overflow-hidden rounded-[26px] border border-volt-400/25 bg-gradient-to-br from-volt-400/[0.09] via-ink-880 to-ink-900 p-6 sm:p-8">
        <span className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 animate-drift rounded-full bg-volt-400/20 blur-[70px]" />
        <span className="dotgrid pointer-events-none absolute inset-0 opacity-[0.18]" />

        <div className="relative">
          <div className="flex items-center gap-2">
            <Pill tone="volt">
              <IconBullhorn className="h-3 w-3" /> 중요 공지
            </Pill>
            <span className="font-mono text-[10.5px] text-zinc-500">{n.date}</span>
          </div>

          <h3 className="mt-5 text-[1.4rem] font-extrabold leading-[1.28] tracking-[-0.03em] text-white sm:text-[1.7rem]">
            {n.title}
          </h3>
          <p className="mt-3 text-[13.5px] leading-relaxed text-zinc-400">{n.summary}</p>

          <ul className="mt-5 space-y-2.5 border-t border-white/[0.08] pt-5">
            {(n.bullets ?? []).slice(0, 4).map((b) => (
              <li key={b} className="flex gap-2.5 text-[12.5px] leading-relaxed text-zinc-300">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-volt-400" />
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <button
              onClick={onOpen}
              className="inline-flex items-center gap-2 rounded-full bg-volt-400 px-5 py-2.5 text-[12.5px] font-extrabold text-ink-950 transition-all duration-300 hover:shadow-[0_12px_36px_-10px_rgba(255,214,10,0.8)]"
            >
              자세히 보기 <IconArrow className="h-3.5 w-3.5" />
            </button>
            <GhostButton href="https://www.xconda.ai" className="px-5 py-2.5 text-[12.5px]">
              서비스 접속 <IconExternal className="h-3.5 w-3.5" />
            </GhostButton>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export default function Notices() {
  const [cat, setCat] = useState<NoticeCategory | "전체">("전체");
  const [open, setOpen] = useState<Notice | null>(null);

  const featured = notices.find((n) => n.pinned)!;
  const list = useMemo(
    () => notices.filter((n) => (cat === "전체" ? true : n.category === cat)),
    [cat],
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = { 전체: notices.length };
    notices.forEach((n) => (m[n.category] = (m[n.category] ?? 0) + 1));
    return m;
  }, []);

  return (
    <section id="notices" className="relative scroll-mt-24 border-t border-white/[0.06] py-20 sm:py-28">
      <div className="shell">
        <Reveal>
          <SectionLabel index="01" title="NOTICES" kicker="매주 업데이트" />
          <SectionHeading
            sub={
              <>
                서비스 변경, 점검 일정, 정책 개정은 <span className="text-zinc-200">이 페이지 하나</span>로
                확인하세요. 고정 공지는 항상 상단에 유지됩니다.
              </>
            }
          >
            공지사항 — <Highlight>먼저 알아야</Highlight> 바쁘지 않습니다.
          </SectionHeading>
        </Reveal>

        {/* ticker */}
        <Reveal delay={80} className="mt-9">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900/60">
            <div className="absolute inset-y-0 left-0 z-10 flex items-center gap-2 bg-volt-400 px-4 text-ink-950">
              <IconBullhorn className="h-3.5 w-3.5" />
              <span className="text-[11px] font-extrabold tracking-tight">LATEST</span>
            </div>
            <div className="mask-fade-x flex overflow-hidden py-3.5 pl-[124px]">
              <div className="flex min-w-max animate-marquee items-center gap-9 pr-9">
                {[...notices, ...notices].map((n, i) => (
                  <button
                    key={`${n.id}-${i}`}
                    onClick={() => setOpen(n)}
                    className="flex items-center gap-2.5 whitespace-nowrap text-[12px] font-medium text-zinc-500 transition-colors hover:text-volt-300"
                  >
                    <span className="h-1 w-1 rounded-full bg-volt-400/70" />
                    <span className="font-mono text-[10.5px] text-zinc-700">{n.date.slice(5)}</span>
                    {n.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.35fr] lg:gap-12">
          <Featured n={featured} onOpen={() => setOpen(featured)} />

          <div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-all duration-300",
                    cat === c
                      ? "border-volt-400 bg-volt-400 text-ink-950"
                      : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/25 hover:text-white",
                  )}
                >
                  {c}
                  <span className={cn("font-mono text-[9.5px]", cat === c ? "text-ink-950/55" : "text-zinc-600")}>
                    {String(counts[c] ?? 0).padStart(2, "0")}
                  </span>
                </button>
              ))}
            </div>

            <ul className="mt-3 divide-y divide-white/[0.05] border-y border-white/[0.05]">
              {list.map((n, i) => (
                <NoticeRow key={n.id} n={n} index={i} onOpen={() => setOpen(n)} />
              ))}
            </ul>

            <div className="mt-5 flex items-center justify-between">
              <span className="font-mono text-[11px] text-zinc-600">
                {String(list.length).padStart(2, "0")} / {String(notices.length).padStart(2, "0")} 표시 중
              </span>
              <button className="inline-flex items-center gap-1.5 text-[12px] font-bold text-zinc-400 transition-colors hover:text-volt-400">
                전체 아카이브 보기 (128건) <IconArrow className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* detail modal */}
      <Modal open={!!open} onClose={() => setOpen(null)} label="공지 상세">
        {open && (
          <>
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/[0.07] bg-ink-900/95 px-6 py-5 backdrop-blur sm:px-8">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={toneForCategory[open.category]}>{open.category}</Pill>
                  {open.pinned && <Pill tone="volt">고정</Pill>}
                  <span className="font-mono text-[10.5px] text-zinc-500">
                    #{String(open.no).padStart(3, "0")} · {open.date}
                  </span>
                </div>
                <h3 className="mt-3 max-w-2xl text-[1.15rem] font-extrabold leading-[1.35] tracking-[-0.03em] text-white sm:text-[1.4rem]">
                  {open.title}
                </h3>
              </div>
              <button
                onClick={() => setOpen(null)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-400 transition-colors hover:border-white/30 hover:text-white"
                aria-label="닫기"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-6 sm:px-8 sm:py-7">
              <p className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-[13.5px] leading-relaxed text-zinc-300">
                {open.summary}
              </p>

              <div className="mt-6 space-y-4">
                {open.body.map((p) => (
                  <p key={p} className="text-[14px] leading-[1.85] text-zinc-400">
                    {p}
                  </p>
                ))}
              </div>

              {open.bullets && (
                <div className="mt-6 rounded-2xl border border-volt-400/20 bg-volt-400/[0.05] p-5">
                  <p className="flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-volt-400">
                    <IconClock className="h-3.5 w-3.5" /> 주요 내용
                  </p>
                  <ul className="mt-3.5 space-y-2.5">
                    {open.bullets.map((b) => (
                      <li key={b} className="flex gap-2.5 text-[13px] leading-relaxed text-zinc-300">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-volt-400" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-5">
                <span className="font-mono text-[11px] text-zinc-600">
                  조회 {open.views.toLocaleString()} · XCONDA 운영팀
                </span>
                <button
                  onClick={() => setOpen(null)}
                  className="text-[12.5px] font-bold text-zinc-400 transition-colors hover:text-volt-400"
                >
                  목록으로 돌아가기
                </button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </section>
  );
}
