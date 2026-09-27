import { useState } from "react";
import { cn } from "../utils/cn";
import type { Entry } from "../content/types";
import { useContent } from "../content/ContentContext";
import { useLang } from "../i18n";
import { IconArrow, IconPlus, Reveal, SectionHeader } from "./volt";

const SUPPORT_EMAIL = "support@xconda.ai";

function QnaItem({ f, defaultOpen, onOpen }: { f: Entry; defaultOpen: boolean; onOpen: () => void }) {
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

/** Q&A 섹션 — Notion `Type = FAQ`(또는 Q&A) 글이 노출됩니다. */
export default function Qna() {
  const { t } = useLang();
  const { faqs, openEntry } = useContent();

  return (
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
            <QnaItem key={f.id} f={f} defaultOpen={i === 0} onOpen={() => openEntry(f)} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}

export { SUPPORT_EMAIL };
