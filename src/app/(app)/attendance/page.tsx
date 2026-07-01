"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { todayISO, fmtTime, fullName } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Loading, PageHeader, Avatar, EmptyState } from "@/components/ui/Primitives";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import type { Student, StudentContact, StudentAttendance, Staff } from "@/lib/types";
import {
  UserCheck, Car, School, LogOut, Check, X, Clock3, CalendarDays, Undo2,
} from "lucide-react";

type Filter = "arrivals" | "departures" | "all";

interface RosterRow {
  student: Student;
  att: StudentAttendance | null;
  contacts: StudentContact[];
}

async function loadRoster() {
  const today = todayISO();
  const [students, contacts, att, staff] = await Promise.all([
    supabase.from("students").select("*").eq("status", "active").order("first_name"),
    supabase.from("student_contacts").select("*").order("sort_order"),
    supabase.from("student_attendance").select("*").eq("date", today),
    supabase.from("staff").select("*").eq("status", "active").order("first_name"),
  ]);
  const byStudentContacts = new Map<string, StudentContact[]>();
  for (const c of (contacts.data ?? []) as StudentContact[]) {
    if (!byStudentContacts.has(c.student_id)) byStudentContacts.set(c.student_id, []);
    byStudentContacts.get(c.student_id)!.push(c);
  }
  const byStudentAtt = new Map<string, StudentAttendance>();
  for (const a of (att.data ?? []) as StudentAttendance[]) byStudentAtt.set(a.student_id, a);

  const rows: RosterRow[] = ((students.data ?? []) as Student[]).map((s) => ({
    student: s,
    att: byStudentAtt.get(s.id) ?? null,
    contacts: byStudentContacts.get(s.id) ?? [],
  }));
  return { rows, staff: (staff.data ?? []) as Staff[] };
}

export default function AttendancePage() {
  const { data, loading, refetch } = useAsync(loadRoster, []);
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("arrivals");
  const [arriveFor, setArriveFor] = useState<RosterRow | null>(null);
  const [departFor, setDepartFor] = useState<RosterRow | null>(null);

  const rows = data?.rows ?? [];
  const staff = data?.staff ?? [];

  const counts = useMemo(() => {
    const present = rows.filter((r) => r.att && (r.att.status === "present" || r.att.status === "late")).length;
    const arrived = rows.filter((r) => r.att?.arrived_at).length;
    const departed = rows.filter((r) => r.att?.departed_at).length;
    const absent = rows.filter((r) => r.att?.status === "absent").length;
    return { present, arrived, departed, absent, notIn: rows.length - arrived - absent };
  }, [rows]);

  async function markArrival(row: RosterRow, method: "pickup" | "dropoff", personId: string | null, personName: string) {
    const payload = {
      student_id: row.student.id,
      date: todayISO(),
      status: "present" as const,
      arrival_method: method,
      arrived_at: new Date().toISOString(),
      dropped_off_by: method === "dropoff" ? personName : null,
      dropped_off_by_contact_id: method === "dropoff" ? personId : null,
      picked_from_school_by_staff_id: method === "pickup" ? personId : null,
    };
    const { error } = await supabase.from("student_attendance").upsert(payload, { onConflict: "student_id,date" });
    if (error) return toast(error.message, "error");
    toast(`${row.student.first_name} marked in`);
    setArriveFor(null);
    refetch();
  }

  async function markDeparture(row: RosterRow, personId: string | null, personName: string, kind: "contact" | "staff") {
    const payload = {
      student_id: row.student.id,
      date: todayISO(),
      departed_at: new Date().toISOString(),
      picked_up_by: personName,
      picked_up_by_contact_id: kind === "contact" ? personId : null,
      picked_up_by_staff_id: kind === "staff" ? personId : null,
    };
    const { error } = await supabase.from("student_attendance").upsert({ ...payload }, { onConflict: "student_id,date" });
    if (error) return toast(error.message, "error");
    toast(`${row.student.first_name} signed out`);
    setDepartFor(null);
    refetch();
  }

  async function setAbsent(row: RosterRow) {
    const { error } = await supabase.from("student_attendance").upsert(
      { student_id: row.student.id, date: todayISO(), status: "absent", arrived_at: null, arrival_method: null },
      { onConflict: "student_id,date" }
    );
    if (error) return toast(error.message, "error");
    toast(`${row.student.first_name} marked absent`);
    refetch();
  }

  async function undo(row: RosterRow) {
    if (!row.att) return;
    const { error } = await supabase.from("student_attendance").delete().eq("id", row.att.id);
    if (error) return toast(error.message, "error");
    refetch();
  }

  return (
    <div className="page animate-rise">
      <PageHeader
        title="Attendance"
        subtitle={new Date().toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}
      />

      {/* Summary chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        <span className="badge-ok">{counts.present} present</span>
        <span className="badge-slate">{counts.notIn} not in</span>
        <span className="badge-warn">{counts.absent} absent</span>
        <span className="badge-info">{counts.departed} signed out</span>
      </div>

      <Segmented
        className="mb-4"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "arrivals", label: "Arrivals" },
          { value: "departures", label: "Departures" },
          { value: "all", label: "All" },
        ]}
      />

      {loading ? (
        <Loading label="Loading roster…" />
      ) : rows.length === 0 ? (
        <div className="card"><EmptyState icon={UserCheck} title="No active students" /></div>
      ) : (
        <div className="card overflow-hidden row-divide">
          {rows.map((row) => (
            <AttendanceRow
              key={row.student.id}
              row={row}
              filter={filter}
              onArrive={() => setArriveFor(row)}
              onDepart={() => setDepartFor(row)}
              onAbsent={() => setAbsent(row)}
              onUndo={() => undo(row)}
            />
          ))}
        </div>
      )}

      {arriveFor && (
        <ArrivalSheet row={arriveFor} staff={staff} onClose={() => setArriveFor(null)} onConfirm={markArrival} />
      )}
      {departFor && (
        <DepartureSheet row={departFor} staff={staff} onClose={() => setDepartFor(null)} onConfirm={markDeparture} />
      )}
    </div>
  );
}

function AttendanceRow({
  row, filter, onArrive, onDepart, onAbsent, onUndo,
}: {
  row: RosterRow;
  filter: Filter;
  onArrive: () => void;
  onDepart: () => void;
  onAbsent: () => void;
  onUndo: () => void;
}) {
  const { student, att } = row;
  const isIn = !!att?.arrived_at;
  const isOut = !!att?.departed_at;
  const isAbsent = att?.status === "absent";

  return (
    <div className="row">
      <Avatar first={student.first_name} last={student.last_name} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{fullName(student.first_name, student.last_name)}</p>
        <p className="text-xs text-muted truncate">
          {isAbsent ? (
            "Absent today"
          ) : isOut ? (
            <>Out · {fmtTime(att!.departed_at)} · {att!.picked_up_by || "picked up"}</>
          ) : isIn ? (
            <span className="inline-flex items-center gap-1">
              {att!.arrival_method === "pickup" ? <School className="h-3 w-3" /> : <Car className="h-3 w-3" />}
              In {fmtTime(att!.arrived_at)}
            </span>
          ) : (
            student.school_name || "Not marked"
          )}
        </p>
      </div>

      {/* Action zone */}
      {isAbsent ? (
        <button className="btn-ghost btn-sm" onClick={onUndo}><Undo2 className="h-4 w-4" /></button>
      ) : filter === "departures" || (filter === "all" && isIn && !isOut) ? (
        isOut ? (
          <span className="badge-info"><Check className="h-3 w-3" /> Out</span>
        ) : isIn ? (
          <button className="btn-outline btn-sm" onClick={onDepart}><LogOut className="h-4 w-4" /> Sign out</button>
        ) : (
          <span className="badge-slate">Not in</span>
        )
      ) : isOut ? (
        <span className="badge-info"><Check className="h-3 w-3" /> Out</span>
      ) : isIn ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="badge-ok"><Check className="h-3 w-3" /> In</span>
          <button className="btn-ghost btn-sm" onClick={onUndo}><Undo2 className="h-4 w-4" /></button>
        </span>
      ) : (
        <div className="flex items-center gap-1.5">
          <button className="btn-ghost btn-sm !px-2 text-muted" onClick={onAbsent} title="Mark absent"><X className="h-4 w-4" /></button>
          <button className="btn-primary btn-sm" onClick={onArrive}><Check className="h-4 w-4" /> Mark in</button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Arrival sheet ---------------- */
function ArrivalSheet({
  row, staff, onClose, onConfirm,
}: {
  row: RosterRow;
  staff: Staff[];
  onClose: () => void;
  onConfirm: (row: RosterRow, method: "pickup" | "dropoff", personId: string | null, personName: string) => void;
}) {
  const [method, setMethod] = useState<"pickup" | "dropoff">(row.student.default_arrival_method);
  const pickupContacts = row.contacts.filter((c) => c.can_pickup);
  const [contactId, setContactId] = useState<string>(pickupContacts[0]?.id ?? "");
  const [staffId, setStaffId] = useState<string>(staff[0]?.id ?? "");

  function confirm() {
    if (method === "dropoff") {
      const c = row.contacts.find((x) => x.id === contactId);
      onConfirm(row, "dropoff", c?.id ?? null, c ? `${c.first_name} ${c.last_name ?? ""} (${c.relationship})`.trim() : "Parent");
    } else {
      const s = staff.find((x) => x.id === staffId);
      onConfirm(row, "pickup", s?.id ?? null, s ? fullName(s.first_name, s.last_name) : "Staff");
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Mark ${row.student.first_name} in`}
      description="How did they arrive?"
      footer={<button className="btn-primary w-full" onClick={confirm}><Check className="h-4 w-4" /> Confirm arrival</button>}
    >
      <Segmented
        className="w-full mb-4"
        value={method}
        onChange={setMethod}
        options={[
          { value: "pickup", label: "Picked up from school", icon: School },
          { value: "dropoff", label: "Dropped off", icon: Car },
        ]}
      />
      {method === "dropoff" ? (
        <div className="field">
          <label className="label">Dropped off by</label>
          {pickupContacts.length ? (
            <select className="select" value={contactId} onChange={(e) => setContactId(e.target.value)}>
              {pickupContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name ?? ""} — {c.relationship}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-muted">No authorized contacts on file.</p>
          )}
        </div>
      ) : (
        <div className="field">
          <label className="label">Picked up from school by</label>
          <select className="select" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{fullName(s.first_name, s.last_name)}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-muted mt-2">
        <Clock3 className="h-3.5 w-3.5" /> Arrival time will be recorded as now.
      </div>
    </Sheet>
  );
}

/* ---------------- Departure sheet ---------------- */
function DepartureSheet({
  row, staff, onClose, onConfirm,
}: {
  row: RosterRow;
  staff: Staff[];
  onClose: () => void;
  onConfirm: (row: RosterRow, personId: string | null, personName: string, kind: "contact" | "staff") => void;
}) {
  const pickupContacts = row.contacts.filter((c) => c.can_pickup);
  const [choice, setChoice] = useState<string>(pickupContacts[0] ? `c:${pickupContacts[0].id}` : staff[0] ? `s:${staff[0].id}` : "");

  function confirm() {
    const [kind, id] = choice.split(":");
    if (kind === "c") {
      const c = row.contacts.find((x) => x.id === id);
      onConfirm(row, id, c ? `${c.first_name} ${c.last_name ?? ""} (${c.relationship})`.trim() : "Parent", "contact");
    } else {
      const s = staff.find((x) => x.id === id);
      onConfirm(row, id, s ? fullName(s.first_name, s.last_name) : "Staff", "staff");
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Sign ${row.student.first_name} out`}
      description="Who is picking up?"
      footer={<button className="btn-primary w-full" onClick={confirm}><LogOut className="h-4 w-4" /> Confirm pickup</button>}
    >
      <div className="field">
        <label className="label">Picked up by</label>
        <select className="select" value={choice} onChange={(e) => setChoice(e.target.value)}>
          <optgroup label="Authorized contacts">
            {pickupContacts.map((c) => (
              <option key={c.id} value={`c:${c.id}`}>{c.first_name} {c.last_name ?? ""} — {c.relationship}</option>
            ))}
          </optgroup>
          <optgroup label="Staff">
            {staff.map((s) => (
              <option key={s.id} value={`s:${s.id}`}>{fullName(s.first_name, s.last_name)}</option>
            ))}
          </optgroup>
        </select>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        <CalendarDays className="h-3.5 w-3.5" /> Sign-out time will be recorded as now.
      </div>
    </Sheet>
  );
}
