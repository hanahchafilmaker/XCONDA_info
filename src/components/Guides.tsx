import { useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { TOOLS, TOOL_GROUPS } from "../content/tools";
import { getToolVideo } from "../content/toolVideos";
import { useContent } from "../content/ContentContext";
import { groupLabel, localizeTool, useLang } from "../i18n";
import { SmartImage } from "./common";
import {
  GhostButton,
  Highlight,
  IconArrow,
  IconBook,
  IconExternal,
  IconSpark,
  Pill,
  Reveal,
  SectionHeading,
  SectionLabel,
  VoltButton,
} from "./volt";

/** 실제 툴 카탈로그 순서를 따르는 대표 워크플로우 */
const PIPELINE_SLUGS = ["turn", "flexboard", "art-director-pro", "video"];
const PIPELINE_TEXT: Record<string, { ko: string; en: string }> = {
  turn: {
    ko: "레퍼런스 사진이나 텍스트로 3D 공간을 만들고, 촬영할 공간부터 확보합니다.",
    en: "Build the 3D space from a reference photo or text before you shoot anything.",
  },
  flexboard: {
    ko: "시나리오를 넣으면 9컷 스토리보드가 완성되고, 마음에 안 드는 컷만 재생성합니다.",
    en: "Drop in a scenario and get a 9-cut storyboard, then regenerate only the cuts you dislike.",
  },
  "art-director-pro": {
    ko: "얼굴·의상 레퍼런스로 캐릭터 시트를 만들어 시나리오를 바꿔도 같은 인물이 유지됩니다.",
    en: "Lock faces and wardrobe with a character sheet so cuts stay consistent.",
  },
  video: {
    ko: "카메라 무브를 정해 스틸을 영상으로 바꾸고, 업스케일·그레이딩으로 마무리합니다.",
    en: "Set a camera move to turn stills into video, then upscale and grade.",
  },
};

export default function Guides() {
  const { t, lang } = useLang();
  const { openTool } = useContent();
  const [group, setGroup] = useState<string>("전체");
  const [activeSlug, setActiveSlug] = useState(TOOLS[0].slug);

  const tools = useMemo(() => TOOLS.map((tool) => localizeTool(tool, lang)), [lang]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { 전체: tools.length };
    tools.forEach((tool) => (m[tool.group] = (m[tool.group] ?? 0) + 1));
    return m;
  }, [tools]);

  const filtered = useMemo(
    () => tools.filter((tool) => (group === "전체" ? true : tool.group === group)),
    [tools, group],
  );

  const active = tools.find((tool) => tool.slug === activeSlug) ?? filtered[0] ?? tools[0];
  const video = getToolVideo(active.slug, lang);

  const pickGroup = (g: string) => {
    setGroup(g);
    const next = tools.filter((tool) => (g === "전체" ? true : tool.group === g));
    if (next.length && !next.some((tool) => tool.slug === activeSlug)) setActiveSlug(next[0].slug);
  };

  const pipeline = PIPELINE_SLUGS.map((slug, i) => {
    const tool = tools.find((x) => x.slug === slug) ?? tools[i];
    return { n: String(i + 1).padStart(2, "0"), tool, desc: PIPELINE_TEXT[slug]?.[lang] ?? "" };
  });

  return (
    <section id="guides" className="relative scroll-mt-24 border-t border-white/[0.06] py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-14rem] top-1/3 h-[30rem] w-[30rem] animate-drift rounded-full bg-volt-400/[0.07] blur-[130px]" />
      </div>

      <div className="shell">
        <Reveal>
          <SectionLabel index="02" title="TOOL GUIDES" kicker={`${tools.length}${t("v.guides.kicker")}`} />
          <SectionHeading
            sub={
              <>
                {t("v.guides.subA")} <span className="text-zinc-200">{t("v.guides.subStrong")}</span> {t("v.guides.subB")}
              </>
            }
          >
            {t("v.guides.lead")} <Highlight>{t("v.guides.accent")}</Highlight> {t("v.guides.accentTail")}
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
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-volt-400">{p.tool.name}</p>
                <h3 className="mt-3 text-[15.5px] font-extrabold tracking-tight text-white">{p.tool.tagline}</h3>
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
              {t("v.guides.explorer")}
            </h3>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-600">
              {tools.length} tools · {t("v.ticker.brand")}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {TOOL_GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => pickGroup(g)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-all duration-300",
                  group === g
                    ? "border-volt-400 bg-volt-400 text-ink-950"
                    : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/25 hover:text-white",
                )}
              >
                {groupLabel(g, lang)}
                <span className={cn("font-mono text-[9.5px]", group === g ? "text-ink-950/55" : "text-zinc-600")}>
                  {String(counts[g] ?? 0).padStart(2, "0")}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[290px_1fr] lg:gap-8">
            {/* tool list */}
            <div className="lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-2xl border border-white/[0.08] bg-ink-900/60 p-2">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">tools</span>
                  <span className="font-mono text-[10px] text-zinc-700">{String(filtered.length).padStart(2, "0")}</span>
                </div>
                <ul className="max-h-[520px] overflow-y-auto">
                  {filtered.map((g, i) => (
                    <li key={g.slug}>
                      <button
                        onClick={() => setActiveSlug(g.slug)}
                        aria-current={active.slug === g.slug ? "true" : undefined}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-300",
                          active.slug === g.slug ? "bg-volt-400/[0.12] ring-1 ring-inset ring-volt-400/35" : "hover:bg-white/[0.04]",
                        )}
                      >
                        <span className={cn("font-mono text-[10px] font-bold", active.slug === g.slug ? "text-volt-400" : "text-zinc-700")}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "truncate text-[13px] font-bold transition-colors",
                                active.slug === g.slug ? "text-white" : "text-zinc-300 group-hover:text-white",
                              )}
                            >
                              {g.name}
                            </span>
                            {g.badge === "Most Popular" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-volt-400" />}
                          </span>
                          <span className="mt-0.5 block truncate font-mono text-[9.5px] uppercase tracking-[0.14em] text-zinc-600">
                            {groupLabel(g.group, lang)}
                          </span>
                        </span>
                        <IconArrow
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 transition-all duration-300",
                            active.slug === g.slug
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
            <div key={active.slug} className="anim-fade">
              <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-ink-900/70">
                <span className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 animate-drift rounded-full bg-volt-400/10 blur-[80px]" />

                <div className="relative border-b border-white/[0.07] p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="zinc">{groupLabel(active.group, lang)}</Pill>
                    {active.badge && <Pill tone="volt">{active.badge}</Pill>}
                  </div>

                  <h4 className="mt-4 text-[1.6rem] font-extrabold leading-tight tracking-[-0.035em] text-white sm:text-[2.1rem]">
                    {active.name}
                  </h4>
                  <p className="mt-2 text-[14px] font-medium text-volt-300">{active.tagline}</p>
                  <p className="mt-4 max-w-2xl text-[13.5px] leading-[1.8] text-zinc-400">{active.desc}</p>

                  {active.image && (
                    <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07]">
                      <SmartImage
                        src={active.image}
                        alt={active.name}
                        className="aspect-[21/9] w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
                      />
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] text-zinc-600">
                    <span className="flex items-center gap-1.5">
                      <IconSpark className="h-3.5 w-3.5" /> {active.steps.length}
                      {t("v.guides.stepCount")}
                    </span>
                    <span>
                      {t("v.guides.updated")} {new Date().getFullYear()}
                    </span>
                  </div>
                </div>

                {/* steps */}
                <div className="relative p-6 sm:p-8">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-600">{t("v.guides.howTo")}</p>
                  <ol className="mt-5">
                    {active.steps.map((s, i) => (
                      <li key={s} className="group relative flex gap-4 pb-6 last:pb-0 sm:gap-5">
                        <div className="flex flex-col items-center">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-volt-400/35 bg-volt-400/10 font-mono text-[11px] font-bold text-volt-300 transition-all duration-500 group-hover:border-volt-400 group-hover:bg-volt-400 group-hover:text-ink-950">
                            {i + 1}
                          </span>
                          {i < active.steps.length - 1 && (
                            <span className="mt-1 w-px flex-1 bg-gradient-to-b from-volt-400/40 to-white/[0.06]" />
                          )}
                        </div>
                        <div className="pt-1">
                          <p className="text-[13.5px] leading-[1.85] text-zinc-300">{s}</p>
                        </div>
                      </li>
                    ))}
                  </ol>

                  {/* tips */}
                  {active.tips && active.tips.length > 0 && (
                    <div className="mt-8 flex gap-4 rounded-2xl border border-volt-400/20 bg-volt-400/[0.05] p-5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-volt-400 text-ink-950">
                        <IconSpark className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-volt-400">
                          {t("v.guides.tip")}
                        </p>
                        <ul className="mt-2 space-y-2">
                          {active.tips.map((tip) => (
                            <li key={tip} className="text-[13px] leading-[1.8] text-zinc-300">
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* official video */}
                  {video && (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-950/70">
                      <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-volt-400" /> {t("v.guides.video")}
                      </div>
                      <iframe
                        src={video}
                        title={active.name}
                        className="aspect-video w-full"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <a
                      href={active.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex items-center gap-2 rounded-full bg-volt-400 px-6 py-3 text-[13px] font-extrabold text-ink-950 transition-all duration-300 hover:shadow-[0_14px_44px_-10px_rgba(255,214,10,0.75)]"
                    >
                      {t("v.guides.run")}
                      <IconArrow className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </a>
                    <VoltButton onClick={() => openTool(active.slug)} className="px-5 py-2.5 text-[12.5px]">
                      {t("v.guides.openFull")}
                    </VoltButton>
                    <GhostButton
                      onClick={() => {
                        const i = filtered.findIndex((g) => g.slug === active.slug);
                        setActiveSlug(filtered[(i + 1) % filtered.length].slug);
                      }}
                    >
                      {t("v.guides.next")} <IconArrow className="h-4 w-4" />
                    </GhostButton>
                  </div>
                </div>
              </div>

              {/* mobile tool switcher */}
              <div className="mask-fade-x mt-4 flex gap-2 overflow-x-auto pb-2 lg:hidden">
                {filtered.map((g) => (
                  <button
                    key={g.slug}
                    onClick={() => setActiveSlug(g.slug)}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2 text-[12px] font-bold transition-all duration-300",
                      g.slug === active.slug
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
                {t("v.guides.footnote")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
