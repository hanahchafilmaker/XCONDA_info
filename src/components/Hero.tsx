import { ArrowRight, BookOpen, FileText, Megaphone, MessageCircle, Newspaper, Search } from "lucide-react";
import { useLang } from "../i18n";
import { useContent } from "../content/ContentContext";
import { SmartImage } from "./common";
import { hubBase } from "../seo";

/** Neutral editorial homepage: real search and guide actions, no decorative backdrop. */
export default function Hero({ onSearch }: { onSearch: (query?: string) => void }) {
  const { t } = useLang();
  const { openTool } = useContent();
  const sections = [
    { id: "notices", label: t("nav.notices"), description: t("home.noticesHint"), Icon: Megaphone },
    { id: "news", label: t("nav.news"), description: t("home.newsHint"), Icon: Newspaper },
    { id: "guides", label: t("nav.tools"), description: t("home.guidesHint"), Icon: BookOpen },
    { id: "blog", label: t("nav.blog"), description: t("home.blogHint"), Icon: FileText },
    { id: "faq", label: t("nav.qna"), description: t("home.faqHint"), Icon: MessageCircle },
  ];

  return (
    <section id="top" data-home-design="neutral-editorial" className="bg-ink-950 pb-6 pt-28 sm:pb-8 sm:pt-32">
      <div className="shell">
        <div className="grid items-center gap-9 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="notranslate text-xs font-bold tracking-[0.12em] text-neutral-600">XCONDA RESOURCE HUB</p>
            <h1 className="mt-6 text-[36px] font-bold leading-[1.2] tracking-[-0.045em] text-neutral-950 sm:text-[50px] lg:text-[52px]">
              {t("home.title")}<br />{t("home.titleTail")}
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-[1.8] text-neutral-700 sm:text-base">{t("home.description")}</p>

            <form className="mt-7 flex items-stretch gap-2.5" role="search"
              onSubmit={(event) => { event.preventDefault(); onSearch(String(new FormData(event.currentTarget).get("query") ?? "")); }}>
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 shadow-sm transition focus-within:border-neutral-600 focus-within:ring-2 focus-within:ring-neutral-200">
                <Search className="size-5 shrink-0 text-neutral-500" aria-hidden />
                <input name="query" aria-label={t("v.search.placeholder")} placeholder={t("home.searchPlaceholder")} className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-neutral-950 outline-none placeholder:text-neutral-500 focus-visible:outline-none sm:text-base" />
              </div>
              <button type="submit" aria-label={t("v.nav.search")} className="grid w-12 shrink-0 place-items-center rounded-lg bg-volt-500 text-neutral-950 shadow-sm transition hover:bg-volt-200 sm:w-14"><ArrowRight className="size-5" aria-hidden /></button>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
              <span className="font-medium text-neutral-600">{t("home.quickSearch")}</span>
              {["Flex Board", "Seedance 2.5", "Turn"].map((keyword) => <button type="button" key={keyword} onClick={() => onSearch(keyword)} className="rounded-full bg-ink-850 px-3 py-1.5 font-medium text-neutral-700 transition hover:bg-neutral-200">{keyword}</button>)}
            </div>
          </div>

          <button type="button" data-featured-guide onClick={() => openTool("flexboard")} aria-haspopup="dialog"
            className="group overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 text-left shadow-[0_8px_28px_-12px_rgba(28,28,26,0.25)] transition duration-300 hover:border-neutral-400 hover:shadow-[0_12px_32px_-12px_rgba(28,28,26,0.3)]">
            <span className="relative block overflow-hidden rounded-lg bg-neutral-950">
              <SmartImage src={`${hubBase()}assets/img/tools/tool-flexboard.jpg`} loading="eager" alt="" className="block aspect-[16/9] w-full object-contain" />
              <span className="absolute left-3 top-3 rounded-full bg-volt-500 px-3 py-1 text-[11px] font-bold text-neutral-950">{t("home.startHere")}</span>
            </span>
            <span className="block px-3 pb-3 pt-4 sm:px-4 sm:pb-4">
              <span className="notranslate block text-[11px] font-semibold tracking-wider text-neutral-600">FLEX BOARD GUIDE</span>
              <span className="mt-2 flex items-center justify-between gap-4"><span className="text-xl font-bold tracking-tight text-neutral-950 sm:text-[22px]">{t("home.featuredTitle")}</span><ArrowRight className="size-6 shrink-0 text-neutral-800 transition group-hover:translate-x-1" aria-hidden /></span>
              <span className="mt-2 block text-sm leading-relaxed text-neutral-600">{t("home.featuredDescription")}</span>
            </span>
          </button>
        </div>

        <nav data-hub-hero-nav aria-label={t("home.explore")} className="hub-destinations mt-10 grid grid-cols-2 rounded-xl border border-neutral-200 bg-white p-2 shadow-[0_2px_3px_rgba(28,28,26,0.04)] sm:mt-12 sm:grid-cols-3 lg:grid-cols-5 lg:py-5">
          {sections.map(({ id, label, description, Icon }) => (
            <a key={id} href={`#${id}`} className="group flex min-w-0 flex-col items-center justify-center px-3 py-4 text-center transition-colors hover:bg-neutral-50 lg:py-1">
              <Icon className="size-6 text-neutral-800" strokeWidth={1.6} aria-hidden />
              <span className="mt-2.5 text-sm font-bold text-neutral-950">{label}</span>
              <span className="mt-1 block text-xs leading-relaxed text-neutral-600">{description}</span>
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}
