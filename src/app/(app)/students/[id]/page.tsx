"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { ageFromDob, fullName, fmtDate, relativeDay, fmtTime } from "@/lib/utils";
import { Loading, Avatar, Section } from "@/components/ui/Primitives";
import { ContactActions } from "@/components/ContactActions";
import type { Student, StudentContact, StudentAttendance } from "@/lib/types";
import {
  ChevronLeft, MapPin, Cake, CalendarCheck, Stethoscope, Pill, Salad,
  TriangleAlert, HeartPulse, Phone, Star, ShieldCheck,
} from "lucide-react";

async function loadStudent(id: string) {
  const [student, contacts, att] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).single(),
    supabase.from("student_contacts").select("*").eq("student_id", id).order("sort_order"),
    supabase.from("student_attendance").select("*").eq("student_id", id).order("date", { ascending: false }).limit(14),
  ]);
  return {
    student: student.data as Student | null,
    contacts: (contacts.data ?? []) as StudentContact[],
    attendance: (att.data ?? []) as StudentAttendance[],
  };
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Icon className="h-[18px] w-[18px] text-muted mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm text-body">{value}</p>
      </div>
    </div>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useAsync(() => loadStudent(id), [id]);

  if (loading || !data) return <div className="page"><Loading /></div>;
  const s = data.student;
  if (!s) return <div className="page"><p className="text-muted py-10 text-center">Student not found.</p></div>;

  const age = ageFromDob(s.dob);
  const hasMedical = s.allergies || s.medical_conditions || s.medications || s.dietary_restrictions || s.doctor_name;

  return (
    <div className="page animate-rise max-w-3xl">
      <Link href="/students" className="inline-flex items-center gap-1 text-sm text-muted hover:text-brand-700 mb-4">
        <ChevronLeft className="h-4 w-4" /> Students
      </Link>

      {/* Hero */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-4">
          <Avatar first={s.first_name} last={s.last_name} size={64} />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-ink tracking-tight">{fullName(s.first_name, s.last_name)}</h1>
            <p className="text-sm text-muted">
              {[s.preferred_name ? `“${s.preferred_name}”` : null, age ? `${age} years` : null, s.grade].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="badge-teal capitalize">{s.status}</span>
              {s.school_name && <span className="badge-slate">{s.school_name}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Allergy alert banner */}
      {s.allergies && (
        <div className="rounded-2xl border border-warn/30 bg-warn-soft p-4 mb-6 flex items-start gap-3">
          <TriangleAlert className="h-5 w-5 text-warn shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-warn">Allergies</p>
            <p className="text-sm text-body">{s.allergies}</p>
          </div>
        </div>
      )}

      {/* Contacts */}
      <Section title="Parents & guardians">
        <div className="space-y-3">
          {data.contacts.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {c.first_name} {c.last_name ?? ""}
                  </p>
                  <p className="text-xs text-muted">{c.relationship}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {c.is_primary && <span className="badge-teal"><Star className="h-3 w-3" /> Primary</span>}
                    {c.is_emergency && <span className="badge-danger"><HeartPulse className="h-3 w-3" /> Emergency</span>}
                    {c.can_pickup && <span className="badge-ok"><ShieldCheck className="h-3 w-3" /> Can pick up</span>}
                  </div>
                </div>
                <ContactActions phone={c.phone} email={c.email} />
              </div>
              {(c.phone || c.phone_alt || c.email) && (
                <div className="mt-3 pt-3 border-t border-line space-y-1 text-sm text-body">
                  {c.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted" /> {c.phone}</p>}
                  {c.phone_alt && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted" /> <span>{c.phone_alt}</span>
                      <ContactActions phone={c.phone_alt} compact className="ml-auto" />
                    </div>
                  )}
                  {c.email && <p className="flex items-center gap-2 truncate"><span className="text-muted">@</span> {c.email}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Medical */}
      {hasMedical && (
        <Section title="Medical & dietary">
          <div className="card row-divide overflow-hidden">
            <InfoRow icon={TriangleAlert} label="Allergies" value={s.allergies} />
            <InfoRow icon={HeartPulse} label="Medical conditions" value={s.medical_conditions} />
            <InfoRow icon={Pill} label="Medications" value={s.medications} />
            <InfoRow icon={Salad} label="Dietary restrictions" value={s.dietary_restrictions} />
            <InfoRow icon={Stethoscope} label="Family doctor" value={s.doctor_name ? `${s.doctor_name}${s.doctor_phone ? ` · ${s.doctor_phone}` : ""}` : null} />
          </div>
        </Section>
      )}

      {/* Details */}
      <Section title="Details">
        <div className="card row-divide overflow-hidden">
          <InfoRow icon={MapPin} label="Home address" value={[s.address, s.city, s.province, s.postal_code].filter(Boolean).join(", ")} />
          <InfoRow icon={Cake} label="Date of birth" value={s.dob ? fmtDate(s.dob) : null} />
          <InfoRow icon={CalendarCheck} label="Enrolled" value={s.enrollment_date ? fmtDate(s.enrollment_date) : null} />
          <InfoRow icon={MapPin} label="Notes" value={s.notes} />
        </div>
      </Section>

      {/* Attendance history */}
      <Section title="Recent attendance">
        <div className="card row-divide overflow-hidden">
          {data.attendance.length === 0 ? (
            <p className="text-sm text-muted p-4">No attendance records yet.</p>
          ) : (
            data.attendance.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm text-body">{relativeDay(a.date)}</p>
                  {a.arrived_at && <p className="text-xs text-muted">In {fmtTime(a.arrived_at)}{a.departed_at ? ` · Out ${fmtTime(a.departed_at)}` : ""}</p>}
                </div>
                <span className={
                  a.status === "present" ? "badge-ok" :
                  a.status === "absent" ? "badge-warn" :
                  a.status === "late" ? "badge-info" : "badge-slate"
                }>
                  {a.status}
                </span>
              </div>
            ))
          )}
        </div>
      </Section>
    </div>
  );
}
