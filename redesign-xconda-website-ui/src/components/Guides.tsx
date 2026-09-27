import { useMemo, useState } from "react";
import { cn } from "@/utils/cn";
import { guideCategories, guides, type GuideCategory } from "@/data/content";
import {
  GhostButton,
  Highlight,
  IconArrow,
  IconBook,
  IconCheck,
  IconClock,
  IconExternal,
  IconPlus,
  IconSpark,
  Pill,
  Reveal,
  SectionHeading,
  SectionLabel,
} from "@/components/ui";

const levelTone: Record<string, string> = {
  입문: "green",
  중급: "volt",
  프로: "red",
};

const pipeline = [
  {
    n: "01",
    title: "공간을 먼저 만든다",
    tool: "360 Turn Studio",
    desc: "레퍼런스 사진이나 텍스트로 3D 공간을 만들고, 오브젝트를 더하거나 지우며 촬영할 곳을 확보합니다.",
  },
  {
    n: "02",
    title: "시나리오로 9컷을 뽑는다",
    tool: "Director's Cut",
    desc: "이미지 엔진·연도·장소·감독 스타일을 고르고 시나리오를 넣으면 9컷 스토리보드가 완성됩니다.",
  },
  {
    n: "03",
    title: "인물과 의상을 고정한다",
    tool: "Art Director Pro",
    desc: "얼굴·의상 레퍼런스로 캐릭터 시트를 만들어 시나리오를 고쳐도 같은 인물이 유지되게 합니다.",
  },
  {
    n: "04",
    title: "움직이는 컷으로 완성한다",
    tool: "Kling 3.0",
    desc: "카메라 무브를 정해 스틸을 영상으로 바꾸고, 업스케일 · 그레이딩으로 마무리합니다.",
  },
];

export default function Guides() {
  const [cat, setCat] = useState<GuideCategory | "전체">("전체");
  const [activeId, setActiveId] = useState(guides[0].id);
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(
    () => guides.filter((g) => (cat === "전체" ? true : g.category === cat)),
    [cat],
  );

  const active = guides.find((g) => g.id === activeId) ?? filtered[0] ?? guides[0];

  const counts = useMemo(() => {
    const m: Record<string, number> = { 전체: guides.length };
    guides.forEach((g) => (m[g.category] = (m[g.category] ?? 0) + 1));
    return m;
  }, []);

  const pickCategory = (c: GuideCategory | "전체") => {
    setCat(c);
    const next = guides.filter((g) => (c === "전체" ? true : g.category === c));
    if (next.length && !next.some((g) => g.id === activeId)) setActiveId(next[0].id);
  };

  const copyPrompt = async () => {
    if (!active.prompt) return;
    try {
      await navigator.clipboard.writeText(active.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="guides" className="relative scroll-mt-24 border-t border-white/[0.06] py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-14rem] top-1/3 h-[30rem] w-[30rem] animate-drift rounded-full bg-volt-400/[0.07] blur-[130px]" />
      </div>

      <div className="shell">
        <Reveal>
          <SectionLabel index="03" title="TOOL GUIDES" kicker={`${guides.length}개 툴`} />
          <SectionHeading
            sub={
              <>
                단계별로, 툴별로. 어디서 막혔는지만 찾아 읽으세요. 모든 가이드에는{" "}
                <span className="text-zinc-200">실제로 통하는 프롬프트 예시</span>가 들어 있습니다.
              </>
            }
          >
            툴 사용법 — <Highlight>단계별로</Highlight> 끊지 않고.
          </SectionHeading>
        </Reveal>

        {/* pipeline */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pipeline.map((p, i) => (
            <Reveal key={p.n} delay={i * 90}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900/60 p-5 transition-all duration-500 hover:-translate-y-1 hover:border-volt-400/35">
                <span className="absolute right-4 top-3 font-mono text-[2.4rem] font-bold leading-none text-white/[0.045] transition-colors duration-500 group-hover:text-volt-400/15">
                  {p.n}
                </span>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-volt-400">
                  {p.tool}
                </p>
                <h3 className="mt-3 text-[15.5px] font-extrabold tracking-tight text-white">{p.title}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-500">{p.desc}</p>
                <span className="mt-4 block h-px w-full bg-white/[0.07]">
                  <span className="block h-px w-0 bg-volt-400 transition-all duration-700 group-hover:w-full" />
                </span>
              </div>
            </Reveal>
          ))}
        </div>

        {/* guide explorer */}
        <div className="mt-16">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2.5 text-[1.15rem] font-extrabold tracking-tight text-white sm:text-[1.35rem]">
              <IconBook className="h-5 w-5 text-volt-400" />
              툴별 상세 가이드
            </h3>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-600">
              updated {guides[0].updated}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(["전체", ...guideCategories] as const).map((c) => (
              <button
                key={c}
                onClick={() => pickCategory(c as GuideCategory | "전체")}
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

          <div className="mt-6 grid gap-6 lg:grid-cols-[290px_1fr] lg:gap-8">
            {/* tool list */}
            <div className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-2xl border border-white/[0.08] bg-ink-900/60 p-2">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                    tools
                  </span>
                  <span className="font-mono text-[10px] text-zinc-700">{String(filtered.length).padStart(2, "0")}</span>
                </div>
                <ul className="max-h-[520px] overflow-y-auto">
                  {filtered.map((g, i) => (
                    <li key={g.id}>
                      <button
                        onClick={() => setActiveId(g.id)}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-300",
                          active.id === g.id
                            ? "bg-volt-400/[0.12] ring-1 ring-inset ring-volt-400/35"
                            : "hover:bg-white/[0.04]",
                        )}
                      >
                        <span
                          className={cn(
                            "font-mono text-[10px] font-bold",
                            active.id === g.id ? "text-volt-400" : "text-zinc-700",
                          )}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "truncate text-[13px] font-bold transition-colors",
                                active.id === g.id ? "text-white" : "text-zinc-300 group-hover:text-white",
                              )}
                            >
                              {g.name}
                            </span>
                            {g.hot && <span className="h-1.5 w-1.5 rounded-full bg-volt-400" />}
                          </span>
                          <span className="mt-0.5 block truncate font-mono text-[9.5px] uppercase tracking-[0.14em] text-zinc-600">
                            {g.en}
                          </span>
                        </span>
                        <IconArrow
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 transition-all duration-300",
                            active.id === g.id
                              ? "translate-x-0 text-volt-400 opacity-100"
                              : "-translate-x-1 text-zinc-700 opacity-0 group-hover:translate-x-0 group-hover:opacity-60",
                          )}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* detail */}
            <div key={active.id} className="anim-fade">
              <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-ink-900/70">
                <span className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 animate-drift rounded-full bg-volt-400/10 blur-[80px]" />

                <div className="relative border-b border-white/[0.07] p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="zinc">{active.category}</Pill>
                    <Pill tone={levelTone[active.level]}>난이도 {active.level}</Pill>
                    {active.hot && <Pill tone="volt">인기</Pill>}
                  </div>

                  <h4 className="mt-4 text-[1.6rem] font-extrabold leading-tight tracking-[-0.035em] text-white sm:text-[2.1rem]">
                    {active.name}
                    <span className="ml-2.5 align-middle font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                      {active.en}
                    </span>
                  </h4>
                  <p className="mt-2 text-[14px] font-medium text-volt-300">{active.tagline}</p>
                  <p className="mt-4 max-w-2xl text-[13.5px] leading-[1.8] text-zinc-400">{active.intro}</p>

                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] text-zinc-600">
                    <span className="flex items-center gap-1.5">
                      <IconClock className="h-3.5 w-3.5" /> 소요 {active.time}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <IconSpark className="h-3.5 w-3.5" /> 단계 {active.steps.length}개
                    </span>
                    <span>최종 수정 {active.updated}</span>
                  </div>
                </div>

                {/* steps */}
                <div className="relative p-6 sm:p-8">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-600">
                    how to use
                  </p>
                  <ol className="mt-5 space-y-0">
                    {active.steps.map((s, i) => (
                      <li key={s.title} className="group relative flex gap-4 pb-6 last:pb-0 sm:gap-5">
                        <div className="flex flex-col items-center">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-volt-400/35 bg-volt-400/10 font-mono text-[11px] font-bold text-volt-300 transition-all duration-400 group-hover:border-volt-400 group-hover:bg-volt-400 group-hover:text-ink-950">
                            {i + 1}
                          </span>
                          {i < active.steps.length - 1 && (
                            <span className="mt-1 w-px flex-1 bg-gradient-to-b from-volt-400/40 to-white/[0.06]" />
                          )}
                        </div>
                        <div className="pt-1">
                          <p className="text-[14.5px] font-extrabold tracking-tight text-white">{s.title}</p>
                          <p className="mt-1.5 text-[13px] leading-[1.8] text-zinc-400">{s.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ol>

                  {/* tip */}
                  <div className="mt-8 flex gap-4 rounded-2xl border border-volt-400/20 bg-volt-400/[0.05] p-5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-volt-400 text-ink-950">
                      <IconSpark className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-volt-400">
                        director's tip
                      </p>
                      <p className="mt-1.5 text-[13px] leading-[1.8] text-zinc-300">{active.tip}</p>
                    </div>
                  </div>

                  {/* prompt */}
                  {active.prompt ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-950/70">
                      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
                        <span className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-volt-400" /> prompt example
                        </span>
                        <button
                          onClick={copyPrompt}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-all duration-300",
                            copied
                              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                              : "border-white/10 text-zinc-400 hover:border-volt-400/50 hover:text-volt-300",
                          )}
                        >
                          {copied ? <IconCheck className="h-3 w-3" /> : <IconPlus className="h-3 w-3" />}
                          {copied ? "copied" : "copy"}
                        </button>
                      </div>
                      <p className="px-5 py-4 text-[13px] leading-[1.85] text-zinc-300">{active.prompt}</p>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-white/[0.08] bg-ink-950/70 px-5 py-4">
                      <p className="text-[12.5px] leading-relaxed text-zinc-500">
                        이 툴은 이미지 입력 기반이라 프롬프트보다 <span className="text-zinc-300">원본 이미지 품질</span>이
                        결과를 결정합니다. 1024px 이상, 명확한 주제, 단순한 배경을 권장합니다.
                      </p>
                    </div>
                  )}

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <a
                      href={active.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex items-center gap-2 rounded-full bg-volt-400 px-6 py-3 text-[13px] font-extrabold text-ink-950 transition-all duration-300 hover:shadow-[0_14px_44px_-10px_rgba(255,214,10,0.75)]"
                    >
                      {active.name} 실행하기
                      <IconArrow className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </a>
                    <GhostButton
                      onClick={() => {
                        const i = filtered.findIndex((g) => g.id === active.id);
                        setActiveId(filtered[(i + 1) % filtered.length].id);
                      }}
                    >
                      다음 툴 가이드 <IconArrow className="h-4 w-4" />
                    </GhostButton>
                  </div>
                </div>
              </div>

              {/* mobile tool switcher */}
              <div className="mask-fade-x mt-4 flex gap-2 overflow-x-auto pb-2 lg:hidden">
                {filtered.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setActiveId(g.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2 text-[12px] font-bold transition-all duration-300",
                      g.id === active.id
                        ? "border-volt-400 bg-volt-400 text-ink-950"
                        : "border-white/10 bg-white/[0.02] text-zinc-400",
                    )}
                  >
                    {g.name}
                  </button>
                ))}
              </div>

              <p className="mt-5 flex items-center gap-2 text-[12px] text-zinc-600">
                <IconExternal className="h-3.5 w-3.5" />
                가이드는 실제 서비스 화면 기준으로 작성되었으며, UI 변경 시 함께 업데이트됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
