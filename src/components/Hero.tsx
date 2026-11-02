import { ArrowDown, ArrowRight, FileText, Search, Sparkles } from "lucide-react";
import { useLang } from "../i18n";
import { useContent } from "../content/ContentContext";
import { SmartImage } from "./common";

export default function Hero({ onSearch }: { onSearch: (query?: string) => void }) {
  const { t } = useLang();
  const { notices, news, guides, blogs, faqs, openEntry } = useContent();
  const sections = [
    { id: "notices", label: t("nav.notices"), entries: notices },
    { id: "news", label: t("nav.news"), entries: news },
    { id: "guides", label: t("nav.tools"), entries: guides },
    { id: "blog", label: t("nav.blog"), entries: blogs },
    { id: "faq", label: t("nav.qna"), entries: faqs },
  ];
  const recent = sections.flatMap((section) => section.entries.slice(0, 1).map((entry) => ({ entry, section }))).slice(0, 4);

  return (
    <section id="top" className="pixa-hero relative isolate overflow-hidden pb-20 pt-36 sm:pt-44 lg:pt-52">
      <div aria-hidden="true" className="pixa-dots pointer-events-none absolute inset-x-0 bottom-0 top-[350px] -z-10" />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-32 -z-10 h-48 w-48 -translate-x-1/2 rounded-full bg-[conic-gradient(from_90deg,#d8ccff,#c6f3f1,#f6d9ee,#d8ccff)] opacity-65 blur-[65px]" />
      <div className="shell">
        <div className="mx-auto flex min-h-[420px] max-w-5xl flex-col items-center justify-center text-center sm:min-h-[470px]">
          <h1 className="text-balance text-[39px] font-bold uppercase leading-[1.18] tracking-[-0.045em] text-black sm:text-[60px] lg:text-[76px]">
            {t("v.hero.lead")}<br />
            <span className="font-serif font-normal tracking-[-0.035em]">{t("v.hero.accent")}</span>
          </h1>
          <p className="mx-auto mt-8 max-w-[490px] text-[16px] leading-[1.65] text-neutral-700 sm:text-lg">{t("v.hero.desc")}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a href="#notices" className="inline-flex h-14 min-w-[165px] items-center justify-center gap-3 rounded-xl border border-black bg-white/70 px-6 text-sm font-medium text-black transition hover:bg-neutral-100">
              {t("nav.notices")} <ArrowDown className="h-4 w-4" />
            </a>
            <button type="button" onClick={() => onSearch()} className="inline-flex h-14 min-w-[165px] items-center justify-center gap-3 rounded-xl bg-black px-6 text-sm font-medium text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-neutral-800">
              {t("v.nav.search")} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl sm:mt-20">
          <div aria-hidden="true" className="absolute -inset-8 -z-10 rounded-full bg-[conic-gradient(from_90deg,#dbd0ff,#c9f1ee,#f2dbf3,#dbd0ff)] opacity-70 blur-3xl" />
          <div className="overflow-hidden rounded-xl border border-violet-200/80 bg-white shadow-[0_18px_55px_rgba(30,20,50,.12)]">
            <div className="grid min-h-[410px] md:grid-cols-[210px_1fr] lg:min-h-[500px]">
              <aside className="hidden border-r border-neutral-200 bg-[#f4f4f6] p-5 md:block">
                <div className="mb-9 flex items-center gap-2 text-sm font-bold"><Sparkles className="h-6 w-6" /> XCONDA HUB</div>
                <nav aria-label={t("nav.primary")} className="space-y-1">
                  {sections.map((section) => <a key={section.id} href={`#${section.id}`} className="flex items-center justify-between rounded-lg px-3 py-3 text-sm text-neutral-700 transition hover:bg-white"><span>{section.label}</span><span className="text-xs text-neutral-400">{section.entries.length}</span></a>)}
                </nav>
              </aside>
              <div className="flex min-w-0 flex-col items-center px-5 py-9 sm:px-10 sm:py-12">
                <Sparkles className="h-8 w-8 text-neutral-800" aria-hidden="true" />
                <h2 className="mt-3 text-center text-2xl font-medium tracking-tight sm:text-3xl">{t("v.hero.lead")}</h2>
                <p className="mt-2 text-center text-sm text-neutral-500">{t("v.hero.desc")}</p>
                <form className="mt-8 flex w-full max-w-xl items-center gap-3 rounded-xl border border-neutral-300 bg-white p-2 pl-4 shadow-sm focus-within:border-neutral-600" role="search" onSubmit={(event) => { event.preventDefault(); onSearch(String(new FormData(event.currentTarget).get("query") ?? "")); }}>
                  <Search className="h-5 w-5 shrink-0 text-neutral-400" aria-hidden="true" />
                  <input name="query" aria-label={t("v.search.placeholder")} placeholder={t("v.search.placeholder")} className="min-w-0 flex-1 bg-transparent py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400" />
                  <button type="submit" aria-label={t("v.nav.search")} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-black text-white transition hover:bg-neutral-700"><ArrowRight className="h-4 w-4" /></button>
                </form>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {["FLEXBOARD", "Seedance 2.5", "Turn"].map((keyword) => <button type="button" key={keyword} onClick={() => onSearch(keyword)} className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 transition hover:border-neutral-500 hover:text-black">{keyword}</button>)}
                </div>
                <div className="mt-9 grid w-full gap-3 sm:grid-cols-2">
                  {recent.map(({ entry, section }) => <button type="button" key={`${section.id}-${entry.id}`} onClick={() => openEntry(entry)} className="group flex min-w-0 items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left transition hover:border-neutral-400 hover:shadow-sm">
                    {entry.cover ? <SmartImage src={entry.cover} fallbackSrc={entry.coverFallback} alt="" className="h-11 w-12 shrink-0 rounded-lg object-cover" /> : <span className="grid h-11 w-12 shrink-0 place-items-center rounded-lg bg-neutral-100"><FileText className="h-4 w-4" /></span>}
                    <span className="min-w-0"><span className="block text-[11px] text-neutral-500">{section.label}</span><span className="mt-1 block line-clamp-1 text-xs font-semibold text-neutral-900">{entry.title}</span></span>
                  </button>)}
                </div>
              </div>
            </div>
          </div>
        </div>
        <nav aria-label={t("nav.primary")} className="mx-auto mt-16 flex max-w-4xl flex-wrap justify-center gap-x-8 gap-y-4 border-b border-neutral-200 pb-8">
          {sections.map((section) => <a key={section.id} href={`#${section.id}`} className="text-sm font-medium text-neutral-500 transition hover:text-black">{section.label} <span className="ml-1 text-xs text-neutral-400">{section.entries.length}</span></a>)}
        </nav>
      </div>
    </section>
  );
}
