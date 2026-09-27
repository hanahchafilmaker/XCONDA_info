import { useMemo, useState } from "react";
import { cn } from "@/utils/cn";
import { news, type NewsCategory, type NewsItem } from "@/data/content";
import {
  Highlight,
  IconArrow,
  IconCheck,
  IconClose,
  IconSpark,
  Modal,
  Pill,
  Reveal,
  SectionHeading,
  SectionLabel,
} from "@/components/ui";

const catTone: Record<NewsCategory, string> = {
  모델: "volt",
  도구: "blue",
  산업: "green",
  정책: "red",
  리서치: "violet",
};

const cats: (NewsCategory | "전체")[] = ["전체", "모델", "도구", "산업", "정책", "리서치"];

function FeaturedNews({ item, onOpen }: { item: NewsItem; onOpen: () => void }) {
  return (
    <Reveal>
      <article
        onClick={onOpen}
        className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[26px] border border-white/[0.09] bg-ink-900/70 p-6 transition-all duration-500 hover:border-volt-400/35 sm:p-8"
      >
        <span className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 animate-drift rounded-full bg-volt-400/10 blur-[80px]" />
        <span className="dotgrid pointer-events-none absolute inset-0 opacity-[0.13]" />

        <div className="relative flex items-center gap-2">
          <Pill tone="volt">
            <IconSpark className="h-3 w-3" /> 오늘의 브리핑
          </Pill>
          <Pill tone={catTone[item.category]}>{item.category}</Pill>
        </div>

        <h3 className="relative mt-5 text-[1.45rem] font-extrabold leading-[1.25] tracking-[-0.035em] text-white sm:text-[1.9rem]">
          {item.title}
        </h3>
        <p className="relative mt-3 text-[13.5px] leading-relaxed text-zinc-400">{item.summary}</p>

        <ul className="relative mt-6 space-y-2.5 border-t border-white/[0.07] pt-5">
          {item.points.slice(0, 3).map((p) => (
            <li key={p} className="flex gap-2.5 text-[12.5px] leading-relaxed text-zinc-300">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-volt-400" />
              {p}
            </li>
          ))}
        </ul>

        <div className="relative mt-auto flex items-center justify-between pt-6">
          <span className="font-mono text-[10.5px] text-zinc-600">
            {item.date} · {item.source} · {item.readTime} 읽기
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-volt-400">
            전문 보기
            <IconArrow className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </article>
    </Reveal>
  );
}

function NewsCard({ item, onOpen, delay }: { item: NewsItem; onOpen: () => void; delay: number }) {
  return (
    <Reveal as="article" delay={delay} className="h-full">
      <button
        onClick={onOpen}
        className="group flex h-full w-full flex-col rounded-2xl border border-white/[0.07] bg-ink-900/50 p-5 text-left transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-ink-880"
      >
        <div className="flex items-center justify-between">
          <Pill tone={catTone[item.category]}>{item.category}</Pill>
          <span className="font-mono text-[10px] text-zinc-600">{item.date.slice(5)}</span>
        </div>
        <h4 className="mt-4 text-[15px] font-extrabold leading-[1.4] tracking-[-0.025em] text-zinc-100 transition-colors duration-300 group-hover:text-white">
          {item.title}
        </h4>
        <p className="mt-2.5 line-clamp-3 text-[12.5px] leading-relaxed text-zinc-500">{item.summary}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {item.tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 font-mono text-[9.5px] text-zinc-500"
            >
              #{t}
            </span>
          ))}
        </div>
        <span className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3.5 font-mono text-[10px] text-zinc-600">
          {item.readTime} 읽기
          <IconArrow className="h-3.5 w-3.5 text-zinc-700 transition-all duration-300 group-hover:translate-x-1 group-hover:text-volt-400" />
        </span>
      </button>
    </Reveal>
  );
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <Reveal delay={60}>
      <div className="relative overflow-hidden rounded-[26px] border border-volt-400/25 bg-gradient-to-br from-volt-400/[0.1] via-ink-880 to-ink-900 p-6 sm:p-8">
        <span className="pointer-events-none absolute -right-16 -bottom-20 h-56 w-56 animate-drift rounded-full bg-volt-400/20 blur-[70px]" />
        <div className="relative max-w-2xl">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-volt-400">
            weekly briefing
          </p>
          <h3 className="mt-3 text-[1.3rem] font-extrabold leading-[1.3] tracking-[-0.03em] text-white sm:text-[1.7rem]">
            매주 화 · 금 아침 8시,
            <br />
            필요한 소식만 골라 보내드립니다.
          </h3>
          <p className="mt-3 text-[13px] leading-relaxed text-zinc-400">
            모델 업데이트 · 정책 변화 · 툴 개선점을 3분 분량으로 정리합니다. 광고 없음, 언제든 해지 가능.
          </p>

          {done ? (
            <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-3">
              <IconCheck className="h-4 w-4 text-emerald-300" />
              <span className="text-[13px] font-bold text-emerald-200">
                구독 완료 — 다음 화요일 아침에 만나요.
              </span>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email.includes("@")) setDone(true);
              }}
              className="mt-6 flex flex-col gap-2.5 sm:flex-row"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@studio.com"
                className="w-full rounded-full border border-white/12 bg-ink-950/70 px-5 py-3 text-[13.5px] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-volt-400/60"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-volt-400 px-6 py-3 text-[13px] font-extrabold text-ink-950 transition-all duration-300 hover:shadow-[0_14px_40px_-10px_rgba(255,214,10,0.8)] active:scale-[0.97]"
              >
                브리핑 구독
              </button>
            </form>
          )}
          <p className="mt-3 font-mono text-[10px] text-zinc-600">
            구독자 12,480명 · 지난 호 오픈율 41%
          </p>
        </div>
      </div>
    </Reveal>
  );
}

export default function News() {
  const [cat, setCat] = useState<NewsCategory | "전체">("전체");
  const [open, setOpen] = useState<NewsItem | null>(null);

  const featured = news.find((n) => n.hot) ?? news[0];
  const list = useMemo(
    () => news.filter((n) => n.id !== featured.id).filter((n) => (cat === "전체" ? true : n.category === cat)),
    [cat, featured.id],
  );
  const featuredVisible = cat === "전체";

  const counts = useMemo(() => {
    const m: Record<string, number> = { 전체: news.length };
    news.forEach((n) => (m[n.category] = (m[n.category] ?? 0) + 1));
    return m;
  }, []);

  return (
    <section id="news" className="relative scroll-mt-24 border-t border-white/[0.06] py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute right-[-12rem] top-24 h-[28rem] w-[28rem] animate-drift rounded-full bg-volt-400/[0.07] blur-[130px]" />
      </div>

      <div className="shell">
        <Reveal>
          <SectionLabel index="03" title="AI NEWS" kicker="주 2회 브리핑" />
          <SectionHeading
            sub={
              <>
                모델 발표 · 툴 업데이트 · 정책 변화만 선별합니다. 홍보성 소식은 걸러 내고,{" "}
                <span className="text-zinc-200">실무에 바로 영향을 주는 것</span>만 담았습니다.
              </>
            }
          >
            AI 뉴스 — <Highlight>쓸 것만</Highlight> 골라서.
          </SectionHeading>
        </Reveal>

        <div className="mt-9 flex flex-wrap gap-2">
          {cats.map((c) => (
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

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
          {featuredVisible ? (
            <FeaturedNews item={featured} onOpen={() => setOpen(featured)} />
          ) : (
            <div className="hidden lg:block" />
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {list.slice(0, 4).map((n, i) => (
              <NewsCard key={n.id} item={n} delay={i * 70} onOpen={() => setOpen(n)} />
            ))}
          </div>
        </div>

        {list.length > 4 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {list.slice(4).map((n, i) => (
              <NewsCard key={n.id} item={n} delay={i * 60} onOpen={() => setOpen(n)} />
            ))}
          </div>
        )}

        <div className="mt-14">
          <Newsletter />
        </div>
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} label="뉴스 상세">
        {open && (
          <>
            <div className="sticky top-0 z-10 border-b border-white/[0.07] bg-ink-900/95 px-6 py-5 backdrop-blur sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={catTone[open.category]}>{open.category}</Pill>
                  <span className="font-mono text-[10.5px] text-zinc-500">
                    {open.date} · {open.source} · {open.readTime} 읽기
                  </span>
                </div>
                <button
                  onClick={() => setOpen(null)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-400 transition-colors hover:border-white/30 hover:text-white"
                  aria-label="닫기"
                >
                  <IconClose className="h-4 w-4" />
                </button>
              </div>
              <h3 className="mt-3 max-w-2xl text-[1.2rem] font-extrabold leading-[1.3] tracking-[-0.035em] text-white sm:text-[1.65rem]">
                {open.title}
              </h3>
            </div>

            <div className="px-6 py-6 sm:px-8 sm:py-7">
              <p className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-[13.5px] font-medium leading-relaxed text-zinc-200">
                {open.summary}
              </p>

              <div className="mt-6 space-y-4">
                {open.body.map((p) => (
                  <p key={p} className="text-[14px] leading-[1.85] text-zinc-400">
                    {p}
                  </p>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-volt-400/20 bg-volt-400/[0.05] p-5">
                <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-volt-400">
                  key takeaways
                </p>
                <ul className="mt-3.5 space-y-2.5">
                  {open.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-[13px] leading-relaxed text-zinc-300">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-volt-400" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-5">
                <div className="flex flex-wrap gap-1.5">
                  {open.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-zinc-500"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
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
