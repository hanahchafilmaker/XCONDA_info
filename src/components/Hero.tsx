import { GhostButton, Highlight, IconArrow, Pill, Reveal, VoltButton } from "./volt";
import { useLang } from "../i18n";

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

export default function Hero({ onSearch }: { onSearch: () => void }) {
  const { t } = useLang();

  return (
    <section id="top" className="relative overflow-hidden pt-28 pb-6 sm:pt-36 sm:pb-10">
      {/* backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-18rem] h-[36rem] w-[36rem] -translate-x-1/2 animate-drift rounded-full bg-volt-400/[0.13] blur-[130px]" />
        <div className="absolute right-[-10rem] top-40 h-[26rem] w-[26rem] animate-drift rounded-full bg-volt-600/10 blur-[120px] [animation-delay:-8s]" />
        <div className="hatch absolute inset-x-0 top-0 h-64 opacity-40" />
        <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-b from-transparent to-ink-950" />
      </div>

      <div className="shell">
        <Reveal className="flex flex-col items-start gap-5">
          <Pill tone="volt" className="py-1.5 pl-2 pr-3">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-volt-400" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-volt-400" />
            </span>
            {t("v.hero.badge")}
          </Pill>

          <h1 className="text-balance-tight max-w-[16ch] text-[2.5rem] font-extrabold leading-[1.06] text-white sm:text-[3.5rem] lg:text-[4.2rem]">
            {t("v.hero.lead")}
            <br />
            <Highlight>{t("v.hero.accent")}</Highlight>
          </h1>

          <p className="max-w-xl text-[15px] leading-relaxed text-zinc-400 sm:text-base">{t("v.hero.desc")}</p>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <VoltButton onClick={() => scrollTo("guides")} icon>
              {t("v.hero.cta1")}
            </VoltButton>
            <GhostButton onClick={onSearch}>
              <IconArrow className="h-4 w-4" />
              {t("v.hero.cta2")}
            </GhostButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
