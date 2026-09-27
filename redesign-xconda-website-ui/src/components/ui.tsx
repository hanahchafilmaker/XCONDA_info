import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SVGProps,
} from "react";
import { cn } from "@/utils/cn";

/* ───────────────────────── icons ───────────────────────── */

type IconProps = SVGProps<SVGSVGElement>;

const base = (p: IconProps) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const IconArrow = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const IconSearch = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const IconBullhorn = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Z" />
    <path d="M14 8.5a5 5 0 0 1 0 7M17.5 5.5a9 9 0 0 1 0 13" />
  </svg>
);
export const IconBook = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5Z" />
    <path d="M19 18v3H6.5A2.5 2.5 0 0 1 4 18.5" />
  </svg>
);
export const IconSpark = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />
    <path d="M18.5 16.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z" />
  </svg>
);
export const IconClock = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);
export const IconEye = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const IconClose = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconPin = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21v-6" />
    <path d="M8 3h8l-1 6 3 3H6l3-3-1-6Z" />
  </svg>
);
export const IconChevron = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const IconPlus = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconCheck = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);
export const IconExternal = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </svg>
);
export const IconMenu = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

/* ───────────────────────── logo ───────────────────────── */

export function Logo({ className }: { className?: string }) {
  return (
    <a href="#top" className={cn("group flex items-center gap-2.5", className)}>
      <span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-[10px] bg-volt-400">
        <span className="absolute -left-1 top-0 h-full w-1.5 rotate-12 bg-ink-950/85" />
        <svg viewBox="0 0 24 24" className="relative h-4 w-4 text-ink-950">
          <path
            d="M5 5l7 7-7 7M19 5l-7 7 7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-extrabold tracking-[-0.04em] text-white">
          XCONDA
          <span className="text-volt-400">.</span>
        </span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
          Guide Center
        </span>
      </span>
    </a>
  );
}

/* ───────────────────────── reveal on scroll ───────────────────────── */

export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article" | "span";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setSeen(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Comp = Tag as "div";
  return (
    <Comp
      ref={ref as React.Ref<HTMLDivElement>}
      className={cn("reveal", seen && "is-in", className)}
      style={{ ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </Comp>
  );
}

/* ───────────────────────── section chrome ───────────────────────── */

export function SectionLabel({
  index,
  title,
  kicker,
}: {
  index: string;
  title: string;
  kicker?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[11px] font-bold tracking-[0.22em] text-volt-400">
        {index}
      </span>
      <span className="h-px w-8 bg-volt-400/40" />
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
        {title}
      </span>
      {kicker && (
        <span className="hidden items-center gap-1.5 rounded-full border border-zinc-800 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-zinc-500 sm:inline-flex">
          {kicker}
        </span>
      )}
    </div>
  );
}

export function SectionHeading({
  children,
  sub,
}: {
  children: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="mt-5 space-y-4">
      <h2 className="text-balance-tight text-[2rem] font-extrabold leading-[1.08] text-white sm:text-[2.6rem] lg:text-[3.1rem]">
        {children}
      </h2>
      {sub && <p className="max-w-2xl text-[15px] leading-relaxed text-zinc-400">{sub}</p>}
    </div>
  );
}

export function Highlight({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 text-volt-400">{children}</span>
      <span className="absolute inset-x-0 bottom-1 z-0 h-2.5 -skew-x-6 bg-volt-400/15" />
    </span>
  );
}

/* ───────────────────────── badges / chips ───────────────────────── */

const toneMap: Record<string, string> = {
  volt: "border-volt-400/35 bg-volt-400/10 text-volt-300",
  zinc: "border-white/10 bg-white/[0.04] text-zinc-400",
  green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  red: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  blue: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  violet: "border-violet-400/25 bg-violet-400/10 text-violet-300",
};

export function Pill({
  children,
  tone = "zinc",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof toneMap | string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold tracking-wide",
        toneMap[tone] ?? toneMap.zinc,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function FilterChip({
  active,
  children,
  count,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[12.5px] font-semibold transition-all duration-300",
        active
          ? "border-volt-400 bg-volt-400 text-ink-950 glow-volt"
          : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/25 hover:text-white",
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "font-mono text-[10px]",
            active ? "text-ink-950/60" : "text-zinc-600",
          )}
        >
          {String(count).padStart(2, "0")}
        </span>
      )}
    </button>
  );
}

/* ───────────────────────── buttons ───────────────────────── */

export function VoltButton({
  children,
  href,
  onClick,
  className,
  icon,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  icon?: boolean;
}) {
  const cls = cn(
    "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-volt-400 px-6 py-3 text-[13px] font-extrabold tracking-tight text-ink-950 transition-all duration-300 hover:shadow-[0_14px_44px_-10px_rgba(255,214,10,0.75)] active:scale-[0.97]",
    className,
  );
  const inner = (
    <>
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative">{children}</span>
      {icon && <IconArrow className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />}
    </>
  );
  return href ? (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

export function GhostButton({
  children,
  href,
  onClick,
  className,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-[13px] font-bold text-zinc-200 transition-all duration-300 hover:border-white/35 hover:bg-white/[0.07] hover:text-white active:scale-[0.97]",
    className,
  );
  return href ? (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={cls}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/* ───────────────────────── modal shell ───────────────────────── */

export function Modal({
  open,
  onClose,
  children,
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={label}>
      <button
        aria-label="닫기"
        onClick={onClose}
        className="anim-fade absolute inset-0 bg-ink-950/85 backdrop-blur-md"
      />
      <div className="anim-modal relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-[26px] border border-white/10 bg-ink-900 shadow-[0_-20px_80px_-20px_rgba(0,0,0,0.9)] sm:max-h-[86vh] sm:max-w-3xl sm:rounded-[26px]">
        {children}
      </div>
    </div>
  );
}

/* ───────────────────────── misc ───────────────────────── */

export function useCountUp(target: number, run: boolean, duration = 1200) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, duration]);
  return n;
}

export function Marquee({
  items,
  speed = "normal",
}: {
  items: string[];
  speed?: "normal" | "slow";
}) {
  const doubled = [...items, ...items];
  return (
    <div className="mask-fade-x relative flex overflow-hidden">
      <div
        className={cn(
          "flex min-w-max items-center gap-10 pr-10",
          speed === "slow" ? "animate-marquee-slow" : "animate-marquee",
        )}
      >
        {doubled.map((t, i) => (
          <span key={i} className="flex items-center gap-3 whitespace-nowrap text-[12.5px] font-medium text-zinc-500">
            <span className="h-1 w-1 rounded-full bg-volt-400" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
