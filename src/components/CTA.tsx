import { useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Bell, Check, Mail, MessageCircle } from "lucide-react";
import { Container, Reveal, Serif } from "./ui";
import { STUDIO_URL, FLOW_GIFS } from "../content/tools";
import { SmartImage } from "./common";
import { cn } from "../utils/cn";

export default function CTA() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setState("error");
    setState("loading");
    setTimeout(() => setState("done"), 900);
  };

  return (
    <section id="support" className="relative py-20 sm:py-28">
      <Container>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* Main CTA */}
          <Reveal className="h-full">
            <div className="relative isolate flex h-full flex-col justify-between overflow-hidden rounded-[32px] p-8 ring-1 ring-white/10 sm:p-12">
              <div aria-hidden className="absolute inset-0 -z-10">
                <SmartImage src={FLOW_GIFS.storyboard} className="h-full w-full object-cover opacity-25" />
                <div className="absolute inset-0 bg-gradient-to-br from-ink-950/90 via-ink-950/70 to-ink-950/40" />
                <div className="animate-drift absolute -left-20 top-0 h-72 w-72 rounded-full bg-violet-600/40 blur-[100px]" />
                <div className="animate-drift-slow absolute -right-10 bottom-0 h-72 w-72 rounded-full bg-fuchsia-600/30 blur-[100px]" />
              </div>
              <div>
                <p className="text-sm font-medium text-fuchsia-200">KBS Production Verified · Causality-Driven AI</p>
                <h2 className="mt-4 text-balance text-3xl font-bold leading-[1.2] tracking-[-0.035em] text-white sm:text-5xl">
                  시나리오를 입력하면,
                  <br />
                  <Serif className="text-gradient font-normal">하나의 이야기</Serif>가 되는 9컷.
                </h2>
                <p className="mt-4 max-w-md text-zinc-300">가이드를 다 읽으셨다면, 이제 직접 만들어 볼 차례입니다.</p>
              </div>
              <div className="mt-10 flex flex-wrap gap-3">
                <a
                  href={STUDIO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-ink-950 transition hover:shadow-[0_12px_40px_-6px_rgba(236,72,153,0.7)] active:scale-95"
                >
                  XCONDA 스튜디오 열기 <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
                <a href={`${STUDIO_URL}/studio/directors-cut`} target="_blank" rel="noopener noreferrer" className="glass inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm text-white transition hover:bg-white/10">
                  Ad Storyboard 템플릿
                </a>
              </div>
            </div>
          </Reveal>

          <div className="grid gap-4">
            {/* Subscribe */}
            <Reveal delay={100}>
              <div className="glass rounded-[28px] p-7">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-fuchsia-400/12 text-fuchsia-300 ring-1 ring-inset ring-fuchsia-400/20">
                  <Bell className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-white">업데이트 알림 받기</h3>
                <p className="mt-1 text-sm text-zinc-400">새 기능과 중요 공지를 메일로 가장 먼저 받아보세요.</p>
                <form onSubmit={onSubmit} noValidate className="mt-5">
                  <div className={cn("flex gap-2 rounded-full bg-black/30 p-1 ring-1 ring-inset ring-white/10", state === "error" && "ring-rose-400/60")}>
                    <label htmlFor="sub-email" className="sr-only">이메일</label>
                    <input
                      id="sub-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@studio.com"
                      value={email}
                      disabled={state === "done"}
                      aria-invalid={state === "error"}
                      aria-describedby="sub-help"
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (state === "error") setState("idle");
                      }}
                      className="h-10 min-w-0 flex-1 bg-transparent px-4 text-sm text-white placeholder-zinc-500 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={state === "loading" || state === "done"}
                      className={cn("inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition active:scale-95", state === "done" ? "bg-emerald-400 text-ink-950" : "bg-white text-ink-950")}
                    >
                      {state === "loading" ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-950/20 border-t-ink-950" /> : state === "done" ? <><Check className="h-4 w-4" /> 완료</> : <>구독 <ArrowRight className="h-3.5 w-3.5" /></>}
                    </button>
                  </div>
                  <p id="sub-help" aria-live="polite" className={cn("mt-2 px-2 text-xs", state === "error" ? "text-rose-300" : "text-zinc-500")}>
                    {state === "error" ? "올바른 이메일을 입력해 주세요." : state === "done" ? "구독이 완료되었습니다." : "언제든 구독을 해지할 수 있습니다."}
                  </p>
                </form>
              </div>
            </Reveal>

            {/* Contact */}
            <Reveal delay={180}>
              <div className="glass flex flex-col gap-4 rounded-[28px] p-7">
                <h3 className="text-lg font-semibold text-white">원하는 답을 찾지 못하셨나요?</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <a href="mailto:support@xconda.ai" className="group flex items-center gap-3 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.06] transition hover:bg-white/[0.07]">
                    <Mail className="h-5 w-5 text-violet-300" />
                    <span className="text-sm"><span className="block font-medium text-white">이메일 문의</span><span className="text-xs text-zinc-500">support@xconda.ai</span></span>
                  </a>
                  <a href={STUDIO_URL} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.06] transition hover:bg-white/[0.07]">
                    <MessageCircle className="h-5 w-5 text-fuchsia-300" />
                    <span className="text-sm"><span className="block font-medium text-white">스튜디오 내 문의</span><span className="text-xs text-zinc-500">로그인 후 채팅</span></span>
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
