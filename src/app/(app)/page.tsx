"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { todayISO, fmtTime, fullName } from "@/lib/utils";
import { Loading, StatCard, Section, Avatar } from "@/components/ui/Primitives";
import {
  UserCheck, Footprints, ShieldAlert, Thermometer, Clock, ChevronRight,
  CircleAlert, TriangleAlert, CalendarClock,
} from "lucide-react";

interface DashData {
  activeStudents: { id: string; first_name: string; last_name: string }[];
  todayAtt: { student_id: string; status: string }[];
  recentAtt: { student_id: string; date: string; status: string }[];
  activeOutings: { id: string; title: string; destination: string | null; expected_return: string | null }[];
  outParticipantsPending: number;
  openIncidents: { id: string; quick_note: string | null; severity: string; created_at: string }[];
  fridgeLatest: { date: string; temp_c: number; in_range: boolean | null } | null;
  fridgeToday: boolean;
  clockedIn: { id: string; clock_in: string | null; staff: { first_name: string; last_name: string } | null }[];
}

async function loadDashboard(): Promise<DashData> {
  const today = todayISO();
  const since = new Date(Date.now() - 20 * 86400000).toLocaleDateString("en-CA");

  const [students, todayAtt, recentAtt, outings, incidents, fridge, clock] = await Promise.all([
    supabase.from("students").select("id,first_name,last_name").eq("status", "active").order("first_name"),
    supabase.from("student_attendance").select("student_id,status").eq("date", today),
    supabase.from("student_attendance").select("student_id,date,status").gte("date", since).order("date", { ascending: false }),
    supabase.from("outings").select("id,title,destination,expected_return").eq("status", "out"),
    supabase.from("incidents").select("id,quick_note,severity,created_at").eq("status", "draft").order("created_at", { ascending: false }),
    supabase.from("fridge_temp_logs").select("date,temp_c,in_range").order("date", { ascending: false }).limit(1),
    supabase.from("staff_attendance").select("id,clock_in,staff:staff_id(first_name,last_name)").eq("date", today).is("clock_out", null),
  ]);

  let pending = 0;
  const outIds = (outings.data ?? []).map((o) => o.id);
  if (outIds.length) {
    const { count } = await supabase
      .from("outing_participants")
      .select("id", { count: "exact", head: true })
      .in("outing_id", outIds)
      .is("checked_in_at", null);
    pending = count ?? 0;
  }

  const fridgeLatest = fridge.data?.[0] ?? null;
  return {
    activeStudents: students.data ?? [],
    todayAtt: todayAtt.data ?? [],
    recentAtt: recentAtt.data ?? [],
    activeOutings: outings.data ?? [],
    outParticipantsPending: pending,
    openIncidents: incidents.data ?? [],
    fridgeLatest,
    fridgeToday: fridgeLatest?.date === today,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clockedIn: (clock.data as any) ?? [],
  };
}

function computeConsecutiveAbsences(
  students: { id: string; first_name: string; last_name: string }[],
  recent: { student_id: string; date: string; status: string }[]
) {
  const byStudent = new Map<string, { date: string; status: string }[]>();
  for (const r of recent) {
    if (!byStudent.has(r.student_id)) byStudent.set(r.student_id, []);
    byStudent.get(r.student_id)!.push(r);
  }
  const flagged: { student: { first_name: string; last_name: string }; days: number }[] = [];
  for (const s of students) {
    const rows = (byStudent.get(s.id) ?? []).sort((a, b) => (a.date < b.date ? 1 : -1));
    let streak = 0;
    for (const row of rows) {
      if (row.status === "absent") streak++;
      else break;
    }
    if (streak >= 3) flagged.push({ student: s, days: streak });
  }
  return flagged.sort((a, b) => b.days - a.days);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { data, loading } = useAsync(loadDashboard, []);

  if (loading || !data) {
    return (
      <div className="page">
        <Loading label="Loading today…" />
      </div>
    );
  }

  const presentIds = new Set(data.todayAtt.filter((a) => a.status === "present" || a.status === "late").map((a) => a.student_id));
  const absentCount = data.todayAtt.filter((a) => a.status === "absent").length;
  const present = presentIds.size;
  const expected = data.activeStudents.length;
  const notMarked = Math.max(0, expected - data.todayAtt.length);
  const flagged = computeConsecutiveAbsences(data.activeStudents, data.recentAtt);
  const fridgeOutOfRange = data.fridgeLatest && data.fridgeLatest.in_range === false;

  const alerts: { icon: typeof CircleAlert; tone: string; text: string; href: string }[] = [];
  if (data.activeOutings.length > 0) {
    alerts.push({
      icon: Footprints,
      tone: "info",
      text: `${data.outParticipantsPending} ${data.outParticipantsPending === 1 ? "child is" : "children are"} out on “${data.activeOutings[0].title}” — awaiting return check-in.`,
      href: `/outings/${data.activeOutings[0].id}`,
    });
  }
  for (const f of flagged) {
    alerts.push({
      icon: TriangleAlert,
      tone: "warn",
      text: `${fullName(f.student.first_name, f.student.last_name)} has been absent ${f.days} days in a row.`,
      href: "/attendance",
    });
  }
  if (!data.fridgeToday) {
    alerts.push({ icon: Thermometer, tone: "warn", text: "Fridge temperature hasn't been logged today.", href: "/temperature" });
  }
  if (fridgeOutOfRange) {
    alerts.push({ icon: TriangleAlert, tone: "danger", text: `Last fridge reading ${data.fridgeLatest!.temp_c}°C was out of the safe range.`, href: "/temperature" });
  }

  const quickActions = [
    { label: "Mark attendance", icon: UserCheck, href: "/attendance" },
    { label: "New incident", icon: ShieldAlert, href: "/incidents?new=1" },
    { label: "Log temperature", icon: Thermometer, href: "/temperature" },
    { label: "Start an outing", icon: Footprints, href: "/outings?new=1" },
  ];

  return (
    <div className="page animate-rise">
      {/* Greeting */}
      <div className="mb-5">
        <p className="eyebrow">
          {new Date().toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-[26px] sm:text-3xl font-semibold text-ink tracking-tight mt-1">{greeting()}</h1>
      </div>

      {/* Clock-in status */}
      <Link href="/clock" className="card card-hover block p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Clock className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            {data.clockedIn.length > 0 ? (
              <>
                <p className="text-sm font-medium text-ink">
                  {data.clockedIn.length} on shift now
                </p>
                <p className="text-[13px] text-muted truncate">
                  {data.clockedIn.map((c) => c.staff ? `${c.staff.first_name} (in ${fmtTime(c.clock_in)})` : "").filter(Boolean).join(" · ")}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-ink">No one clocked in yet</p>
                <p className="text-[13px] text-muted">Tap to clock in for your shift</p>
              </>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-muted" />
        </div>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon={UserCheck} tone="ok" value={present} label="Present today" hint={`of ${expected} enrolled`} />
        <StatCard icon={CalendarClock} tone="warn" value={notMarked} label="Not marked yet" />
        <StatCard icon={Footprints} tone="info" value={data.outParticipantsPending} label="Currently out" />
        <StatCard icon={ShieldAlert} tone={data.openIncidents.length ? "danger" : "teal"} value={data.openIncidents.length} label="Open incidents" />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Section title="Needs attention">
          <div className="card overflow-hidden row-divide">
            {alerts.map((a, i) => {
              const toneCls =
                a.tone === "danger" ? "text-danger bg-danger-soft" :
                a.tone === "warn" ? "text-warn bg-warn-soft" : "text-info bg-info-soft";
              return (
                <Link key={i} href={a.href} className="row hover:bg-canvas">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${toneCls}`}>
                    <a.icon className="h-[18px] w-[18px]" />
                  </div>
                  <p className="text-sm text-body flex-1">{a.text}</p>
                  <ChevronRight className="h-4 w-4 text-muted shrink-0" />
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {/* Quick actions */}
      <Section title="Quick actions">
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((q) => (
            <Link key={q.label} href={q.href} className="card card-hover p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-800 text-white">
                <q.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-ink">{q.label}</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* Open incidents preview */}
      {data.openIncidents.length > 0 && (
        <Section title="Draft incidents" action={<Link href="/incidents" className="text-[13px] font-medium text-brand-700">View all</Link>}>
          <div className="card overflow-hidden row-divide">
            {data.openIncidents.slice(0, 3).map((inc) => (
              <Link key={inc.id} href={`/incidents/${inc.id}`} className="row hover:bg-canvas">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-danger-soft text-danger shrink-0">
                  <CircleAlert className="h-[18px] w-[18px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-body truncate">{inc.quick_note || "Untitled incident"}</p>
                  <p className="text-xs text-muted">Draft · {fmtTime(inc.created_at)}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted shrink-0" />
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
