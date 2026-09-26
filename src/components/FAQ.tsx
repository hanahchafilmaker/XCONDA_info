import { useId, useMemo, useState } from "react";
import { MessageCircle, Plus } from "lucide-react";
import { ButtonLink, Container, Reveal, SectionHeading, Serif } from "./ui";
import { useLang } from "../i18n";
import { useContent } from "../content/ContentContext";
import { cn } from "../utils/cn";

function Item({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <div className={cn("rounded-2xl border transition-all duration-500", open ? "border-white/15 bg-white/[0.04]" : "border-white/[0.06] bg-white/[0.015] hover:border-white/10 hover:bg-white/[0.03]")}>
      <h3>
        <button
          type="button"
          id={`${id}-btn`}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-6 rounded-2xl px-5 py-5 text-left sm:px-6"
        >
          <span className="text-[15px] font-medium text-white sm:text-base">
            <span className="text-gradient mr-2 font-semibold">Q.</span>
            {q}
          </span>
          <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full ring-1 ring-inset transition-all duration-500", open ? "bg-brand rotate-45 ring-transparent" : "bg-white/[0.04] ring-white/10")}>
            <Plus className="h-4 w-4 text-white" />
          </span>
        </button>
      </h3>
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-btn`}
        className={cn("grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}
      >
        <div className="overflow-hidden">
          <p className="whitespace-pre-line px-5 pb-6 text-sm leading-relaxed text-zinc-400 sm:px-6 sm:text-[15px]">{a}</p>
        </div>
      </div>
    </div>
  );
}

const ALL = "전체";

export default function FAQ() {
  const { t } = useLang();
  const { faqs } = useContent();
  const [open, setOpen] = useState<string | null>(null);
  const [cat, setCat] = useState(ALL);
  const cats = useMemo(() => [ALL, ...Array.from(new Set(faqs.map((f) => f.category).filter(Boolean)))], [faqs]);
  const list = cat === ALL ? faqs : faqs.filter((f) => f.category === cat);

  return (
    <section id="faq" className="relative py-20 sm:py-28">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeading
              align="left"
              eyebrow="FAQ"
              title={<>{t("faq.titleKo")} <Serif className="text-gradient font-normal">Q&amp;A</Serif></>}
              description={t("faq.desc")}
            />
            <Reveal delay={160} className="mt-6 flex flex-wrap gap-2">
              {cats.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={cat === c}
                  onClick={() => setCat(c)}
                  className={cn("rounded-full px-3.5 py-1.5 text-sm transition", cat === c ? "bg-white text-ink-950" : "glass text-zinc-300 hover:bg-white/10")}
                >
                  {c === ALL ? t("common.all") : c}
                </button>
              ))}
            </Reveal>
            <Reveal delay={220} className="mt-8">
              <ButtonLink href="#support" variant="secondary">
                <MessageCircle className="h-4 w-4" /> {t("faq.contact")}
              </ButtonLink>
            </Reveal>
          </div>
          <div className="flex flex-col gap-3">
            {list.map((f, i) => (
              <Reveal key={f.id} delay={i * 50}>
                <Item q={f.title} a={f.summary} open={open === f.id} onToggle={() => setOpen(open === f.id ? null : f.id)} />
              </Reveal>
            ))}
            {list.length === 0 && <p className="py-10 text-center text-sm text-zinc-500">{t("faq.empty")}</p>}
          </div>
        </div>
      </Container>
    </section>
  );
}
