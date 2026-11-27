import { useId, useState } from "react";
import { cn } from "../utils/cn";
import type { Entry } from "../content/types";
import { useContent } from "../content/ContentContext";
import { useLang } from "../i18n";
import { IconArrow, IconPlus, Reveal, SectionHeader } from "./volt";

/**
 * 문의 메일 — 도메인·메일 분리 정책(2026-11-27 대표 승인).
 *   ko        → cubeberry@cuberry.kr  (한국 · cuberry.kr)
 *   en·ja·zh  → product@cubeberry.ai  (글로벌·미국 제품 문의 · cubeberry.ai)
 * 결제·계약 창구 info@cubeberry.ai(미국 법인)는 푸터·구조화 데이터의 리셀러 노드에 남깁니다.
 * Q&A 섹션 링크 · 푸터(Closing.tsx) · 구조화 데이터가 같은 규칙을 씁니다.
 */
const SUPPORT_EMAIL_GLOBAL = "product@cubeberry.ai";
const SUPPORT_EMAIL_KO = "cubeberry@cuberry.kr";

/** 문의 메일. 한국어 화면은 한국(cuberry.kr), 그 밖의 언어는 글로벌(cubeberry.ai)입니다. */
function supportEmailFor(lang?: string): string {
  return lang && !String(lang).toLowerCase().startsWith("ko") ? SUPPORT_EMAIL_GLOBAL : SUPPORT_EMAIL_KO;
}

function QnaItem({ f, defaultOpen, onOpen }: { f: Entry; defaultOpen: boolean; onOpen: () => void }) {
  const [open, setOpen] = useState(defaultOpen);
  const answerId = useId();
  const { t } = useLang();

  return (
    <div className="border-b border-neutral-200 last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={answerId}
        className="group flex w-full items-center gap-4 py-5 text-left"
      >
        <span className="min-w-0 flex-1 text-balance text-[15px] font-semibold leading-relaxed text-neutral-950 group-hover:text-neutral-600">{f.title}</span>
        <IconPlus
          className={cn("h-5 w-5 shrink-0 text-neutral-500 transition-transform duration-300", open && "rotate-45 text-black")}
        />
      </button>
      <div
        id={answerId}
        inert={!open}
        aria-hidden={!open}
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="pb-6 pr-9">
            {/* 답변은 문단·목록이 여러 줄일 수 있어 줄바꿈을 그대로 살립니다. */}
            <p className="whitespace-pre-line text-pretty text-sm leading-[1.8] text-neutral-600">{f.summary}</p>
            <button
              onClick={onOpen}
              className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-medium text-neutral-500 transition-colors hover:text-volt-400"
            >
              {t("v.faq.full")} <IconArrow className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Q&A — 기본으로 펼쳐 두는 문항 수 (나머지는 '더 보기' 로 노출) */
const PAGE = 5;

/** Q&A 섹션 — Notion `Type = FAQ`(또는 Q&A) 글이 노출됩니다. */
export default function Qna() {
  const { t, lang } = useLang();
  const supportEmail = supportEmailFor(lang);
  const { faqs, openEntry } = useContent();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? faqs : faqs.slice(0, PAGE);

  return (
    <section id="faq" className="scroll-mt-20 border-t border-black/[0.06] py-14 sm:py-20">
      <div className="shell grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
        <Reveal className="lg:sticky lg:top-24 lg:self-start">
          <SectionHeader eyebrow="05 / HELP CENTER" title={t("v.faq.lead")} sub={t("v.faq.sub")} />
          <a
            href={`mailto:${supportEmail}`}
            className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-volt-400 hover:text-volt-300"
          >
            {supportEmail} <IconArrow className="h-4 w-4" />
          </a>
        </Reveal>

        <Reveal delay={60} className="rounded-2xl border border-neutral-200 bg-white px-6 pb-3">
          {faqs.length > 0 && (
            <p className="pt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">
              {faqs.length} {t("v.faq.count")}
            </p>
          )}
          {faqs.length === 0 && <p className="py-6 text-[14px] text-neutral-500">{t("v.faq.empty")}</p>}
          {visible.map((f) => (
            <QnaItem key={f.id} f={f} defaultOpen={false} onOpen={() => openEntry(f)} />
          ))}
          {faqs.length > PAGE && (
            <div className="flex justify-center py-2">
              <button
                onClick={() => setShowAll((v) => !v)}
                className="rounded-lg border border-neutral-300 px-5 py-3 text-[13px] font-medium text-neutral-700 transition-colors hover:border-black/25 hover:text-black"
              >
                {showAll ? t("v.faq.less") : `${t("v.faq.more")} (${faqs.length - PAGE})`}
              </button>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}

export { supportEmailFor, SUPPORT_EMAIL_GLOBAL, SUPPORT_EMAIL_KO };
