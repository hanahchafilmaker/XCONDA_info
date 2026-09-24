import { useState, type KeyboardEvent } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, CreditCard, Lightbulb, MousePointerClick, PenLine, UserPlus } from "lucide-react";
import { Container, Reveal, SectionHeading, Serif, trackSpotlight } from "./ui";
import { useContent } from "../content/ContentContext";
import { TOOLS } from "../content/tools";
import { SmartImage, CategoryBadge } from "./common";
import { cn } from "../utils/cn";

const START = [
  { icon: UserPlus, title: "계정 만들기", desc: "xconda.ai에 접속해 가입하면 바로 워크스페이스가 열립니다." },
  { icon: CreditCard, title: "크레딧 준비", desc: "1회 결제 크레딧 팩으로 시작하세요. Starter V1은 $6.90부터입니다.", href: "#credits" },
  { icon: MousePointerClick, title: "툴 선택", desc: "처음이라면 Director's Cut으로 9컷 스토리보드를 만들어 보세요." },
  { icon: PenLine, title: "시나리오 입력 → 생성", desc: "시나리오를 쓰고 생성하세요. 마음에 안 드는 컷만 다시 만들 수 있습니다." },
];

const CORE = TOOLS.filter((t) => t.group === "핵심 스튜디오");

export default function Guides() {
  const { guides, openEntry, openTool } = useContent();
  const [tab, setTab] = useState(0);
  const tool = CORE[tab];

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const n = (tab + (e.key === "ArrowRight" ? 1 : -1) + CORE.length) % CORE.length;
    setTab(n);
    document.getElementById(`core-tab-${n}`)?.focus();
  };

  const articles = guides.filter((g) => !g.tool || g.remote);

  return (
    <section id="start" className="relative py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Getting Started"
          title={<>처음이라면, <Serif className="text-gradient font-normal">start here.</Serif></>}
          description="가입부터 첫 스토리보드까지 4단계면 충분합니다."
        />

        {/* Quick start */}
        <ol className="relative mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div aria-hidden className="absolute left-[12%] right-[12%] top-[2.6rem] hidden h-px bg-gradient-to-r from-violet-500/0 via-fuchsia-400/40 to-amber-400/0 lg:block" />
          {START.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 90}>
              <div
                onMouseMove={trackSpotlight}
                className="spotlight group relative h-full rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-white/15"
              >
                <div className="flex items-center justify-between">
                  <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-ink-800 ring-1 ring-white/10">
                    <span className="bg-brand absolute inset-0 rounded-2xl opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-50" />
                    <s.icon className="relative h-5 w-5 text-white" />
                  </span>
                  <span className="font-mono text-sm text-zinc-600">0{i + 1}</span>
                </div>
                <h3 className="mt-5 font-semibold text-white">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{s.desc}</p>
                {s.href && (
                  <a href={s.href} className="mt-3 inline-flex items-center gap-1 text-sm text-fuchsia-300 hover:text-fuchsia-200">
                    크레딧 안내 <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </Reveal>
          ))}
        </ol>

        {/* Core tools tutorial */}
        <div id="core" className="mt-28 scroll-mt-24">
          <SectionHeading
            align="left"
            eyebrow="Core Studio Guide"
            title={<>핵심 스튜디오 <Serif className="text-gradient font-normal">step by step.</Serif></>}
            description="XCONDA의 세 가지 핵심 스튜디오를 단계별로 익혀 보세요."
          />

          <Reveal delay={80} className="mt-10">
            <div role="tablist" aria-label="핵심 스튜디오" onKeyDown={onKey} className="glass inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1">
              {CORE.map((t, i) => (
                <button
                  key={t.slug}
                  id={`core-tab-${i}`}
                  role="tab"
                  aria-selected={tab === i}
                  aria-controls="core-panel"
                  tabIndex={tab === i ? 0 : -1}
                  type="button"
                  onClick={() => setTab(i)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-300 sm:px-5",
                    tab === i ? "bg-white text-ink-950" : "text-zinc-400 hover:text-white"
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </Reveal>

          <Reveal delay={140} className="mt-6">
            <div id="core-panel" role="tabpanel" aria-labelledby={`core-tab-${tab}`} className="gradient-border overflow-hidden rounded-[28px] p-px">
              <div key={tool.slug} className="grid gap-0 rounded-[27px] bg-ink-900/90 lg:grid-cols-[1.1fr_1fr]">
                <div className="relative min-h-[260px] overflow-hidden rounded-t-[27px] bg-ink-800 lg:rounded-l-[27px] lg:rounded-tr-none">
                  <SmartImage src={tool.image} alt={`${tool.name} 사용 화면`} className="hero-in absolute inset-0 h-full w-full object-cover" />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-ink-900/40" />
                  {tool.badge && (
                    <span className="bg-brand absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-lg">{tool.badge}</span>
                  )}
                </div>
                <div className="p-6 sm:p-9">
                  <h3 className="hero-in text-2xl font-bold tracking-[-0.03em] text-white">{tool.name}</h3>
                  <p className="hero-in mt-2 text-sm leading-relaxed text-zinc-400" style={{ animationDelay: "60ms" }}>{tool.desc}</p>
                  <ol className="mt-6 space-y-3.5">
                    {tool.steps.map((s, i) => (
                      <li key={i} className="hero-in flex gap-3 text-sm leading-relaxed text-zinc-200" style={{ animationDelay: `${100 + i * 60}ms` }}>
                        <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/[0.07] font-mono text-xs text-white ring-1 ring-inset ring-white/10">{i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                  {tool.tips?.[0] && (
                    <div className="mt-6 flex gap-3 rounded-xl bg-amber-400/[0.06] p-3.5 text-sm text-amber-100/90 ring-1 ring-inset ring-amber-400/15">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                      {tool.tips[0]}
                    </div>
                  )}
                  <div className="mt-7 flex flex-wrap gap-2">
                    <a
                      href={tool.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:shadow-[0_10px_30px_-8px_rgba(236,72,153,0.7)] active:scale-95"
                    >
                      스튜디오에서 열기 <ArrowUpRight className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => openTool(tool.slug)}
                      className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-zinc-200 transition hover:bg-white/10"
                    >
                      전체 가이드 보기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Guide articles from Notion */}
        {articles.length > 0 && (
          <div className="mt-20">
            <Reveal className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <BookOpen className="h-5 w-5 text-fuchsia-300" /> 활용 가이드
              </h3>
              <span className="text-sm text-zinc-500">{articles.length}개의 글</span>
            </Reveal>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((g, i) => (
                <Reveal key={g.id} delay={(i % 3) * 80} className="h-full">
                  <button
                    type="button"
                    onClick={() => openEntry(g)}
                    onMouseMove={trackSpotlight}
                    className="spotlight group flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02] text-left transition-all duration-500 hover:-translate-y-1 hover:border-white/15"
                  >
                    {g.cover && (
                      <div className="aspect-[16/8] w-full overflow-hidden">
                        <SmartImage src={g.cover} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-6">
                      {g.category && <CategoryBadge className="self-start">{g.category}</CategoryBadge>}
                      <h4 className="mt-3 font-semibold leading-snug text-white">{g.title}</h4>
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-400">{g.summary}</p>
                      <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm text-zinc-300 transition group-hover:text-white">
                        읽기 <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </button>
                </Reveal>
              ))}
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}
