import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "../utils/cn";
import { TOOLS, TOOL_GROUPS } from "../content/tools";
import { getToolVideo } from "../content/toolVideos";
import { useContent } from "../content/ContentContext";
import { groupLabel, localizeTool, useLang } from "../i18n";
import { SmartImage } from "./common";
import { GhostButton, IconArrow, Reveal, SectionHeader, Tabs, VoltButton } from "./volt";

type Group = (typeof TOOL_GROUPS)[number];

export default function Guides() {
  const { t, pick, lang } = useLang();
  const { openTool } = useContent();
  const [group, setGroup] = useState<Group>("전체");
  const [activeSlug, setActiveSlug] = useState(TOOLS[0].slug);

  const tools = useMemo(() => TOOLS.map((tool) => localizeTool(tool, lang)), [lang]);

  const filtered = useMemo(
    () => tools.filter((tool) => (group === "전체" ? true : tool.group === group)),
    [tools, group],
  );

  const active = filtered.find((tool) => tool.slug === activeSlug) ?? filtered[0] ?? tools[0];
  const video = getToolVideo(active.slug, lang);

  const pickGroup = (g: Group) => {
    setGroup(g);
    const next = tools.filter((tool) => (g === "전체" ? true : tool.group === g));
    if (next.length && !next.some((tool) => tool.slug === activeSlug)) setActiveSlug(next[0].slug);
  };

  return (
    <section id="guides" className="scroll-mt-20 border-t border-white/[0.06] py-20 sm:py-24">
      <div className="shell">
        <Reveal>
          <SectionHeader title={t("nav.tools")} sub={t("v.guides.sub")} />
        </Reveal>

        <Reveal delay={60} className="mt-8">
          <Tabs
            label={t("nav.tools")}
            value={group}
            onChange={pickGroup}
            items={TOOL_GROUPS.map((g) => ({ id: g, label: groupLabel(g, lang) }))}
          />
        </Reveal>

        <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr] lg:gap-10">
          {/* tool list (desktop) */}
          <nav aria-label={t("nav.tools")} className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
            <ul className="space-y-0.5">
              {filtered.map((g) => (
                <li key={g.slug}>
                  <button
                    onClick={() => setActiveSlug(g.slug)}
                    aria-current={active.slug === g.slug ? "true" : undefined}
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left text-[14px] font-medium transition-colors",
                      active.slug === g.slug
                        ? "bg-white/[0.07] text-white"
                        : "text-zinc-400 hover:bg-white/[0.03] hover:text-white",
                    )}
                  >
                    {g.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* tool switcher (mobile) */}
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:hidden">
            {filtered.map((g) => (
              <button
                key={g.slug}
                onClick={() => setActiveSlug(g.slug)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  g.slug === active.slug ? "border-white bg-white text-ink-950" : "border-white/10 text-zinc-400",
                )}
              >
                {g.name}
              </button>
            ))}
          </div>

          {/* detail */}
          <article key={active.slug} className="anim-fade min-w-0 rounded-2xl border border-white/[0.08] bg-ink-900">
            <div className="p-6 sm:p-8">
              <p className="text-[13px] font-medium text-zinc-500">{groupLabel(active.group, lang)}</p>
              <h3 className="mt-2 text-[1.6rem] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[1.9rem]">
                {active.name}
              </h3>
              <p className="mt-2 text-[15px] font-medium text-volt-400">{active.tagline}</p>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-zinc-400">{active.desc}</p>

              {active.image && (
                <div className="mt-6 overflow-hidden rounded-xl">
                  <SmartImage src={active.image} alt={active.name} className="aspect-[21/9] w-full object-cover" />
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.06] p-6 sm:p-8">
              <h4 className="text-[15px] font-semibold text-white">{t("v.guides.howTo")}</h4>
              <ol className="mt-4 space-y-4">
                {active.steps.map((s, i) => (
                  <li key={s} className="flex gap-4">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/[0.07] text-[12px] font-semibold text-zinc-300">
                      {i + 1}
                    </span>
                    <p className="text-[15px] leading-relaxed text-zinc-300">{s}</p>
                  </li>
                ))}
              </ol>

              {active.tips && active.tips.length > 0 && (
                <div className="mt-7 rounded-xl bg-white/[0.03] p-5">
                  <p className="text-[13px] font-semibold text-volt-400">{t("v.guides.tip")}</p>
                  <ul className="mt-2 space-y-1.5">
                    {active.tips.map((tip) => (
                      <li key={tip} className="text-[14px] leading-relaxed text-zinc-300">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {video && (
                <a
                  href={video}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-black px-4 py-3 text-sm text-zinc-200 ring-1 ring-inset ring-white/[0.08] transition hover:bg-white/[0.06]"
                >
                  <span>{pick("공식 영상 가이드 (Google Drive에서 열기)", "Official video guide (open in Google Drive)")}</span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                </a>
              )}

              <div className="mt-7 flex flex-wrap gap-3">
                <VoltButton href={active.href} icon>
                  {t("v.guides.run")}
                </VoltButton>
                <GhostButton onClick={() => openTool(active.slug)}>{t("v.guides.openFull")}</GhostButton>
                <button
                  onClick={() => {
                    const i = filtered.findIndex((g) => g.slug === active.slug);
                    setActiveSlug(filtered[(i + 1) % filtered.length].slug);
                  }}
                  className="ml-auto inline-flex items-center gap-1.5 px-2 text-[14px] font-medium text-zinc-400 transition-colors hover:text-white"
                >
                  {t("v.guides.next")} <IconArrow className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
