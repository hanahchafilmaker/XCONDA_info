import { useMemo, useState } from "react";
import type { Entry } from "../content/types";
import { useContent } from "../content/ContentContext";
import { formatDate, isNew } from "../notion";
import { categoryLabel, useLang } from "../i18n";
import { IconArrow, Pill, Reveal, SectionHeader, Tabs } from "./volt";
import { SmartImage } from "./common";

const PAGE = 6;

function BlogCard({ item, onOpen }: { item: Entry; onOpen: () => void }) {
  const { t, lang } = useLang();
  return (
    <article className="h-full">
      <button
        onClick={onOpen}
        className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900 text-left transition-colors hover:border-white/20"
      >
        <span className="block aspect-[16/9] w-full overflow-hidden">
          <SmartImage
            src={item.cover}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </span>

        <span className="flex flex-1 flex-col p-5">
          <span className="flex items-center gap-2 text-[12.5px] text-zinc-500">
            {item.category && <span className="font-semibold text-volt-400">{categoryLabel(item.category, lang)}</span>}
            <span aria-hidden>·</span>
            <time>{formatDate(item.date)}</time>
            {isNew(item.date) && <Pill tone="volt">NEW</Pill>}
          </span>

          <span className="mt-2.5 block text-[16.5px] font-semibold leading-snug text-zinc-100 transition-colors group-hover:text-white">
            {item.title}
          </span>
          <span className="mt-2 line-clamp-2 block text-[14px] leading-relaxed text-zinc-400">{item.summary}</span>

          {item.tags.length > 0 && (
            <span className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[11.5px] text-zinc-500">
                  #{tag}
                </span>
              ))}
            </span>
          )}

          <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[13.5px] font-semibold text-zinc-400 transition-colors group-hover:text-volt-400">
            {t("v.blog.read")}
            <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </span>
      </button>
    </article>
  );
}

export default function Blog() {
  const { t, lang } = useLang();
  const { blogs, openEntry } = useContent();
  const [cat, setCat] = useState<string>("전체");
  const [showAll, setShowAll] = useState(false);

  const categories = useMemo(
    () => ["전체", ...new Set(blogs.map((b) => b.category).filter(Boolean))],
    [blogs],
  );

  const list = useMemo(
    () => blogs.filter((b) => (cat === "전체" ? true : b.category === cat)),
    [blogs, cat],
  );
  const visible = showAll ? list : list.slice(0, PAGE);

  return (
    <section id="blog" className="scroll-mt-20 border-t border-white/[0.06] py-20 sm:py-24">
      <div className="shell">
        <Reveal>
          <SectionHeader title={t("nav.blog")} sub={t("v.blog.sub")} />
        </Reveal>

        {!blogs.length ? (
          <p className="mt-10 text-[14px] text-zinc-500">{t("v.blog.empty")}</p>
        ) : (
          <Reveal delay={60} className="mt-8">
            {categories.length > 2 && (
              <Tabs
                label={t("nav.blog")}
                value={cat}
                onChange={(c) => {
                  setCat(c);
                  setShowAll(false);
                }}
                items={categories.map((c) => ({
                  id: c,
                  label: c === "전체" ? t("v.search.all") : categoryLabel(c, lang),
                }))}
              />
            )}

            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((b, i) => (
                <Reveal key={b.id} delay={Math.min(i, 5) * 50} className="h-full">
                  <BlogCard item={b} onOpen={() => openEntry(b)} />
                </Reveal>
              ))}
            </div>

            {list.length > PAGE && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="rounded-full border border-white/12 px-5 py-2 text-[14px] font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
                >
                  {showAll ? t("v.blog.less") : `${t("v.blog.more")} (${list.length - PAGE})`}
                </button>
              </div>
            )}
          </Reveal>
        )}
      </div>
    </section>
  );
}
