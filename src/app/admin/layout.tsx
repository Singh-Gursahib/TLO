"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo, LogoMark } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Delete, Lock, ArrowLeft, LayoutDashboard, Users, UsersRound, Inbox, ClipboardList, CalendarRange } from "lucide-react";

const PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || "3113";
const KEY = "tlo_admin_ok";

const tabs = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Students", href: "/admin/students", icon: Users },
  { label: "Staff", href: "/admin/staff", icon: UsersRound },
  { label: "Inquiries", href: "/admin/inquiries", icon: Inbox },
  { label: "Admissions", href: "/admin/admissions", icon: ClipboardList },
  { label: "Attendance", href: "/admin/attendance", icon: CalendarRange },
];

function PinGate({ onOk }: { onOk: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function press(d: string) {
    setError(false);
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => {
        if (next === PIN) {
          sessionStorage.setItem(KEY, "ok");
          onOk();
        } else {
          setError(true);
          setPin("");
        }
      }, 120);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-canvas">
      <LogoMark className="h-14 w-14 text-brand-900 mb-5" />
      <h1 className="text-xl font-semibold text-ink">Admin access</h1>
      <p className="text-sm text-muted mt-1 mb-7">Enter your 4-digit PIN</p>

      <div className={cn("flex gap-3 mb-8 transition-transform", error && "animate-[rise_0.3s]")}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn(
            "h-4 w-4 rounded-full border-2 transition-all",
            i < pin.length ? "bg-brand-800 border-brand-800" : "border-line-strong",
            error && "border-danger"
          )} />
        ))}
      </div>
      {error && <p className="text-sm text-danger -mt-5 mb-4">Incorrect PIN, try again</p>}

      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} onClick={() => press(d)} className="h-16 rounded-2xl bg-surface border border-line text-xl font-medium text-ink active:scale-95 active:bg-canvas transition-all shadow-sm">
            {d}
          </button>
        ))}
        <div />
        <button onClick={() => press("0")} className="h-16 rounded-2xl bg-surface border border-line text-xl font-medium text-ink active:scale-95 active:bg-canvas transition-all shadow-sm">0</button>
        <button onClick={() => setPin((p) => p.slice(0, -1))} className="h-16 rounded-2xl flex items-center justify-center text-muted active:scale-95">
          <Delete className="h-6 w-6" />
        </button>
      </div>

      <Link href="/" className="mt-8 text-sm text-muted hover:text-brand-700 inline-flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Back to app
      </Link>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setOk(sessionStorage.getItem(KEY) === "ok");
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!ok) return <PinGate onOk={() => setOk(true)} />;

  function lock() {
    sessionStorage.removeItem(KEY);
    router.push("/");
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-lg border-b border-line pt-safe">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo showText={false} />
              <div>
                <p className="text-sm font-semibold text-ink leading-none">Admin</p>
                <p className="text-[11px] text-muted mt-0.5">The Little Orbits</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/" className="btn-ghost btn-sm hidden sm:inline-flex"><ArrowLeft className="h-4 w-4" /> App</Link>
              <button onClick={lock} className="btn-outline btn-sm"><Lock className="h-4 w-4" /> Lock</button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto no-scrollbar -mb-px">
            {tabs.map((t) => {
              const active = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                    active ? "border-brand-800 text-brand-800" : "border-transparent text-muted hover:text-body"
                  )}
                >
                  <t.icon className="h-4 w-4" /> {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 pb-16">{children}</main>
    </div>
  );
}
