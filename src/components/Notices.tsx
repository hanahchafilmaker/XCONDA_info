import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Pin, Megaphone } from "lucide-react";
import { Container, Reveal, SectionHeading, Serif } from "./ui";
import { useContent } from "../content/ContentContext";
import { formatDate, isNew } from "../notion";
import { CategoryBadge, NewBadge } from "./common";
import { cn } from "../utils/cn";

const PAGE = 6;

export default function Notices() {
  const { notices, openEntry, status } = useContent();
  const [cat, setCat] = useState("전체");
  const [limit, setLimit] = useState(PAGE);

  const cats = useMemo(() => ["전체", ...Array.from(new Set(notices.map((n) => n.category).filter(Boolean)))], [notices]);
  const list = useMemo(() => (cat === "전체" ? notices : notices.filter((n) => n.category === cat)), [notices, cat]);
  const visible = list.slice(0, limit);

  return (
    <section id="notices" className="relative py-20 sm:py-28">
      <Container>
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            align="left"
            eyebrow="Notice"
            title={<>공지사항 <Serif className="text-gradient font-normal">News</Serif></>}
            description="서비스 공지, 점검 일정, 정책 변경, 이벤트 소식을 가장 먼저 알려드립니다."
          />
          <Reveal delay={120}>
            <div role="tablist" aria-label="공지 분류" className="glass flex max-w-full gap-1 overflow-x-auto rounded-full p-1">
              {cats.map((c) => (
                <button
                  key={c}
                  role="tab"
                  aria-selected={cat === c}
                  type="button"
                  onClick={() => {
                    setCat(c);
                    setLimit(PAGE);
                  }}
                  className={cn(
                    "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-300",
                    cat === c ? "bg-white text-ink-950" : "text-zinc-400 hover:text-white"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal delay={80} className="mt-10">
          <div className="overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02]">
            {/* header (desktop) */}
            <div className="hidden grid-cols-[96px_1fr_120px] gap-4 border-b border-white/[0.06] px-6 py-3 text-xs font-medium text-zinc-500 md:grid">
              <span>구분</span>
              <span>제목</span>
              <span className="text-right">등록일</span>
            </div>

            {status === "loading" ? (
              <ul>
                {Array.from({ length: 5 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-4 border-b border-white/[0.04] px-6 py-5 last:border-0">
                    <div className="skeleton h-5 w-12 rounded" />
                    <div className="skeleton h-4 flex-1 rounded" />
                    <div className="skeleton hidden h-4 w-20 rounded md:block" />
                  </li>
                ))}
              </ul>
            ) : visible.length ? (
              <ul>
                {visible.map((n) => (
                  <li key={n.id} className="border-b border-white/[0.04] last:border-0">
                    <button
                      type="button"
                      onClick={() => openEntry(n)}
                      className={cn(
                        "group grid w-full grid-cols-1 gap-2 px-5 py-4 text-left transition-colors hover:bg-white/[0.035] md:grid-cols-[96px_1fr_120px] md:items-center md:gap-4 md:px-6 md:py-5",
                        n.pinned && "bg-gradient-to-r from-fuchsia-500/[0.06] to-transparent"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {n.pinned ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-fuchsia-400/15 px-2 py-0.5 text-[11px] font-semibold text-fuchsia-200 ring-1 ring-inset ring-fuchsia-400/30">
                            <Pin className="h-3 w-3" /> 고정
                          </span>
                        ) : (
                          <CategoryBadge>{n.category || "공지"}</CategoryBadge>
                        )}
                        <span className="text-xs text-zinc-500 md:hidden">{formatDate(n.date)}</span>
                      </span>
                      <span className="flex min-w-0 items-center gap-2">
                        {n.important && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" aria-label="중요" />}
                        <span className={cn("truncate text-[15px] transition-colors group-hover:text-white", n.pinned || n.important ? "font-semibold text-white" : "text-zinc-200")}>
                          {n.title}
                        </span>
                        {isNew(n.date) && <NewBadge />}
                        <ChevronRight className="ml-auto h-4 w-4 shrink-0 -translate-x-1 text-zinc-600 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 md:ml-2" />
                      </span>
                      <span className="hidden text-right font-mono text-sm text-zinc-500 md:block">{formatDate(n.date)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-sm text-zinc-500">
                <Megaphone className="h-6 w-6" />
                등록된 공지가 없습니다.
              </div>
            )}
          </div>
        </Reveal>

        {list.length > limit && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setLimit((l) => l + PAGE)}
              className="glass inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-zinc-200 transition hover:bg-white/10"
            >
              공지 더보기 <span className="text-zinc-500">({list.length - limit})</span>
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}
      </Container>
    </section>
  );
}
