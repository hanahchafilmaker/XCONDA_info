import { useEffect, useState } from "react";
import { cn } from "../utils/cn";
import { IconClose, IconMenu, IconSearch, Logo } from "./volt";
import { STUDIO_URL } from "../content/tools";
import { useLang } from "../i18n";

const LINKS = [
  { id: "notices", label: { ko: "공지사항", en: "Notices" } },
  { id: "guides", label: { ko: "툴 사용법", en: "Guides" } },
  { id: "updates", label: { ko: "업데이트", en: "Updates" } },
  { id: "credits", label: { ko: "크레딧", en: "Credits" } },
  { id: "faq", label: { ko: "FAQ", en: "FAQ" } },
];

export default function Nav({ onSearch }: { onSearch: () => void }) {
  const { t, lang, setLang } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? Math.min(100, (y / h) * 100) : 0);

      let current = "";
      for (const l of LINKS) {
        const el = document.getElementById(l.id);
        if (el && el.getBoundingClientRect().top <= 220) current = l.id;
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
          "fixed inset-x-0 top-0 z-50 transition-all duration-500",
          scrolled ? "border-b border-white/[0.07] bg-ink-950/80 backdrop-blur-xl" : "border-b border-transparent",
        )}
      >
        <div className="shell flex h-16 items-center justify-between gap-4">
          <Logo />

          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <button
                key={l.id}
                onClick={() => go(l.id)}
                aria-current={active === l.id ? "true" : undefined}
                className={cn(
                  "group relative rounded-full px-4 py-2 text-[13px] font-bold transition-colors duration-300",
                  active === l.id ? "text-volt-400" : "text-zinc-400 hover:text-white",
                )}
              >
                {l.label[lang]}
                <span
                  className={cn(
                    "absolute inset-x-4 -bottom-0.5 h-px bg-volt-400 transition-transform duration-300",
                    active === l.id ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                  )}
                />
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={onSearch}
              className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-2 pl-3 pr-2 text-zinc-400 transition-all duration-300 hover:border-white/25 hover:text-white sm:pr-2.5"
            >
              <IconSearch className="h-4 w-4" />
              <span className="hidden text-[12px] font-semibold sm:inline">{t("v.nav.search")}</span>
              <kbd className="hidden rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 lg:inline">
                ⌘K
              </kbd>
            </button>

            <div className="hidden items-center rounded-full border border-white/10 p-0.5 sm:flex" role="group" aria-label={t("v.lang.toggleAria")}>
              {(["ko", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={cn(
                    "rounded-full px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-all duration-300",
                    lang === l ? "bg-volt-400 text-ink-950" : "text-zinc-500 hover:text-white",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>

            <a
              href={STUDIO_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-full bg-volt-400 px-4 py-2 text-[12.5px] font-extrabold text-ink-950 transition-all duration-300 hover:shadow-[0_10px_34px_-8px_rgba(255,214,10,0.8)] sm:inline-flex"
            >
              {t("v.nav.open")}
            </a>

            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={t("v.nav.menu")}
              aria-expanded={open}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-zinc-300 transition hover:text-white md:hidden"
            >
              {open ? <IconClose className="h-4 w-4" /> : <IconMenu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="relative h-px w-full bg-white/[0.06]">
          <div className="absolute inset-y-0 left-0 bg-volt-400 transition-[width] duration-150" style={{ width: `${progress}%` }} />
        </div>
      </header>

      {/* mobile drawer */}
      <div
        className={cn(
          "fixed inset-x-0 top-16 z-40 origin-top border-b border-white/[0.07] bg-ink-900/97 backdrop-blur-xl transition-all duration-300 md:hidden",
          open ? "pointer-events-auto scale-y-100 opacity-100" : "pointer-events-none scale-y-95 opacity-0",
        )}
      >
        <div className="shell flex flex-col py-3">
          {LINKS.map((l) => (
            <button
              key={l.id}
              onClick={() => go(l.id)}
              className="flex items-center justify-between border-b border-white/[0.06] py-3.5 text-left last:border-0"
            >
              <span className="text-[15px] font-bold text-white">{l.label[lang]}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">{l.label[lang === "ko" ? "en" : "ko"]}</span>
            </button>
          ))}

          <div className="mt-3 flex items-center gap-2">
            <div className="flex flex-1 items-center rounded-full border border-white/10 p-0.5" role="group" aria-label={t("v.lang.toggleAria")}>
              {(["ko", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={cn(
                    "flex-1 rounded-full py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-all duration-300",
                    lang === l ? "bg-volt-400 text-ink-950" : "text-zinc-500",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <a
              href={STUDIO_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-volt-400 px-5 py-2.5 text-center text-[13px] font-extrabold text-ink-950"
            >
              {t("v.nav.open")}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
