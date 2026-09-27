import { useState } from "react";
import { cn } from "../utils/cn";
import type { Entry } from "../content/types";
import { useContent } from "../content/ContentContext";
import { TOOLS } from "../content/tools";
import { categoryLabel, useLang } from "../i18n";
import {
  GhostButton,
  Highlight,
  IconArrow,
  IconChevron,
  IconExternal,
  IconPlus,
  Logo,
  Reveal,
  SectionHeading,
  SectionLabel,
  VoltButton,
} from "./volt";

const STUDIO_URL = "https://www.xconda.ai";

function FaqItem({ f, index, onOpen }: { f: Entry; index: number; onOpen: () => void }) {
  const [open, setOpen] = useState(index === 0);
  const { t, lang } = useLang();

  return (
    <Reveal as="div" delay={index * 55}>
      <div
        className={cn(
          "overflow-hidden rounded-2xl border transition-all duration-500",
          open ? "border-volt-400/30 bg-volt-400/[0.04]" : "border-white/[0.07] bg-ink-900/50 hover:border-white/15",
        )}
      >
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
        >
          <span className={cn("font-mono text-[11px] font-bold transition-colors duration-300", open ? "text-volt-400" : "text-zinc-700")}>
            Q{String(index + 1).padStart(2, "0")}
          </span>
          <span className="flex-1 text-[14px] font-extrabold tracking-tight text-white sm:text-[15.5px]">{f.title}</span>
          <span
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-all duration-500",
              open ? "rotate-45 border-volt-400 bg-volt-400 text-ink-950" : "border-white/12 text-zinc-500",
            )}
          >
            <IconPlus className="h-3.5 w-3.5" />
          </span>
        </button>
        <div
          className="grid transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="px-5 pb-5 pl-[4.2rem] pr-6 sm:px-6 sm:pb-6 sm:pl-[4.9rem]">
              <p className="text-[13px] leading-[1.85] text-zinc-400">{f.summary}</p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-700">
                {categoryLabel(f.category, lang)}
              </p>
              <button
                onClick={onOpen}
                className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-zinc-400 transition-colors hover:text-volt-400"
              >
                {t("v.faq.full")} <IconArrow className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export default function Closing() {
  const { t, lang, setLang } = useLang();
  const { faqs, openEntry } = useContent();
  const footerTools = TOOLS.slice(0, 6);

  return (
    <>
      {/* FAQ */}
      <section id="faq" className="relative scroll-mt-24 border-t border-white/[0.06] py-20 sm:py-28">
        <div className="shell">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-14">
            <Reveal className="lg:sticky lg:top-28 lg:self-start">
              <SectionLabel index="05" title="FAQ" kicker={`${faqs.length}${t("v.faq.kicker")}`} />
              <SectionHeading
                sub={
                  <>
                    {t("v.faq.subA")} <span className="text-zinc-200">{t("v.faq.subStrong")}</span> 답장합니다.
                  </>
                }
              >
                {t("v.faq.lead")}
              </SectionHeading>

              <div className="mt-8 rounded-2xl border border-white/[0.08] bg-ink-900/60 p-5">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-volt-400">support</p>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[1.5rem] font-extrabold leading-none text-white">
                      1<span className="text-volt-400">day</span>
                    </p>
                    <p className="mt-1.5 text-[11.5px] text-zinc-500">{t("v.faq.subStrong")}</p>
                  </div>
                  <div>
                    <p className="text-[1.5rem] font-extrabold leading-none text-white">
                      {String(faqs.length).padStart(2, "0")}
                    </p>
                    <p className="mt-1.5 text-[11.5px] text-zinc-500">{t("v.faq.count")}</p>
                  </div>
                </div>
              </div>
            </Reveal>

            <div className="space-y-3">
              {faqs.length === 0 && <p className="text-[13px] text-zinc-500">{t("v.faq.empty")}</p>}
              {faqs.map((f, i) => (
                <FaqItem key={f.id} f={f} index={i} onOpen={() => openEntry(f)} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="relative overflow-hidden border-t border-white/[0.06] py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 h-[30rem] w-[52rem] -translate-x-1/2 -translate-y-1/2 animate-drift rounded-full bg-volt-400/[0.12] blur-[120px]" />
          <div className="hatch absolute inset-x-0 bottom-0 h-40 opacity-30" />
        </div>

        <div className="shell">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-volt-400">{t("v.cta.kicker")}</p>
            <h2 className="text-balance-tight mt-5 text-[2.1rem] font-extrabold leading-[1.06] text-white sm:text-[3rem] lg:text-[3.6rem]">
              {t("v.cta.line1")}
              <br />
              <Highlight>{t("v.cta.line2")}</Highlight>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[14.5px] leading-relaxed text-zinc-400">{t("v.cta.desc")}</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <VoltButton href={STUDIO_URL} icon className="px-8 py-3.5">
                {t("v.cta.start")}
              </VoltButton>
              <GhostButton href="#guides" className="px-8 py-3.5">
                {t("v.cta.again")} <IconChevron className="h-4 w-4 rotate-180" />
              </GhostButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* footer */}
      <footer className="relative border-t border-white/[0.07] bg-ink-950 pb-10 pt-16">
        <div className="shell">
          <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div>
              <Logo />
              <p className="mt-5 max-w-xs text-[12.5px] leading-relaxed text-zinc-500">{t("v.footer.desc")}</p>
              <div className="mt-5 flex gap-2">
                {(["ko", "en"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    aria-pressed={lang === l}
                    className={cn(
                      "rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase transition-colors",
                      lang === l
                        ? "border-volt-400/35 bg-volt-400/10 text-volt-300"
                        : "border-white/10 text-zinc-600 hover:text-zinc-300",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">{t("v.footer.guide")}</p>
              <ul className="mt-4 space-y-2.5">
                {[
                  { l: t("nav.notices"), h: "#notices" },
                  { l: t("nav.tools"), h: "#guides" },
                  { l: t("nav.updates"), h: "#updates" },
                  { l: t("nav.credits"), h: "#credits" },
                  { l: t("nav.faq"), h: "#faq" },
                ].map((x) => (
                  <li key={x.h}>
                    <a href={x.h} className="text-[12.5px] font-medium text-zinc-400 transition-colors hover:text-volt-400">
                      {x.l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">{t("v.footer.tools")}</p>
              <ul className="mt-4 space-y-2.5">
                {footerTools.map((tool) => (
                  <li key={tool.slug}>
                    <a
                      href={tool.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex items-center gap-1.5 text-[12.5px] font-medium text-zinc-400 transition-colors hover:text-volt-400"
                    >
                      {tool.name}
                      <IconExternal className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">{t("v.footer.support")}</p>
              <ul className="mt-4 space-y-2.5">
                {[
                  { l: "support@xconda.ai", h: "mailto:support@xconda.ai" },
                  { l: t("nav.credits"), h: "#credits" },
                  { l: t("nav.faq"), h: "#faq" },
                  { l: t("nav.notices"), h: "#notices" },
                ].map((x) => (
                  <li key={x.l}>
                    <a href={x.h} className="text-[12.5px] font-medium text-zinc-400 transition-colors hover:text-volt-400">
                      {x.l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center">
            <p className="font-mono text-[10.5px] text-zinc-600">{t("v.footer.rights")}</p>
            <a
              href="#top"
              className="group inline-flex items-center gap-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-zinc-500 transition-colors hover:text-volt-400"
            >
              {t("v.footer.backToTop")}
              <IconArrow className="h-3.5 w-3.5 -rotate-90 transition-transform duration-300 group-hover:-translate-y-0.5" />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
