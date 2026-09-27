import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import {
  GhostButton,
  Highlight,
  IconArrow,
  IconBook,
  IconBullhorn,
  IconChevron,
  IconSpark,
  Pill,
  Reveal,
  useCountUp,
  VoltButton,
} from "@/components/ui";
import { faqs, guides, news, notices } from "@/data/content";

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

function Stat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [run, setRun] = useState(false);
  const n = useCountUp(value, run);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (e) => e[0].isIntersecting && (setRun(true), io.disconnect()),
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-col">
      <span className="font-mono text-[1.6rem] font-bold tracking-tight text-white sm:text-[1.85rem]">
        {n.toLocaleString()}
        <span className="text-volt-400">{suffix}</span>
      </span>
      <span className="mt-1 text-[11.5px] font-medium text-zinc-500">{label}</span>
    </div>
  );
}

const quick = [
  {
    id: "notices",
    label: "공지사항",
    en: "Notices",
    desc: "업데이트 · 점검 · 정책 변경",
    count: `${notices.length}건`,
    Icon: IconBullhorn,
  },
  {
    id: "guides",
    label: "툴 사용법",
    en: "Guides",
    desc: "툴별 단계 가이드 · 프롬프트",
    count: `${guides.length}개`,
    Icon: IconBook,
  },
  {
    id: "news",
    label: "AI 뉴스",
    en: "AI News",
    desc: "모델 · 산업 · 정책 브리핑",
    count: `주 ${2}회`,
    Icon: IconSpark,
  },
  {
    id: "faq",
    label: "자주 묻는 질문",
    en: "FAQ",
    desc: "크레딧 · 컨티뉴이티 · 저작권",
    count: `${faqs.length}문항`,
    Icon: IconChevron,
  },
];

function StoryboardVisual() {
  const [active, setActive] = useState(4);
  useEffect(() => {
    const t = setInterval(() => setActive((v) => (v + 1) % 9), 1400);
    return () => clearInterval(t);
  }, []);

  const angles = [
    "EST · WIDE",
    "INSERT",
    "MEDIUM",
    "PRODUCT",
    "CLOSE-UP",
    "WIDE",
    "TITLE",
    "LOW ANGLE",
    "END",
  ];

  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-10 -z-10 rounded-[50%] bg-volt-400/12 blur-[90px]" />
      <div className="relative overflow-hidden rounded-[24px] border border-white/[0.09] bg-ink-900/80 p-4 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-volt-400" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              storyboard · 9 cuts
            </span>
          </div>
          <span className="rounded-full border border-volt-400/30 bg-volt-400/10 px-2 py-0.5 font-mono text-[9.5px] font-bold text-volt-300">
            Director's Cut
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-2.5">
          {angles.map((a, i) => (
            <div
              key={a}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "group relative aspect-video cursor-pointer overflow-hidden rounded-lg border transition-all duration-500",
                active === i
                  ? "border-volt-400 bg-volt-400/[0.14] shadow-[0_0_0_1px_rgba(255,214,10,0.35),0_10px_30px_-12px_rgba(255,214,10,0.5)]"
                  : "border-white/[0.07] bg-white/[0.025] hover:border-white/20",
              )}
            >
              <span className="dotgrid absolute inset-0 opacity-40" />
              <span
                className={cn(
                  "absolute inset-0 flex items-center justify-center font-mono text-[9px] font-bold tracking-[0.14em] transition-colors duration-500",
                  active === i ? "text-volt-300" : "text-zinc-600",
                )}
              >
                {a}
              </span>
              <span
                className={cn(
                  "absolute bottom-1 left-1.5 font-mono text-[8px] transition-colors duration-500",
                  active === i ? "text-volt-400" : "text-zinc-700",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-white/[0.07] bg-ink-950/70 p-3">
          <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-zinc-600">
            prompt
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-zinc-400">
            골든타임 측광, 통창 로프트 스튜디오, <span className="text-volt-400">35mm</span>, 커튼 미세
            흔들림, 인물 시선 유지
            <span className="ml-0.5 inline-block h-3 w-1.5 translate-y-0.5 animate-blink bg-volt-400" />
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  active % 3 === i ? "w-6 bg-volt-400" : "w-2 bg-white/15",
                )}
              />
            ))}
          </div>
          <span className="font-mono text-[9.5px] text-zinc-600">
            render 00:0{active % 6}.{active % 10}s
          </span>
        </div>
      </div>

      <div className="animate-float absolute -bottom-6 -left-4 hidden rounded-2xl border border-white/10 bg-ink-880/95 px-4 py-3 shadow-2xl backdrop-blur sm:block">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">생성 시간</p>
        <p className="mt-0.5 text-[15px] font-extrabold text-white">
          3일 <span className="text-volt-400">→</span> 4분
        </p>
      </div>
    </div>
  );
}

export default function Hero({ onSearch }: { onSearch: () => void }) {
  return (
    <section id="top" className="relative overflow-hidden pt-28 sm:pt-36">
      {/* backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-18rem] h-[36rem] w-[36rem] -translate-x-1/2 animate-drift rounded-full bg-volt-400/[0.13] blur-[130px]" />
        <div className="absolute right-[-10rem] top-40 h-[26rem] w-[26rem] animate-drift rounded-full bg-amber-600/10 blur-[120px] [animation-delay:-8s]" />
        <div className="hatch absolute inset-x-0 top-0 h-64 opacity-40" />
        <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-b from-transparent to-ink-950" />
      </div>

      <div className="shell">
        <Reveal className="flex flex-col items-start gap-5">
          <Pill tone="volt" className="py-1.5 pl-2 pr-3">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-volt-400" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-volt-400" />
            </span>
            XCONDA 공식 가이드 센터 · 2026.02 기준
          </Pill>

          <h1 className="text-balance-tight max-w-[15ch] text-[2.6rem] font-extrabold leading-[1.04] text-white sm:text-[3.6rem] lg:text-[4.35rem]">
            공지를 읽고, 툴을 익히고,
            <br />
            다음 트렌드를 <Highlight>먼저 잡는다.</Highlight>
          </h1>

          <p className="max-w-xl text-[15px] leading-relaxed text-zinc-400 sm:text-base">
            XCONDA의 모든 업데이트 소식과 툴별 사용법, 업계를 움직이는 AI 뉴스를 한 곳에
            모았습니다. 검색으로 시간을 쓰지 말고, 이 페이지에서 답을 찾으세요.
          </p>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <VoltButton onClick={() => scrollTo("guides")} icon>
              툴 사용법 바로 보기
            </VoltButton>
            <GhostButton onClick={onSearch}>
              <IconArrow className="h-4 w-4" />
              통합 검색으로 찾기
            </GhostButton>
          </div>

          <div className="mt-4 grid w-full grid-cols-2 gap-x-6 gap-y-5 border-t border-white/[0.07] pt-6 sm:grid-cols-4">
            <Stat value={guides.length} suffix="개" label="툴 사용법 가이드" />
            <Stat value={128} suffix="건" label="공지 아카이브" />
            <Stat value={news.length} suffix="편" label="이번 달 AI 브리핑" />
            <Stat value={4} suffix="분" label="평균 문제 해결" />
          </div>
        </Reveal>

        <Reveal delay={140} className="mt-14 lg:mt-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center">
            <StoryboardVisual />
            <div className="grid gap-3 sm:grid-cols-2">
              {quick.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => scrollTo(q.id)}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900/60 p-5 text-left transition-all duration-500 hover:-translate-y-1 hover:border-volt-400/40 hover:bg-ink-880"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-volt-400/0 blur-2xl transition-all duration-500 group-hover:bg-volt-400/20" />
                  <div className="flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-volt-400 transition-colors duration-500 group-hover:border-volt-400/40 group-hover:bg-volt-400/10">
                      <q.Icon className="h-4 w-4" />
                    </span>
                    <span className="font-mono text-[10px] font-bold text-zinc-600">{q.count}</span>
                  </div>
                  <p className="mt-4 text-[15px] font-extrabold text-white">{q.label}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-500">{q.desc}</p>
                  <span className="mt-3 flex items-center gap-1 text-[11px] font-bold text-volt-400 opacity-0 transition-all duration-500 group-hover:opacity-100">
                    이동 <IconArrow className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
