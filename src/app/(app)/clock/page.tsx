"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { todayISO, fmtTime, fullName, hoursBetween, fmtHours } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Loading, PageHeader } from "@/components/ui/Primitives";
import type { SessionStaff } from "@/lib/types";
import { Clock, LogIn, LogOut, User, Lock, CircleDot } from "lucide-react";

interface OpenSession {
  id: string;
  clock_in: string;
  staff: { id: string; first_name: string; last_name: string } | null;
}
interface DaySession {
  id: string;
  clock_in: string | null;
  clock_out: string | null;
  staff: { first_name: string; last_name: string } | null;
}

async function loadClock() {
  const today = todayISO();
  const [open, day] = await Promise.all([
    supabase.from("staff_attendance").select("id,clock_in,staff:staff_id(id,first_name,last_name)").eq("date", today).is("clock_out", null),
    supabase.from("staff_attendance").select("id,clock_in,clock_out,staff:staff_id(first_name,last_name)").eq("date", today).order("clock_in", { ascending: false }),
  ]);
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    open: (open.data as any as OpenSession[]) ?? [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    day: (day.data as any as DaySession[]) ?? [],
  };
}

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <div className="text-center py-2">
      <div className="text-4xl font-semibold text-ink tracking-tight tabular-nums">
        {now.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}
      </div>
      <div className="text-sm text-muted mt-1">
        {now.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
      </div>
    </div>
  );
}

export default function ClockPage() {
  const { data, loading, refetch } = useAsync(loadClock, []);
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function punch() {
    if (!username || !password) return toast("Enter your username and password", "error");
    setBusy(true);
    try {
      const { data: rows, error } = await supabase.rpc("verify_staff_login", {
        p_username: username.trim(),
        p_password: password,
      });
      if (error) throw error;
      const staff = (rows as SessionStaff[])?.[0];
      if (!staff) {
        toast("Incorrect username or password", "error");
        return;
      }
      const today = todayISO();
      const { data: openRows } = await supabase
        .from("staff_attendance")
        .select("id,clock_in")
        .eq("staff_id", staff.id)
        .eq("date", today)
        .is("clock_out", null)
        .order("clock_in", { ascending: false })
        .limit(1);

      if (openRows && openRows.length > 0) {
        const { error: e2 } = await supabase
          .from("staff_attendance")
          .update({ clock_out: new Date().toISOString() })
          .eq("id", openRows[0].id);
        if (e2) throw e2;
        toast(`${staff.first_name} clocked out — have a great evening!`);
      } else {
        const { error: e3 } = await supabase
          .from("staff_attendance")
          .insert({ staff_id: staff.id, date: today, clock_in: new Date().toISOString() });
        if (e3) throw e3;
        toast(`Welcome, ${staff.first_name}! Clocked in.`);
      }
      setUsername("");
      setPassword("");
      refetch();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast(e.message ?? "Something went wrong", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page animate-rise max-w-xl">
      <PageHeader title="Time Clock" subtitle="Clock in and out for your shift" />

      <div className="card p-5 mb-6">
        <LiveClock />
        <div className="mt-4 space-y-3">
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted" />
            <input
              className="input pl-10"
              placeholder="Username"
              autoCapitalize="none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted" />
            <input
              className="input pl-10"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && punch()}
            />
          </div>
          <button className="btn-primary w-full btn-lg" onClick={punch} disabled={busy}>
            {busy ? "Checking…" : <><LogIn className="h-5 w-5" /> Clock in / out</>}
          </button>
          <p className="text-xs text-muted text-center">
            Enter your credentials to clock in, or again to clock out.
          </p>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <>
          {(data?.open.length ?? 0) > 0 && (
            <div className="mb-6">
              <p className="section-title mb-2.5 px-1">On shift now</p>
              <div className="card row-divide overflow-hidden">
                {data!.open.map((o) => (
                  <div key={o.id} className="row">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ok-soft text-ok shrink-0">
                      <CircleDot className="h-[18px] w-[18px]" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink">{o.staff ? fullName(o.staff.first_name, o.staff.last_name) : "Staff"}</p>
                      <p className="text-xs text-muted">Since {fmtTime(o.clock_in)}</p>
                    </div>
                    <span className="badge-ok">On shift</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="section-title mb-2.5 px-1">Today&apos;s activity</p>
            <div className="card row-divide overflow-hidden">
              {(data?.day.length ?? 0) === 0 ? (
                <div className="p-6 text-center text-sm text-muted">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-muted" />
                  No clock activity yet today.
                </div>
              ) : (
                data!.day.map((d) => (
                  <div key={d.id} className="row">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${d.clock_out ? "bg-canvas text-muted" : "bg-ok-soft text-ok"}`}>
                      {d.clock_out ? <LogOut className="h-[18px] w-[18px]" /> : <LogIn className="h-[18px] w-[18px]" />}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink">{d.staff ? fullName(d.staff.first_name, d.staff.last_name) : "Staff"}</p>
                      <p className="text-xs text-muted">
                        In {fmtTime(d.clock_in)}{d.clock_out ? ` · Out ${fmtTime(d.clock_out)}` : " · working"}
                      </p>
                    </div>
                    {d.clock_out && (
                      <span className="badge-slate">{fmtHours(hoursBetween(d.clock_in, d.clock_out))}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
