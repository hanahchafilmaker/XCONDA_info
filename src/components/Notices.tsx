import { useMemo, useState } from "react";
import { cn } from "../utils/cn";
import type { Entry } from "../content/types";
import { useContent } from "../content/ContentContext";
import { formatDate, isNew } from "../notion";
import { categoryLabel, useLang } from "../i18n";
import { STUDIO_URL } from "../content/tools";
import {
  GhostButton,
  Highlight,
  IconArrow,
  IconBullhorn,
  IconClock,
  IconExternal,
  IconPin,
  Pill,
  Reveal,
  SectionHeading,
  SectionLabel,
} from "./volt";

const toneFor = (category: string): string => {
  if (/점검|maintenance/i.test(category)) return "red";
  if (/정책|policy/i.test(category)) return "blue";
  if (/이벤트|event/i.test(category)) return "green";
  if (/업데이트|update/i.test(category)) return "volt";
  return "violet";
};

function NoticeRow({ n, onOpen, index, showNo }: { n: Entry; onOpen: () => void; index: number; showNo: string }) {
  const { lang } = useLang();
  const points = n.changes?.slice(0, 2).map((c) => c.text) ?? n.tags.slice(0, 2);
  return (
    <Reveal as="li" delay={index * 45}>
      <button
        onClick={onOpen}
        className="group grid w-full grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 rounded-2xl border border-transparent px-4 py-4 text-left transition-all duration-500 hover:border-white/10 hover:bg-white/[0.035] sm:grid-cols-[86px_1fr_auto] sm:items-center sm:px-5"
      >
        <span className="font-mono text-[11px] font-semibold text-zinc-600 sm:text-[12px]">{showNo}</span>

        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <Pill tone={toneFor(n.category)}>{categoryLabel(n.category, lang)}</Pill>
            {n.pinned && (
              <Pill tone="volt" className="border-volt-400/45 bg-volt-400/15">
                <IconPin className="h-3 w-3" /> {n.pinned ? "고정" : ""}
              </Pill>
            )}
            {isNew(n.date) && <Pill tone="green">NEW</Pill>}
            <span className="truncate text-[14px] font-bold text-zinc-100 transition-colors duration-300 group-hover:text-white sm:text-[15px]">
              {n.title}
            </span>
          </span>
          <span className="mt-1.5 line-clamp-1 block text-[12px] text-zinc-500">{n.summary}</span>
          {points.length > 0 && (
            <span className="mt-1.5 hidden flex-wrap gap-1.5 sm:flex">
              {points.map((p) => (
                <span key={p} className="max-w-[22ch] truncate font-mono text-[9.5px] text-zinc-700">
                  # {p}
                </span>
              ))}
            </span>
          )}
          <span className="mt-1.5 flex items-center gap-3 font-mono text-[10px] text-zinc-600 sm:hidden">{formatDate(n.date)}</span>
        </span>

        <span className="hidden items-center gap-4 sm:flex">
          <span className="font-mono text-[11px] text-zinc-600">{formatDate(n.date)}</span>
          <span className="grid h-7 w-7 place-items-center rounded-full border border-white/10 text-zinc-500 transition-all duration-300 group-hover:border-volt-400 group-hover:bg-volt-400 group-hover:text-ink-950">
            <IconArrow className="h-3.5 w-3.5" />
          </span>
        </span>
      </button>
    </Reveal>
  );
}

function Featured({ n, onOpen }: { n: Entry; onOpen: () => void }) {
  const { t, lang } = useLang();
  const points = n.changes?.map((c) => c.text) ?? n.tags;
  return (
    <Reveal className="lg:sticky lg:top-28">
      <div className="group relative overflow-hidden rounded-[26px] border border-volt-400/25 bg-gradient-to-br from-volt-400/[0.09] via-ink-880 to-ink-900 p-6 sm:p-8">
        <span className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 animate-drift rounded-full bg-volt-400/20 blur-[70px]" />
        <span className="dotgrid pointer-events-none absolute inset-0 opacity-[0.18]" />

        <div className="relative">
          <div className="flex items-center gap-2">
            <Pill tone="volt">
              <IconBullhorn className="h-3 w-3" /> {t("v.notices.important")}
            </Pill>
            <span className="font-mono text-[10.5px] text-zinc-500">{formatDate(n.date)}</span>
          </div>

          <h3 className="mt-5 text-[1.4rem] font-extrabold leading-[1.28] tracking-[-0.03em] text-white sm:text-[1.7rem]">
            {n.title}
          </h3>
          <p className="mt-3 text-[13.5px] leading-relaxed text-zinc-400">{n.summary}</p>

          {points.length > 0 && (
            <ul className="mt-5 space-y-2.5 border-t border-white/[0.08] pt-5">
              {points.slice(0, 4).map((b) => (
                <li key={b} className="flex gap-2.5 text-[12.5px] leading-relaxed text-zinc-300">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-volt-400" />
                  {b}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-wrap gap-2.5">
            <button
              onClick={onOpen}
              className="inline-flex items-center gap-2 rounded-full bg-volt-400 px-5 py-2.5 text-[12.5px] font-extrabold text-ink-950 transition-all duration-300 hover:shadow-[0_12px_36px_-10px_rgba(255,214,10,0.8)]"
            >
              {t("v.notices.detail")} <IconArrow className="h-3.5 w-3.5" />
            </button>
            <GhostButton href={STUDIO_URL} className="px-5 py-2.5 text-[12.5px]">
              {t("common.openStudio")} <IconExternal className="h-3.5 w-3.5" />
            </GhostButton>
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-700">
            {categoryLabel(n.category, lang)}
          </p>
        </div>
      </div>
    </Reveal>
  );
}

export default function Notices() {
  const { t } = useLang();
  const { notices, openEntry } = useContent();
  const [cat, setCat] = useState<string>("전체");

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    notices.forEach((n) => m.set(n.category, (m.get(n.category) ?? 0) + 1));
    return ["전체", ...[...m.keys()]];
  }, [notices]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { 전체: notices.length };
    notices.forEach((n) => (m[n.category] = (m[n.category] ?? 0) + 1));
    return m;
  }, [notices]);

  const list = useMemo(
    () => notices.filter((n) => (cat === "전체" ? true : n.category === cat)),
    [notices, cat],
  );

  const featured = useMemo(() => notices.find((n) => n.pinned) ?? notices[0], [notices]);

  if (!notices.length) {
    return (
      <section id="notices" className="relative scroll-mt-24 border-t border-white/[0.06] py-20 sm:py-28">
        <div className="shell">
          <SectionLabel index="01" title="NOTICES" />
          <SectionHeading sub={t("v.notices.empty")}>{t("nav.notices")}</SectionHeading>
        </div>
      </section>
    );
  }

  return (
    <section id="notices" className="relative scroll-mt-24 border-t border-white/[0.06] py-20 sm:py-28">
      <div className="shell">
        <Reveal>
          <SectionLabel index="01" title="NOTICES" kicker={t("v.notices.kicker")} />
          <SectionHeading
            sub={
              <>
                {t("v.notices.subA")} <span className="text-zinc-200">{t("v.notices.subStrong")}</span>
                {t("v.notices.subB")}
              </>
            }
          >
            {t("v.notices.lead")} <Highlight>{t("v.notices.accent")}</Highlight> {t("v.notices.accentTail")}
          </SectionHeading>
        </Reveal>

        {/* ticker */}
        <Reveal delay={80} className="mt-9">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900/60">
            <div className="absolute inset-y-0 left-0 z-10 flex items-center gap-2 bg-volt-400 px-4 text-ink-950">
              <IconBullhorn className="h-3.5 w-3.5" />
              <span className="text-[11px] font-extrabold tracking-tight">{t("v.notices.latest")}</span>
            </div>
            <div className="mask-fade-x flex overflow-hidden py-3.5 pl-[124px]">
              <div className="flex min-w-max animate-marquee items-center gap-9 pr-9">
                {[...notices, ...notices].map((n, i) => (
                  <button
                    key={`${n.id}-${i}`}
                    onClick={() => openEntry(n)}
                    className="flex items-center gap-2.5 whitespace-nowrap text-[12px] font-medium text-zinc-500 transition-colors hover:text-volt-300"
                  >
                    <span className="h-1 w-1 rounded-full bg-volt-400/70" />
                    <span className="font-mono text-[10.5px] text-zinc-700">{formatDate(n.date).slice(5)}</span>
                    {n.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.35fr] lg:gap-12">
          <Featured n={featured} onOpen={() => openEntry(featured)} />

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
                <NoticeRow
                  key={n.id}
                  n={n}
                  index={i}
                  showNo={String(i + 1).padStart(3, "0")}
                  onOpen={() => openEntry(n)}
                />
              ))}
            </ul>

            {list.length === 0 && (
              <p className="mt-8 text-center text-[13px] text-zinc-500">{t("v.notices.empty")}</p>
            )}

            <div className="mt-5 flex items-center justify-between">
              <span className="font-mono text-[11px] text-zinc-600">
                {String(list.length).padStart(2, "0")} / {String(notices.length).padStart(2, "0")} {t("v.notices.showing")}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-zinc-500">
                <IconClock className="h-3.5 w-3.5" /> Notion sync
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
