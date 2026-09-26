import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, Search } from "lucide-react";
import { Container, Reveal, SectionHeading, Serif, trackSpotlight } from "./ui";
import { useLang, groupLabel } from "../i18n";
import { useContent } from "../content/ContentContext";
import { TOOL_GROUPS, TOOLS } from "../content/tools";
import { SmartImage } from "./common";
import { cn } from "../utils/cn";

const ALL = "전체";

export default function Tools() {
  const { t: tr, pick, lang } = useLang();
  const { openTool } = useContent();
  const [group, setGroup] = useState<string>(ALL);
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return TOOLS.filter(
      (t) =>
        (group === ALL || t.group === group) &&
        (!query || `${t.name} ${t.tagline} ${t.desc}`.toLowerCase().includes(query))
    );
  }, [group, q]);

  return (
    <section id="tools" className="relative py-20 sm:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-40 -z-10 mx-auto h-[30rem] max-w-5xl rounded-full bg-violet-700/10 blur-[140px]" />
      <Container>
        <SectionHeading
          eyebrow="All Tools"
          title={<>{tr("tools.titleKo")} <Serif className="text-gradient font-normal">Tool Guide</Serif></>}
          description={pick(
            `XCONDA의 ${TOOLS.length}가지 툴을 한눈에. 카드를 누르면 단계별 사용법을 볼 수 있습니다.`,
            `All ${TOOLS.length} XCONDA tools at a glance. Tap a card to see step-by-step how-tos.`
          )}
        />

        <Reveal delay={100} className="mt-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label={tr("tools.tabAria")} className="glass flex max-w-full gap-1 overflow-x-auto rounded-full p-1">
            {TOOL_GROUPS.map((g) => (
              <button
                key={g}
                role="tab"
                aria-selected={group === g}
                type="button"
                onClick={() => setGroup(g)}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-300",
                  group === g ? "bg-white text-ink-950" : "text-zinc-400 hover:text-white"
                )}
              >
                {g === ALL ? tr("common.all") : groupLabel(g, lang)}
              </button>
            ))}
          </div>
          <label className="glass flex h-11 items-center gap-2 rounded-full px-4 lg:w-72">
            <Search className="h-4 w-4 text-zinc-500" aria-hidden />
            <span className="sr-only">{tr("tools.searchLabel")}</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tr("tools.searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
            />
          </label>
        </Reveal>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((t, i) => (
            <Reveal key={t.slug} delay={(i % 4) * 60} className="h-full">
              <article
                onMouseMove={trackSpotlight}
                className="spotlight group flex h-full flex-col overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-b from-white/[0.045] to-white/[0.01] transition-all duration-500 hover:-translate-y-1 hover:border-white/15 hover:shadow-[0_30px_70px_-40px_rgba(139,92,246,0.55)]"
              >
                <button type="button" onClick={() => openTool(t.slug)} className="relative aspect-[16/10] overflow-hidden bg-ink-800" aria-label={pick(`${t.name} 사용법 보기`, `View ${t.name} guide`)}>
                  <SmartImage src={t.image} alt="" className="h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105" />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="glass absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium text-white">{groupLabel(t.group, lang)}</span>
                  {t.badge && <span className="bg-brand absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white">{t.badge}</span>}
                </button>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-semibold tracking-tight text-white">{t.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-400">{t.tagline}</p>
                  <div className="mt-auto flex items-center justify-between pt-5">
                    <button
                      type="button"
                      onClick={() => openTool(t.slug)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-zinc-200 transition hover:text-white"
                    >
                      {tr("common.howto")} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                    <a
                      href={t.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={pick(`${t.name} 스튜디오에서 열기`, `Open ${t.name} in Studio`)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-white/[0.05] text-zinc-400 ring-1 ring-inset ring-white/10 transition hover:bg-white hover:text-ink-950"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        {list.length === 0 && <p className="mt-16 text-center text-sm text-zinc-500">{pick(`“${q}”와 일치하는 툴이 없습니다.`, `No tools match “${q}”.`)}</p>}
      </Container>
    </section>
  );
}
