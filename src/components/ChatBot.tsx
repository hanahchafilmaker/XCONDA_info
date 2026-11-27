import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import type { Entry } from "../content/types";
import { useContent } from "../content/ContentContext";
import { buildChatIndex, searchChat, SCORE_GOOD, SCORE_MAYBE } from "../content/chatSearch";
import { useLang } from "../i18n";
import { SUPPORT_EMAIL_KO } from "./Qna";
import { IconArrow, IconClose } from "./volt";
import { cn } from "../utils/cn";

/**
 * 허브 Q&A 챗봇 — 화면 오른쪽 아래에 떠 있는 "질문하기" 버튼과 대화 창.
 *
 * - AI·API 키 없이 동작합니다. 사이트가 이미 읽어 온 Q&A · 공지 · 툴 사용법 글에서
 *   질문과 가장 비슷한 글을 찾아(`src/content/chatSearch.js`) 그 답변(요약)을 그대로 보여 줍니다.
 * - 노션에서 글을 고치면 사이트와 함께 챗봇 답변도 자동으로 바뀝니다(따로 데이터 파일 없음).
 * - "전체 보기"는 기존 글 상세 창(ArticleModal)을 엽니다.
 */

type Kind = "faq" | "notice" | "guide";
type Doc = { kind: Kind; slug?: string; title: string; text: string; entry: Entry };
type Msg =
  | { id: number; who: "user"; text: string }
  | { id: number; who: "bot"; text: string; options?: string[] }
  | { id: number; who: "answer"; doc: Doc; related: string[] };

/** id 를 뺀 새 메시지 (유니언 각각에 Omit 적용) */
type NewMsg = Msg extends infer M ? (M extends Msg ? Omit<M, "id"> : never) : never;

const EXAMPLE_KEYS = ["chat.ex1", "chat.ex2", "chat.ex3", "chat.ex4"] as const;

const toDoc = (entry: Entry, kind: Kind): Doc => ({
  kind,
  slug: entry.slug,
  title: entry.title,
  text: [entry.summary, entry.seoTitle, entry.seoDescription, entry.category, ...entry.tags].filter(Boolean).join(" "),
  entry,
});

export default function ChatBot() {
  const { t } = useLang();
  const { faqs, notices, guides, openEntry, active } = useContent();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelId = useId();

  const index = useMemo(
    () => buildChatIndex([...faqs.map((e) => toDoc(e, "faq")), ...notices.map((e) => toDoc(e, "notice")), ...guides.map((e) => toDoc(e, "guide"))]),
    [faqs, notices, guides],
  );

  const kindLabel: Record<Kind, string> = { faq: t("nav.qna"), notice: t("nav.notices"), guide: t("nav.tools") };

  const push = (...add: NewMsg[]) =>
    setMsgs((prev) => [...prev, ...add.map((m) => ({ ...m, id: nextId.current++ }) as Msg)]);

  const ask = (raw: string) => {
    const question = raw.trim();
    if (!question) return;
    // 같은 글이 여러 번 나오지 않게 묶은 뒤 점수 순으로
    const seen = new Set<string>();
    const hits = searchChat(index, question)
      .map((h) => ({ doc: index.docs[h.index], score: h.score }))
      .filter(({ doc }) => (seen.has(doc.entry.id) ? false : (seen.add(doc.entry.id), true)));
    const user = { who: "user" as const, text: question };
    if (hits[0] && hits[0].score >= SCORE_GOOD) {
      const related = hits.slice(1, 4).filter((h) => h.score >= SCORE_MAYBE).map((h) => h.doc.title);
      push(user, { who: "answer", doc: hits[0].doc, related });
    } else {
      const options = hits.slice(0, 3).filter((h) => h.score >= SCORE_MAYBE).map((h) => h.doc.title);
      push(user, { who: "bot", text: t("chat.notFound"), options });
    }
  };

  useEffect(() => {
    if (open && msgs.length === 0) push({ who: "bot", text: t("chat.hello") });
    if (open) inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !active) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, active]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(q);
    setQ("");
  };

  const Chips = ({ items }: { items: string[] }) => (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => ask(s)}
          className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-left text-[13px] text-neutral-800 transition-colors hover:border-neutral-950 hover:text-neutral-950"
        >
          {s}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls={panelId}
          data-testid="chat-open"
          className="fixed z-[60] inline-flex items-center gap-2 rounded-full bg-neutral-950 px-5 py-3.5 text-[14px] font-bold text-white shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5"
          style={{
            right: "calc(16px + env(safe-area-inset-right, 0px))",
            bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-volt-500" />
          {t("chat.open")}
        </button>
      )}

      {open && (
        <section
          id={panelId}
          role="dialog"
          aria-label={t("chat.title")}
          data-testid="chat-panel"
          className="fixed inset-0 z-[70] flex flex-col bg-ink-950 sm:inset-auto sm:right-5 sm:bottom-5 sm:h-[min(620px,calc(100dvh-6rem))] sm:w-[400px] sm:rounded-2xl sm:border sm:border-neutral-200 sm:shadow-2xl"
        >
          <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 sm:rounded-t-2xl">
            <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-xl bg-volt-500 font-bold text-neutral-950">
              Q
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold leading-tight text-neutral-950">{t("chat.title")}</p>
              <p className="text-[12px] text-neutral-500">{t("chat.sub")}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("chat.close")}
              className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950"
            >
              <IconClose className="h-5 w-5" />
            </button>
          </header>

          <div ref={logRef} aria-live="polite" className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
            {msgs.map((m) =>
              m.who === "user" ? (
                <p key={m.id} className="max-w-[85%] self-end whitespace-pre-line rounded-2xl rounded-br-md bg-neutral-950 px-3.5 py-2.5 text-[14px] text-white">
                  {m.text}
                </p>
              ) : m.who === "bot" ? (
                <div key={m.id} className="flex flex-col gap-2">
                  <p className="whitespace-pre-line rounded-2xl rounded-bl-md border border-neutral-200 bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-neutral-800">
                    {m.text}
                    {m.text === t("chat.notFound") && (
                      <>
                        {"\n"}
                        <span className="select-all font-medium text-neutral-950">{SUPPORT_EMAIL_KO}</span>
                      </>
                    )}
                  </p>
                  {m.options && m.options.length > 0 && (
                    <>
                      <p className="text-[12px] text-neutral-500">{t("chat.maybe")}</p>
                      <Chips items={m.options} />
                    </>
                  )}
                </div>
              ) : (
                <div key={m.id} className="flex flex-col gap-2">
                  <article data-testid="chat-answer" className="rounded-2xl rounded-bl-md border border-neutral-200 bg-white px-3.5 py-3">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-volt-200 px-2 py-0.5 text-[11px] font-bold text-neutral-900">{kindLabel[m.doc.kind]}</span>
                      <h3 className="text-[14px] font-bold leading-snug text-neutral-950">{m.doc.title}</h3>
                    </div>
                    <p className="line-clamp-[12] whitespace-pre-line text-[14px] leading-relaxed text-neutral-700">{m.doc.entry.summary}</p>
                    <button
                      type="button"
                      onClick={() => openEntry(m.doc.entry)}
                      className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-volt-400 hover:text-volt-600"
                    >
                      {t("chat.full")} <IconArrow className="h-4 w-4" />
                    </button>
                  </article>
                  {m.related.length > 0 && (
                    <>
                      <p className="text-[12px] text-neutral-500">{t("chat.related")}</p>
                      <Chips items={m.related} />
                    </>
                  )}
                </div>
              ),
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-neutral-200 bg-white px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] sm:rounded-b-2xl sm:pb-3">
            {msgs.length <= 1 && <Chips items={EXAMPLE_KEYS.map((k) => t(k))} />}
            <form onSubmit={submit} className="flex gap-2">
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label={t("chat.input")}
                placeholder={t("chat.placeholder")}
                data-testid="chat-input"
                className="min-w-0 flex-1 rounded-xl border border-neutral-300 bg-ink-950 px-3.5 py-2.5 text-[16px] text-neutral-950 outline-none focus:border-neutral-950 sm:text-[14px]"
              />
              <button type="submit" className={cn("rounded-xl bg-neutral-950 px-4 text-[14px] font-bold text-white", !q.trim() && "opacity-60")}>
                {t("chat.send")}
              </button>
            </form>
            <p className="text-[11px] leading-snug text-neutral-500">{t("chat.disclaimer")}</p>
          </div>
        </section>
      )}
    </>
  );
}
