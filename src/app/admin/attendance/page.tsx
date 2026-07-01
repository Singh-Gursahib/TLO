"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { todayISO, fmtTime, fullName } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Loading, Avatar } from "@/components/ui/Primitives";
import type { Student, StudentAttendance, AttendanceStatus } from "@/lib/types";
import { CalendarRange } from "lucide-react";

const STATUSES: AttendanceStatus[] = ["expected", "present", "late", "absent", "excused"];

async function loadDay(date: string) {
  const [students, att] = await Promise.all([
    supabase.from("students").select("*").eq("status", "active").order("first_name"),
    supabase.from("student_attendance").select("*").eq("date", date),
  ]);
  const byStudent = new Map<string, StudentAttendance>();
  for (const a of (att.data ?? []) as StudentAttendance[]) byStudent.set(a.student_id, a);
  return { students: (students.data ?? []) as Student[], byStudent };
}

export default function AdminAttendance() {
  const [date, setDate] = useState(todayISO());
  const { data, loading, refetch } = useAsync(() => loadDay(date), [date]);
  const { toast } = useToast();

  async function setStatus(studentId: string, status: AttendanceStatus) {
    const { error } = await supabase.from("student_attendance").upsert(
      { student_id: studentId, date, status, updated_at: new Date().toISOString() },
      { onConflict: "student_id,date" }
    );
    if (error) return toast(error.message, "error");
    refetch();
  }

  const students = data?.students ?? [];
  const present = students.filter((s) => { const a = data?.byStudent.get(s.id); return a?.status === "present" || a?.status === "late"; }).length;

  return (
    <div className="animate-rise">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Attendance records</h1>
          <p className="text-sm text-muted">{present} present · {students.length} enrolled</p>
        </div>
        <div className="relative">
          <CalendarRange className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted pointer-events-none" />
          <input type="date" className="input pl-10 !w-auto" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="card row-divide overflow-hidden">
          {students.map((s) => {
            const a = data?.byStudent.get(s.id);
            return (
              <div key={s.id} className="row">
                <Avatar first={s.first_name} last={s.last_name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{fullName(s.first_name, s.last_name)}</p>
                  <p className="text-xs text-muted truncate">
                    {a?.arrived_at ? `In ${fmtTime(a.arrived_at)}` : "Not marked"}
                    {a?.departed_at ? ` · Out ${fmtTime(a.departed_at)}` : ""}
                    {a?.picked_up_by ? ` · ${a.picked_up_by}` : ""}
                  </p>
                </div>
                <select
                  className="select h-9 !w-auto text-[13px]"
                  value={a?.status ?? "expected"}
                  onChange={(e) => setStatus(s.id, e.target.value as AttendanceStatus)}
                >
                  {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
