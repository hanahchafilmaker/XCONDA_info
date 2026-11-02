import { ArrowDown, ArrowUpRight, FileText, Search, Sparkles } from "lucide-react";
import { useLang } from "../i18n";
import { useContent } from "../content/ContentContext";
import { SmartImage } from "./common";

export default function Hero({ onSearch }: { onSearch: (query?: string) => void }) {
  const { t } = useLang();
  const { notices, news, guides, blogs, faqs } = useContent();
  const sections = [
    { id: "notices", label: t("nav.notices"), count: notices.length, entries: notices },
    { id: "news", label: t("nav.news"), count: news.length, entries: news },
    { id: "guides", label: t("nav.tools"), count: guides.length, entries: guides },
    { id: "blog", label: t("nav.blog"), count: blogs.length, entries: blogs },
    { id: "faq", label: t("nav.qna"), count: faqs.length, entries: faqs },
  ];
  const total = sections.reduce((sum, section) => sum + section.count, 0);
  const recent = sections.flatMap((section) => section.entries.slice(0, 1).map((entry) => ({ ...entry, section }))).slice(0, 4);

  return (
    <section id="top" className="relative isolate overflow-hidden pb-16 pt-32 sm:pt-36 lg:pb-20 lg:pt-40">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(195,180,255,.28),transparent_42%),radial-gradient(ellipse_at_6%_24%,rgba(255,222,139,.24),transparent_30%),linear-gradient(180deg,#faf8ff_0%,#fbfaf7_70%)]" />
      <div className="shell">
        <div className="mx-auto max-w-4xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-violet-800 shadow-sm sm:text-xs">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="notranslate">XCONDA HUB</span>
            <span className="text-violet-300" aria-hidden="true">·</span>
            {total} {t("v.search.all") === "전체" ? "개의 자료" : "resources"}
          </p>
          <h1 className="mx-auto mt-7 max-w-4xl text-[42px] font-semibold leading-[1.08] tracking-[-0.06em] text-neutral-950 sm:text-[60px] lg:text-[76px]">
            {t("v.hero.lead")}<br /><span className="bg-gradient-to-r from-violet-700 via-indigo-600 to-amber-600 bg-clip-text text-transparent">{t("v.hero.accent")}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-[1.75] text-neutral-600 sm:text-[18px]">{t("v.hero.desc")}</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => onSearch()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-neutral-950 px-5 text-[14px] font-semibold text-white shadow-lg shadow-violet-900/10 transition hover:-translate-y-0.5 hover:bg-violet-800">
              {t("v.nav.search")}<ArrowUpRight className="h-4 w-4" />
            </button>
            <a href="#notices" className="inline-flex h-11 items-center gap-2 rounded-xl border border-black/10 bg-white/80 px-5 text-[14px] font-semibold text-neutral-800 transition hover:border-violet-300 hover:bg-white">
              {t("nav.notices")}<ArrowDown className="h-4 w-4 text-violet-700" />
            </a>
          </div>
        </div>

        {/* A product-style preview, using live hub entries rather than a static screenshot. */}
        <div className="relative mx-auto mt-12 max-w-6xl sm:mt-16">
          <div aria-hidden="true" className="absolute -inset-x-8 -inset-y-8 -z-10 rounded-[3rem] bg-gradient-to-r from-violet-200/55 via-amber-100/55 to-sky-200/50 blur-2xl" />
          <div className="overflow-hidden rounded-[1.5rem] border border-white/90 bg-white/90 shadow-[0_30px_100px_rgba(47,34,79,.17)] backdrop-blur sm:rounded-[1.8rem]">
            <div className="flex h-12 items-center justify-between border-b border-neutral-100 bg-white/90 px-4 sm:px-6">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b67]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#f4c451]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#54c98b]" />
              </div>
              <span className="hidden text-[11px] font-medium tracking-wide text-neutral-400 sm:block">HUB.XCONDA.AI</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />LIVE</span>
            </div>

            <div className="grid min-h-[330px] lg:grid-cols-[220px_1fr]">
              <aside className="hidden border-r border-neutral-100 bg-[#fcfbff] p-5 lg:block">
                <div className="mb-6 flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-700 to-indigo-500 text-white"><Sparkles className="h-4 w-4" /></span>
                  <span className="text-[13px] font-bold tracking-tight text-neutral-900">XCONDA <span className="font-normal text-neutral-400">HUB</span></span>
                </div>
                <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[.16em] text-neutral-400">EXPLORE</p>
                <nav aria-label={t("nav.primary")} className="space-y-1">
                  {sections.map((section, index) => (
                    <a key={section.id} href={`#${section.id}`} className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-[12px] transition-colors ${index === 0 ? "bg-violet-100/80 font-semibold text-violet-900" : "text-neutral-600 hover:bg-neutral-100"}`}>
                      <span>{section.label}</span><span className="text-[10px] text-neutral-400">{section.count}</span>
                    </a>
                  ))}
                </nav>
                <div className="mt-7 rounded-xl bg-gradient-to-br from-violet-700 to-indigo-600 p-3.5 text-white">
                  <p className="text-[11px] font-semibold">{t("v.hero.lead")}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-white/75">{t("v.hero.desc")}</p>
                </div>
              </aside>

              <div className="min-w-0 p-4 sm:p-6 lg:p-7">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.15em] text-violet-600">YOUR CREATIVE DESK</p>
                    <h2 className="mt-1 text-[20px] font-semibold tracking-tight text-neutral-900 sm:text-[23px]">{t("v.hero.lead")} {t("v.hero.accent")}</h2>
                  </div>
                  <form className="flex h-10 w-full max-w-[300px] items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 transition focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100" role="search" onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    onSearch(String(data.get("query") ?? ""));
                  }}>
                    <Search className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                    <input name="query" aria-label={t("v.search.placeholder")} placeholder={t("v.search.placeholder")} className="min-w-0 flex-1 bg-transparent text-[12px] text-neutral-800 outline-none placeholder:text-neutral-400" />
                    <kbd className="hidden rounded border border-neutral-200 px-1.5 py-0.5 text-[9px] text-neutral-400 sm:inline">⌘ K</kbd>
                  </form>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {["FLEXBOARD", "Seedance 2.5", "Turn"].map((keyword) => (
                    <button type="button" key={keyword} onClick={() => onSearch(keyword)} className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[10px] font-medium text-neutral-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800">{keyword}</button>
                  ))}
                  <span className="ml-auto hidden items-center gap-1 text-[10px] text-neutral-400 sm:inline-flex"><FileText className="h-3 w-3" />{total} {t("v.search.all") === "전체" ? "개의 콘텐츠" : "items"}</span>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-neutral-900">{t("v.search.all") === "전체" ? "최근 업데이트" : "Recently updated"}</h3>
                  <a href="#news" className="text-[11px] font-medium text-violet-700 hover:text-violet-900">{t("v.search.all")} <ArrowUpRight className="inline h-3 w-3" /></a>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {recent.map((entry) => (
                    <a key={`${entry.section.id}-${entry.id}`} href={`#${entry.section.id}`} className="group flex min-w-0 items-center gap-3 rounded-xl border border-neutral-100 bg-white p-2.5 transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
                      {entry.cover ? (
                        <SmartImage src={entry.cover} fallbackSrc={entry.coverFallback} alt="" className="h-12 w-14 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <span className="grid h-12 w-14 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-100 via-amber-50 to-sky-100 text-violet-700"><FileText className="h-4 w-4" /></span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] font-medium text-violet-700">{entry.section.label}</span>
                        <span className="mt-0.5 block line-clamp-2 text-[11px] font-semibold leading-snug text-neutral-800 group-hover:text-violet-800">{entry.title}</span>
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-neutral-300 group-hover:text-violet-600" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div aria-hidden="true" className="absolute -bottom-5 left-[8%] hidden rounded-2xl border border-white bg-white/95 px-4 py-2.5 shadow-xl sm:block">
            <span className="flex items-center gap-2 text-[11px] font-medium text-neutral-700"><span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-100 text-amber-800"><Sparkles className="h-3.5 w-3.5" /></span>One hub. All your creative tools.</span>
          </div>
        </div>

        <nav aria-label={t("nav.primary")} className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-2 sm:grid-cols-3 lg:mt-16 lg:grid-cols-5">
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="group flex min-h-[68px] items-center justify-between rounded-xl border border-black/[0.07] bg-white/70 px-4 text-left transition-all hover:-translate-y-0.5 hover:border-violet-300 hover:bg-white hover:shadow-md">
              <span>
                <span className="block text-[13px] font-medium text-neutral-800">{section.label}</span>
                <span className="mt-1 block text-[11px] text-neutral-500">{section.count} {t("v.search.all") === "전체" ? "항목" : "items"}</span>
              </span>
              <ArrowDown className="h-4 w-4 text-neutral-400 transition-transform group-hover:translate-y-0.5 group-hover:text-violet-700" />
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}
