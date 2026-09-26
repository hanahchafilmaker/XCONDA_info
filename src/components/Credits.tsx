import { ArrowUpRight, Coins, Info, Sparkles } from "lucide-react";
import { Container, Reveal, SectionHeading, Serif, trackSpotlight } from "./ui";
import { useLang } from "../i18n";
import { STUDIO_URL } from "../content/tools";
import { cn } from "../utils/cn";

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
  const { t, pick } = useLang();
  return (
    <section id="credits" className="relative py-20 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Credits"
          title={<>{t("credits.titleKo")} <Serif className="text-gradient font-normal">Pricing</Serif></>}
          description={t("credits.desc")}
        />

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PACKS.map((p, i) => {
            const save = Math.round((1 - perK(p) / base) * 100);
            return (
              <Reveal key={p.name} delay={i * 70} className="h-full">
                <article
                  onMouseMove={trackSpotlight}
                  className={cn(
                    "spotlight relative flex h-full flex-col rounded-3xl p-6 transition-all duration-500 hover:-translate-y-1",
                    p.popular
                      ? "gradient-border bg-gradient-to-b from-violet-500/[0.14] via-fuchsia-500/[0.05] to-transparent shadow-[0_30px_80px_-40px_rgba(236,72,153,0.6)]"
                      : "border border-white/[0.08] bg-white/[0.02] hover:border-white/15"
                  )}
                >
                  {p.popular && (
                    <span className="bg-brand mb-4 inline-flex items-center gap-1 self-start rounded-full px-2.5 py-1 text-[11px] font-semibold text-white">
                      <Sparkles className="h-3 w-3" /> Most Popular
                    </span>
                  )}
                  <h3 className="text-sm font-semibold text-white">{p.name}</h3>
                  <p className="mt-4 flex items-baseline gap-0.5">
                    <span className="text-lg text-zinc-400">$</span>
                    <span className="text-4xl font-bold tabular-nums tracking-[-0.04em] text-white">{p.price.toFixed(2)}</span>
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-200">
                    <Coins className="h-4 w-4 text-amber-300" />
                    {p.credits.toLocaleString()} {t("credits.unit")}
                  </p>
                  <p className="mt-3 flex-1 text-xs leading-relaxed text-zinc-500">{t(p.descKey)}</p>
                  <div className="mt-5 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-zinc-500">${perK(p).toFixed(2)} / 1K</span>
                    {save > 0 && <span className="rounded-full bg-emerald-400/12 px-2 py-0.5 font-semibold text-emerald-300">{pick(`${save}% 절약`, `Save ${save}%`)}</span>}
                  </div>
                  <a
                    href={STUDIO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "mt-5 inline-flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition active:scale-95",
                      p.popular ? "bg-white text-ink-950 hover:shadow-[0_10px_30px_-8px_rgba(236,72,153,0.7)]" : "bg-white/[0.06] text-white ring-1 ring-inset ring-white/10 hover:bg-white/10"
                    )}
                  >
                    {t("credits.buy")} <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={150} className="mt-4">
          <div className="glass flex flex-col gap-3 rounded-2xl p-5 text-sm text-zinc-400 sm:flex-row sm:items-center">
            <Info className="h-4 w-4 shrink-0 text-sky-300" />
            <p>
              {t("credits.notePre")}
              <strong className="font-semibold text-zinc-200">{t("credits.noteStrong")}</strong>
              {t("credits.notePost")}
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
