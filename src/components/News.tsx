import { useMemo, useState } from "react";
import { Play } from "lucide-react";
import type { Entry } from "../content/types";
import { CHANNELS, IconGlobe } from "../content/channels";
import { channelFromUrl } from "../content/classify";
import { useContent } from "../content/ContentContext";
import { formatDate, isNew } from "../notion";
import { categoryLabel, changeLabel, useLang } from "../i18n";
import { IconArrow, IconExternal, Pill, Reveal, SectionHeader, Tabs } from "./volt";
import { SmartImage, SyncStatus, youtubeId } from "./common";

const PAGE = 5;

/** Notion Category(또는 Tags)에서 이 글이 어느 채널 소식인지 찾아냅니다. */
function channelOf(entry: Entry): string | undefined {
  const cat = (entry.category ?? "").toLowerCase();
  const hit = CHANNELS.find((c) => [c.id, c.name.toLowerCase()].includes(cat));
  if (hit) return hit.id;
  const tag = (entry.tags ?? []).map((t) => t.toLowerCase()).find((t) => CHANNELS.some((c) => c.id === t));
  if (tag) return tag;
  // Category 를 비워 두어도 Link 주소로 채널을 알아냅니다 (x.com → X, youtu.be → YouTube …)
  return channelFromUrl(entry.url);
}

/** 원문 링크 호스트 이름 — Notion 본체 링크는 칩을 만들지 않습니다(원본 DB 주소 노출 금지). */
function sourceHostOf(url?: string): string {
  if (!url || !/^https?:/i.test(url)) return "";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return /(^|\.)notion\.(so|site)$/i.test(host) ? "" : host;
  } catch {
    return "";
  }
}

function NewsItem({ item, onOpen }: { item: Entry; onOpen: () => void }) {
  const { t, lang } = useLang();
  const channel = CHANNELS.find((c) => c.id === channelOf(item));
  const Icon = channel?.Icon;
  // 이미지 없이도 비어 보이지 않도록: 커버 → OG 이미지 → YouTube 썸네일(실제 영상 주소일 때)
  const ytId = item.url ? youtubeId(item.url) : null;
  const thumbSrc =
    item.cover ?? item.ogImage ?? (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : undefined);
  const sourceHost = sourceHostOf(item.url);
  // 이미지가 하나도 없으면 채널 아이콘 타일(그라데이션)로 채웁니다.
  const TileIcon = Icon ?? IconGlobe;

  return (
    <article className="grid gap-2 py-7 sm:grid-cols-[160px_1fr] sm:gap-8">
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-neutral-500 sm:flex-col sm:items-start sm:gap-1.5 sm:pt-1">
        <time>{formatDate(item.date)}</time>
        {channel ? (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-500">
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {channel.name}
          </span>
        ) : (
          item.version && <span className="font-mono text-[12px] text-neutral-500">{item.version}</span>
        )}
        {/* 원문 기사로 바로 여는 칩 — 버튼 안에 넣으면 링크가 버튼으로 가려서 바깥에 둡니다 */}
        {sourceHost && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${t("v.news.sourceLink")}: ${sourceHost}`}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-black/10 px-2 py-0.5 text-[11.5px] text-neutral-500 transition-colors hover:border-black/25 hover:text-black"
          >
            <span className="truncate">{sourceHost}</span>
            <IconExternal className="h-3 w-3 shrink-0" />
          </a>
        )}
      </div>

      <button onClick={onOpen} className="group flex w-full min-w-0 gap-4 text-left sm:gap-5">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[17px] font-medium leading-snug text-neutral-950 transition-colors group-hover:text-black">
              {item.title}
            </span>
            {isNew(item.date) && <Pill tone="volt">NEW</Pill>}
            {ytId && <span className="sr-only">{t("v.news.play")}</span>}
          </span>
          <span className="mt-2 block text-[14.5px] leading-relaxed text-neutral-500">{item.summary}</span>

          <span className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-neutral-500">
            {item.category && <span>{categoryLabel(item.category, lang)}</span>}
            {item.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-black/[0.05] px-2 py-0.5">
                #{tag}
              </span>
            ))}
          </span>

          {item.changes && item.changes.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {item.changes.slice(0, 3).map((c, i) => (
                <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-neutral-700">
                  <span className="w-14 shrink-0 text-[13px] text-neutral-500">{changeLabel(c.kind, lang)}</span>
                  <span className="min-w-0">{c.text}</span>
                </li>
              ))}
            </ul>
          )}

          <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-neutral-500 transition-colors group-hover:text-volt-400">
            {t("v.news.readMore")}
            <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </span>

        {/* 썸네일 — 이미지가 있으면 실물, 없으면 채널 아이콘 타일, 영상 링크면 재생 배지 */}
        <span className="relative block aspect-[16/9] w-[104px] shrink-0 self-start overflow-hidden sm:w-36 lg:w-44">
          {thumbSrc ? (
            <SmartImage
              src={thumbSrc}
              fallbackSrc={item.coverFallback}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <span
              data-news-tile
              className="grid h-full w-full place-items-center bg-gradient-to-br from-volt-400/18 via-volt-500/10 to-ink-800"
            >
              <TileIcon className="h-7 w-7 text-black/30" aria-hidden />
            </span>
          )}
          {ytId && (
            <span aria-hidden className="absolute inset-0 grid place-items-center">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/40 backdrop-blur-sm">
                <Play className="h-3.5 w-3.5 fill-white text-white" />
              </span>
            </span>
          )}
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
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.06] text-neutral-800">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[14px] font-medium text-black">{channel.name}</span>
          <span className="truncate font-mono text-[11.5px] text-neutral-500">{channel.handle}</span>
        </span>
        <span className="mt-1 block text-[13px] leading-relaxed text-neutral-500">{t(channel.descKey)}</span>
      </span>
      {channel.href ? (
        <IconExternal className="h-4 w-4 shrink-0 text-neutral-500" />
      ) : (
        <span className="shrink-0 rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-medium text-neutral-500">
          {t("v.news.soon")}
        </span>
      )}
    </>
  );
  const cls =
    "flex w-full items-center gap-3 rounded-none border border-black/[0.08] bg-ink-900 p-4 text-left transition-colors hover:border-black/20";

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
    <section id="news" className="scroll-mt-20 border-t border-black/[0.06] py-20 sm:py-24">
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
              <p className="text-[14px] text-neutral-500">{t("v.news.empty")}</p>
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

                <div className="mt-2 divide-y divide-black/[0.06] border-b border-black/[0.06]">
                  {visible.map((n) => (
                    <NewsItem key={n.id} item={n} onOpen={() => openEntry(n)} />
                  ))}
                </div>

                {list.length > PAGE && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={() => setShowAll((v) => !v)}
                      className="rounded-full border border-black/12 px-5 py-2 text-[14px] font-medium text-neutral-700 transition-colors hover:border-black/25 hover:text-black"
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
              <h3 className="text-[15px] font-medium text-black">{t("v.news.channels")}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-neutral-500">{t("v.news.channelsSub")}</p>
              <div className="mt-4 grid gap-3">
                {CHANNELS.filter((c) => c.id !== "notion").map((c) => (
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
