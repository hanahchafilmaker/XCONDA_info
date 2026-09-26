import { ArrowUpRight } from "lucide-react";
import { Container, Logo } from "./ui";
import { useLang } from "../i18n";
import { STUDIO_URL } from "../content/tools";
import { NotionMark } from "./common";
import { useContent } from "../content/ContentContext";
import { timeAgo } from "../notion";

const cols = [
  {
    titleKey: "footer.col.guide",
    links: [
      { key: "nav.notices", h: "#notices" },
      { key: "nav.updates", h: "#updates" },
      { key: "nav.start", h: "#start" },
      { key: "nav.faq", h: "#faq" },
    ],
  },
  {
    titleKey: "footer.col.studio",
    links: [
      { label: "360 Turn Studio", h: `${STUDIO_URL}/studio/turn` },
      { label: "Director's Cut", h: `${STUDIO_URL}/studio/directors-cut` },
      { label: "Art Director Pro", h: STUDIO_URL },
      { key: "footer.link.allTools", h: "#tools" },
    ],
  },
  {
    title: "XCONDA",
    links: [
      { key: "footer.link.openStudio", h: STUDIO_URL },
      { key: "footer.link.buyCredits", h: "#credits" },
      { key: "common.contact", h: "#support" },
      { key: "footer.link.email", h: "mailto:support@xconda.ai" },
    ],
  },
];

export default function Footer() {
  const { t, pick } = useLang();
  const { source, syncedAt } = useContent();
  return (
    <footer className="relative border-t border-white/[0.06] pt-16">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <div className="flex items-center gap-2">
              <Logo />
              <span className="rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[11px] font-semibold text-zinc-300 ring-1 ring-inset ring-white/10">Guide</span>
            </div>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-zinc-400">
              {t("footer.tagline")}
            </p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-400 ring-1 ring-inset ring-white/10">
              <NotionMark className="h-3.5 w-3.5 text-zinc-300" />
              {source === "notion"
                ? pick(
                    `Powered by Notion · ${syncedAt ? timeAgo(syncedAt) : ""} 동기화`,
                    `Powered by Notion · synced ${syncedAt ? timeAgo(syncedAt) : ""}`
                  )
                : t("footer.poweredNotion")}
            </p>
          </div>
          <nav aria-label={t("footer.navAria")} className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {cols.map((c, ci) => {
              const title = c.title ?? t(c.titleKey!);
              return (
                <div key={ci}>
                  <h3 className="text-sm font-semibold text-white">{title}</h3>
                  <ul className="mt-4 flex flex-col gap-3">
                    {c.links.map((x) => {
                      const ext = x.h.startsWith("http");
                      const label = "label" in x && x.label ? x.label : t((x as { key: string }).key);
                      return (
                        <li key={x.h}>
                          <a
                            href={x.h}
                            {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                            className="group inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-white"
                          >
                            {label}
                            {ext && <ArrowUpRight className="h-3 w-3 opacity-50 transition group-hover:opacity-100" />}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] py-8 text-xs text-zinc-500 sm:flex-row">
          <p>© {new Date().getFullYear()} XCONDA. All rights reserved.</p>
          <p>KBS Production Verified · Causality-Driven AI</p>
        </div>
      </Container>
      <div aria-hidden className="pointer-events-none select-none overflow-hidden">
        <p className="text-gradient-soft -mb-[0.2em] text-center text-[20vw] font-bold leading-none tracking-[-0.04em] opacity-[0.06]">XCONDA</p>
      </div>
    </footer>
  );
}
