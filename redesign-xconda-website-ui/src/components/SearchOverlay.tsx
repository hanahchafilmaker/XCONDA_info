import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { guides, news, notices } from "@/data/content";
import { IconArrow, IconClose, IconSearch, Pill } from "@/components/ui";

type Hit = {
  id: string;
  kind: "공지사항" | "툴 사용법" | "AI 뉴스";
  title: string;
  sub: string;
  meta: string;
  target: string;
};

const kindTone: Record<Hit["kind"], string> = {
  공지사항: "volt",
  "툴 사용법": "blue",
  "AI 뉴스": "green",
};

export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"전체" | Hit["kind"]>("전체");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const all: Hit[] = useMemo(
    () => [
      ...notices.map((n) => ({
        id: n.id,
        kind: "공지사항" as const,
        title: n.title,
        sub: n.summary,
        meta: `${n.date} · ${n.category}`,
        target: "notices",
      })),
      ...guides.map((g) => ({
        id: g.id,
        kind: "툴 사용법" as const,
        title: `${g.name} (${g.en})`,
        sub: g.tagline,
        meta: `${g.category} · ${g.level} · ${g.time}`,
        target: "guides",
      })),
      ...news.map((n) => ({
        id: n.id,
        kind: "AI 뉴스" as const,
        title: n.title,
        sub: n.summary,
        meta: `${n.date} · ${n.category}`,
        target: "news",
      })),
    ],
    [],
  );

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = kind === "전체" ? all : all.filter((h) => h.kind === kind);
    if (!term) return base.slice(0, 8);
    return base
      .filter(
        (h) =>
          h.title.toLowerCase().includes(term) ||
          h.sub.toLowerCase().includes(term) ||
          h.meta.toLowerCase().includes(term),
      )
      .slice(0, 20);
  }, [q, kind, all]);

  if (!open) return null;

  const jump = (target: string) => {
    onClose();
    setTimeout(
      () => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" }),
      120,
    );
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center p-4 pt-[12vh] sm:pt-[14vh]">
      <button aria-label="닫기" onClick={onClose} className="anim-fade absolute inset-0 bg-ink-950/85 backdrop-blur-md" />

      <div className="anim-modal relative z-10 w-full max-w-2xl overflow-hidden rounded-[22px] border border-white/10 bg-ink-900 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.95)]">
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
          <IconSearch className="h-4 w-4 shrink-0 text-volt-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="공지 · 툴 · 뉴스를 검색하세요 (예: 크레딧, Kling, 컨티뉴이티)"
            className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-zinc-600"
          />
          <button
            onClick={onClose}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-500 transition-colors hover:text-white"
            aria-label="닫기"
          >
            <IconClose className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-white/[0.06] px-5 py-3">
          {(["전체", "공지사항", "툴 사용법", "AI 뉴스"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cn(
                "rounded-full border px-3 py-1 text-[11.5px] font-bold transition-all duration-300",
                kind === k
                  ? "border-volt-400 bg-volt-400 text-ink-950"
                  : "border-white/10 text-zinc-500 hover:border-white/25 hover:text-white",
              )}
            >
              {k}
            </button>
          ))}
        </div>

        <ul className="max-h-[46vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <li className="px-4 py-10 text-center">
              <p className="text-[13px] font-bold text-zinc-400">검색 결과가 없습니다.</p>
              <p className="mt-1.5 text-[12px] text-zinc-600">
                ‘크레딧’, ‘점검’, ‘스토리보드’, ‘업스케일’ 같은 키워드를 시도해 보세요.
              </p>
            </li>
          )}
          {results.map((h) => (
            <li key={`${h.kind}-${h.id}`}>
              <button
                onClick={() => jump(h.target)}
                className="group flex w-full items-start gap-3.5 rounded-xl px-3.5 py-3 text-left transition-colors duration-300 hover:bg-white/[0.05]"
              >
                <span className="mt-0.5 shrink-0">
                  <Pill tone={kindTone[h.kind]}>{h.kind}</Pill>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-bold text-zinc-100 group-hover:text-white">
                    {h.title}
                  </span>
                  <span className="mt-0.5 line-clamp-1 block text-[12px] text-zinc-500">{h.sub}</span>
                  <span className="mt-1 block font-mono text-[10px] text-zinc-700">{h.meta}</span>
                </span>
                <IconArrow className="mt-1 h-4 w-4 shrink-0 text-zinc-700 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-volt-400" />
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600">
            {String(results.length).padStart(2, "0")} results
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-600">
            <kbd className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5">esc</kbd> 닫기
          </span>
        </div>
      </div>
    </div>
  );
}
