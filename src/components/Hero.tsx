import { ArrowDown, ArrowUpRight, Search } from "lucide-react";
import { useLang } from "../i18n";
import { useContent } from "../content/ContentContext";

export default function Hero({ onSearch }: { onSearch: (query?: string) => void }) {
  const { t } = useLang();
  const { notices, news, guides, blogs, faqs } = useContent();
  const sections = [
    { id: "notices", label: t("nav.notices"), count: notices.length },
    { id: "news", label: t("nav.news"), count: news.length },
    { id: "guides", label: t("nav.tools"), count: guides.length },
    { id: "blog", label: t("nav.blog"), count: blogs.length },
    { id: "faq", label: t("nav.qna"), count: faqs.length },
  ];
  const total = sections.reduce((sum, section) => sum + section.count, 0);

  return (
    <section id="top" className="relative overflow-hidden pb-16 pt-32 sm:pb-20 sm:pt-40 lg:pt-44">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-16 -z-10 h-[28rem] w-[52rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.055),transparent_68%)]" />
      <div className="shell">
        <div className="mx-auto max-w-4xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-50 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-amber-900 shadow-sm sm:text-xs">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="notranslate">XCONDA HUB</span>
            <span aria-hidden="true" className="text-neutral-300">/</span>
            {total} {t("v.search.all") === "전체" ? "자료" : "RESOURCES"}
          </p>
          <h1 className="mx-auto mt-7 max-w-4xl text-[40px] font-semibold leading-[1.12] tracking-[-0.055em] text-black sm:text-[58px] lg:text-[72px]">
            {t("v.hero.lead")}<br /><span className="text-volt-300">{t("v.hero.accent")}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[16px] leading-[1.75] text-neutral-600 sm:text-[18px]">{t("v.hero.desc")}</p>

          <form className="mx-auto mt-9 max-w-2xl" role="search" onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onSearch(String(data.get("query") ?? ""));
          }}>
            <label className="group flex min-h-[60px] items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 text-left shadow-[0_8px_32px_rgba(0,0,0,.06)] transition-all focus-within:border-black/30 focus-within:shadow-[0_12px_40px_rgba(0,0,0,.1)] sm:px-5">
              <Search className="h-5 w-5 shrink-0 text-neutral-500" aria-hidden="true" />
              <input name="query" aria-label={t("v.search.placeholder")} placeholder={t("v.search.placeholder")} className="min-w-0 flex-1 bg-transparent py-4 text-[15px] text-black outline-none placeholder:text-neutral-400 sm:text-base" />
              <kbd className="hidden rounded-md border border-black/10 bg-neutral-50 px-2 py-1 text-[11px] font-medium text-neutral-500 sm:inline-block">⌘ K</kbd>
              <button type="submit" aria-label={t("v.nav.search")} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black text-white transition-transform hover:scale-105" title={t("v.nav.search")}>
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </label>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[12px] text-neutral-500 sm:text-[13px]">
              <span className="mr-1">{t("v.search.all")}:</span>
              {["FLEXBOARD", "Seedance 2.5", "Turn", t("nav.tools")].map((keyword) => (
                <button type="button" key={keyword} onClick={() => onSearch(keyword)} className="rounded-full border border-black/[0.08] bg-white/70 px-3 py-1.5 transition-colors hover:border-black/20 hover:bg-white hover:text-black">{keyword}</button>
              ))}
            </div>
          </form>

          <nav aria-label={t("nav.primary")} className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-2 sm:mt-16 sm:grid-cols-3 lg:grid-cols-5">
            {sections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`} className="group flex min-h-[72px] items-center justify-between rounded-xl border border-black/[0.07] bg-white/70 px-4 text-left transition-all hover:-translate-y-0.5 hover:border-black/20 hover:bg-white hover:shadow-md">
                <span>
                  <span className="block text-[13px] font-medium text-neutral-800">{section.label}</span>
                  <span className="mt-1 block text-[11px] text-neutral-500">{section.count} {t("v.search.all") === "전체" ? "항목" : "items"}</span>
                </span>
                {index === 0 ? <ArrowDown className="h-4 w-4 text-neutral-400 transition-transform group-hover:translate-y-0.5" /> : <span className="text-[11px] text-neutral-400">↘</span>}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
