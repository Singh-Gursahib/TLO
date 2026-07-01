"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { fullName } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Loading } from "@/components/ui/Primitives";
import { ConfirmSheet } from "@/components/ui/Sheet";
import type { Incident, Student, Staff } from "@/lib/types";
import { ChevronLeft, Check, Save, Trash2, FileText } from "lucide-react";

const TYPES = ["injury", "illness", "behavioral", "property", "allergy", "other"];
const SEV = ["low", "medium", "high", "critical"];

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
function fromLocalInput(v: string): string | null {
  if (!v) return null;
  return new Date(v).toISOString();
}

async function loadIncident(id: string) {
  const [inc, links, students, staff] = await Promise.all([
    supabase.from("incidents").select("*").eq("id", id).single(),
    supabase.from("incident_students").select("student_id").eq("incident_id", id),
    supabase.from("students").select("id,first_name,last_name,status").order("first_name"),
    supabase.from("staff").select("*").eq("status", "active").order("first_name"),
  ]);
  return {
    incident: inc.data as Incident | null,
    selected: new Set((links.data ?? []).map((l: { student_id: string }) => l.student_id)),
    students: (students.data ?? []) as Student[],
    staff: (staff.data ?? []) as Staff[],
  };
}

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading } = useAsync(() => loadIncident(id), [id]);
  const { toast } = useToast();

  const [form, setForm] = useState<Partial<Incident>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (data?.incident) {
      setForm(data.incident);
      setSelected(data.selected);
    }
  }, [data]);

  if (loading || !data) return <div className="page"><Loading /></div>;
  if (!data.incident) return <div className="page"><p className="text-muted py-10 text-center">Incident not found.</p></div>;

  const set = (k: keyof Incident, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (sid: string) => setSelected((s) => { const n = new Set(s); n.has(sid) ? n.delete(sid) : n.add(sid); return n; });

  async function save(markComplete = false) {
    setBusy(true);
    const payload = {
      quick_note: form.quick_note ?? null,
      incident_type: form.incident_type ?? null,
      severity: form.severity ?? "low",
      occurred_at: form.occurred_at ?? null,
      location: form.location ?? null,
      description: form.description ?? null,
      actions_taken: form.actions_taken ?? null,
      witnesses: form.witnesses ?? null,
      follow_up_actions: form.follow_up_actions ?? null,
      parent_notified: form.parent_notified ?? false,
      parent_notified_at: form.parent_notified ? (form.parent_notified_at ?? new Date().toISOString()) : null,
      parent_notified_method: form.parent_notified_method ?? null,
      reported_by_staff_id: form.reported_by_staff_id ?? null,
      status: markComplete ? "complete" : form.status ?? "draft",
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("incidents").update(payload).eq("id", id);
    if (!error) {
      await supabase.from("incident_students").delete().eq("incident_id", id);
      if (selected.size) await supabase.from("incident_students").insert([...selected].map((sid) => ({ incident_id: id, student_id: sid })));
    }
    setBusy(false);
    if (error) return toast(error.message, "error");
    toast(markComplete ? "Incident marked complete ✓" : "Saved");
    if (markComplete) set("status", "complete");
  }

  async function remove() {
    await supabase.from("incidents").delete().eq("id", id);
    toast("Incident deleted");
    router.push("/incidents");
  }

  return (
    <div className="page animate-rise max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <Link href="/incidents" className="inline-flex items-center gap-1 text-sm text-muted hover:text-brand-700">
          <ChevronLeft className="h-4 w-4" /> Incidents
        </Link>
        <div className="flex items-center gap-2">
          {form.status === "draft" ? <span className="badge-warn">Draft</span> : <span className="badge-ok"><Check className="h-3 w-3" /> Complete</span>}
          <button className="icon-btn text-muted hover:bg-danger-soft hover:text-danger" onClick={() => setConfirmDel(true)}><Trash2 className="h-[18px] w-[18px]" /></button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><FileText className="h-5 w-5" /></div>
        <div>
          <h1 className="text-xl font-semibold text-ink tracking-tight">Incident report</h1>
          <p className="text-sm text-muted">Add as much detail as you can.</p>
        </div>
      </div>

      <div className="card p-5 space-y-1">
        <div className="field">
          <label className="label">Quick note / summary</label>
          <textarea className="textarea" rows={2} value={form.quick_note ?? ""} onChange={(e) => set("quick_note", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label className="label">Type</label>
            <select className="select" value={form.incident_type ?? "other"} onChange={(e) => set("incident_type", e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">Severity</label>
            <select className="select" value={form.severity ?? "low"} onChange={(e) => set("severity", e.target.value)}>
              {SEV.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="field">
            <label className="label">Date & time</label>
            <input type="datetime-local" className="input" value={toLocalInput(form.occurred_at ?? null)} onChange={(e) => set("occurred_at", fromLocalInput(e.target.value))} />
          </div>
          <div className="field">
            <label className="label">Location</label>
            <input className="input" placeholder="e.g. Main playroom" value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card p-5 mt-4">
        <label className="label">Children involved ({selected.size})</label>
        <div className="rounded-xl border border-line divide-y divide-line max-h-48 overflow-y-auto">
          {data.students.map((s) => {
            const on = selected.has(s.id);
            return (
              <button key={s.id} type="button" onClick={() => toggle(s.id)} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-canvas">
                <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${on ? "bg-brand-800 border-brand-800 text-white" : "border-line-strong"}`}>
                  {on && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="text-sm text-body flex-1">{fullName(s.first_name, s.last_name)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card p-5 mt-4 space-y-1">
        <div className="field">
          <label className="label">What happened (description)</label>
          <textarea className="textarea" rows={3} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Actions taken</label>
          <textarea className="textarea" rows={2} value={form.actions_taken ?? ""} onChange={(e) => set("actions_taken", e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Witnesses</label>
          <input className="input" value={form.witnesses ?? ""} onChange={(e) => set("witnesses", e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Follow-up actions</label>
          <textarea className="textarea" rows={2} value={form.follow_up_actions ?? ""} onChange={(e) => set("follow_up_actions", e.target.value)} />
        </div>
      </div>

      <div className="card p-5 mt-4 space-y-1">
        <div className="flex items-center justify-between py-1">
          <label className="label mb-0">Parent / guardian notified</label>
          <button
            type="button"
            onClick={() => set("parent_notified", !form.parent_notified)}
            className={`relative h-6 w-11 rounded-full transition-colors ${form.parent_notified ? "bg-brand-700" : "bg-line-strong"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.parent_notified ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
        {form.parent_notified && (
          <div className="field">
            <label className="label">How were they notified?</label>
            <input className="input" placeholder="e.g. Phone call, text message" value={form.parent_notified_method ?? ""} onChange={(e) => set("parent_notified_method", e.target.value)} />
          </div>
        )}
        <div className="field">
          <label className="label">Reported by</label>
          <select className="select" value={form.reported_by_staff_id ?? ""} onChange={(e) => set("reported_by_staff_id", e.target.value || null)}>
            <option value="">— Select staff —</option>
            {data.staff.map((s) => <option key={s.id} value={s.id}>{fullName(s.first_name, s.last_name)}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2.5 mt-5 sticky bottom-24 lg:bottom-4">
        <button className="btn-outline flex-1" onClick={() => save(false)} disabled={busy}><Save className="h-4 w-4" /> Save</button>
        {form.status !== "complete" && (
          <button className="btn-primary flex-1" onClick={() => save(true)} disabled={busy}><Check className="h-4 w-4" /> Mark complete</button>
        )}
      </div>

      <ConfirmSheet open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={remove} title="Delete this incident?" message="This permanently removes the report. This cannot be undone." confirmLabel="Delete" danger />
    </div>
  );
}
