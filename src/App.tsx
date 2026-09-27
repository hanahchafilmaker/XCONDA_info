import { useEffect, useState } from "react";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Notices from "./components/Notices";
import News from "./components/News";
import Guides from "./components/Guides";
import Blog from "./components/Blog";
import Qna from "./components/Qna";
import Closing from "./components/Closing";
import SearchOverlay from "./components/SearchOverlay";
import ArticleModal from "./components/ArticleModal";
import { ContentProvider } from "./content/ContentContext";
import { useLang } from "./i18n";

export default function App() {
  const { t } = useLang();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <ContentProvider>
      <div className="relative min-h-screen overflow-x-hidden bg-ink-950">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-volt-400 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-ink-950"
        >
          {t("a11y.skip")}
        </a>

        <Nav onSearch={() => setSearchOpen(true)} />

        <main id="main">
          <Hero onSearch={() => setSearchOpen(true)} />
          {/* 섹션 순서: 공지사항 → 뉴스(타 SNS 정보) → 툴 사용법 → 블로그 → Q&A */}
          <Notices />
          <News />
          <Guides />
          <Blog />
          <Qna />
        </main>

        <Closing />

        <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
        <ArticleModal />
      </div>
    </ContentProvider>
  );
}
