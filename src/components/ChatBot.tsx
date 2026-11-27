import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import type { Entry } from "../content/types";
import { useContent } from "../content/ContentContext";
import { buildChatIndex, searchChat, SCORE_GOOD, SCORE_MAYBE } from "../content/chatSearch";
import { useLang } from "../i18n";
import { routePathFor } from "../content/seo";
import { askQnaAi, resolveQnaAiEndpoint, type AiDoc } from "../content/qnaAi";
import { SUPPORT_EMAIL_KO } from "./Qna";
import { ArrowRight, MessageCircle } from "lucide-react";
import { IconArrow, IconClose, Pill } from "./volt";
import { Button } from "./ui/button";

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
  | { id: number; who: "answer"; doc: Doc; related: string[] }
  /** AI 요약 — text 가 null 이면 아직 답을 기다리는 중 */
  | { id: number; who: "ai"; text: string | null };

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
  const { t, lang } = useLang();
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

  /** 메시지를 추가하고 각 메시지에 붙은 id 를 돌려줍니다. (id 는 상태 갱신 함수 밖에서 정해야 개발 모드의 두 번 실행에도 안전합니다) */
  const push = (...add: NewMsg[]) => {
    const withIds = add.map((m) => ({ ...m, id: nextId.current++ }) as Msg);
    setMsgs((prev) => [...prev, ...withIds]);
    return withIds.map((m) => m.id);
  };

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
      if (!resolveQnaAiEndpoint()) {
        push(user, { who: "answer", doc: hits[0].doc, related });
        return;
      }
      // AI 요약을 먼저 "정리하는 중"으로 보여 주고, 근거 글 카드는 바로 아래에 둡니다.
      const [, aiId] = push(user, { who: "ai", text: null }, { who: "answer", doc: hits[0].doc, related });
      const docs: AiDoc[] = hits
        .slice(0, 4)
        .filter((h, i) => i === 0 || h.score >= SCORE_MAYBE)
        .map(({ doc }) => {
          const path = doc.slug ? routePathFor(doc.entry.type, doc.slug) : null;
          return { title: doc.title, answer: doc.entry.summary, url: path ? `https://hub.xconda.ai/${path}` : "", kind: doc.kind, date: doc.entry.modified ?? doc.entry.date };
        });
      void askQnaAi(question, docs, lang).then((text) =>
        setMsgs((prev) =>
          text ? prev.map((m) => (m.id === aiId && m.who === "ai" ? { ...m, text } : m)) : prev.filter((m) => m.id !== aiId),
        ),
      );
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

  // 새 질문을 하면 그 질문이 창 맨 위에 오도록 스크롤 → 바로 아래의 AI 요약·답변을 위에서부터 읽을 수 있음
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    const lastUser = [...msgs].reverse().find((m) => m.who === "user");
    const target = lastUser ? el.querySelector<HTMLElement>(`[data-msg="${lastUser.id}"]`) : null;
    el.scrollTop = target ? target.offsetTop - el.offsetTop - 12 : el.scrollHeight;
  }, [msgs.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // 허브 첫 화면의 "빠른 검색" 칩과 같은 모양
  const Chips = ({ items }: { items: string[] }) => (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => ask(s)}
          className="rounded-full bg-ink-850 px-3 py-1.5 text-left text-xs font-medium text-neutral-700 transition hover:bg-neutral-200"
        >
          {s}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {!open && (
        // 허브의 기본 검은 버튼(VoltButton · "XCONDA 열기")과 같은 모양
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls={panelId}
          data-testid="chat-open"
          className="fixed z-[60] inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-3 text-[13px] font-medium text-white shadow-[0_8px_28px_-12px_rgba(28,28,26,0.45)] transition-colors hover:bg-neutral-800 active:scale-[0.98]"
          style={{
            right: "calc(16px + env(safe-area-inset-right, 0px))",
            bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <MessageCircle className="size-4" aria-hidden />
          {t("chat.open")}
        </button>
      )}

      {open && (
        // 통합검색 창(SearchOverlay)과 같은 흰 패널 · 테두리 · 모서리 · 그림자
        <section
          id={panelId}
          role="dialog"
          aria-label={t("chat.title")}
          data-testid="chat-panel"
          className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-white text-neutral-950 sm:inset-auto sm:right-5 sm:bottom-5 sm:h-[min(620px,calc(100dvh-6rem))] sm:w-[400px] sm:rounded-2xl sm:border sm:border-black/10 sm:shadow-2xl"
        >
          <header className="flex items-start justify-between gap-3 border-b border-black/[0.06] px-5 pt-4 pb-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t("chat.title")}</p>
              <p className="mt-1 text-xs text-neutral-600">{t("chat.sub")}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label={t("chat.close")} className="-mr-2 -mt-1">
              <IconClose className="size-4" />
            </Button>
          </header>

          <div ref={logRef} aria-live="polite" className="relative flex flex-1 flex-col gap-4 overflow-y-auto bg-ink-950 px-4 py-4">
            {msgs.map((m) =>
              m.who === "user" ? (
                <p key={m.id} data-msg={m.id} className="max-w-[85%] self-end whitespace-pre-line rounded-xl bg-neutral-950 px-3.5 py-2.5 text-sm text-white">
                  {m.text}
                </p>
              ) : m.who === "ai" ? (
                <div key={m.id} data-msg={m.id} data-testid="chat-ai" className="rounded-xl border border-neutral-200 bg-white px-4 py-3.5">
                  <Pill tone="amber">{t("chat.ai")}</Pill>
                  {m.text === null ? (
                    <p className="mt-2 text-sm text-neutral-600" aria-busy="true">{t("chat.aiPending")}</p>
                  ) : (
                    <>
                      <p className="mt-2 whitespace-pre-line text-pretty text-sm leading-[1.8] text-neutral-800">{m.text}</p>
                      <p className="mt-2 text-xs text-neutral-600">{t("chat.aiNote")}</p>
                    </>
                  )}
                </div>
              ) : m.who === "bot" ? (
                <div key={m.id} data-msg={m.id} className="flex flex-col gap-2">
                  <p className="whitespace-pre-line rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm leading-[1.8] text-neutral-700">
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
                      <p className="text-xs font-medium text-neutral-600">{t("chat.maybe")}</p>
                      <Chips items={m.options} />
                    </>
                  )}
                </div>
              ) : (
                <div key={m.id} data-msg={m.id} className="flex flex-col gap-2">
                  {/* 통합검색 결과 · Q&A 섹션과 같은 구성: Pill 분류 + 제목 + 답변 + "전체 보기" */}
                  <article data-testid="chat-answer" className="rounded-xl border border-neutral-200 bg-white px-4 py-3.5">
                    <Pill tone="zinc">{kindLabel[m.doc.kind]}</Pill>
                    <h3 className="mt-2 text-[15px] font-semibold leading-relaxed text-neutral-950">{m.doc.title}</h3>
                    <p className="mt-1.5 line-clamp-[12] whitespace-pre-line text-pretty text-sm leading-[1.8] text-neutral-600">{m.doc.entry.summary}</p>
                    <button
                      type="button"
                      onClick={() => openEntry(m.doc.entry)}
                      className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-medium text-neutral-500 transition-colors hover:text-volt-400"
                    >
                      {t("chat.full")} <IconArrow className="h-4 w-4" />
                    </button>
                  </article>
                  {m.related.length > 0 && (
                    <>
                      <p className="text-xs font-medium text-neutral-600">{t("chat.related")}</p>
                      <Chips items={m.related} />
                    </>
                  )}
                </div>
              ),
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-black/[0.07] bg-white px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] sm:pb-3">
            {msgs.length <= 1 && <Chips items={EXAMPLE_KEYS.map((k) => t(k))} />}
            {/* 허브 첫 화면 검색창과 같은 입력칸 + 노란 화살표 버튼 */}
            <form onSubmit={submit} className="flex items-stretch gap-2">
              <div className="flex min-w-0 flex-1 items-center rounded-lg border border-neutral-200 bg-white px-3.5 shadow-sm transition focus-within:border-neutral-600 focus-within:ring-2 focus-within:ring-neutral-200">
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label={t("chat.input")}
                  placeholder={t("chat.placeholder")}
                  data-testid="chat-input"
                  className="min-w-0 flex-1 bg-transparent py-3 text-[16px] text-neutral-950 outline-none placeholder:text-neutral-500 focus-visible:outline-none sm:text-sm"
                />
              </div>
              <button
                type="submit"
                aria-label={t("chat.send")}
                className="grid w-12 shrink-0 place-items-center rounded-lg bg-volt-500 text-neutral-950 shadow-sm transition hover:bg-volt-200"
              >
                <ArrowRight className="size-5" aria-hidden />
              </button>
            </form>
            <p className="text-[11px] leading-snug text-neutral-600">{t("chat.disclaimer")}</p>
          </div>
        </section>
      )}
    </>
  );
}
