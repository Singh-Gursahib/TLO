"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { todayISO, fmtTime, fmtDate, fullName } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Loading, PageHeader, EmptyState } from "@/components/ui/Primitives";
import { Sheet } from "@/components/ui/Sheet";
import type { Outing, Student, Staff } from "@/lib/types";
import { Footprints, Plus, MapPin, ChevronRight, Check, Clock3, Users } from "lucide-react";

interface OutingWithCounts extends Outing {
  total: number;
  back: number;
}

async function loadOutings() {
  const [outings, parts, students, staff] = await Promise.all([
    supabase.from("outings").select("*").order("departure_time", { ascending: false }).limit(40),
    supabase.from("outing_participants").select("outing_id,checked_in_at"),
    supabase.from("students").select("id,first_name,last_name,status").eq("status", "active").order("first_name"),
    supabase.from("staff").select("*").eq("status", "active").order("first_name"),
  ]);
  const counts = new Map<string, { total: number; back: number }>();
  for (const p of (parts.data ?? []) as { outing_id: string; checked_in_at: string | null }[]) {
    const c = counts.get(p.outing_id) ?? { total: 0, back: 0 };
    c.total++;
    if (p.checked_in_at) c.back++;
    counts.set(p.outing_id, c);
  }
  const withCounts: OutingWithCounts[] = ((outings.data ?? []) as Outing[]).map((o) => ({
    ...o,
    total: counts.get(o.id)?.total ?? 0,
    back: counts.get(o.id)?.back ?? 0,
  }));
  return {
    outings: withCounts,
    students: (students.data ?? []) as Student[],
    staff: (staff.data ?? []) as Staff[],
  };
}

export default function OutingsPage() {
  const { data, loading, refetch } = useAsync(loadOutings, []);
  const { toast } = useToast();
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1") {
      setNewOpen(true);
    }
  }, []);

  const outings = data?.outings ?? [];
  const active = outings.filter((o) => o.status === "out");
  const past = outings.filter((o) => o.status === "returned" || o.status === "cancelled");

  return (
    <div className="page animate-rise">
      <PageHeader
        title="Outings"
        subtitle="Outdoor & indoor attendance"
        action={<button className="btn-primary btn-sm" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> New</button>}
      />

      {loading ? (
        <Loading />
      ) : (
        <>
          {active.length > 0 && (
            <div className="mb-6">
              <p className="section-title mb-2.5 px-1">Currently out</p>
              <div className="space-y-3">
                {active.map((o) => (
                  <Link key={o.id} href={`/outings/${o.id}`} className="card card-hover block p-4 border-info/30">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-info-soft text-info shrink-0">
                        <Footprints className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{o.title}</p>
                        <p className="text-xs text-muted flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3" /> {o.destination || "—"} · left {fmtTime(o.departure_time)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="badge-info">{o.back}/{o.total} back</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {active.length === 0 && past.length === 0 ? (
            <div className="card">
              <EmptyState icon={Footprints} title="No outings yet" description="Start an outing to track children leaving and returning safely.">
                <button className="btn-primary" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> New outing</button>
              </EmptyState>
            </div>
          ) : (
            <div>
              <p className="section-title mb-2.5 px-1">History</p>
              <div className="card row-divide overflow-hidden">
                {past.map((o) => (
                  <Link key={o.id} href={`/outings/${o.id}`} className="row hover:bg-canvas">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-canvas text-muted shrink-0">
                      <Footprints className="h-[18px] w-[18px]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{o.title}</p>
                      <p className="text-xs text-muted truncate">{fmtDate(o.departure_time)} · {o.total} children</p>
                    </div>
                    {o.status === "returned" ? <span className="badge-ok"><Check className="h-3 w-3" /> All back</span> : <span className="badge-slate">Cancelled</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {newOpen && (
        <NewOutingSheet
          students={data?.students ?? []}
          staff={data?.staff ?? []}
          onClose={() => setNewOpen(false)}
          onCreated={() => { setNewOpen(false); refetch(); toast("Outing started — children checked out"); }}
        />
      )}
    </div>
  );
}

function NewOutingSheet({
  students, staff, onClose, onCreated,
}: {
  students: Student[];
  staff: Staff[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");
  const [leadId, setLeadId] = useState(staff[0]?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function create() {
    if (!title.trim()) return toast("Give the outing a title", "error");
    if (selected.size === 0) return toast("Select at least one child", "error");
    setBusy(true);
    const now = new Date().toISOString();
    const { data: outing, error } = await supabase
      .from("outings")
      .insert({ title: title.trim(), destination: destination || null, purpose: purpose || null, led_by_staff_id: leadId || null, departure_time: now, status: "out" })
      .select("id")
      .single();
    if (error || !outing) { setBusy(false); return toast(error?.message ?? "Failed", "error"); }
    const rows = [...selected].map((sid) => ({ outing_id: outing.id, student_id: sid, checked_out_at: now, status: "out" as const }));
    const { error: e2 } = await supabase.from("outing_participants").insert(rows);
    setBusy(false);
    if (e2) return toast(e2.message, "error");
    onCreated();
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="New outing"
      description="Record children leaving the daycare"
      size="lg"
      footer={
        <button className="btn-primary w-full" onClick={create} disabled={busy}>
          {busy ? "Starting…" : <><Footprints className="h-4 w-4" /> Check out {selected.size > 0 ? `${selected.size} ` : ""}& start</>}
        </button>
      }
    >
      <div className="field">
        <label className="label">Title</label>
        <input className="input" placeholder="e.g. Riverside Park Walk" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field">
          <label className="label">Destination</label>
          <input className="input" placeholder="Where to?" value={destination} onChange={(e) => setDestination(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Purpose</label>
          <input className="input" placeholder="e.g. Nature walk" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label className="label">Led by</label>
        <select className="select" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
          {staff.map((s) => <option key={s.id} value={s.id}>{fullName(s.first_name, s.last_name)}</option>)}
        </select>
      </div>

      <div className="flex items-center justify-between mb-2">
        <label className="label mb-0 flex items-center gap-1.5"><Users className="h-4 w-4" /> Children ({selected.size} selected)</label>
        <button className="text-[13px] text-brand-700 font-medium" onClick={() => setSelected(new Set(students.map((s) => s.id)))}>Select all</button>
      </div>
      <div className="rounded-xl border border-line divide-y divide-line max-h-64 overflow-y-auto">
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
      <div className="flex items-center gap-2 text-xs text-muted mt-3">
        <Clock3 className="h-3.5 w-3.5" /> Check-out time recorded as now. Confirm each child back inside on return.
      </div>
    </Sheet>
  );
}
