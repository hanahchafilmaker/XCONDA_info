import { useMemo, useState } from "react";
import type { Entry } from "../content/types";
import { useContent } from "../content/ContentContext";
import { formatDate, isNew } from "../notion";
import { categoryLabel, changeLabel, useLang } from "../i18n";
import { SyncStatus } from "./common";
import { IconArrow, Pill, Reveal, SectionHeader, Tabs } from "./volt";

const PAGE = 5;

function UpdateItem({ item, onOpen }: { item: Entry; onOpen: () => void }) {
  const { t, lang } = useLang();
  return (
    <article className="grid gap-2 py-7 sm:grid-cols-[160px_1fr] sm:gap-8">
      <div className="flex items-center gap-2 text-[13px] text-zinc-500 sm:flex-col sm:items-start sm:gap-1.5 sm:pt-1">
        <time>{formatDate(item.date)}</time>
        {item.version && <span className="font-mono text-[12px] text-zinc-600">{item.version}</span>}
      </div>

      <button onClick={onOpen} className="group min-w-0 text-left">
        <span className="flex items-center gap-2">
          <span className="text-[17px] font-semibold leading-snug text-zinc-100 transition-colors group-hover:text-white">
            {item.title}
          </span>
          {isNew(item.date) && <Pill tone="volt">NEW</Pill>}
        </span>
        <span className="mt-2 block text-[14.5px] leading-relaxed text-zinc-400">{item.summary}</span>

        {item.changes && item.changes.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {item.changes.slice(0, 3).map((c, i) => (
              <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-zinc-300">
                <span className="w-14 shrink-0 text-[13px] text-zinc-500">{changeLabel(c.kind, lang)}</span>
                <span className="min-w-0">{c.text}</span>
              </li>
            ))}
          </ul>
        )}

        <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-zinc-400 transition-colors group-hover:text-volt-400">
          {t("v.updates.readMore")}
          <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </button>
    </article>
  );
}

export default function Updates() {
  const { t, lang } = useLang();
  const { updates, openEntry } = useContent();
  const [cat, setCat] = useState<string>("전체");
  const [showAll, setShowAll] = useState(false);

  const categories = useMemo(() => ["전체", ...new Set(updates.map((n) => n.category))], [updates]);

  const list = useMemo(
    () => updates.filter((n) => (cat === "전체" ? true : n.category === cat)),
    [updates, cat],
  );
  const visible = showAll ? list : list.slice(0, PAGE);

  return (
    <section id="updates" className="scroll-mt-20 border-t border-white/[0.06] py-20 sm:py-24">
      <div className="shell">
        <Reveal>
          <SectionHeader
            title={t("nav.updates")}
            sub={t("v.updates.sub")}
            action={
              <div aria-label={t("v.updates.syncAria")}>
                <SyncStatus />
              </div>
            }
          />
        </Reveal>

        {!updates.length ? (
          <p className="mt-10 text-[14px] text-zinc-500">{t("v.updates.empty")}</p>
        ) : (
          <Reveal delay={60} className="mt-8">
            {categories.length > 2 && (
              <Tabs
                label={t("nav.updates")}
                value={cat}
                onChange={(c) => {
                  setCat(c);
                  setShowAll(false);
                }}
                items={categories.map((c) => ({ id: c, label: c === "전체" ? t("v.search.all") : categoryLabel(c, lang) }))}
              />
            )}

            <div className="mt-2 divide-y divide-white/[0.06] border-b border-white/[0.06]">
              {visible.map((n) => (
                <UpdateItem key={n.id} item={n} onOpen={() => openEntry(n)} />
              ))}
            </div>

            {list.length > PAGE && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="rounded-full border border-white/12 px-5 py-2 text-[14px] font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
                >
                  {showAll ? t("v.updates.less") : `${t("v.updates.more")} (${list.length - PAGE})`}
                </button>
              </div>
            )}
          </Reveal>
        )}
      </div>
    </section>
  );
}
