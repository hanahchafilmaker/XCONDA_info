import { GhostButton, IconSearch, Reveal, VoltButton } from "./volt";
import { useLang } from "../i18n";

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

export default function Hero({ onSearch }: { onSearch: () => void }) {
  const { t } = useLang();

  return (
    <section id="top" className="relative pt-32 pb-4 sm:pt-40 sm:pb-8">
      {/* 단일 은은한 글로우 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(50%_60%_at_50%_0%,rgba(255,214,10,0.08),transparent)]"
      />

      <div className="shell">
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <p className="text-[13px] font-semibold text-volt-400">{t("v.hero.badge")}</p>

          <h1 className="text-balance-tight mt-5 text-[2.3rem] font-bold leading-[1.15] text-white sm:text-[3.2rem]">
            {t("v.hero.lead")}
            <br />
            <span className="text-zinc-400">{t("v.hero.accent")}</span>
          </h1>

          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-zinc-400">{t("v.hero.desc")}</p>

          <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <VoltButton onClick={() => scrollTo("guides")} icon className="w-full sm:w-auto">
              {t("v.hero.cta1")}
            </VoltButton>
            <GhostButton onClick={onSearch} className="w-full sm:w-auto">
              <IconSearch className="h-4 w-4" />
              {t("v.hero.cta2")}
            </GhostButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
