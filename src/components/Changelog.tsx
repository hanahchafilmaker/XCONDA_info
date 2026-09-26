import { useState } from "react";
import { ArrowRight, ChevronDown, GitCommitHorizontal } from "lucide-react";
import { Container, Reveal, SectionHeading, Serif, trackSpotlight } from "./ui";
import { useLang } from "../i18n";
import { useContent } from "../content/ContentContext";
import { formatDate, isNew, timeAgo } from "../notion";
import { NewBadge, SmartImage } from "./common";
import { cn } from "../utils/cn";

const KIND = {
  New: { label: "New", cls: "bg-emerald-400/12 text-emerald-200 ring-emerald-400/25" },
  Improved: { label: "Improved", cls: "bg-sky-400/12 text-sky-200 ring-sky-400/25" },
  Fixed: { label: "Fixed", cls: "bg-amber-400/12 text-amber-200 ring-amber-400/25" },
};

export default function Changelog() {
  const { t, pick } = useLang();
  const { updates, openEntry, status } = useContent();
  const [expanded, setExpanded] = useState(false);
  const list = expanded ? updates : updates.slice(0, 3);

  return (
    <section id="updates" className="relative py-20 sm:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-32 -z-10 mx-auto h-[28rem] max-w-4xl rounded-full bg-emerald-600/[0.07] blur-[140px]" />
      <Container>
        <SectionHeading
          eyebrow="Changelog"
          title={<>{t("updates.titleKo")} <Serif className="text-gradient font-normal">Release Notes</Serif></>}
          description={t("updates.desc")}
        />

        <div className="relative mx-auto mt-14 max-w-4xl">
          {/* line */}
          <div aria-hidden className="absolute bottom-0 left-[7px] top-2 w-px bg-gradient-to-b from-fuchsia-400/60 via-white/10 to-transparent md:left-[163px]" />

          {status === "loading" && (
            <div className="space-y-6 pl-8 md:pl-[196px]">
              {[0, 1].map((i) => <div key={i} className="skeleton h-48 rounded-3xl" />)}
            </div>
          )}

          <ol className="space-y-8">
            {list.map((u, i) => (
              <Reveal as="li" key={u.id} delay={i * 80} className="relative grid gap-3 pl-8 md:grid-cols-[140px_1fr] md:gap-14 md:pl-0">
                {/* dot */}
                <span aria-hidden className="absolute left-0 top-2 grid h-[15px] w-[15px] place-items-center rounded-full bg-ink-950 ring-1 ring-white/20 md:left-[156px]">
                  <span className={cn("h-[7px] w-[7px] rounded-full", i === 0 ? "bg-brand" : "bg-zinc-500")} />
                  {i === 0 && <span className="animate-pulse-ring absolute inset-0 rounded-full bg-fuchsia-400/40" />}
                </span>

                <div className="md:pt-0.5 md:text-right">
                  <p className="font-mono text-sm font-medium text-white">{u.version ?? "—"}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {formatDate(u.date)} · {timeAgo(u.date)}
                  </p>
                </div>

                <article
                  onMouseMove={trackSpotlight}
                  className="spotlight group overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-b from-white/[0.045] to-white/[0.01] transition-all duration-500 hover:border-white/15"
                >
                  {u.cover && (
                    <button type="button" onClick={() => openEntry(u)} className="block aspect-[21/8] w-full overflow-hidden" tabIndex={-1} aria-hidden>
                      <SmartImage src={u.cover} className="h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-[1.03] group-hover:opacity-100" />
                    </button>
                  )}
                  <div className="p-6 sm:p-7">
                    <div className="flex items-center gap-2">
                      <GitCommitHorizontal className="h-4 w-4 text-zinc-500" />
                      {u.tags.slice(0, 2).map((t) => (
                        <span key={t} className="text-xs text-zinc-400">{t}</span>
                      ))}
                      {isNew(u.date) && <NewBadge />}
                    </div>
                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-white">{u.title}</h3>
                    {u.summary && <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{u.summary}</p>}
                    {u.changes && u.changes.length > 0 && (
                      <ul className="mt-5 space-y-2.5">
                        {u.changes.map((c, j) => (
                          <li key={j} className="flex items-start gap-3 text-sm text-zinc-300">
                            <span className={cn("mt-px w-[68px] shrink-0 rounded-md py-0.5 text-center text-[11px] font-semibold ring-1 ring-inset", KIND[c.kind].cls)}>
                              {KIND[c.kind].label}
                            </span>
                            <span className="leading-relaxed">{c.text}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={() => openEntry(u)}
                      className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-300 transition hover:text-white"
                    >
                      {t("common.readMore")} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </article>
              </Reveal>
            ))}
          </ol>

          {updates.length > 3 && (
            <div className="mt-10 flex justify-center pl-8 md:pl-[196px]">
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                aria-expanded={expanded}
                className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-zinc-200 transition hover:bg-white/10"
              >
                {expanded
                  ? t("updates.collapse")
                  : pick(`이전 릴리스 ${updates.length - 3}개 더보기`, `${updates.length - 3} more past releases`)}
                <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
              </button>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
