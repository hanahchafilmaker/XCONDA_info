import { useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { TOOLS, TOOL_GROUPS } from "../content/tools";
import { htmlGuideUrl } from "../content/htmlGuides";
import { groupLabel, localizeTool, useLang } from "../i18n";
import { Reveal, SectionHeader, Tabs } from "./volt";

type Group = (typeof TOOL_GROUPS)[number];

export default function Guides() {
  const { t, lang, target } = useLang();
  const [group, setGroup] = useState<Group>("전체");
  const [activeSlug, setActiveSlug] = useState(TOOLS[0].slug);

  const tools = useMemo(() => TOOLS.map((tool) => localizeTool(tool, lang)), [lang]);
  const filtered = useMemo(
    () => tools.filter((tool) => (group === "전체" ? true : tool.group === group)),
    [tools, group],
  );
  const active = filtered.find((tool) => tool.slug === activeSlug) ?? filtered[0] ?? tools[0];
  const guideUrl = htmlGuideUrl(active.slug, target);

  const pickGroup = (g: Group) => {
    setGroup(g);
    const next = tools.filter((tool) => (g === "전체" ? true : tool.group === g));
    if (next.length && !next.some((tool) => tool.slug === activeSlug)) setActiveSlug(next[0].slug);
  };

  return (
    <section
      id="guides"
      data-current-guide-count="96"
      data-current-video-count="65"
      className="scroll-mt-20 border-t border-black/[0.06] py-14 sm:py-20"
    >
      <div className="shell">
        <Reveal>
          <SectionHeader eyebrow="03 / TOOLKIT" title={t("nav.tools")} sub={t("v.guides.sub")} />
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

          {/* The whole tool detail is the sanitized 2026-11-18 current HTML. */}
          <article
            key={active.slug}
            data-current-guide-slug={active.slug}
            data-current-guide-target={target}
            className="anim-fade min-w-0 overflow-hidden rounded-2xl border border-neutral-200 bg-white"
          >
            {guideUrl ? (
              <iframe
                key={guideUrl}
                data-html-guide={active.slug}
                src={guideUrl}
                title={`${active.name} — 2026-11-18 current guide`}
                aria-label={`${active.name} 현재 가이드`}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="block h-[min(82dvh,1100px)] min-h-[620px] w-full border-0 bg-white"
              />
            ) : (
              <p className="p-8 text-sm text-neutral-600">현재 가이드를 찾지 못했습니다.</p>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}
