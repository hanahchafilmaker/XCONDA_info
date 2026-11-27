import { STUDIO_URL, TOOLS } from "../content/tools";
import { socialChannelsFor } from "../content/channels";
import { useLang } from "../i18n";
import { Logo, Reveal, VoltButton } from "./volt";
import { supportEmailFor } from "./Qna";

const socialColors: Record<string, string> = {
  x: "text-black",
  threads: "text-black",
  youtube: "text-[#ff0000]",
  instagram: "text-[#c13584]",
  facebook: "text-[#0866ff]",
};

export default function Closing() {
  const { t, lang } = useLang();
  // 푸터 문의처는 시장을 따릅니다 — 한국어는 cuberry.kr, 그 밖의 언어는 cubeberry.ai(2026-11-27 도메인·메일 분리).
  const supportEmail = supportEmailFor(lang);
  const footerTools = TOOLS.slice(0, 5);

  return (
    <>
      {/* CTA */}
      <section className="pb-14 sm:pb-20">
        <div className="shell">
          <Reveal className="flex flex-col items-start justify-between gap-8 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm sm:flex-row sm:items-center sm:p-12">
            <div>
              <p className="mb-4 text-[11px] font-medium tracking-wider text-neutral-600">{t("home.footerEyebrow")}</p>
              <h2 className="text-2xl font-bold tracking-[-0.03em] text-neutral-950 sm:text-[30px]">
                {t("v.cta.line1")} {t("v.cta.line2")}
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-neutral-600">{t("v.cta.desc")}</p>
            </div>
            <VoltButton href={STUDIO_URL} icon className="shrink-0 bg-volt-500 text-neutral-950 hover:bg-volt-200">
              {t("v.cta.start")}
            </VoltButton>
          </Reveal>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-neutral-200 bg-neutral-50 py-12">
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
                {socialChannelsFor(lang).map((c) => {
                  const Icon = c.Icon;
                  return (
                    <a
                      key={c.id}
                      data-social-channel={c.id}
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${c.name} (${c.handle})`}
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
            <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1">
              <a href="https://www.xconda.ai/legal/terms" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-neutral-700">{t("v.footer.terms")}</a>
              <a href="https://www.xconda.ai/legal/privacy" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-neutral-700">{t("v.footer.privacy")}</a>
              <a href="https://www.xconda.ai/legal/refund" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-neutral-700">{t("v.footer.refund")}</a>
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
}
