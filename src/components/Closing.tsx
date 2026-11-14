import { STUDIO_URL, TOOLS } from "../content/tools";
import { CHANNELS } from "../content/channels";
import { useLang } from "../i18n";
import { Logo, Reveal, VoltButton } from "./volt";
import { supportEmailFor } from "./Qna";

const socialColors: Record<string, string> = {
  x: "text-black",
  threads: "text-black",
  youtube: "text-[#ff0000]",
  instagram: "text-[#c13584]",
  naver: "text-[#03c75a]",
};

export default function Closing() {
  const { t, lang } = useLang();
  // 푸터 문의처도 화면 언어를 따릅니다(영어 = 미국 법인, 그 밖 = 한국 법인).
  const supportEmail = supportEmailFor(lang);
  const footerTools = TOOLS.slice(0, 5);

  return (
    <>
      {/* CTA */}
      <section className="pb-20 sm:pb-24">
        <div className="shell">
          <Reveal className="flex flex-col items-start justify-between gap-6 rounded-none border border-black/[0.08] bg-ink-900 p-8 sm:flex-row sm:items-center sm:p-10">
            <div>
              <h2 className="text-[1.5rem] font-medium tracking-[-0.02em] text-black sm:text-[1.75rem]">
                {t("v.cta.line1")} {t("v.cta.line2")}
              </h2>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-neutral-500">{t("v.cta.desc")}</p>
            </div>
            <VoltButton href={STUDIO_URL} icon className="shrink-0">
              {t("v.cta.start")}
            </VoltButton>
          </Reveal>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-black/[0.06] py-12">
        <div className="shell">
          <div className="grid gap-10 sm:grid-cols-[2fr_1fr_1fr]">
            <div>
              <Logo />
              <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-neutral-500">{t("v.footer.desc")}</p>
              <div className="mt-5 flex items-center gap-2.5">
                <svg aria-hidden="true" width="0" height="0" className="absolute">
                  <defs>
                    <linearGradient id="footer-instagram-gradient" x1="0" y1="1" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f9ce34" />
                      <stop offset="48%" stopColor="#ee2a7b" />
                      <stop offset="100%" stopColor="#6228d7" />
                    </linearGradient>
                  </defs>
                </svg>
                {CHANNELS.filter((c) => c.href && c.id !== "web" && c.id !== "notion").map((c) => {
                  const Icon = c.Icon;
                  return (
                    <a
                      key={c.id}
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={c.name}
                      title={`${c.name} (${c.handle})`}
                      className={`grid h-8 w-8 place-items-center rounded-full border border-black/10 bg-white transition-colors hover:border-black/25 hover:bg-black/[0.04] ${socialColors[c.id] ?? "text-neutral-700"}`}
                    >
                      <Icon className="h-4 w-4" style={c.id === "instagram" ? { fill: "url(#footer-instagram-gradient)" } : undefined} />
                    </a>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[13px] font-medium text-neutral-700">{t("v.footer.guide")}</p>
              <ul className="mt-3 space-y-2">
                {[
                  { l: t("nav.notices"), h: "#notices" },
                  { l: t("nav.news"), h: "#news" },
                  { l: t("nav.tools"), h: "#guides" },
                  { l: t("nav.blog"), h: "#blog" },
                  { l: t("nav.qna"), h: "#faq" },
                ].map((x) => (
                  <li key={x.h}>
                    <a href={x.h} className="text-[13.5px] text-neutral-500 transition-colors hover:text-black">
                      {x.l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[13px] font-medium text-neutral-700">{t("v.footer.tools")}</p>
              <ul className="mt-3 space-y-2">
                {footerTools.map((tool) => (
                  <li key={tool.slug}>
                    <a
                      href={tool.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13.5px] text-neutral-500 transition-colors hover:text-black"
                    >
                      {tool.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-3 border-t border-black/[0.06] pt-6 text-[12.5px] text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
            <p>{t("v.footer.rights")}</p>
            {/* 두 법인의 역할 — 개발·운영(한국)과 Stripe 결제 판매·청구(미국)를 구분해 표기합니다. */}
            <p className="sm:order-3 sm:basis-full sm:pt-1">{t("v.footer.entities")}</p>
            <a href={`mailto:${supportEmail}`} className="transition-colors hover:text-neutral-700">
              {supportEmail}
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
