"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { primaryNav, secondaryNav, adminNav } from "./navConfig";
import { Logo, LogoMark } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { LayoutGrid, X } from "lucide-react";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/* ---------------- Desktop sidebar ---------------- */
function Sidebar({ pathname }: { pathname: string }) {
  const groups = [
    { label: "Daily", items: primaryNav },
    { label: "Records", items: secondaryNav },
  ];
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-line bg-surface">
      <div className="px-5 h-16 flex items-center border-b border-line">
        <Logo />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="eyebrow px-3 mb-2">{g.label}</p>
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active ? "bg-brand-50 text-brand-800" : "text-body hover:bg-canvas"
                    )}
                  >
                    <item.icon className={cn("h-[18px] w-[18px]", active ? "text-brand-700" : "text-muted")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-line">
        <Link
          href={adminNav.href}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            isActive(pathname, adminNav.href) ? "bg-brand-50 text-brand-800" : "text-body hover:bg-canvas"
          )}
        >
          <adminNav.icon className="h-[18px] w-[18px] text-muted" />
          {adminNav.label}
        </Link>
      </div>
    </aside>
  );
}

/* ---------------- Mobile top bar ---------------- */
function TopBar() {
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-surface/85 backdrop-blur-lg border-b border-line pt-safe">
      <div className="h-14 px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark className="h-8 w-8 text-brand-900" />
          <span className="font-semibold text-ink tracking-tight">The Little Orbits</span>
        </Link>
      </div>
    </header>
  );
}

/* ---------------- Mobile bottom nav ---------------- */
function BottomNav({ pathname, onMore }: { pathname: string; onMore: () => void }) {
  const moreActive = secondaryNav.some((i) => isActive(pathname, i.href)) || isActive(pathname, adminNav.href);
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/90 backdrop-blur-lg border-t border-line shadow-nav pb-safe">
      <div className="grid grid-cols-5">
        {primaryNav.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 py-2.5 relative"
            >
              <item.icon
                className={cn("h-[22px] w-[22px] transition-colors", active ? "text-brand-800" : "text-muted")}
                strokeWidth={active ? 2.4 : 2}
              />
              <span className={cn("text-[10.5px] font-medium", active ? "text-brand-800" : "text-muted")}>
                {item.label}
              </span>
            </Link>
          );
        })}
        <button onClick={onMore} className="flex flex-col items-center justify-center gap-1 py-2.5">
          <LayoutGrid
            className={cn("h-[22px] w-[22px]", moreActive ? "text-brand-800" : "text-muted")}
            strokeWidth={moreActive ? 2.4 : 2}
          />
          <span className={cn("text-[10.5px] font-medium", moreActive ? "text-brand-800" : "text-muted")}>
            More
          </span>
        </button>
      </div>
    </nav>
  );
}

/* ---------------- More menu (mobile) ---------------- */
function MoreMenu({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) {
  if (!open) return null;
  const items = [...secondaryNav, adminNav];
  return (
    <div className="lg:hidden fixed inset-0 z-40 flex items-end">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div className="relative w-full bg-surface rounded-t-3xl shadow-pop animate-sheet pb-safe">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-base font-semibold text-ink">More</h2>
          <button onClick={onClose} className="icon-btn text-muted hover:bg-canvas">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 p-4">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border p-4 transition-colors",
                  active ? "border-brand-200 bg-brand-50" : "border-line bg-surface hover:bg-canvas"
                )}
              >
                <item.icon className={cn("h-6 w-6", active ? "text-brand-700" : "text-muted")} />
                <span className={cn("text-[13px] font-medium text-center", active ? "text-brand-800" : "text-body")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-dvh">
      <Sidebar pathname={pathname} />
      <div className="lg:pl-64">
        <TopBar />
        <main className="pt-4 pb-28 lg:pb-12 lg:pt-8">{children}</main>
      </div>
      <BottomNav pathname={pathname} onMore={() => setMoreOpen(true)} />
      <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} pathname={pathname} />
    </div>
  );
}
