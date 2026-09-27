import { useMemo, useState } from "react";
import type { Entry } from "../content/types";
import { useContent } from "../content/ContentContext";
import { formatDate, isNew } from "../notion";
import { categoryLabel, useLang } from "../i18n";
import { IconArrow, IconChevron, IconPin, Pill, Reveal, SectionHeader, Tabs } from "./volt";

const isMaintenance = (category: string) => /점검|maintenance/i.test(category);

function NoticeRow({ n, onOpen }: { n: Entry; onOpen: () => void }) {
  const { lang } = useLang();
  return (
    <li>
      <button
        onClick={onOpen}
        className="group flex w-full items-center gap-4 px-1 py-4 text-left transition-colors sm:px-2"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            {n.pinned && <IconPin className="h-3.5 w-3.5 shrink-0 text-volt-400" aria-label="pinned" />}
            <span className="truncate text-[15px] font-semibold text-zinc-100 transition-colors group-hover:text-white">
              {n.title}
            </span>
            {isNew(n.date) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-volt-400" aria-label="new" />}
          </span>
          <span className="mt-1 flex items-center gap-2 text-[13px] text-zinc-500">
            <span className={isMaintenance(n.category) ? "text-rose-300" : undefined}>{categoryLabel(n.category, lang)}</span>
            <span aria-hidden>·</span>
            <span>{formatDate(n.date)}</span>
          </span>
        </span>
        <IconChevron className="h-4 w-4 shrink-0 -rotate-90 text-zinc-600 transition-colors group-hover:text-zinc-300" />
      </button>
    </li>
  );
}

function Featured({ n, onOpen }: { n: Entry; onOpen: () => void }) {
  const { t } = useLang();
  const points = (n.changes?.map((c) => c.text) ?? n.tags).slice(0, 3);
  return (
    <button
      onClick={onOpen}
      className="group flex h-full w-full flex-col rounded-2xl border border-white/[0.08] bg-ink-900 p-6 text-left transition-colors hover:border-white/15 sm:p-7"
    >
      <span className="flex items-center gap-2 text-[13px] text-zinc-500">
        <Pill tone="volt">{t("v.notices.important")}</Pill>
        {formatDate(n.date)}
      </span>

      <span className="mt-4 block text-[1.35rem] font-bold leading-snug tracking-[-0.02em] text-white">{n.title}</span>
      <span className="mt-3 block text-[14.5px] leading-relaxed text-zinc-400">{n.summary}</span>

      {points.length > 0 && (
        <ul className="mt-5 space-y-2">
          {points.map((b) => (
            <li key={b} className="flex gap-2.5 text-[14px] leading-relaxed text-zinc-300">
              <span className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
              {b}
            </li>
          ))}
        </ul>
      )}

      <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-[14px] font-semibold text-volt-400">
        {t("v.notices.detail")}
        <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

export default function Notices() {
  const { t, lang } = useLang();
  const { notices, openEntry } = useContent();
  const [cat, setCat] = useState<string>("전체");

  const categories = useMemo(() => {
    const set = new Set(notices.map((n) => n.category));
    return ["전체", ...set];
  }, [notices]);

  const featured = useMemo(() => notices.find((n) => n.pinned) ?? notices[0], [notices]);

  const list = useMemo(
    () => notices.filter((n) => n.id !== featured?.id && (cat === "전체" || n.category === cat)),
    [notices, cat, featured],
  );

  return (
    <section id="notices" className="scroll-mt-20 py-20 sm:py-24">
      <div className="shell">
        <Reveal>
          <SectionHeader title={t("nav.notices")} sub={t("v.notices.sub")} />
        </Reveal>

        {!notices.length ? (
          <p className="mt-10 text-[14px] text-zinc-500">{t("v.notices.empty")}</p>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[5fr_7fr] lg:gap-12">
            <Reveal>
              <Featured n={featured} onOpen={() => openEntry(featured)} />
            </Reveal>

            <Reveal delay={80}>
              {categories.length > 2 && (
                <Tabs
                  label={t("nav.notices")}
                  value={cat}
                  onChange={setCat}
                  items={categories.map((c) => ({ id: c, label: c === "전체" ? t("v.search.all") : categoryLabel(c, lang) }))}
                />
              )}
              <ul className="mt-2 divide-y divide-white/[0.06]">
                {list.map((n) => (
                  <NoticeRow key={n.id} n={n} onOpen={() => openEntry(n)} />
                ))}
              </ul>
              {list.length === 0 && <p className="py-10 text-center text-[14px] text-zinc-500">{t("v.notices.empty")}</p>}
            </Reveal>
          </div>
        )}
      </div>
    </section>
  );
}
