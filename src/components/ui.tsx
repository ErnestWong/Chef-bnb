import Link from "next/link";
import type { ReactNode } from "react";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-6 ${className}`}>{children}</div>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "warn" }) {
  const tones = {
    neutral: "border-line text-muted",
    accent: "border-transparent bg-accent-soft text-accent",
    warn: "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-accent text-white hover:opacity-90"
      : "border border-line hover:border-accent hover:text-accent";
  return (
    <Link href={href} className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium ${styles}`}>
      {children}
    </Link>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
      <p className="font-display text-xl">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Stars({ rating, count }: { rating: number | null; count?: number }) {
  if (rating === null) return <span className="text-sm text-muted">No reviews yet</span>;
  const full = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-1.5 text-sm" aria-label={`${rating} out of 5`}>
      <span className="text-accent" aria-hidden>
        {"★".repeat(full)}
        <span className="opacity-30">{"★".repeat(5 - full)}</span>
      </span>
      <span className="font-medium">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-muted">({count})</span>}
    </span>
  );
}

/** Warm placeholder when a chef has no photos yet. */
export function Monogram({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-10 w-10 text-base", md: "h-14 w-14 text-xl", lg: "h-24 w-24 text-4xl" };
  return (
    <div
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-display font-semibold text-accent ${sizes[size]}`}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
