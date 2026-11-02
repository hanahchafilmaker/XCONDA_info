import { STUDIO_URL, TOOLS } from "../content/tools";
import { CHANNELS } from "../content/channels";
import { useLang } from "../i18n";
import { Logo, Reveal, VoltButton } from "./volt";
import { SUPPORT_EMAIL } from "./Qna";

const socialColors: Record<string, string> = {
  x: "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700",
  threads: "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700",
  youtube: "border-red-100 bg-red-50 text-red-600 hover:bg-red-100",
  instagram: "border-pink-100 bg-pink-50 text-pink-700 hover:bg-pink-100",
  naver: "border-green-100 bg-green-50 text-green-700 hover:bg-green-100",
};

export default function Closing() {
  const { t } = useLang();
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
      <footer className="border-t border-violet-200/60 bg-gradient-to-br from-[#f6f3ff] via-[#fbfaff] to-[#f5f9ed] py-12">
        <div className="shell">
          <div className="grid gap-10 sm:grid-cols-[2fr_1fr_1fr]">
            <div>
              <Logo />
              <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-neutral-500">{t("v.footer.desc")}</p>
              <div className="mt-5 flex items-center gap-2.5">
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
                      className={`grid h-8 w-8 place-items-center rounded-full border transition-colors ${socialColors[c.id] ?? "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"}`}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[13px] font-semibold text-violet-900">{t("v.footer.guide")}</p>
              <ul className="mt-3 space-y-2">
                {[
                  { l: t("nav.notices"), h: "#notices" },
                  { l: t("nav.news"), h: "#news" },
                  { l: t("nav.tools"), h: "#guides" },
                  { l: t("nav.blog"), h: "#blog" },
                  { l: t("nav.qna"), h: "#faq" },
                ].map((x) => (
                  <li key={x.h}>
                    <a href={x.h} className="text-[13.5px] text-neutral-600 transition-colors hover:text-violet-800">
                      {x.l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[13px] font-semibold text-violet-900">{t("v.footer.tools")}</p>
              <ul className="mt-3 space-y-2">
                {footerTools.map((tool) => (
                  <li key={tool.slug}>
                    <a
                      href={tool.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13.5px] text-neutral-600 transition-colors hover:text-violet-800"
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
            <a href={`mailto:${SUPPORT_EMAIL}`} className="transition-colors hover:text-neutral-700">
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
