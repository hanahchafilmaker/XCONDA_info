import { useMemo, useState } from "react";
import { cn } from "../utils/cn";
import type { Entry } from "../content/types";
import { useContent } from "../content/ContentContext";
import { formatDate, isNew } from "../notion";
import { categoryLabel, changeLabel, useLang } from "../i18n";
import { STUDIO_URL } from "../content/tools";
import { SyncStatus } from "./common";
import {
  GhostButton,
  Highlight,
  IconArrow,
  IconExternal,
  IconGit,
  Pill,
  Reveal,
  SectionHeading,
  SectionLabel,
} from "./volt";

const toneFor = (kind: string): string => {
  if (kind === "New") return "green";
  if (kind === "Improved") return "blue";
  if (kind === "Fixed") return "volt";
  return "zinc";
};

function FeaturedUpdate({ item, onOpen }: { item: Entry; onOpen: () => void }) {
  const { t, lang } = useLang();
  return (
    <Reveal>
      <article
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[26px] border border-white/[0.09] bg-ink-900/70 p-6 transition-all duration-500 hover:border-volt-400/35 sm:p-8"
      >
        <span className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 animate-drift rounded-full bg-volt-400/10 blur-[80px]" />
        <span className="dotgrid pointer-events-none absolute inset-0 opacity-[0.13]" />

        <div className="relative flex flex-wrap items-center gap-2">
          <Pill tone="volt">
            <IconGit className="h-3 w-3" /> {t("v.updates.featured")}
          </Pill>
          {isNew(item.date) && <Pill tone="green">NEW</Pill>}
          {item.version && <Pill tone="zinc">{item.version}</Pill>}
        </div>

        <h3 className="relative mt-5 text-[1.45rem] font-extrabold leading-[1.25] tracking-[-0.035em] text-white sm:text-[1.9rem]">
          {item.title}
        </h3>
        <p className="relative mt-3 text-[13.5px] leading-relaxed text-zinc-400">{item.summary}</p>

        {item.changes && item.changes.length > 0 && (
          <ul className="relative mt-6 space-y-2.5 border-t border-white/[0.07] pt-5">
            {item.changes.slice(0, 4).map((c, i) => (
              <li key={i} className="flex gap-2.5 text-[12.5px] leading-relaxed text-zinc-300">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-volt-400" />
                <span className="text-zinc-500">{changeLabel(c.kind, lang)} ·</span> {c.text}
              </li>
            ))}
          </ul>
        )}

        <div className="relative mt-auto flex items-center justify-between pt-6">
          <span className="font-mono text-[10.5px] text-zinc-600">
            {formatDate(item.date)} · {categoryLabel(item.category, lang)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-volt-400">
            {t("v.updates.readMore")}
            <IconArrow className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </article>
    </Reveal>
  );
}

function UpdateCard({ item, onOpen, delay }: { item: Entry; onOpen: () => void; delay: number }) {
  const { lang } = useLang();
  return (
    <Reveal as="article" delay={delay} className="h-full">
      <button
        onClick={onOpen}
        className="group flex h-full w-full flex-col rounded-2xl border border-white/[0.07] bg-ink-900/50 p-5 text-left transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:bg-ink-880"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {item.changes?.slice(0, 2).map((c, i) => (
              <Pill key={i} tone={toneFor(c.kind)}>
                {changeLabel(c.kind, lang)}
              </Pill>
            )) ?? <Pill tone="zinc">{categoryLabel(item.category, lang)}</Pill>}
          </div>
          <span className="font-mono text-[10px] text-zinc-600">{formatDate(item.date).slice(5)}</span>
        </div>

        <h4 className="mt-4 text-[15px] font-extrabold leading-[1.4] tracking-[-0.025em] text-zinc-100 transition-colors duration-300 group-hover:text-white">
          {item.title}
        </h4>
        <p className="mt-2.5 line-clamp-3 text-[12.5px] leading-relaxed text-zinc-500">{item.summary}</p>

        {item.changes && item.changes.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {item.changes.slice(0, 3).map((c, i) => (
              <li key={i} className="line-clamp-1 text-[11.5px] text-zinc-500">
                · {c.text}
              </li>
            ))}
          </ul>
        )}

        <span className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-3.5 font-mono text-[10px] text-zinc-600">
          {item.changes?.length ?? 0} changes
          <IconArrow className="h-3.5 w-3.5 text-zinc-700 transition-all duration-300 group-hover:translate-x-1 group-hover:text-volt-400" />
        </span>
      </button>
    </Reveal>
  );
}

export default function Updates() {
  const { t, lang } = useLang();
  const { updates, openEntry } = useContent();
  const [cat, setCat] = useState<string>("전체");

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    updates.forEach((n) => m.set(n.category, (m.get(n.category) ?? 0) + 1));
    return ["전체", ...[...m.keys()]];
  }, [updates]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { 전체: updates.length };
    updates.forEach((n) => (m[n.category] = (m[n.category] ?? 0) + 1));
    return m;
  }, [updates]);

  const list = useMemo(
    () => updates.filter((n) => (cat === "전체" ? true : n.category === cat)),
    [updates, cat],
  );

  const featured = useMemo(() => (cat === "전체" ? updates[0] : undefined), [updates, cat]);
  const rest = useMemo(() => (featured ? list.filter((n) => n.id !== featured.id) : list), [list, featured]);

  return (
    <section id="updates" className="relative scroll-mt-24 border-t border-white/[0.06] py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute right-[-12rem] top-24 h-[28rem] w-[28rem] animate-drift rounded-full bg-volt-400/[0.07] blur-[130px]" />
      </div>

      <div className="shell">
        <Reveal>
          <SectionLabel index="03" title="UPDATES" kicker={t("v.updates.kicker")} />
          <SectionHeading
            sub={
              <>
                {t("v.updates.subA")} <span className="text-zinc-200">{t("v.updates.subStrong")}</span>
                {t("v.updates.subB")}
              </>
            }
          >
            {t("v.updates.lead")} <Highlight>{t("v.updates.accent")}</Highlight> {t("v.updates.accentTail")}
          </SectionHeading>
        </Reveal>

        {!updates.length ? (
          <p className="mt-12 text-[13px] text-zinc-500">{t("v.updates.empty")}</p>
        ) : (
          <>
            {categories.length > 2 && (
              <div className="mt-9 flex flex-wrap gap-2">
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
                    {c === "전체" ? t("v.search.all") : categoryLabel(c, lang)}
                    <span className={cn("font-mono text-[9.5px]", cat === c ? "text-ink-950/55" : "text-zinc-600")}>
                      {String(counts[c] ?? 0).padStart(2, "0")}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
              {featured && <FeaturedUpdate item={featured} onOpen={() => openEntry(featured)} />}
              {!featured && <div className="hidden lg:block" />}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {rest.slice(0, 4).map((n, i) => (
                  <UpdateCard key={n.id} item={n} delay={i * 70} onOpen={() => openEntry(n)} />
                ))}
              </div>
            </div>

            {rest.length > 4 && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {rest.slice(4).map((n, i) => (
                  <UpdateCard key={n.id} item={n} delay={i * 60} onOpen={() => openEntry(n)} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Notion sync panel (실제 연동 상태 안내) */}
        <Reveal delay={60} className="mt-14">
          <div
            className="relative overflow-hidden rounded-[26px] border border-volt-400/25 bg-gradient-to-br from-volt-400/[0.1] via-ink-880 to-ink-900 p-6 sm:p-8"
            aria-label={t("v.updates.syncAria")}
          >
            <span className="pointer-events-none absolute -right-16 -bottom-20 h-56 w-56 animate-drift rounded-full bg-volt-400/20 blur-[70px]" />
            <div className="relative max-w-2xl">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-volt-400">notion · live sync</p>
              <h3 className="mt-3 text-[1.3rem] font-extrabold leading-[1.3] tracking-[-0.03em] text-white sm:text-[1.7rem]">
                {t("v.updates.syncTitle")}
              </h3>
              <p className="mt-3 text-[13px] leading-relaxed text-zinc-400">{t("v.updates.syncDesc")}</p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <SyncStatus />
                <GhostButton href={STUDIO_URL} className="px-5 py-2.5 text-[12.5px]">
                  {t("v.updates.syncCta")} <IconExternal className="h-3.5 w-3.5" />
                </GhostButton>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

