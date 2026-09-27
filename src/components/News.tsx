import { useMemo, useState } from "react";
import type { Entry } from "../content/types";
import { CHANNELS } from "../content/channels";
import { useContent } from "../content/ContentContext";
import { formatDate, isNew } from "../notion";
import { categoryLabel, changeLabel, useLang } from "../i18n";
import { IconArrow, IconExternal, Pill, Reveal, SectionHeader, Tabs } from "./volt";
import { SyncStatus } from "./common";

const PAGE = 5;

/** Notion Category(또는 Tags)에서 이 글이 어느 채널 소식인지 찾아냅니다. */
function channelOf(entry: Entry): string | undefined {
  const cat = (entry.category ?? "").toLowerCase();
  const hit = CHANNELS.find((c) => [c.id, c.name.toLowerCase()].includes(cat));
  if (hit) return hit.id;
  const tag = (entry.tags ?? []).map((t) => t.toLowerCase()).find((t) => CHANNELS.some((c) => c.id === t));
  return tag;
}

function NewsItem({ item, onOpen }: { item: Entry; onOpen: () => void }) {
  const { t, lang } = useLang();
  const channel = CHANNELS.find((c) => c.id === channelOf(item));
  const Icon = channel?.Icon;

  return (
    <article className="grid gap-2 py-7 sm:grid-cols-[160px_1fr] sm:gap-8">
      <div className="flex items-center gap-2 text-[13px] text-zinc-500 sm:flex-col sm:items-start sm:gap-1.5 sm:pt-1">
        <time>{formatDate(item.date)}</time>
        {channel ? (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-zinc-400">
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {channel.name}
          </span>
        ) : (
          item.version && <span className="font-mono text-[12px] text-zinc-600">{item.version}</span>
        )}
      </div>

      <button onClick={onOpen} className="group min-w-0 text-left">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[17px] font-semibold leading-snug text-zinc-100 transition-colors group-hover:text-white">
            {item.title}
          </span>
          {isNew(item.date) && <Pill tone="volt">NEW</Pill>}
          {item.url && <IconExternal className="h-3.5 w-3.5 text-zinc-600" />}
        </span>
        <span className="mt-2 block text-[14.5px] leading-relaxed text-zinc-400">{item.summary}</span>

        <span className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-zinc-500">
          {item.category && <span>{categoryLabel(item.category, lang)}</span>}
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-white/[0.05] px-2 py-0.5">
              #{tag}
            </span>
          ))}
        </span>

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
          {t("v.news.readMore")}
          <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </button>
    </article>
  );
}

/** 타 SNS/외부 채널 바로가기 카드 */
function ChannelCard({ channel }: { channel: (typeof CHANNELS)[number] }) {
  const { t } = useLang();
  const { Icon } = channel;
  const body = (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.06] text-zinc-200">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[14px] font-semibold text-white">{channel.name}</span>
          <span className="truncate font-mono text-[11.5px] text-zinc-500">{channel.handle}</span>
        </span>
        <span className="mt-1 block text-[13px] leading-relaxed text-zinc-500">{t(channel.descKey)}</span>
      </span>
      {channel.href ? (
        <IconExternal className="h-4 w-4 shrink-0 text-zinc-600" />
      ) : (
        <span className="shrink-0 rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] font-semibold text-zinc-500">
          {t("v.news.soon")}
        </span>
      )}
    </>
  );
  const cls =
    "flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-ink-900 p-4 text-left transition-colors hover:border-white/20";

  return channel.href ? (
    <a href={channel.href} target="_blank" rel="noopener noreferrer" className={cls}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export default function News() {
  const { t, lang } = useLang();
  const { news, openEntry } = useContent();
  const [cat, setCat] = useState<string>("전체");
  const [showAll, setShowAll] = useState(false);

  const categories = useMemo(() => ["전체", ...new Set(news.map((n) => n.category).filter(Boolean))], [news]);

  const list = useMemo(
    () => news.filter((n) => (cat === "전체" ? true : n.category === cat)),
    [news, cat],
  );
  const visible = showAll ? list : list.slice(0, PAGE);

  return (
    <section id="news" className="scroll-mt-20 border-t border-white/[0.06] py-20 sm:py-24">
      <div className="shell">
        <Reveal>
          <SectionHeader
            title={t("nav.news")}
            sub={t("v.news.sub")}
            action={
              <div aria-label={t("v.news.syncAria")}>
                <SyncStatus />
              </div>
            }
          />
        </Reveal>

        <div className="mt-10 grid gap-10 lg:grid-cols-[7fr_5fr] lg:gap-12">
          {/* 소식 피드 */}
          <div className="min-w-0">
            {!news.length ? (
              <p className="text-[14px] text-zinc-500">{t("v.news.empty")}</p>
            ) : (
              <Reveal delay={60}>
                {categories.length > 2 && (
                  <Tabs
                    label={t("nav.news")}
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

                <div className="mt-2 divide-y divide-white/[0.06] border-b border-white/[0.06]">
                  {visible.map((n) => (
                    <NewsItem key={n.id} item={n} onOpen={() => openEntry(n)} />
                  ))}
                </div>

                {list.length > PAGE && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={() => setShowAll((v) => !v)}
                      className="rounded-full border border-white/12 px-5 py-2 text-[14px] font-medium text-zinc-300 transition-colors hover:border-white/25 hover:text-white"
                    >
                      {showAll ? t("v.news.less") : `${t("v.news.more")} (${list.length - PAGE})`}
                    </button>
                  </div>
                )}
              </Reveal>
            )}
          </div>

          {/* 타 SNS 채널 */}
          <Reveal delay={120}>
            <div className="lg:sticky lg:top-24">
              <h3 className="text-[15px] font-semibold text-white">{t("v.news.channels")}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-500">{t("v.news.channelsSub")}</p>
              <div className="mt-4 grid gap-3">
                {CHANNELS.map((c) => (
                  <ChannelCard key={c.id} channel={c} />
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
