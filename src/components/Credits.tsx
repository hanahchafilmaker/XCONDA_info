import { cn } from "../utils/cn";
import { STUDIO_URL } from "../content/tools";
import { useLang } from "../i18n";
import {
  GhostButton,
  Highlight,
  IconCoins,
  IconExternal,
  Pill,
  Reveal,
  SectionHeading,
  SectionLabel,
} from "./volt";

const PACKS = [
  { name: "Starter Pack V1", price: 6.9, credits: 2020, descKey: "pack.starter1.desc" },
  { name: "Starter Pack V2", price: 20.9, credits: 6200, descKey: "pack.starter2.desc" },
  { name: "Pro Pack V1", price: 34.9, credits: 10500, descKey: "pack.pro1.desc" },
  { name: "Pro Pack V2", price: 67.9, credits: 21500, descKey: "pack.pro2.desc", popular: true },
  { name: "Master Pack", price: 369.9, credits: 114000, descKey: "pack.master.desc" },
];

const perK = (p: (typeof PACKS)[number]) => (p.price / p.credits) * 1000;
const base = perK(PACKS[0]);

export default function Credits() {
  const { t } = useLang();

  return (
    <section id="credits" className="relative scroll-mt-24 border-t border-white/[0.06] py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-[24rem] w-[40rem] -translate-x-1/2 animate-drift rounded-full bg-volt-400/[0.06] blur-[130px]" />
      </div>

      <div className="shell">
        <Reveal>
          <SectionLabel index="04" title="CREDITS" kicker={t("v.credits.kicker")} />
          <SectionHeading
            sub={
              <>
                {t("v.credits.subA")}
                <span className="text-zinc-200">2,000 {t("credits.unit")}</span>
                {t("v.credits.subB")}
              </>
            }
          >
            {t("v.credits.lead")} <Highlight>{t("v.credits.accent")}</Highlight> {t("v.credits.accentTail")}
          </SectionHeading>
        </Reveal>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PACKS.map((p, i) => {
            const save = Math.round((1 - perK(p) / base) * 100);
            return (
              <Reveal key={p.name} delay={i * 70} className="h-full">
                <article
                  className={cn(
                    "group relative flex h-full flex-col rounded-2xl p-6 transition-all duration-500 hover:-translate-y-1",
                    p.popular
                      ? "border border-volt-400/40 bg-gradient-to-b from-volt-400/[0.14] to-transparent shadow-[0_30px_80px_-40px_rgba(255,214,10,0.55)]"
                      : "border border-white/[0.08] bg-ink-900/50 hover:border-white/20",
                  )}
                >
                  {p.popular && (
                    <Pill tone="volt" className="mb-4 self-start">
                      {t("v.credits.popular")}
                    </Pill>
                  )}
                  <h3 className="text-sm font-extrabold text-white">{p.name}</h3>
                  <p className="mt-4 flex items-baseline gap-0.5">
                    <span className="text-lg text-zinc-500">$</span>
                    <span className="text-4xl font-extrabold tabular-nums tracking-[-0.04em] text-white">{p.price.toFixed(2)}</span>
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-volt-300">
                    <IconCoins className="h-4 w-4" />
                    {p.credits.toLocaleString()} {t("v.credits.unit")}
                  </p>
                  <p className="mt-3 flex-1 text-xs leading-relaxed text-zinc-500">{t(p.descKey)}</p>
                  <div className="mt-5 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-zinc-500">
                      ${perK(p).toFixed(2)} / {t("v.credits.perK")}
                    </span>
                    {save > 0 && (
                      <span className="rounded-full bg-emerald-400/12 px-2 py-0.5 font-semibold text-emerald-300">
                        {save}% {t("v.credits.save")}
                      </span>
                    )}
                  </div>
                  <a
                    href={STUDIO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "mt-5 inline-flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-bold transition active:scale-95",
                      p.popular
                        ? "bg-volt-400 text-ink-950 hover:shadow-[0_10px_30px_-8px_rgba(255,214,10,0.7)]"
                        : "border border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.09]",
                    )}
                  >
                    {t("v.credits.buy")} <IconExternal className="h-3.5 w-3.5" />
                  </a>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={150} className="mt-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-volt-400/20 bg-volt-400/[0.05] p-5 text-sm text-zinc-400 sm:flex-row sm:items-center">
            <IconCoins className="h-4 w-4 shrink-0 text-volt-400" />
            <p>
              <strong className="font-semibold text-zinc-200">{t("v.credits.noteTitle")} · </strong>
              {t("v.credits.note")}
            </p>
          </div>
        </Reveal>

        <Reveal delay={200} className="mt-6 flex justify-center">
          <GhostButton href={STUDIO_URL} className="px-7 py-3">
            {t("common.contact")} <IconExternal className="h-4 w-4" />
          </GhostButton>
        </Reveal>
      </div>
    </section>
  );
}
