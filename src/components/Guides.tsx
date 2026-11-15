import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "../utils/cn";
import { TOOLS, TOOL_GROUPS } from "../content/tools";
import { getToolVideo } from "../content/toolVideos";
import { htmlGuideIndexPath, htmlGuideLabels } from "../content/htmlGuides";
import { useContent } from "../content/ContentContext";
import { groupLabel, localizeTool, useLang } from "../i18n";
import { hubBase } from "../seo";
import { SmartImage } from "./common";
import { GhostButton, IconArrow, Reveal, SectionHeader, Tabs, VoltButton } from "./volt";

type Group = (typeof TOOL_GROUPS)[number];

export default function Guides() {
  const { t, pick, lang, target } = useLang();
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
    <section id="guides" className="scroll-mt-20 border-t border-black/[0.06] py-14 sm:py-20">
      <div className="shell">
        <Reveal>
          <SectionHeader eyebrow="03 / TOOLKIT" title={t("nav.tools")} sub={t("v.guides.sub")} action={
            <a data-html-guide-index href={`${hubBase()}${htmlGuideIndexPath(target)}`} target="_blank" rel="noopener noreferrer" className="notranslate inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-xs font-medium text-neutral-700 transition hover:border-neutral-400">
              {htmlGuideLabels[target].all}<ExternalLink className="size-3.5" aria-hidden />
            </a>
          } />

        </Reveal>

        <Reveal delay={60} className="mt-8">
          <Tabs
            label={t("nav.tools")}
            value={group}
            onChange={pickGroup}
            items={TOOL_GROUPS.map((g) => ({ id: g, label: groupLabel(g, lang) }))}
          />
        </Reveal>

        <div className="mt-6 grid gap-6 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-6">
          {/* tool list (desktop) */}
          <nav aria-label={t("nav.tools")} className="hidden max-h-[640px] overflow-y-auto rounded-xl border border-neutral-200 bg-neutral-50 p-2 lg:sticky lg:top-24 lg:block lg:self-start">
            <ul className="space-y-0.5">
              {filtered.map((g) => (
                <li key={g.slug}>
                  <button
                    onClick={() => setActiveSlug(g.slug)}
                    aria-current={active.slug === g.slug ? "true" : undefined}
                    className={cn(
                      "w-full rounded-lg px-3 py-3 text-left text-[13px] font-medium transition-colors",
                      active.slug === g.slug
                        ? "bg-white text-neutral-950 shadow-sm ring-1 ring-neutral-200"
                        : "text-neutral-600 hover:bg-white hover:text-black",
                    )}
                  >
                    <span className="notranslate">{g.name}</span>
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
                aria-current={active.slug === g.slug ? "true" : undefined}
                onClick={() => setActiveSlug(g.slug)}
                className={cn(
                  "shrink-0 rounded-lg border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  g.slug === active.slug ? "border-black bg-black text-white" : "border-black/10 text-neutral-500",
                )}
              >
                <span className="notranslate">{g.name}</span>
              </button>
            ))}
          </div>

          {/* detail */}
          <article key={active.slug} className="anim-fade min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="grid items-center gap-6 p-6 sm:p-8 xl:grid-cols-[1.1fr_1fr]">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">{groupLabel(active.group, lang)}</p>
                <h3 className="mt-3 text-2xl font-bold tracking-tight text-neutral-950"><span className="notranslate">{active.name}</span></h3>
                <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-800">{active.tagline}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-neutral-600">{active.desc}</p>
              </div>
              {active.image && <div className="overflow-hidden rounded-xl bg-neutral-100"><SmartImage src={active.image} alt={active.name} className="aspect-[16/10] w-full object-cover" /></div>}
            </div>

            <div className="border-t border-neutral-200 p-6 sm:p-8">
              <h4 className="text-[15px] font-medium text-black">{t("v.guides.howTo")}</h4>
              <ol className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {active.steps.map((s, i) => (
                  <li key={s} className="flex gap-4">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-neutral-100 text-[11px] font-medium text-neutral-700">
                      {i + 1}
                    </span>
                    <p className="text-[13px] leading-relaxed text-neutral-700">{s}</p>
                  </li>
                ))}
              </ol>

              {active.tips && active.tips.length > 0 && (
                <div className="mt-7 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
                  <p className="text-xs font-semibold text-neutral-800">{t("v.guides.tip")}</p>
                  <ul className="mt-2 space-y-1.5">
                    {active.tips.map((tip) => (
                      <li key={tip} className="text-[13px] leading-relaxed text-neutral-600">
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
                  className="mt-5 flex items-center justify-between gap-3 rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-800 ring-1 ring-inset ring-black/[0.08] transition hover:bg-black/[0.06]"
                >
                  <span>{pick("공식 영상 가이드 (Google Drive에서 열기)", "Official video guide (open in Google Drive)")}</span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden />
                </a>
              )}

              <div className="mt-7 flex flex-wrap gap-3">
                <VoltButton href={active.href} icon>
                  {t("v.guides.run")}
                </VoltButton>
                <GhostButton aria-haspopup="dialog" onClick={() => openTool(active.slug)}>{t("v.guides.openFull")}</GhostButton>
                <button
                  onClick={() => {
                    const i = filtered.findIndex((g) => g.slug === active.slug);
                    setActiveSlug(filtered[(i + 1) % filtered.length].slug);
                  }}
                  className="ml-auto inline-flex items-center gap-1.5 px-2 py-2 text-xs font-medium text-neutral-500 transition-colors hover:text-black"
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
