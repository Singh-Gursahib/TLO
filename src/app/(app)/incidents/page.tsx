"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { fmtDateTime, fullName } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Loading, PageHeader, EmptyState } from "@/components/ui/Primitives";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import type { Incident, Student } from "@/lib/types";
import { ShieldAlert, Plus, ChevronRight, Check, FileText, Zap } from "lucide-react";

const TYPES = [
  { value: "injury", label: "Injury" },
  { value: "illness", label: "Illness" },
  { value: "behavioral", label: "Behavioural" },
  { value: "property", label: "Property" },
  { value: "allergy", label: "Allergy" },
  { value: "other", label: "Other" },
];
const SEV = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export function sevBadge(sev: string) {
  return sev === "critical" || sev === "high" ? "badge-danger" : sev === "medium" ? "badge-warn" : "badge-slate";
}

async function loadIncidents() {
  const [incidents, links, students] = await Promise.all([
    supabase.from("incidents").select("*").order("created_at", { ascending: false }),
    supabase.from("incident_students").select("incident_id,student:student_id(first_name,last_name)"),
    supabase.from("students").select("id,first_name,last_name,status").eq("status", "active").order("first_name"),
  ]);
  const names = new Map<string, string[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const l of (links.data ?? []) as any[]) {
    if (!l.student) continue;
    const arr = names.get(l.incident_id) ?? [];
    arr.push(`${l.student.first_name} ${l.student.last_name}`);
    names.set(l.incident_id, arr);
  }
  return {
    incidents: (incidents.data ?? []) as Incident[],
    names,
    students: (students.data ?? []) as Student[],
  };
}

export default function IncidentsPage() {
  const { data, loading, refetch } = useAsync(loadIncidents, []);
  const [filter, setFilter] = useState<"draft" | "complete" | "all">("all");
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1") setNewOpen(true);
  }, []);

  const incidents = data?.incidents ?? [];
  const filtered = useMemo(() => {
    if (filter === "all") return incidents;
    return incidents.filter((i) => i.status === filter);
  }, [incidents, filter]);

  const draftCount = incidents.filter((i) => i.status === "draft").length;

  return (
    <div className="page animate-rise">
      <PageHeader
        title="Incidents"
        subtitle="Digital incident reports"
        action={<button className="btn-primary btn-sm" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> Report</button>}
      />

      <Segmented
        className="mb-4"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All" },
          { value: "draft", label: "Drafts", count: draftCount },
          { value: "complete", label: "Complete" },
        ]}
      />

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={ShieldAlert} title="No incidents" description="Quickly capture an incident now — you can add full details later.">
            <button className="btn-primary" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> New report</button>
          </EmptyState>
        </div>
      ) : (
        <div className="card row-divide overflow-hidden">
          {filtered.map((inc) => {
            const people = data?.names.get(inc.id) ?? [];
            return (
              <Link key={inc.id} href={`/incidents/${inc.id}`} className="row hover:bg-canvas items-start">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 mt-0.5 ${inc.status === "draft" ? "bg-warn-soft text-warn" : "bg-brand-50 text-brand-700"}`}>
                  {inc.status === "draft" ? <Zap className="h-[18px] w-[18px]" /> : <FileText className="h-[18px] w-[18px]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {inc.quick_note || inc.description || "Incident report"}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {inc.incident_type ? <span className="capitalize">{inc.incident_type}</span> : "—"}
                    {people.length ? ` · ${people.join(", ")}` : ""} · {fmtDateTime(inc.occurred_at || inc.created_at)}
                  </p>
                  <div className="mt-1.5 flex gap-1.5">
                    <span className={sevBadge(inc.severity)}>{inc.severity}</span>
                    {inc.status === "draft" ? <span className="badge-warn">Draft</span> : <span className="badge-ok"><Check className="h-3 w-3" /> Complete</span>}
                    {inc.parent_notified && <span className="badge-teal">Parent notified</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted shrink-0 mt-2" />
              </Link>
            );
          })}
        </div>
      )}

      {newOpen && <QuickIncidentSheet students={data?.students ?? []} onClose={() => setNewOpen(false)} onCreated={() => refetch()} />}
    </div>
  );
}

function QuickIncidentSheet({ students, onClose, onCreated }: { students: Student[]; onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [type, setType] = useState("injury");
  const [severity, setSeverity] = useState("low");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function save(openAfter: boolean) {
    if (!note.trim()) return toast("Add a quick note", "error");
    setBusy(true);
    const { data: inc, error } = await supabase
      .from("incidents")
      .insert({ quick_note: note.trim(), incident_type: type, severity, status: "draft", occurred_at: new Date().toISOString() })
      .select("id")
      .single();
    if (error || !inc) { setBusy(false); return toast(error?.message ?? "Failed", "error"); }
    if (selected.size) {
      await supabase.from("incident_students").insert([...selected].map((sid) => ({ incident_id: inc.id, student_id: sid })));
    }
    setBusy(false);
    toast("Incident captured as draft");
    onCreated();
    onClose();
    if (openAfter) router.push(`/incidents/${inc.id}`);
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Quick incident report"
      description="Capture the essentials now — add full details later."
      size="lg"
      footer={
        <div className="flex gap-2.5">
          <button className="btn-outline flex-1" onClick={() => save(false)} disabled={busy}>Save draft</button>
          <button className="btn-primary flex-1" onClick={() => save(true)} disabled={busy}>Save & add details</button>
        </div>
      }
    >
      <div className="field">
        <label className="label">What happened?</label>
        <textarea className="textarea" rows={3} placeholder="Brief note — e.g. Scraped knee on playground, cleaned and bandaged." value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field">
          <label className="label">Type</label>
          <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label">Severity</label>
          <select className="select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            {SEV.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <label className="label">Children involved ({selected.size})</label>
      <div className="rounded-xl border border-line divide-y divide-line max-h-48 overflow-y-auto">
        {students.map((s) => {
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
    </Sheet>
  );
}
