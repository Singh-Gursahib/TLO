import { cn, initials } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/* ---- Avatar --------------------------------------------------------------- */
export function Avatar({
  first,
  last,
  size = 40,
  className,
}: {
  first?: string | null;
  last?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("avatar", className)}
      style={{ height: size, width: size, fontSize: size * 0.36 }}
    >
      {initials(first, last)}
    </span>
  );
}

/* ---- Spinner -------------------------------------------------------------- */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block rounded-full border-2 border-brand-200 border-t-brand-700", className)}
      style={{ width: "1.15em", height: "1.15em", animation: "spin-slow 0.7s linear infinite" }}
    />
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Spinner className="text-2xl" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/* ---- Empty state ---------------------------------------------------------- */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 mb-4">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description && <p className="text-sm text-muted mt-1 max-w-xs">{description}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

/* ---- Stat card ------------------------------------------------------------ */
export function StatCard({
  icon: Icon,
  value,
  label,
  tone = "teal",
  hint,
}: {
  icon: LucideIcon;
  value: React.ReactNode;
  label: string;
  tone?: "teal" | "ok" | "warn" | "danger" | "info";
  hint?: string;
}) {
  const tones: Record<string, string> = {
    teal: "bg-brand-50 text-brand-700",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
  };
  return (
    <div className="stat">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl mb-1", tones[tone])}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {hint && <div className="text-xs text-muted/80 mt-0.5">{hint}</div>}
    </div>
  );
}

/* ---- Page header ---------------------------------------------------------- */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        <h1 className="text-[22px] sm:text-2xl font-semibold text-ink tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ---- Section wrapper ------------------------------------------------------ */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-6", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-2.5 px-1">
          {title && <h2 className="section-title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
