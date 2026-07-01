"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { fmtDate, fullName } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Loading, EmptyState } from "@/components/ui/Primitives";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet, ConfirmSheet } from "@/components/ui/Sheet";
import { ContactActions } from "@/components/ContactActions";
import type { Admission, AdmissionStatus } from "@/lib/types";
import { ClipboardList, Check, X, UserPlus, ShieldCheck } from "lucide-react";

const STATUSES: AdmissionStatus[] = ["submitted", "reviewed", "approved", "enrolled", "rejected"];

async function loadAdmissions() {
  const { data } = await supabase.from("admissions").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Admission[];
}

export default function AdminAdmissions() {
  const { data, loading, refetch } = useAsync(loadAdmissions, []);
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | AdmissionStatus>("all");
  const [view, setView] = useState<Admission | null>(null);
  const [confirmEnroll, setConfirmEnroll] = useState<Admission | null>(null);

  const admissions = data ?? [];
  const filtered = useMemo(() => filter === "all" ? admissions : admissions.filter((a) => a.status === filter), [admissions, filter]);

  async function enroll(a: Admission) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (a.payload ?? {}) as any;
    const { data: student, error } = await supabase.from("students").insert({
      first_name: a.child_first_name ?? "New",
      last_name: a.child_last_name ?? "Student",
      dob: a.child_dob ?? null,
      school_name: p.school ?? null,
      grade: p.grade ?? null,
      allergies: p.allergies ?? null,
      status: "active",
      enrollment_date: new Date().toLocaleDateString("en-CA"),
      city: "Kamloops", province: "BC",
    }).select("id").single();
    if (error || !student) return toast(error?.message ?? "Failed to enroll", "error");

    // primary parent contact
    if (a.parent_name) {
      const [fn, ...rest] = a.parent_name.split(" ");
      await supabase.from("student_contacts").insert({
        student_id: student.id, first_name: fn, last_name: rest.join(" ") || null,
        relationship: "Parent", phone: a.parent_phone ?? null, email: a.parent_email ?? null,
        is_primary: true, is_emergency: true, can_pickup: true, sort_order: 0,
      });
    }
    await supabase.from("admissions").update({ status: "enrolled", updated_at: new Date().toISOString() }).eq("id", a.id);
    toast(`${a.child_first_name} enrolled — student record created ✓`);
    setConfirmEnroll(null);
    setView(null);
    refetch();
  }

  async function setStatus(a: Admission, status: AdmissionStatus) {
    await supabase.from("admissions").update({ status, updated_at: new Date().toISOString() }).eq("id", a.id);
    toast("Updated");
    refetch();
    setView(null);
  }

  return (
    <div className="animate-rise">
      <h1 className="text-2xl font-semibold text-ink tracking-tight mb-1">Admissions</h1>
      <p className="text-sm text-muted mb-5">Applications submitted through the admission form.</p>

      <Segmented className="mb-4" value={filter} onChange={setFilter}
        options={[{ value: "all", label: "All" }, ...STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1), count: admissions.filter((a) => a.status === s).length }))]} />

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="card"><EmptyState icon={ClipboardList} title="No admissions" description="Submitted applications will appear here." /></div>
      ) : (
        <div className="card row-divide overflow-hidden">
          {filtered.map((a) => (
            <button key={a.id} onClick={() => setView(a)} className="row hover:bg-canvas w-full text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 shrink-0">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{fullName(a.child_first_name, a.child_last_name)}</p>
                <p className="text-xs text-muted truncate">Parent: {a.parent_name || "—"} · {fmtDate(a.created_at, { month: "short", day: "numeric" })}</p>
              </div>
              <span className={a.status === "enrolled" ? "badge-ok" : a.status === "rejected" ? "badge-danger" : "badge-warn"}>{a.status}</span>
            </button>
          ))}
        </div>
      )}

      {view && (
        <Sheet open onClose={() => setView(null)} title={fullName(view.child_first_name, view.child_last_name)} description="Admission application" size="lg"
          footer={
            view.status !== "enrolled" ? (
              <div className="flex gap-2.5">
                <button className="btn-outline flex-1" onClick={() => setStatus(view, "rejected")}><X className="h-4 w-4" /> Reject</button>
                <button className="btn-primary flex-1" onClick={() => setConfirmEnroll(view)}><UserPlus className="h-4 w-4" /> Approve & enroll</button>
              </div>
            ) : <div className="text-center text-sm text-ok flex items-center justify-center gap-1.5"><Check className="h-4 w-4" /> Enrolled as a student</div>
          }>
          <AdmissionDetails a={view} />
        </Sheet>
      )}

      <ConfirmSheet open={!!confirmEnroll} onClose={() => setConfirmEnroll(null)} onConfirm={() => confirmEnroll && enroll(confirmEnroll)}
        title="Approve & enroll?" message="This creates a student record (with a primary parent contact) and marks the admission as enrolled." confirmLabel="Enroll student" />
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return <div className="flex justify-between gap-4 py-2 border-b border-line last:border-0"><span className="text-sm text-muted">{label}</span><span className="text-sm text-body text-right">{value}</span></div>;
}

function AdmissionDetails({ a }: { a: Admission }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = (a.payload ?? {}) as any;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="eyebrow">Child</p>
        <ContactActions phone={a.parent_phone} email={a.parent_email} />
      </div>
      <div className="card p-3 mb-4">
        <Row label="Name" value={fullName(a.child_first_name, a.child_last_name)} />
        <Row label="Date of birth" value={a.child_dob ? fmtDate(a.child_dob) : null} />
        <Row label="School" value={p.school} />
        <Row label="Grade" value={p.grade} />
        <Row label="Allergies" value={p.allergies} />
      </div>
      <p className="eyebrow mb-3">Parent / guardian</p>
      <div className="card p-3 mb-4">
        <Row label="Name" value={a.parent_name} />
        <Row label="Phone" value={a.parent_phone} />
        <Row label="Email" value={a.parent_email} />
        {p.emergency_contact && <Row label="Emergency" value={`${p.emergency_contact.name} · ${p.emergency_contact.phone}`} />}
        {Array.isArray(p.authorized_pickups) && <Row label="Authorized pickups" value={p.authorized_pickups.join(", ")} />}
      </div>
      <div className="flex items-center gap-2 text-sm text-ok bg-ok-soft rounded-xl p-3">
        <ShieldCheck className="h-4 w-4" />
        {a.policies_accepted ? `Policies accepted${a.signature_name ? ` — signed by ${a.signature_name}` : ""}` : "Policies not yet accepted"}
      </div>
    </div>
  );
}
