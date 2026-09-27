import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";
import {
  IconClose,
  IconMenu,
  IconSearch,
  Logo,
} from "@/components/ui";

const links = [
  { id: "notices", label: "공지사항", en: "Notices" },
  { id: "guides", label: "툴 사용법", en: "Guides" },
  { id: "news", label: "AI 뉴스", en: "AI News" },
  { id: "faq", label: "FAQ", en: "FAQ" },
];

export default function Nav({ onSearch }: { onSearch: () => void }) {
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
      for (const l of links) {
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
          scrolled
            ? "border-b border-white/[0.07] bg-ink-950/80 backdrop-blur-xl"
            : "border-b border-transparent",
        )}
      >
        <div className="shell flex h-16 items-center justify-between gap-4">
          <Logo />

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <button
                key={l.id}
                onClick={() => go(l.id)}
                className={cn(
                  "group relative rounded-full px-4 py-2 text-[13px] font-bold transition-colors duration-300",
                  active === l.id ? "text-volt-400" : "text-zinc-400 hover:text-white",
                )}
              >
                {l.label}
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
              <span className="hidden text-[12px] font-semibold sm:inline">통합 검색</span>
              <kbd className="hidden rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 lg:inline">
                ⌘K
              </kbd>
            </button>
            <a
              href="https://www.xconda.ai"
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-full bg-volt-400 px-4 py-2 text-[12.5px] font-extrabold text-ink-950 transition-all duration-300 hover:shadow-[0_10px_34px_-8px_rgba(255,214,10,0.8)] sm:inline-flex"
            >
              XCONDA 열기
            </a>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="메뉴"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-zinc-300 md:hidden"
            >
              {open ? <IconClose className="h-4 w-4" /> : <IconMenu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="relative h-px w-full bg-white/[0.06]">
          <div
            className="absolute inset-y-0 left-0 bg-volt-400 transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
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
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => go(l.id)}
              className="flex items-center justify-between border-b border-white/[0.06] py-3.5 text-left last:border-0"
            >
              <span className="text-[15px] font-bold text-white">{l.label}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                {l.en}
              </span>
            </button>
          ))}
          <a
            href="https://www.xconda.ai"
            target="_blank"
            rel="noreferrer"
            className="mt-3 rounded-full bg-volt-400 py-3 text-center text-[13px] font-extrabold text-ink-950"
          >
            XCONDA 열기
          </a>
        </div>
      </div>
    </>
  );
}
