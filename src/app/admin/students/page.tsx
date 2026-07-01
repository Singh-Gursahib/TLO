"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { fullName, ageFromDob } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Loading, Avatar, EmptyState } from "@/components/ui/Primitives";
import { Sheet, ConfirmSheet } from "@/components/ui/Sheet";
import type { Student, StudentContact } from "@/lib/types";
import { Plus, Search, Pencil, Trash2, Users, UserPlus, X } from "lucide-react";

type ContactDraft = Partial<StudentContact> & { _tmp?: string };

async function loadStudents() {
  const [students, contacts] = await Promise.all([
    supabase.from("students").select("*").order("first_name"),
    supabase.from("student_contacts").select("student_id"),
  ]);
  const counts = new Map<string, number>();
  for (const c of (contacts.data ?? []) as { student_id: string }[]) counts.set(c.student_id, (counts.get(c.student_id) ?? 0) + 1);
  return { students: (students.data ?? []) as Student[], counts };
}

const REL = ["Mother", "Father", "Guardian", "Foster Parent", "Grandparent", "Emergency Contact", "Other"];

export default function AdminStudents() {
  const { data, loading, refetch } = useAsync(loadStudents, []);
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Student | "new" | null>(null);
  const [delTarget, setDelTarget] = useState<Student | null>(null);

  const students = data?.students ?? [];
  const filtered = useMemo(() => {
    if (!q.trim()) return students;
    const t = q.toLowerCase();
    return students.filter((s) => fullName(s.first_name, s.last_name).toLowerCase().includes(t));
  }, [students, q]);

  async function del() {
    if (!delTarget) return;
    const { error } = await supabase.from("students").delete().eq("id", delTarget.id);
    if (error) return toast(error.message, "error");
    toast("Student deleted");
    setDelTarget(null);
    refetch();
  }

  return (
    <div className="animate-rise">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Students</h1>
          <p className="text-sm text-muted">{students.length} records</p>
        </div>
        <button className="btn-primary btn-sm" onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add student</button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted" />
        <input className="input pl-10" placeholder="Search students…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="card"><EmptyState icon={Users} title="No students" /></div>
      ) : (
        <div className="card row-divide overflow-hidden">
          {filtered.map((s) => (
            <div key={s.id} className="row">
              <Avatar first={s.first_name} last={s.last_name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{fullName(s.first_name, s.last_name)}</p>
                <p className="text-xs text-muted truncate">
                  {[ageFromDob(s.dob) ? `${ageFromDob(s.dob)} yrs` : null, s.grade, s.school_name, `${data?.counts.get(s.id) ?? 0} contacts`].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="badge-slate capitalize hidden sm:inline-flex">{s.status}</span>
              <button className="icon-btn text-muted hover:bg-brand-50 hover:text-brand-700" onClick={() => setEditing(s)}><Pencil className="h-[17px] w-[17px]" /></button>
              <button className="icon-btn text-muted hover:bg-danger-soft hover:text-danger" onClick={() => setDelTarget(s)}><Trash2 className="h-[17px] w-[17px]" /></button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <StudentSheet
          student={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refetch(); }}
        />
      )}

      <ConfirmSheet
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={del}
        title={`Delete ${delTarget ? fullName(delTarget.first_name, delTarget.last_name) : ""}?`}
        message="This permanently removes the student and all their contacts, attendance and records. This cannot be undone."
        confirmLabel="Delete student"
        danger
      />
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function StudentSheet({ student, onClose, onSaved }: { student: Student | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const isNew = !student;
  const [f, setF] = useState<Partial<Student>>(student ?? { status: "active", default_arrival_method: "pickup", province: "BC", city: "Kamloops" });
  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const { data } = useAsync(async () => {
    if (!student) return [];
    const { data } = await supabase.from("student_contacts").select("*").eq("student_id", student.id).order("sort_order");
    return (data ?? []) as StudentContact[];
  }, [student?.id]);

  // hydrate contacts once loaded
  useEffect(() => { if (data) setContacts(data); }, [data]);

  const set = (k: keyof Student, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  const setC = (i: number, k: keyof StudentContact, v: unknown) => setContacts((cs) => cs.map((c, idx) => idx === i ? { ...c, [k]: v } : c));
  const addContact = () => setContacts((cs) => [...cs, { relationship: "Mother", can_pickup: true, is_primary: cs.length === 0, _tmp: Math.random().toString(36) }]);
  const removeContact = (i: number) => setContacts((cs) => cs.filter((_, idx) => idx !== i));

  async function save() {
    if (!f.first_name || !f.last_name) return toast("First and last name are required", "error");
    setBusy(true);
    const payload = { ...f, updated_at: new Date().toISOString() };
    delete (payload as { id?: string }).id;
    delete (payload as { created_at?: string }).created_at;

    let studentId = student?.id;
    if (isNew) {
      const { data: created, error } = await supabase.from("students").insert(payload).select("id").single();
      if (error || !created) { setBusy(false); return toast(error?.message ?? "Failed", "error"); }
      studentId = created.id;
    } else {
      const { error } = await supabase.from("students").update(payload).eq("id", student!.id);
      if (error) { setBusy(false); return toast(error.message, "error"); }
    }

    // Sync contacts: delete all + reinsert (simple, reliable for small sets)
    if (studentId) {
      await supabase.from("student_contacts").delete().eq("student_id", studentId);
      const rows = contacts
        .filter((c) => c.first_name)
        .map((c, i) => ({
          student_id: studentId, first_name: c.first_name!, last_name: c.last_name ?? null,
          relationship: c.relationship ?? "Other", phone: c.phone ?? null, phone_alt: c.phone_alt ?? null,
          email: c.email ?? null, is_primary: !!c.is_primary, is_emergency: !!c.is_emergency,
          can_pickup: c.can_pickup ?? true, sort_order: i,
        }));
      if (rows.length) await supabase.from("student_contacts").insert(rows);
    }

    setBusy(false);
    toast(isNew ? "Student added" : "Student updated");
    onSaved();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={isNew ? "Add student" : `Edit ${student!.first_name}`}
      size="lg"
      footer={<button className="btn-primary w-full" onClick={save} disabled={busy}>{busy ? "Saving…" : isNew ? "Add student" : "Save changes"}</button>}
    >
      <p className="eyebrow mb-3">Child details</p>
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <Field label="First name"><input className="input" value={f.first_name ?? ""} onChange={(e) => set("first_name", e.target.value)} /></Field>
        <Field label="Last name"><input className="input" value={f.last_name ?? ""} onChange={(e) => set("last_name", e.target.value)} /></Field>
        <Field label="Date of birth"><input type="date" className="input" value={f.dob ?? ""} onChange={(e) => set("dob", e.target.value)} /></Field>
        <Field label="Grade"><input className="input" value={f.grade ?? ""} onChange={(e) => set("grade", e.target.value)} /></Field>
        <Field label="School" full><input className="input" value={f.school_name ?? ""} onChange={(e) => set("school_name", e.target.value)} /></Field>
        <Field label="Status">
          <select className="select" value={f.status} onChange={(e) => set("status", e.target.value)}>
            {["active", "prospective", "inactive", "withdrawn"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Usual arrival">
          <select className="select" value={f.default_arrival_method} onChange={(e) => set("default_arrival_method", e.target.value)}>
            <option value="pickup">Picked up from school</option>
            <option value="dropoff">Dropped off</option>
          </select>
        </Field>
      </div>

      <p className="eyebrow mb-3">Address</p>
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <Field label="Street address" full><input className="input" value={f.address ?? ""} onChange={(e) => set("address", e.target.value)} /></Field>
        <Field label="City"><input className="input" value={f.city ?? ""} onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label="Postal code"><input className="input" value={f.postal_code ?? ""} onChange={(e) => set("postal_code", e.target.value)} /></Field>
      </div>

      <p className="eyebrow mb-3">Medical & dietary</p>
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <Field label="Allergies" full><input className="input" placeholder="e.g. Peanuts, dairy" value={f.allergies ?? ""} onChange={(e) => set("allergies", e.target.value)} /></Field>
        <Field label="Medical conditions"><input className="input" value={f.medical_conditions ?? ""} onChange={(e) => set("medical_conditions", e.target.value)} /></Field>
        <Field label="Medications"><input className="input" value={f.medications ?? ""} onChange={(e) => set("medications", e.target.value)} /></Field>
        <Field label="Dietary restrictions"><input className="input" value={f.dietary_restrictions ?? ""} onChange={(e) => set("dietary_restrictions", e.target.value)} /></Field>
        <Field label="Family doctor"><input className="input" value={f.doctor_name ?? ""} onChange={(e) => set("doctor_name", e.target.value)} /></Field>
        <Field label="Doctor phone"><input className="input" value={f.doctor_phone ?? ""} onChange={(e) => set("doctor_phone", e.target.value)} /></Field>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="eyebrow">Parents & guardians</p>
        <button className="text-[13px] text-brand-700 font-medium inline-flex items-center gap-1" onClick={addContact}><UserPlus className="h-4 w-4" /> Add</button>
      </div>
      <div className="space-y-3 mb-4">
        {contacts.map((c, i) => (
          <div key={c.id ?? c._tmp ?? i} className="rounded-xl border border-line p-3 bg-canvas/40">
            <div className="flex items-center justify-between mb-2">
              <select className="select h-9 !w-auto text-[13px] bg-surface" value={c.relationship ?? "Mother"} onChange={(e) => setC(i, "relationship", e.target.value)}>
                {REL.map((r) => <option key={r}>{r}</option>)}
              </select>
              <button className="icon-btn h-8 w-8 text-muted hover:text-danger" onClick={() => removeContact(i)}><X className="h-4 w-4" /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <input className="input" placeholder="First name" value={c.first_name ?? ""} onChange={(e) => setC(i, "first_name", e.target.value)} />
              <input className="input" placeholder="Last name" value={c.last_name ?? ""} onChange={(e) => setC(i, "last_name", e.target.value)} />
              <input className="input" placeholder="Phone" value={c.phone ?? ""} onChange={(e) => setC(i, "phone", e.target.value)} />
              <input className="input" placeholder="Alt phone" value={c.phone_alt ?? ""} onChange={(e) => setC(i, "phone_alt", e.target.value)} />
              <input className="input sm:col-span-2" placeholder="Email" value={c.email ?? ""} onChange={(e) => setC(i, "email", e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-3 mt-2.5 text-[13px]">
              <label className="flex items-center gap-1.5 text-body"><input type="checkbox" checked={!!c.is_primary} onChange={(e) => setC(i, "is_primary", e.target.checked)} /> Primary</label>
              <label className="flex items-center gap-1.5 text-body"><input type="checkbox" checked={!!c.is_emergency} onChange={(e) => setC(i, "is_emergency", e.target.checked)} /> Emergency</label>
              <label className="flex items-center gap-1.5 text-body"><input type="checkbox" checked={c.can_pickup ?? true} onChange={(e) => setC(i, "can_pickup", e.target.checked)} /> Can pick up</label>
            </div>
          </div>
        ))}
        {contacts.length === 0 && <p className="text-sm text-muted">No contacts yet — add at least one.</p>}
      </div>
    </Sheet>
  );
}
