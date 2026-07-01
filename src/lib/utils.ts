import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(first?: string | null, last?: string | null) {
  return `${(first?.[0] ?? "").toUpperCase()}${(last?.[0] ?? "").toUpperCase()}` || "?";
}

export function fullName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(" ");
}

export function ageFromDob(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function fmtTime(ts?: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
}

export function fmtDate(ts?: string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-CA", opts ?? { month: "short", day: "numeric", year: "numeric" });
}

export function fmtDateTime(ts?: string | null): string {
  if (!ts) return "—";
  return `${fmtDate(ts)} · ${fmtTime(ts)}`;
}

export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local tz
}

export function relativeDay(dateStr: string): string {
  const today = todayISO();
  if (dateStr === today) return "Today";
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.round((Date.now() - d.getTime()) / 86400000);
  if (diff === 1) return "Yesterday";
  return fmtDate(dateStr, { weekday: "short", month: "short", day: "numeric" });
}

// Communication deep-links
export const telHref = (p?: string | null) => (p ? `tel:${p.replace(/[^+\d]/g, "")}` : undefined);
export const smsHref = (p?: string | null) => (p ? `sms:${p.replace(/[^+\d]/g, "")}` : undefined);
export const mailHref = (e?: string | null) => (e ? `mailto:${e}` : undefined);

export function hoursBetween(a?: string | null, b?: string | null): number {
  if (!a || !b) return 0;
  const start = new Date(a).getTime();
  const end = new Date(b).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return (end - start) / 3600000;
}

export function fmtHours(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${mins.toString().padStart(2, "0")}m`;
}
