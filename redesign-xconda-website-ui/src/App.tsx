import { useEffect, useState } from "react";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Notices from "@/components/Notices";
import Guides from "@/components/Guides";
import News from "@/components/News";
import Closing from "@/components/Closing";
import SearchOverlay from "@/components/SearchOverlay";
import { Marquee } from "@/components/ui";
import { news, notices } from "@/data/content";

export default function App() {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const tickerItems = [
    ...notices.slice(0, 5).map((n) => `공지 · ${n.title}`),
    ...news.slice(0, 3).map((n) => `AI 뉴스 · ${n.title}`),
  ];

  return (
    <div className="grain relative min-h-screen overflow-x-hidden bg-ink-950">
      <Nav onSearch={() => setSearchOpen(true)} />

      <main>
        <Hero onSearch={() => setSearchOpen(true)} />

        {/* brand + ticker divider */}
        <div className="relative mt-16 border-y border-white/[0.06] sm:mt-20">
          <div className="mask-fade-x overflow-hidden py-7">
            <div className="flex min-w-max animate-marquee-slow items-center gap-8">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="flex items-center gap-8">
                  <span className="brand-word whitespace-nowrap">XCONDA GUIDE CENTER</span>
                  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-volt-400" fill="currentColor">
                    <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2Z" />
                  </svg>
                </span>
              ))}
            </div>
          </div>
          <div className="border-t border-white/[0.06] bg-ink-900/40 py-3">
            <Marquee items={tickerItems} speed="slow" />
          </div>
        </div>

        <Notices />
        <Guides />
        <News />
      </main>

      <Closing />

      {/* floating search (mobile) */}
      <button
        onClick={() => setSearchOpen(true)}
        className="fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-volt-400 text-ink-950 shadow-[0_14px_40px_-8px_rgba(255,214,10,0.8)] transition-transform duration-300 hover:scale-105 active:scale-95 sm:hidden"
        aria-label="검색"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
      </button>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
