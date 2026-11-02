import { ArrowDown, ArrowUpRight, FileText, Search, Sparkles } from "lucide-react";
import { useLang } from "../i18n";
import { useContent } from "../content/ContentContext";

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
  const featured = sections.filter((section) => section.entries.length).slice(0, 3);

  return (
    <section id="top" className="relative isolate overflow-hidden pb-14 pt-32 sm:pb-20 sm:pt-36 lg:pb-24 lg:pt-40">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_12%_8%,rgba(248,210,83,.20),transparent_34%),radial-gradient(ellipse_at_90%_35%,rgba(135,111,220,.12),transparent_32%)]" />
      <div className="shell">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-14">
          <div className="max-w-2xl text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-50 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-amber-900 shadow-sm sm:text-xs">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="notranslate">XCONDA HUB</span>
              <span aria-hidden="true" className="text-amber-700/50">·</span>
              {total} {t("v.search.all") === "전체" ? "자료" : "RESOURCES"}
            </p>
            <h1 className="mt-6 text-[40px] font-semibold leading-[1.12] tracking-[-0.055em] text-neutral-950 sm:text-[54px] lg:text-[64px]">
              {t("v.hero.lead")}<br /><span className="text-volt-300">{t("v.hero.accent")}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-[1.75] text-neutral-600 sm:text-[18px] lg:mx-0">{t("v.hero.desc")}</p>

            <form className="mt-8" role="search" onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              onSearch(String(data.get("query") ?? ""));
            }}>
              <label className="group flex min-h-[62px] items-center gap-3 rounded-2xl border border-black/[0.08] bg-white px-4 text-left shadow-[0_12px_40px_rgba(38,31,15,.09)] transition-all focus-within:border-amber-400 focus-within:shadow-[0_14px_44px_rgba(38,31,15,.13)] sm:px-5">
                <Search className="h-5 w-5 shrink-0 text-neutral-500" aria-hidden="true" />
                <input name="query" aria-label={t("v.search.placeholder")} placeholder={t("v.search.placeholder")} className="min-w-0 flex-1 bg-transparent py-4 text-[15px] text-black outline-none placeholder:text-neutral-400 sm:text-base" />
                <kbd className="hidden rounded-md border border-black/10 bg-neutral-50 px-2 py-1 text-[11px] font-medium text-neutral-500 sm:inline-block">⌘ K</kbd>
                <button type="submit" aria-label={t("v.nav.search")} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-950 text-white transition-colors hover:bg-amber-500 hover:text-neutral-950" title={t("v.nav.search")}>
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </label>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[12px] text-neutral-500 lg:justify-start sm:text-[13px]">
                <span className="mr-1">{t("v.search.all")}:</span>
                {["FLEXBOARD", "Seedance 2.5", "Turn", t("nav.tools")].map((keyword) => (
                  <button type="button" key={keyword} onClick={() => onSearch(keyword)} className="rounded-full border border-black/[0.08] bg-white/75 px-3 py-1.5 transition-colors hover:border-amber-400 hover:bg-amber-50 hover:text-neutral-950">{keyword}</button>
                ))}
              </div>
            </form>
          </div>

          <div className="relative mx-auto w-full max-w-[540px] lg:mx-0 lg:ml-auto">
            <div aria-hidden="true" className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-gradient-to-br from-amber-200/50 via-white/20 to-violet-200/60 blur-2xl" />
            <div className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/90 p-4 shadow-[0_24px_80px_rgba(43,34,20,.13)] backdrop-blur sm:p-5">
              <div className="flex items-center justify-between border-b border-neutral-100 px-1 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-800"><Sparkles className="h-4 w-4" /></span>
                  <span>
                    <span className="block text-[13px] font-semibold text-neutral-900">XCONDA HUB</span>
                    <span className="mt-0.5 block text-[11px] text-neutral-500">{total} {t("v.search.all") === "전체" ? "개의 자료" : "resources"}</span>
                  </span>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700">● LIVE</span>
              </div>
              <div className="px-1 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{t("v.search.all") === "전체" ? "빠른 탐색" : "QUICK DISCOVER"}</div>
              <div className="space-y-2">
                {featured.map((section, index) => (
                  <a key={section.id} href={`#${section.id}`} className="group flex items-center gap-3 rounded-xl border border-transparent p-3 transition-all hover:border-amber-200 hover:bg-amber-50/70">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${index === 0 ? "bg-amber-100 text-amber-800" : index === 1 ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"}`}>
                      <FileText className="h-[17px] w-[17px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-medium text-neutral-500">{section.label} · {section.count}</span>
                      <span className="mt-0.5 block truncate text-[14px] font-semibold text-neutral-900 group-hover:text-amber-900">{section.entries[0].title}</span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-neutral-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-amber-700" />
                  </a>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-neutral-950 px-4 py-3.5 text-white">
                <span className="text-[12px] text-white/75">{t("v.hero.desc")}</span>
                <a href="#notices" className="ml-3 inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2 text-[11px] font-semibold text-neutral-950 transition-colors hover:bg-amber-300">
                  {t("nav.notices")}<ArrowDown className="h-3 w-3" />
                </a>
              </div>
            </div>
            <div className="absolute -right-2 -top-4 hidden rounded-2xl border border-white/80 bg-white px-3.5 py-2.5 shadow-lg sm:block lg:-right-5">
              <span className="block text-[10px] font-medium text-neutral-500">{t("nav.tools")}</span>
              <span className="mt-0.5 block text-[13px] font-semibold text-neutral-900">{guides.length} <span className="text-amber-700">↗</span></span>
            </div>
          </div>
        </div>

        <nav aria-label={t("nav.primary")} className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-2 sm:grid-cols-3 lg:mt-16 lg:grid-cols-5">
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="group flex min-h-[68px] items-center justify-between rounded-xl border border-black/[0.07] bg-white/70 px-4 text-left transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:bg-white hover:shadow-md">
              <span>
                <span className="block text-[13px] font-medium text-neutral-800">{section.label}</span>
                <span className="mt-1 block text-[11px] text-neutral-500">{section.count} {t("v.search.all") === "전체" ? "항목" : "items"}</span>
              </span>
              <ArrowDown className="h-4 w-4 text-neutral-400 transition-transform group-hover:translate-y-0.5 group-hover:text-amber-700" />
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}
