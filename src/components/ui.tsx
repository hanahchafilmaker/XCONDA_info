import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
  type CSSProperties,
  type MouseEvent,
  type ComponentPropsWithoutRef,
} from "react";
import { cn } from "../utils/cn";

/* ---------- useInView ---------- */
export function useInView<T extends Element>(options?: IntersectionObserverInit & { once?: boolean }) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const once = options?.once ?? true;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold: options?.threshold ?? 0.15, rootMargin: options?.rootMargin ?? "0px 0px -60px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, options?.threshold, options?.rootMargin]);

  return { ref, inView };
}

/* ---------- Reveal ---------- */
type RevealProps = {
  as?: ElementType;
  delay?: number;
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
};

export function Reveal({ as: Tag = "div", delay = 0, className, children, style }: RevealProps) {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <Tag
      ref={ref}
      className={cn("reveal", inView && "is-visible", className)}
      style={{ ...style, ["--delay" as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/* ---------- Spotlight handler ---------- */
export function trackSpotlight(e: MouseEvent<HTMLElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
}

/* ---------- Eyebrow / Section heading ---------- */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide text-zinc-300",
        className
      )}
    >
      <span className="bg-brand h-1.5 w-1.5 rounded-full" aria-hidden />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        align === "center" ? "mx-auto max-w-3xl items-center text-center" : "max-w-2xl items-start text-left",
        className
      )}
    >
      {eyebrow && (
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
        </Reveal>
      )}
      <Reveal delay={80}>
        <h2 className="text-gradient-soft text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
          {title}
        </h2>
      </Reveal>
      {description && (
        <Reveal delay={160}>
          <p className="text-pretty text-base leading-relaxed text-zinc-400 sm:text-lg">{description}</p>
        </Reveal>
      )}
    </div>
  );
}

/* ---------- Serif accent ---------- */
export function Serif({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-serif font-normal italic tracking-[-0.01em]", className)}>{children}</span>;
}

/* ---------- Buttons ---------- */
type ButtonProps = ComponentPropsWithoutRef<"a"> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
};

export function ButtonLink({ variant = "primary", size = "md", className, children, ...props }: ButtonProps) {
  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-5 text-sm",
    lg: "h-13 px-7 text-[15px]",
  };
  const variants = {
    primary:
      "bg-white text-ink-950 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_30px_-6px_rgba(236,72,153,0.45)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_12px_40px_-4px_rgba(236,72,153,0.6)]",
    secondary: "glass text-white hover:bg-white/10",
    ghost: "text-zinc-300 hover:text-white hover:bg-white/5",
  };
  return (
    <a
      className={cn(
        "group relative inline-flex select-none items-center justify-center gap-2 overflow-hidden rounded-full font-medium transition-all duration-300 ease-out active:scale-[0.97]",
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    >
      {variant === "primary" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-fuchsia-200/60 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
        />
      )}
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </a>
  );
}

/* ---------- Logo ---------- */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="bg-brand relative grid h-8 w-8 place-items-center rounded-[10px] shadow-[0_6px_20px_-4px_rgba(236,72,153,0.6)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
          <path d="M5 4l14 16M19 4L5 20" stroke="white" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 rounded-[10px] ring-1 ring-inset ring-white/25" />
      </span>
      <span className="text-[16px] font-bold tracking-[0.02em] text-white">XCONDA</span>
    </span>
  );
}

/* ---------- Container ---------- */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-5 sm:px-8", className)}>{children}</div>;
}

/* ---------- Count up ---------- */
export function CountUp({
  to,
  decimals = 0,
  duration = 1800,
  prefix = "",
  suffix = "",
}: {
  to: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>({ threshold: 0.5 });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVal(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      setVal(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}
