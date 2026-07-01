"use client";

import Link from "next/link";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { todayISO, fullName, hoursBetween, fmtHours } from "@/lib/utils";
import { Loading, StatCard } from "@/components/ui/Primitives";
import {
  Users, UserCheck, Clock, Inbox, ShieldAlert, Thermometer, TriangleAlert, ChevronRight,
} from "lucide-react";

async function loadDash() {
  const today = todayISO();
  const since30 = new Date(Date.now() - 30 * 86400000).toLocaleDateString("en-CA");
  const since7 = new Date(Date.now() - 7 * 86400000).toLocaleDateString("en-CA");

  const [students, att, staff, staffAtt, inquiries, incidents, fridge] = await Promise.all([
    supabase.from("students").select("id,first_name,last_name,status").eq("status", "active"),
    supabase.from("student_attendance").select("student_id,date,status").gte("date", since30),
    supabase.from("staff").select("id,first_name,last_name").eq("status", "active"),
    supabase.from("staff_attendance").select("staff_id,clock_in,clock_out").gte("date", since7),
    supabase.from("inquiries").select("id,parent_name,child_name,status,created_at").order("created_at", { ascending: false }),
    supabase.from("incidents").select("id,status,severity,quick_note,description,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("fridge_temp_logs").select("temp_c,in_range,date").gte("date", since30),
  ]);

  return {
    students: students.data ?? [],
    att: att.data ?? [],
    staff: staff.data ?? [],
    staffAtt: staffAtt.data ?? [],
    inquiries: inquiries.data ?? [],
    incidents: incidents.data ?? [],
    fridge: fridge.data ?? [],
    today,
  };
}

export default function AdminDashboard() {
  const { data, loading } = useAsync(loadDash, []);
  if (loading || !data) return <Loading label="Loading analytics…" />;

  const activeCount = data.students.length;
  const presentToday = data.att.filter((a) => a.date === data.today && (a.status === "present" || a.status === "late")).length;

  // Weekly attendance trend (last 14 weekdays)
  const dayMap = new Map<string, { present: number; absent: number }>();
  for (const a of data.att) {
    const d = dayMap.get(a.date) ?? { present: 0, absent: 0 };
    if (a.status === "present" || a.status === "late") d.present++;
    if (a.status === "absent") d.absent++;
    dayMap.set(a.date, d);
  }
  const trend = [...dayMap.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-14)
    .map(([date, v]) => ({
      date: new Date(date + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
      present: v.present,
      absent: v.absent,
    }));

  // Staff hours this week
  const hoursByStaff = new Map<string, number>();
  for (const s of data.staffAtt) {
    if (!s.clock_out) continue;
    hoursByStaff.set(s.staff_id, (hoursByStaff.get(s.staff_id) ?? 0) + hoursBetween(s.clock_in, s.clock_out));
  }
  const staffHours = data.staff.map((s) => ({
    name: s.first_name,
    hours: Math.round((hoursByStaff.get(s.id) ?? 0) * 10) / 10,
  }));
  const totalHours = staffHours.reduce((sum, s) => sum + s.hours, 0);

  // Consecutive absences
  const byStudent = new Map<string, { date: string; status: string }[]>();
  for (const a of data.att) {
    if (!byStudent.has(a.student_id)) byStudent.set(a.student_id, []);
    byStudent.get(a.student_id)!.push(a);
  }
  const watchlist = data.students
    .map((s) => {
      const rows = (byStudent.get(s.id) ?? []).sort((a, b) => (a.date < b.date ? 1 : -1));
      let streak = 0;
      for (const r of rows) { if (r.status === "absent") streak++; else break; }
      return { student: s, streak };
    })
    .filter((x) => x.streak >= 3)
    .sort((a, b) => b.streak - a.streak);

  // Inquiries pipeline
  const newInquiries = data.inquiries.filter((i) => i.status === "new").length;
  const openIncidents = data.incidents.filter((i) => i.status === "draft").length;

  // Fridge compliance
  const fridgeAvg = data.fridge.length ? (data.fridge.reduce((s, f) => s + Number(f.temp_c), 0) / data.fridge.length).toFixed(1) : "—";
  const fridgeOut = data.fridge.filter((f) => f.in_range === false).length;

  return (
    <div className="animate-rise">
      <h1 className="text-2xl font-semibold text-ink tracking-tight mb-1">Dashboard</h1>
      <p className="text-sm text-muted mb-6">A bird&apos;s-eye view of the daycare.</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} value={activeCount} label="Active students" />
        <StatCard icon={UserCheck} tone="ok" value={presentToday} label="Present today" />
        <StatCard icon={Clock} tone="info" value={fmtHours(totalHours)} label="Staff hours (7d)" />
        <StatCard icon={Inbox} tone={newInquiries ? "warn" : "teal"} value={newInquiries} label="New inquiries" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        {/* Attendance trend */}
        <div className="card p-4 lg:col-span-2">
          <p className="section-title mb-4">Attendance — last 14 days</p>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-present" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e4d4b" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#1e4d4b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f1" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7d7a" }} tickLine={false} axisLine={{ stroke: "#e6ebe9" }} minTickGap={20} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7d7a" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e6ebe9", fontSize: 13 }} />
                <Area type="monotone" dataKey="present" stroke="#1e4d4b" strokeWidth={2.5} fill="url(#g-present)" name="Present" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Staff hours */}
        <div className="card p-4">
          <p className="section-title mb-4">Staff hours (7 days)</p>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={staffHours} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f1" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7d7a" }} tickLine={false} axisLine={{ stroke: "#e6ebe9" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7d7a" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e6ebe9", fontSize: 13 }} formatter={(v) => [`${v}h`, "Hours"]} />
                <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                  {staffHours.map((_, i) => <Cell key={i} fill="#2c635d" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Watchlist */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-warn" />
            <p className="section-title">Absence watchlist</p>
          </div>
          {watchlist.length === 0 ? (
            <p className="text-sm text-muted p-4">No students with 3+ consecutive absences. 🎉</p>
          ) : (
            <div className="row-divide">
              {watchlist.map((w) => (
                <Link key={w.student.id} href={`/students/${w.student.id}`} className="row hover:bg-canvas">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">{fullName(w.student.first_name, w.student.last_name)}</p>
                    <p className="text-xs text-muted">Follow-up recommended</p>
                  </div>
                  <span className="badge-warn">{w.streak} days absent</span>
                  <ChevronRight className="h-4 w-4 text-muted" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Operational snapshot */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard icon={ShieldAlert} tone={openIncidents ? "danger" : "teal"} value={openIncidents} label="Open incidents" />
          <StatCard icon={Thermometer} tone={fridgeOut ? "warn" : "ok"} value={`${fridgeAvg}°`} label="Avg fridge (30d)" hint={`${fridgeOut} out of range`} />
          <Link href="/admin/inquiries" className="card card-hover p-4 flex flex-col justify-between">
            <Inbox className="h-5 w-5 text-brand-600" />
            <div><p className="stat-value">{data.inquiries.length}</p><p className="stat-label">Total inquiries</p></div>
          </Link>
          <Link href="/admin/admissions" className="card card-hover p-4 flex flex-col justify-between">
            <Users className="h-5 w-5 text-brand-600" />
            <div><p className="stat-value">{activeCount}</p><p className="stat-label">Enrolled</p></div>
          </Link>
        </div>
      </div>
    </div>
  );
}
