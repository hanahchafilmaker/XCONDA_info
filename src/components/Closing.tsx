import { useState } from "react";
import { cn } from "../utils/cn";
import type { Entry } from "../content/types";
import { useContent } from "../content/ContentContext";
import { STUDIO_URL, TOOLS } from "../content/tools";
import { useLang } from "../i18n";
import { IconArrow, IconPlus, Logo, Reveal, SectionHeader, VoltButton } from "./volt";

const SUPPORT_EMAIL = "support@xconda.ai";

function FaqItem({ f, defaultOpen, onOpen }: { f: Entry; defaultOpen: boolean; onOpen: () => void }) {
  const [open, setOpen] = useState(defaultOpen);
  const { t } = useLang();

  return (
    <div className="border-b border-white/[0.06]">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 py-5 text-left"
      >
        <span className="flex-1 text-[16px] font-semibold text-zinc-100">{f.title}</span>
        <IconPlus
          className={cn("h-5 w-5 shrink-0 text-zinc-500 transition-transform duration-300", open && "rotate-45 text-white")}
        />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="pb-6 pr-9">
            <p className="text-[15px] leading-relaxed text-zinc-400">{f.summary}</p>
            <button
              onClick={onOpen}
              className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-medium text-zinc-400 transition-colors hover:text-volt-400"
            >
              {t("v.faq.full")} <IconArrow className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Closing() {
  const { t } = useLang();
  const { faqs, openEntry } = useContent();
  const footerTools = TOOLS.slice(0, 5);

  return (
    <>
      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-white/[0.06] py-20 sm:py-24">
        <div className="shell grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
          <Reveal className="lg:sticky lg:top-24 lg:self-start">
            <SectionHeader title={t("v.faq.lead")} sub={t("v.faq.sub")} />
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-volt-400 hover:text-volt-300"
            >
              {SUPPORT_EMAIL} <IconArrow className="h-4 w-4" />
            </a>
          </Reveal>

          <Reveal delay={60} className="border-t border-white/[0.06]">
            {faqs.length === 0 && <p className="py-6 text-[14px] text-zinc-500">{t("v.faq.empty")}</p>}
            {faqs.map((f, i) => (
              <FaqItem key={f.id} f={f} defaultOpen={i === 0} onOpen={() => openEntry(f)} />
            ))}
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 sm:pb-24">
        <div className="shell">
          <Reveal className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-white/[0.08] bg-ink-900 p-8 sm:flex-row sm:items-center sm:p-10">
            <div>
              <h2 className="text-[1.5rem] font-bold tracking-[-0.02em] text-white sm:text-[1.75rem]">
                {t("v.cta.line1")} {t("v.cta.line2")}
              </h2>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-zinc-400">{t("v.cta.desc")}</p>
            </div>
            <VoltButton href={STUDIO_URL} icon className="shrink-0">
              {t("v.cta.start")}
            </VoltButton>
          </Reveal>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-white/[0.06] py-12">
        <div className="shell">
          <div className="grid gap-10 sm:grid-cols-[2fr_1fr_1fr]">
            <div>
              <Logo />
              <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-zinc-500">{t("v.footer.desc")}</p>
            </div>

            <div>
              <p className="text-[13px] font-semibold text-zinc-300">{t("v.footer.guide")}</p>
              <ul className="mt-3 space-y-2">
                {[
                  { l: t("nav.notices"), h: "#notices" },
                  { l: t("nav.tools"), h: "#guides" },
                  { l: t("nav.updates"), h: "#updates" },
                  { l: t("nav.credits"), h: "#credits" },
                  { l: t("nav.faq"), h: "#faq" },
                ].map((x) => (
                  <li key={x.h}>
                    <a href={x.h} className="text-[13.5px] text-zinc-500 transition-colors hover:text-white">
                      {x.l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[13px] font-semibold text-zinc-300">{t("v.footer.tools")}</p>
              <ul className="mt-3 space-y-2">
                {footerTools.map((tool) => (
                  <li key={tool.slug}>
                    <a
                      href={tool.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13.5px] text-zinc-500 transition-colors hover:text-white"
                    >
                      {tool.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.06] pt-6 text-[12.5px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
            <p>{t("v.footer.rights")}</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="transition-colors hover:text-zinc-300">
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
