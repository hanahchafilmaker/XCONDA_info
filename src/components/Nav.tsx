import { useEffect, useState } from "react";
import { cn } from "../utils/cn";
import { IconClose, IconMenu, IconSearch, Logo } from "./volt";
import { SyncButton } from "./common";
import { STUDIO_URL } from "../content/tools";
import { useLang } from "../i18n";

const LINKS = [
  { id: "notices", label: { ko: "공지사항", en: "Notices" } },
  { id: "news", label: { ko: "뉴스", en: "News" } },
  { id: "guides", label: { ko: "툴 사용법", en: "Guides" } },
  { id: "blog", label: { ko: "블로그", en: "Blog" } },
  { id: "faq", label: { ko: "Q&A", en: "Q&A" } },
];

function LangToggle({ className, full }: { className?: string; full?: boolean }) {
  const { t, lang, setLang } = useLang();
  return (
    <div className={cn("items-center rounded-full bg-white/[0.05] p-0.5", className)} role="group" aria-label={t("v.lang.toggleAria")}>
      {(["ko", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            "rounded-full px-2.5 py-1 text-[12px] font-semibold uppercase transition-colors",
            full && "flex-1 py-2",
            lang === l ? "bg-white/[0.12] text-white" : "text-zinc-500 hover:text-white",
          )}
        >
          {l}
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
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300",
          scrolled || open ? "border-white/[0.06] bg-ink-950/85 backdrop-blur-xl" : "border-transparent",
        )}
      >
        <div className="shell flex h-16 items-center justify-between gap-6">
          <div className="flex items-center gap-10">
            <Logo />
            <nav className="hidden items-center gap-1 md:flex" aria-label={t("nav.primary")}>
              {LINKS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => go(l.id)}
                  aria-current={active === l.id ? "true" : undefined}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[14px] font-medium transition-colors",
                    active === l.id ? "text-white" : "text-zinc-400 hover:text-white",
                  )}
                >
                  {l.label[lang]}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* 수동 동기화 버튼 — 상단 내비게이션 (연결 없으면 자동으로 숨김) */}
            <SyncButton
              className="h-9 px-2.5 text-zinc-400 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
              labelClass="hidden text-[13px] font-medium lg:inline"
            />
            <button
              onClick={onSearch}
              className="flex h-9 items-center gap-2 rounded-full px-2.5 text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <IconSearch className="h-[18px] w-[18px]" />
              <span className="sr-only lg:not-sr-only lg:text-[13px] lg:font-medium">{t("v.nav.search")}</span>
            </button>

            <LangToggle className="hidden sm:flex" />

            <a
              href={STUDIO_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden h-9 items-center rounded-full bg-volt-400 px-4 text-[13px] font-bold text-ink-950 transition-colors hover:bg-volt-300 sm:inline-flex"
            >
              {t("v.nav.open")}
            </a>

            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={t("v.nav.menu")}
              aria-expanded={open}
              className="grid h-9 w-9 place-items-center rounded-full text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white md:hidden"
            >
              {open ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* mobile drawer */}
      <div
        className={cn(
          "fixed inset-x-0 top-16 z-40 border-b border-white/[0.06] bg-ink-950/95 backdrop-blur-xl transition-all duration-200 md:hidden",
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
        )}
      >
        <div className="shell flex flex-col py-2">
          {LINKS.map((l) => (
            <button key={l.id} onClick={() => go(l.id)} className="py-3 text-left text-[16px] font-semibold text-white">
              {l.label[lang]}
            </button>
          ))}
          <div className="mt-2 flex items-center gap-2 border-t border-white/[0.06] pt-4 pb-2">
            <LangToggle className="flex flex-1" full />
            <a
              href={STUDIO_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-volt-400 px-5 py-2.5 text-center text-[14px] font-bold text-ink-950"
            >
              {t("v.nav.open")}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
