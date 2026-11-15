import { useEffect, useMemo, useRef, useState } from "react";
import type { Entry } from "../content/types";
import { useContent } from "../content/ContentContext";
import { formatDate } from "../notion";
import { useLang } from "../i18n";
import { IconArrow, IconClose, IconSearch, Pill } from "./volt";
import { Button } from "./ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { Command, CommandInput, CommandItem, CommandList } from "./ui/command";

type Kind = "notice" | "news" | "guide" | "blog" | "faq";
type Hit = { id: string; kind: Kind; title: string; sub: string; meta: string; entry: Entry };
const PAGE = 24;
const KIND_TONE: Record<Kind, string> = { notice: "volt", news: "green", guide: "blue", blog: "amber", faq: "violet" };
const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase().trim();
const toHit = (e: Entry, kind: Kind): Hit => ({ id: e.id, kind, title: e.title, sub: e.summary, meta: `${formatDate(e.date)} · ${e.category}`, entry: e });

export default function SearchOverlay({ open, onClose, initialQuery = "" }: { open: boolean; onClose: () => void; initialQuery?: string }) {
  const { t } = useLang();
  const { notices, news, guides, blogs, faqs, openEntry } = useContent();
  const [q, setQ] = useState(initialQuery);
  const [kind, setKind] = useState<Kind | "all">("all");
  const [limit, setLimit] = useState(PAGE);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const pendingEntry = useRef<Entry | null>(null);

  useEffect(() => {
    if (open) { setQ(initialQuery); setKind("all"); setLimit(PAGE); }
  }, [open, initialQuery]);

  const all = useMemo(() => [
    ...notices.map((e) => toHit(e, "notice")),
    ...news.map((e) => toHit(e, "news")),
    ...guides.map((e) => toHit(e, "guide")),
    ...blogs.map((e) => toHit(e, "blog")),
    ...faqs.map((e) => toHit(e, "faq")),
  ], [notices, news, guides, blogs, faqs]);

  // Keep content filtering here (including Korean); cmdk owns selection, not ranking.
  const matches = useMemo(() => {
    const term = normalize(q);
    const tokens = term.split(/\s+/).filter(Boolean);
    return all.filter((h) => kind === "all" || h.kind === kind)
      .map((hit) => {
        const title = normalize(hit.title);
        const text = normalize(`${hit.title} ${hit.sub} ${hit.meta} ${hit.entry.tags.join(" ")}`);
        const score = term && title === term ? 3 : term && title.startsWith(term) ? 2 : term && title.includes(term) ? 1 : 0;
        return { hit, score, match: tokens.every((token) => text.includes(token)) };
      })
      .filter((item) => item.match)
      .sort((a, b) => b.score - a.score)
      .map(({ hit }) => hit);
  }, [q, kind, all]);
  const results = matches.slice(0, limit);
  const kindLabel: Record<Kind | "all", string> = {
    all: t("v.search.all"), notice: t("nav.notices"), news: t("nav.news"),
    guide: t("nav.tools"), blog: t("nav.blog"), faq: t("nav.qna"),
  };
  const reset = () => { setQ(""); setKind("all"); setLimit(PAGE); inputRef.current?.focus(); };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent
        data-search-dialog
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current = document.activeElement as HTMLElement | null;
          pendingEntry.current = null;
          inputRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (returnFocus.current?.isConnected) returnFocus.current.focus();
          // Restore the original trigger before the article captures it. No timeout race.
          if (pendingEntry.current) { openEntry(pendingEntry.current); pendingEntry.current = null; }
        }}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <DialogTitle className="text-sm font-semibold">{t("v.nav.search")}</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" aria-label={t("v.search.close")}><IconClose className="size-4" /></Button>
          </DialogClose>
        </div>
        <DialogDescription className="px-5 pb-3 text-xs text-neutral-600">{t("v.search.description")}</DialogDescription>
        <Command label={t("v.nav.search")} shouldFilter={false} loop vimBindings={false}
          onKeyDownCapture={(event) => {
            if ((event.target as HTMLElement).closest("button") && ["Enter", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) event.stopPropagation();
            // Korean/Japanese IME confirmation must not open the selected result.
            if (event.key === "Enter" && (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) event.stopPropagation();
          }}
        >
          <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-black/15 px-3 focus-within:border-volt-400 focus-within:ring-2 focus-within:ring-volt-400/20">
            <IconSearch className="size-5 shrink-0 text-volt-400" />
            <CommandInput ref={inputRef} value={q} onValueChange={(value) => { setQ(value); setLimit(PAGE); }}
              placeholder={t("v.search.placeholder")} aria-label={t("v.nav.search")} autoComplete="off" spellCheck={false} />
            {q && <Button variant="ghost" size="icon" onClick={() => { setQ(""); setLimit(PAGE); inputRef.current?.focus(); }} aria-label={t("v.search.clear")}><IconClose className="size-4" /></Button>}
          </div>
          <div role="group" aria-label={t("v.search.filter")} className="flex shrink-0 flex-wrap gap-1.5 border-b border-black/[0.06] px-4 pb-3">
            {(Object.keys(kindLabel) as (Kind | "all")[]).map((k) => (
              <Button key={k} size="sm" variant={kind === k ? "default" : "outline"} aria-pressed={kind === k}
                onClick={() => { setKind(k); setLimit(PAGE); }}>{kindLabel[k]}</Button>
            ))}
          </div>
          <CommandList label={t("v.search.results")}>
            {results.map((h) => (
              <CommandItem key={`${h.kind}-${h.id}`} value={`${h.kind}-${h.id}`} data-search-kind={h.kind}
                onSelect={() => { pendingEntry.current = h.entry; onClose(); }}>
                <span className="mt-0.5 shrink-0"><Pill tone={KIND_TONE[h.kind]}>{kindLabel[h.kind]}</Pill></span>
                <span className="min-w-0 flex-1">
                  <span data-search-title className="block text-[14px] font-medium leading-snug">{h.title}</span>
                  <span className="mt-1 line-clamp-1 text-xs text-neutral-600">{h.sub}</span>
                  <span className="mt-1 block text-[11px] text-neutral-600">{h.meta}</span>
                </span>
                <IconArrow className="mt-1 size-4 shrink-0 text-neutral-600" />
              </CommandItem>
            ))}
          </CommandList>
          {matches.length === 0 && (
            <div className="px-5 py-7 text-center">
              <p className="text-sm font-medium">{t("v.search.empty")}</p>
              <p className="mt-2 text-xs text-neutral-600">{t("v.search.emptyHint")}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={reset}>{t("v.search.reset")}</Button>
            </div>
          )}
          {matches.length > limit && <Button variant="ghost" size="sm" className="mx-4 my-2" onClick={() => setLimit((n) => n + PAGE)}>{t("v.search.more")}</Button>}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-black/[0.07] bg-ink-950 px-5 py-3 text-xs text-neutral-600">
            <span role="status" aria-live="polite" aria-atomic="true">{results.length} / {matches.length} {t("v.search.results")}</span>
            <span className="hidden sm:inline">↑↓ {t("v.search.navigate")} · Enter {t("v.search.open")} · Esc {t("v.search.close")}</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
