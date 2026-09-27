import { cn } from "../utils/cn";
import { STUDIO_URL } from "../content/tools";
import { useLang } from "../i18n";
import { Pill, Reveal, SectionHeader } from "./volt";

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
    <section id="credits" className="scroll-mt-20 border-t border-white/[0.06] py-20 sm:py-24">
      <div className="shell">
        <Reveal>
          <SectionHeader title={t("nav.credits")} sub={t("v.credits.sub")} />
        </Reveal>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PACKS.map((p, i) => {
            const save = Math.round((1 - perK(p) / base) * 100);
            return (
              <Reveal key={p.name} delay={i * 50} className="h-full">
                <article
                  className={cn(
                    "flex h-full flex-col rounded-2xl border bg-ink-900 p-5",
                    p.popular ? "border-volt-400/60" : "border-white/[0.08]",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[14px] font-semibold text-zinc-300">{p.name}</h3>
                    {p.popular && <Pill tone="volt">{t("v.credits.popular")}</Pill>}
                  </div>
                  <p className="mt-4 text-[2rem] font-bold tabular-nums leading-none tracking-[-0.03em] text-white">
                    ${p.price.toFixed(2)}
                  </p>
                  <p className="mt-2 text-[14px] font-medium text-zinc-300">
                    {p.credits.toLocaleString()} {t("v.credits.unit")}
                  </p>
                  <p className="mt-3 flex-1 text-[13px] leading-relaxed text-zinc-500">{t(p.descKey)}</p>
                  <p className="mt-4 text-[12.5px] text-zinc-500">
                    ${perK(p).toFixed(2)} / {t("v.credits.perK")}
                    {save > 0 && (
                      <span className="text-emerald-400">
                        {" "}
                        · {save}% {t("v.credits.save")}
                      </span>
                    )}
                  </p>
                  <a
                    href={STUDIO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "mt-4 inline-flex h-10 items-center justify-center rounded-full text-[14px] font-semibold transition-colors",
                      p.popular
                        ? "bg-volt-400 text-ink-950 hover:bg-volt-300"
                        : "bg-white/[0.06] text-white hover:bg-white/[0.1]",
                    )}
                  >
                    {t("v.credits.buy")}
                  </a>
                </article>
              </Reveal>
            );
          })}
        </div>

        <p className="mt-6 text-[13.5px] leading-relaxed text-zinc-500">
          <span className="font-semibold text-zinc-300">{t("v.credits.noteTitle")}</span> — {t("v.credits.note")}
        </p>
      </div>
    </section>
  );
}
