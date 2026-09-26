import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Languages, Menu, Search, X } from "lucide-react";
import { ButtonLink, Container, Logo } from "./ui";
import { useLang } from "../i18n";
import { cn } from "../utils/cn";

const links = [
  { href: "#notices", key: "nav.notices" },
  { href: "#updates", key: "nav.updates" },
  { href: "#start", key: "nav.start" },
  { href: "#tools", key: "nav.tools" },
  { href: "#credits", key: "nav.credits" },
  { href: "#faq", key: "nav.faq" },
];
const STUDIO = "https://www.xconda.ai";

function LangToggle({ className }: { className?: string }) {
  const { lang, toggle } = useLang();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={lang === "ko" ? "Change language to English" : "언어를 한국어로 변경"}
      title={lang === "ko" ? "English" : "한국어"}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white",
        className
      )}
    >
      <Languages className="h-4 w-4" />
      <span className="font-semibold">{lang === "ko" ? "EN" : "한국어"}</span>
    </button>
  );
}

export default function Navbar() {
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = links
      .map((l) => document.querySelector(l.href))
      .filter((el): el is Element => Boolean(el));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(`#${e.target.id}`);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "transition-all duration-500 ease-out",
          scrolled ? "pt-3" : "pt-5"
        )}
      >
        <Container>
          <nav
            aria-label="Primary"
            className={cn(
              "flex h-14 items-center justify-between rounded-full pl-4 pr-2 transition-all duration-500 ease-out sm:pl-5",
              scrolled
                ? "glass-strong shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)]"
                : "border border-transparent bg-transparent"
            )}
          >
            <a href="#top" aria-label={t("nav.home")} className="flex items-center gap-2 rounded-full">
              <Logo />
              <span className="rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[11px] font-semibold text-zinc-300 ring-1 ring-inset ring-white/10">Guide</span>
            </a>

            <ul className="hidden items-center gap-1 lg:flex">
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className={cn(
                      "relative rounded-full px-4 py-2 text-sm transition-colors duration-300",
                      active === l.href ? "text-white" : "text-zinc-400 hover:text-white"
                    )}
                  >
                    {active === l.href && (
                      <span aria-hidden className="absolute inset-0 rounded-full bg-white/[0.07] ring-1 ring-inset ring-white/10" />
                    )}
                    <span className="relative">{t(l.key)}</span>
                  </a>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("guide-search") as HTMLInputElement | null;
                  el?.scrollIntoView({ block: "center", behavior: "smooth" });
                  setTimeout(() => el?.focus(), 350);
                }}
                aria-label={t("nav.search")}
                className="hidden h-9 items-center gap-2 rounded-full px-3 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white md:inline-flex"
              >
                <Search className="h-4 w-4" />
                <kbd className="font-mono text-[11px] text-zinc-500">⌘K</kbd>
              </button>
              <LangToggle className="hidden sm:inline-flex" />
              <ButtonLink href={STUDIO} target="_blank" rel="noopener noreferrer" size="sm" className="hidden sm:inline-flex">
                {t("nav.openStudioShort")}
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </ButtonLink>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls="mobile-menu"
                aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
                className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/10 lg:hidden"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </nav>
        </Container>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={cn(
          "fixed inset-x-0 top-0 -z-10 h-dvh bg-ink-950/90 backdrop-blur-2xl transition-all duration-500 ease-out lg:hidden",
          open ? "visible opacity-100" : "invisible opacity-0"
        )}
      >
        <Container className="flex h-full flex-col pb-10 pt-28">
          <ul className="flex flex-col gap-1">
            {links.map((l, i) => (
              <li
                key={l.href}
                className={cn(
                  "transition-all duration-500 ease-out",
                  open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                )}
                style={{ transitionDelay: open ? `${80 + i * 50}ms` : "0ms" }}
              >
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between border-b border-white/5 py-5 text-2xl font-medium tracking-tight text-white"
                >
                  {t(l.key)}
                  <ArrowRight className="h-5 w-5 text-zinc-500" />
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-col gap-3">
            <div className="flex justify-center pb-1">
              <LangToggle className="border border-white/10" />
            </div>
            <ButtonLink href={STUDIO} target="_blank" rel="noopener noreferrer" size="lg" onClick={() => setOpen(false)}>
              {t("common.openStudioTop")} <ArrowUpRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="#support" variant="secondary" size="lg" onClick={() => setOpen(false)}>
              {t("common.contact")}
            </ButtonLink>
          </div>
        </Container>
      </div>
    </header>
  );
}
