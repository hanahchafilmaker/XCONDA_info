import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type SVGProps,
} from "react";
import { cn } from "../utils/cn";

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
export const IconCoins = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="9" r="6" />
    <path d="M15.5 6.5A6 6 0 1 1 12 18a6 6 0 0 0 3.5-11.5Z" />
  </svg>
);
export const IconGrid = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </svg>
);
export const IconGit = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="7" cy="6" r="2.2" />
    <circle cx="7" cy="18" r="2.2" />
    <circle cx="17" cy="12" r="2.2" />
    <path d="M7 8.2v7.6M9.2 6h3.3a2.5 2.5 0 0 1 2.5 2.5v1.3" />
  </svg>
);

/* ───────────────────────── logo ───────────────────────── */

/**
 * XCONDA 공식 마크 — 옐로(＼) 획이 화이트(／) 획을 가르며 교차하는 플랫 X.
 * 화이트 획은 마스크로 잘라내 배경색과 무관하게 틈이 보입니다.
 * 에셋 원본: assets/img/logo/xconda-mark.svg (단일 파일 빌드를 위해 인라인으로도 유지)
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <mask id={`${uid}-cut`} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <rect width="32" height="32" fill="#fff" />
          <path d="M4 4h7l17 24h-7z" fill="#000" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
        </mask>
      </defs>
      {/* 화이트 획 (／) — 옐로 획 주변을 잘라냄 */}
      <path d="M21 4h7L11 28H4z" fill="#FFFFFF" mask={`url(#${uid}-cut)`} />
      {/* 옐로 획 (＼) */}
      <path d="M4 4h7l17 24h-7z" fill="#FFD60A" />
    </svg>
  );
}

/** 헤더·푸터 로고 락업: 마크 + "Xconda" 워드마크 */
export function Logo({ className }: { className?: string }) {
  return (
    <a href="#top" aria-label="XCONDA허브 홈" className={cn("flex items-center gap-2", className)}>
      <LogoMark className="h-[22px] w-[22px] shrink-0" />
      <span className="text-[19px] font-bold leading-none tracking-[-0.02em] text-white">Xconda</span>
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

/** 섹션 머리: 작은 라벨 + 제목 + 한 줄 설명 (+ 우측 액션) */
export function SectionHeader({
  eyebrow,
  title,
  sub,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-[13px] font-semibold text-volt-400">{eyebrow}</p>}
        <h2 className="mt-2 text-[1.75rem] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[2.1rem]">
          {title}
        </h2>
        {sub && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-zinc-400">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** 강조 텍스트 — 색상만 사용 (장식 바 없음) */
export function Highlight({ children }: { children: ReactNode }) {
  return <span className="text-volt-400">{children}</span>;
}

/** 필터 탭 (세그먼트) */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto">
      {items.map((it) => (
        <button
          key={it.id}
          role="tab"
          aria-selected={value === it.id}
          onClick={() => onChange(it.id)}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
            value === it.id ? "bg-white text-ink-950" : "text-zinc-400 hover:bg-white/[0.06] hover:text-white",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────── badges / chips ───────────────────────── */

const toneMap: Record<string, string> = {
  volt: "bg-volt-400/12 text-volt-300",
  zinc: "bg-white/[0.06] text-zinc-400",
  red: "bg-rose-400/10 text-rose-300",
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
        "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-semibold",
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
          ? "border-volt-400 bg-volt-400 text-ink-950"
          : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/25 hover:text-white",
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cn("font-mono text-[10px]", active ? "text-ink-950/60" : "text-zinc-600")}>
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
    "group inline-flex items-center justify-center gap-2 rounded-full bg-volt-400 px-5 py-2.5 text-[14px] font-bold text-ink-950 transition-colors hover:bg-volt-300 active:scale-[0.98]",
    className,
  );
  const inner = (
    <>
      <span>{children}</span>
      {icon && <IconArrow className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />}
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
    "inline-flex items-center justify-center gap-2 rounded-full border border-white/12 px-5 py-2.5 text-[14px] font-semibold text-zinc-200 transition-colors hover:border-white/25 hover:bg-white/[0.04] hover:text-white active:scale-[0.98]",
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
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <button aria-label="닫기" onClick={onClose} className="anim-fade absolute inset-0 bg-ink-950/85 backdrop-blur-md" />
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

/** 4자리 mono 숫자 카운터 (조회수 등) */
export function useCountUpPad(target: number, run: boolean, pad = 4, duration = 1200) {
  const n = useCountUp(target, run, duration);
  return String(n).padStart(pad, "0");
}
