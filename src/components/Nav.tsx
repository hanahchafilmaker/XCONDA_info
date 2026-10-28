import { useEffect, useState } from "react";
import { cn } from "../utils/cn";
import { IconClose, IconMenu, IconSearch, Logo } from "./volt";
import { STUDIO_URL } from "../content/tools";
import { useLang } from "../i18n";

const LINKS = [
  { id: "notices", label: { ko: "공지사항", en: "Notices" } },
  { id: "news", label: { ko: "뉴스", en: "News" } },
  { id: "guides", label: { ko: "툴 사용법", en: "Guides" } },
  { id: "blog", label: { ko: "블로그", en: "Blog" } },
  { id: "faq", label: { ko: "Q&A", en: "Q&A" } },
];

const LANG_ITEMS = [
  { target: "ko", code: "KO", ariaKey: "lang.korean" },
  { target: "en", code: "EN", ariaKey: "lang.english" },
  { target: "ja", code: "JA", ariaKey: "lang.japanese" },
  { target: "zh-CN", code: "ZH", ariaKey: "lang.chinese" },
] as const;

function LangToggle({ className, full }: { className?: string; full?: boolean }) {
  const { t, target, setTarget } = useLang();
  return (
    <div className={cn("items-center rounded-full bg-black/[0.05] p-0.5", className)} role="group" aria-label={t("v.lang.toggleAria")}>
      {LANG_ITEMS.map((item) => (
        <button
          key={item.target}
          onClick={() => setTarget(item.target)}
          aria-pressed={target === item.target}
          title={t(item.ariaKey)}
          className={cn(
            "rounded-full px-2.5 py-1 text-[12px] font-medium uppercase transition-colors",
            full && "flex-1 py-2",
            target === item.target ? "bg-black/[0.12] text-black" : "text-neutral-500 hover:text-black",
          )}
        >
          {/* 언어 코드(KO/EN/JA/ZH)는 Google 번역기가 한글 단어(고→WHO, 인→IN, 안→AND)로
              오역하는 대상이므로, 툴 이름·로고와 동일하게 notranslate 로 보호합니다. */}
          <span className="notranslate">{item.code}</span>
        </button>
      ))}
    </div>
  );
}

export default function Nav({ onSearch }: { onSearch: () => void }) {
  const { t, lang } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      let current = "";
      for (const l of LINKS) {
        const el = document.getElementById(l.id);
        if (el && el.getBoundingClientRect().top <= 160) current = l.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <header data-hub-header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
          scrolled || open ? "border-black/[0.06] bg-ink-950/85 backdrop-blur-xl" : "border-black/10 bg-white/90 backdrop-blur-md",
        )}
      >
        <div className="shell flex h-16 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <Logo href="#top" />
            <nav data-hub-desktop-nav className="hidden shrink-0 items-center gap-1 xl:flex" aria-label={t("nav.primary")}>
              {LINKS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => go(l.id)}
                  aria-current={active === l.id ? "true" : undefined}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-1.5 text-[14px] font-medium transition-colors",
                    active === l.id ? "text-black" : "text-neutral-500 hover:text-black",
                  )}
                >
                  {l.label[lang]}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={onSearch}
              className="flex h-9 items-center gap-2 rounded-full px-2.5 text-neutral-500 transition-colors hover:bg-black/[0.06] hover:text-black"
            >
              <IconSearch className="h-[18px] w-[18px]" />
              <span className="sr-only xl:not-sr-only xl:text-[13px] xl:font-medium">{t("v.nav.search")}</span>
            </button>

            <LangToggle className="hidden sm:flex" />

            <a
              href={STUDIO_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden h-9 shrink-0 items-center whitespace-nowrap rounded-full bg-black px-4 text-[13px] font-medium text-white transition-colors hover:bg-neutral-800 sm:inline-flex"
            >
              {t("v.nav.open")}
            </a>

            <button
              onClick={() => setOpen((v) => !v)}
              data-hub-menu-toggle
              aria-label={t("v.nav.menu")}
              aria-expanded={open}
              className="grid h-9 w-9 place-items-center rounded-full text-neutral-700 transition-colors hover:bg-black/[0.06] hover:text-black xl:hidden"
            >
              {open ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* mobile drawer */}
      <div
        className={cn(
          "fixed inset-x-0 top-16 z-40 border-b border-black/[0.06] bg-ink-950/95 backdrop-blur-xl transition-all duration-200 xl:hidden",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        <div className="shell flex flex-col py-2">
          {LINKS.map((l) => (
            <button key={l.id} onClick={() => go(l.id)} className="py-3 text-left text-[16px] font-medium text-black">
              {l.label[lang]}
            </button>
          ))}
          <div className="mt-2 flex items-center gap-2 border-t border-black/[0.06] pt-4 pb-2">
            <LangToggle className="flex flex-1" full />
            <a
              href={STUDIO_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-black px-5 py-2.5 text-center text-[14px] font-medium text-white"
            >
              {t("v.nav.open")}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
