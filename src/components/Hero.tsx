import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, FileText, Megaphone, MessageCircle, Newspaper, Search } from "lucide-react";
import { useLang } from "../i18n";
import { useContent } from "../content/ContentContext";
import { SmartImage } from "./common";
import { hubBase } from "../seo";

/** A real search entry and guide shortcut, not a decorative product mock-up. */
export default function Hero({ onSearch }: { onSearch: (query?: string) => void }) {
  const { t } = useLang();
  const { notices, news, blogs, faqs, openTool } = useContent();
  const sections = [
    { id: "notices", label: t("nav.notices"), description: t("home.noticesHint"), Icon: Megaphone, count: notices.length },
    { id: "news", label: t("nav.news"), description: t("home.newsHint"), Icon: Newspaper, count: news.length },
    { id: "guides", label: t("nav.tools"), description: t("home.guidesHint"), Icon: BookOpen },
    { id: "blog", label: t("nav.blog"), description: t("home.blogHint"), Icon: FileText, count: blogs.length },
    { id: "faq", label: t("nav.qna"), description: t("home.faqHint"), Icon: MessageCircle, count: faqs.length },
  ];

  return (
    <section id="top" data-home-design="minimal" className="bg-white pb-10 pt-28 sm:pb-14 sm:pt-36">
      <div className="shell">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div>
            <p className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">
              <span className="size-2 rounded-sm bg-volt-500" aria-hidden />
              <span className="notranslate">XCONDA RESOURCE HUB</span>
            </p>
            <h1 className="mt-6 text-[36px] font-bold leading-[1.23] tracking-[-0.055em] text-neutral-950 sm:text-[52px] lg:text-[54px]">
              {t("home.title")}<br /><span className="text-neutral-500">{t("home.titleTail")}</span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-[1.8] text-neutral-600 sm:text-base">{t("home.description")}</p>

            <form className="mt-8 flex items-center gap-3 rounded-xl border border-neutral-300 bg-white p-2 pl-4 shadow-[0_3px_12px_rgba(0,0,0,0.03)] transition focus-within:border-neutral-800 focus-within:ring-2 focus-within:ring-neutral-200" role="search"
              onSubmit={(event) => { event.preventDefault(); onSearch(String(new FormData(event.currentTarget).get("query") ?? "")); }}>
              <Search className="size-5 shrink-0 text-neutral-500" aria-hidden />
              <input name="query" aria-label={t("v.search.placeholder")} placeholder={t("home.searchPlaceholder")} className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-neutral-950 outline-none placeholder:text-neutral-500 focus-visible:outline-none" />
              <button type="submit" aria-label={t("v.nav.search")} className="grid size-11 shrink-0 place-items-center rounded-lg bg-neutral-950 text-white transition hover:bg-neutral-700"><ArrowRight className="size-5" aria-hidden /></button>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
              <span className="text-neutral-500">{t("home.quickSearch")}</span>
              {["FLEXBOARD", "Seedance 2.5", "Turn"].map((keyword) => <button type="button" key={keyword} onClick={() => onSearch(keyword)} className="rounded-md bg-neutral-100 px-2.5 py-1.5 font-medium text-neutral-700 transition hover:bg-neutral-200">{keyword}</button>)}
            </div>
          </div>

          <button type="button" data-featured-guide onClick={() => openTool("flexboard")} aria-haspopup="dialog"
            className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-[0_12px_40px_-24px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1 hover:border-neutral-400 hover:shadow-[0_20px_40px_-24px_rgba(0,0,0,0.3)]">
            <span className="relative block overflow-hidden bg-neutral-950">
              <SmartImage src={`${hubBase()}assets/img/tools/tool-flexboard.jpg`} loading="eager" alt="" className="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
              <span className="absolute left-5 top-5 rounded-md bg-volt-500 px-2.5 py-1 text-[11px] font-semibold text-neutral-950">{t("home.startHere")}</span>
            </span>
            <span className="block p-6">
              <span className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-neutral-500"><span className="notranslate">FLEXBOARD GUIDE</span><span>{t("home.stepByStep")}</span></span>
              <span className="mt-3 flex items-center justify-between gap-4"><span className="text-xl font-bold tracking-tight text-neutral-950">{t("home.featuredTitle")}</span><ArrowUpRight className="size-5 shrink-0 text-neutral-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden /></span>
              <span className="mt-2 block text-sm leading-relaxed text-neutral-600">{t("home.featuredDescription")}</span>
            </span>
          </button>
        </div>

        <div className="mb-4 mt-12 flex items-center gap-2 text-xs font-medium text-neutral-500 sm:mt-16"><ArrowDown className="size-3.5" aria-hidden />{t("home.explore")}</div>
        <nav data-hub-hero-nav aria-label={t("home.explore")} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {sections.map(({ id, label, description, Icon, count }) => (
            <a key={id} href={`#${id}`} className="group rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-400 hover:bg-neutral-50 sm:p-5">
              <span className="flex items-center justify-between"><Icon className="size-5 text-neutral-600" strokeWidth={1.5} aria-hidden /><ArrowUpRight className="size-3.5 text-neutral-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden /></span>
              <span className="mt-5 flex items-center gap-2 text-sm font-semibold text-neutral-950">{label}{count !== undefined && <span className="font-mono text-[10px] font-normal text-neutral-500">{String(count).padStart(2, "0")}</span>}</span>
              <span className="mt-1 block text-xs leading-relaxed text-neutral-500">{description}</span>
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}
