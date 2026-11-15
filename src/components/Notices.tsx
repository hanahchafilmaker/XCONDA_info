import { useMemo, useState } from "react";
import type { Entry } from "../content/types";
import { useContent } from "../content/ContentContext";
import { formatDate, isNew } from "../notion";
import { categoryLabel, useLang } from "../i18n";
import { SmartImage } from "./common";
import { IconArrow, IconChevron, IconPin, Pill, Reveal, SectionHeader, Tabs } from "./volt";

const isMaintenance = (category: string) => /점검|maintenance/i.test(category);

function NoticeRow({ n, onOpen }: { n: Entry; onOpen: () => void }) {
  const { lang } = useLang();
  return (
    <li>
      <button
        onClick={onOpen}
        className="group flex w-full items-center gap-4 rounded-lg px-3 py-4 text-left transition-colors hover:bg-neutral-50"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            {n.pinned && <IconPin className="h-3.5 w-3.5 shrink-0 text-volt-400" aria-label="pinned" />}
            <span className="line-clamp-2 text-[14px] font-bold leading-relaxed text-neutral-950 transition-colors group-hover:text-black">
              {n.title}
            </span>
            {isNew(n.date) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-volt-400" aria-label="new" />}
          </span>
          <span className="mt-1.5 flex items-center gap-2 text-[11px] text-neutral-500">
            <span className={isMaintenance(n.category) ? "text-rose-700" : undefined}>{categoryLabel(n.category, lang)}</span>
            <span aria-hidden>·</span>
            <span>{formatDate(n.date)}</span>
          </span>
        </span>
        <IconChevron className="h-4 w-4 shrink-0 -rotate-90 text-neutral-500 transition-colors group-hover:text-neutral-700" />
      </button>
    </li>
  );
}

function Featured({ n, onOpen }: { n: Entry; onOpen: () => void }) {
  const { t } = useLang();
  const points = (n.changes?.map((c) => c.text) ?? n.tags).slice(0, 3);
  return (
    <button
      data-featured-notice
      onClick={onOpen}
      className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left transition-all hover:border-black/15 hover:shadow-[0_12px_32px_rgba(0,0,0,.07)]"
    >
      {n.cover && (
        <span data-card-cover className="block aspect-[1200/630] w-full shrink-0 overflow-hidden bg-neutral-100">
          <SmartImage
            src={n.cover}
            fallbackSrc={n.coverFallback}
            alt=""
            className="block h-full w-full object-contain"
          />
        </span>
      )}
      <span className="flex w-full flex-1 flex-col p-6 sm:p-7">
        <span className="flex items-center gap-2 text-[13px] text-neutral-500">
          <Pill tone="volt">{t("v.notices.important")}</Pill>
          {formatDate(n.date)}
        </span>

        <span data-card-title className="mt-4 block text-[22px] font-bold leading-[1.45] tracking-[-0.025em] text-neutral-950 sm:text-2xl">{n.title}</span>
        <span className="mt-3 line-clamp-3 text-sm leading-relaxed text-neutral-600">{n.summary}</span>

        {points.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {points.map((b) => (
              <li key={b} className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] leading-relaxed text-neutral-600">
                {b}
              </li>
            ))}
          </ul>
        )}

        <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-[14px] font-medium text-volt-400">
          {t("v.notices.detail")}
          <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </button>
  );
}

export default function Notices() {
  const { t, lang } = useLang();
  const { notices, openEntry } = useContent();
  const [cat, setCat] = useState<string>("전체");
  const [showAll, setShowAll] = useState(false);

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
    <section id="notices" className="scroll-mt-20 py-14 sm:py-20">
      <div className="shell">
        <Reveal>
          <SectionHeader eyebrow="01 / UPDATES" title={t("nav.notices")} sub={t("v.notices.sub")} />
        </Reveal>

        {!notices.length ? (
          <p className="mt-10 text-[14px] text-neutral-500">{t("v.notices.empty")}</p>
        ) : (
          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_1.55fr] lg:gap-8">
            <Reveal>
              <Featured n={featured} onOpen={() => openEntry(featured)} />
            </Reveal>

            <Reveal delay={80} className="rounded-2xl border border-neutral-200 bg-white p-3 sm:p-4">
              {categories.length > 2 && (
                <Tabs
                  label={t("nav.notices")}
                  value={cat}
                  onChange={(value) => { setCat(value); setShowAll(false); }}
                  items={categories.map((c) => ({ id: c, label: c === "전체" ? t("v.search.all") : categoryLabel(c, lang) }))}
                />
              )}
              <ul className="mt-2 divide-y divide-black/[0.06]">
                {(showAll ? list : list.slice(0, 5)).map((n) => (
                  <NoticeRow key={n.id} n={n} onOpen={() => openEntry(n)} />
                ))}
              </ul>
              {list.length > 5 && <button type="button" data-notices-more onClick={() => setShowAll((value) => !value)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 py-3 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50">{showAll ? t("home.noticesLess") : `${t("home.noticesMore")} (${list.length - 5})`}<IconArrow className="size-3.5" /></button>}
              {list.length === 0 && <p className="py-10 text-center text-[14px] text-neutral-500">{t("v.notices.empty")}</p>}
            </Reveal>
          </div>
        )}
      </div>
    </section>
  );
}
