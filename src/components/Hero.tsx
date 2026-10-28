import { IconSearch, Reveal } from "./volt";
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

  return (
    <section id="top" className="relative pt-36 pb-16 lg:pt-44 lg:pb-24">
      <div className="shell">
        <Reveal className="mx-auto text-center">
          <p className="notranslate text-[13px] font-medium tracking-[0.14em] text-neutral-500">
            XCONDA HUB · {sections.reduce((sum, section) => sum + section.count, 0)} DOCUMENTS
          </p>
          <h1 className="mx-auto mt-6 max-w-4xl text-[40px] font-medium leading-[1.15] tracking-[-0.045em] text-black sm:text-[56px] lg:text-[68px]">
            {t("v.hero.lead")}<br />{t("v.hero.accent")}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.7] text-neutral-500 sm:text-[18px]">{t("v.hero.desc")}</p>
          <form className="mx-auto mt-12 max-w-xl" onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onSearch(String(data.get("query") ?? ""));
          }}>
            <div className="flex items-center gap-3 border-b border-black/20 pb-3 focus-within:border-black">
              <IconSearch className="h-5 w-5 shrink-0 text-neutral-500" />
              <input name="query" aria-label={t("v.hero.cta2")} placeholder={t("v.search.placeholder")} className="min-w-0 flex-1 bg-transparent text-[16px] text-black outline-none" />
              <button type="submit" aria-label={t("v.nav.search")} className="text-[13px] text-neutral-500 hover:text-black">↵</button>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] text-neutral-500">
              {["FLEXBOARD", "Seedance 2.5", "Turn", t("nav.tools")].map((keyword) => (
                <button type="button" key={keyword} onClick={() => onSearch(keyword)} className="hover:text-black">{keyword}</button>
              ))}
            </div>
          </form>
          <div className="mx-auto mt-16 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-black/10 pt-8">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="flex items-baseline gap-2 text-[14px] hover:opacity-60">
                {section.label}<span className="text-neutral-500">{section.count}</span>
              </a>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
