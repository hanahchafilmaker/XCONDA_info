import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Notices from "./components/Notices";
import Changelog from "./components/Changelog";
import Guides from "./components/Guides";
import Tools from "./components/Tools";
import Credits from "./components/Credits";
import FAQ from "./components/FAQ";
import CTA from "./components/CTA";
import Footer from "./components/Footer";
import ArticleModal from "./components/ArticleModal";
import { ContentProvider } from "./content/ContentContext";
import { useLang } from "./i18n";

function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setP(h > 0 ? window.scrollY / h : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-[2px]">
      <div className="bg-brand h-full origin-left" style={{ transform: `scaleX(${p})` }} />
    </div>
  );
}

const Divider = () => <div aria-hidden className="mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-white/10 to-transparent" />;

export default function App() {
  const { t } = useLang();
  return (
    <ContentProvider>
      <div className="relative min-h-screen overflow-x-clip">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink-950"
        >
          {t("a11y.skip")}
        </a>
        <ScrollProgress />
        <Navbar />
        <main id="main">
          <Hero />
          <Notices />
          <Divider />
          <Changelog />
          <Divider />
          <Guides />
          <Tools />
          <Divider />
          <Credits />
          <FAQ />
          <CTA />
        </main>
        <Footer />
        <ArticleModal />
      </div>
    </ContentProvider>
  );
}
