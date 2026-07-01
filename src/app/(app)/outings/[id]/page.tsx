"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { fmtTime, fmtDate, fullName } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Loading, Avatar } from "@/components/ui/Primitives";
import { ConfirmSheet } from "@/components/ui/Sheet";
import { useState } from "react";
import type { Outing } from "@/lib/types";
import { ChevronLeft, MapPin, Footprints, Check, Clock3, ShieldCheck, LogIn } from "lucide-react";

interface PartRow {
  id: string;
  checked_out_at: string | null;
  checked_in_at: string | null;
  status: string;
  student: { id: string; first_name: string; last_name: string } | null;
}

async function loadOuting(id: string) {
  const [outing, parts] = await Promise.all([
    supabase.from("outings").select("*, staff:led_by_staff_id(first_name,last_name)").eq("id", id).single(),
    supabase.from("outing_participants").select("id,checked_out_at,checked_in_at,status,student:student_id(id,first_name,last_name)").eq("outing_id", id),
  ]);
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    outing: outing.data as any as (Outing & { staff: { first_name: string; last_name: string } | null }) | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parts: ((parts.data as any as PartRow[]) ?? []).sort((a, b) => (a.student?.first_name ?? "").localeCompare(b.student?.first_name ?? "")),
  };
}

export default function OutingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, refetch } = useAsync(() => loadOuting(id), [id]);
  const { toast } = useToast();
  const [confirmAll, setConfirmAll] = useState(false);

  if (loading || !data) return <div className="page"><Loading /></div>;
  const o = data.outing;
  if (!o) return <div className="page"><p className="text-muted py-10 text-center">Outing not found.</p></div>;

  const parts = data.parts;
  const back = parts.filter((p) => p.checked_in_at).length;
  const total = parts.length;
  const allBack = total > 0 && back === total;
  const isReturned = o.status === "returned";

  async function checkIn(p: PartRow) {
    const { error } = await supabase
      .from("outing_participants")
      .update({ checked_in_at: new Date().toISOString(), status: "returned" })
      .eq("id", p.id);
    if (error) return toast(error.message, "error");
    toast(`${p.student?.first_name} back inside ✓`);
    refetch();
  }

  async function finalize() {
    const now = new Date().toISOString();
    await supabase.from("outing_participants").update({ checked_in_at: now, status: "returned" }).eq("outing_id", id).is("checked_in_at", null);
    const { error } = await supabase.from("outings").update({ status: "returned", actual_return: now }).eq("id", id);
    if (error) return toast(error.message, "error");
    toast("All children confirmed safely back inside 🎉");
    refetch();
  }

  return (
    <div className="page animate-rise max-w-2xl">
      <Link href="/outings" className="inline-flex items-center gap-1 text-sm text-muted hover:text-brand-700 mb-4">
        <ChevronLeft className="h-4 w-4" /> Outings
      </Link>

      <div className="card p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 ${isReturned ? "bg-ok-soft text-ok" : "bg-info-soft text-info"}`}>
            <Footprints className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-ink tracking-tight">{o.title}</h1>
            <p className="text-sm text-muted flex items-center gap-1.5 mt-0.5"><MapPin className="h-3.5 w-3.5" /> {o.destination || "—"}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {isReturned ? <span className="badge-ok"><Check className="h-3 w-3" /> All back</span> : <span className="badge-info">{back}/{total} back inside</span>}
              {o.staff && <span className="badge-slate">Led by {fullName(o.staff.first_name, o.staff.last_name)}</span>}
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-line grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted">Departed</p>
            <p className="text-body">{fmtDate(o.departure_time)} · {fmtTime(o.departure_time)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">{isReturned ? "Returned" : "Expected back"}</p>
            <p className="text-body">{isReturned ? fmtTime(o.actual_return) : fmtTime(o.expected_return)}</p>
          </div>
        </div>
      </div>

      {/* Indoor attendance */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <p className="section-title flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-brand-600" /> Return check-in</p>
        {!isReturned && !allBack && (
          <button className="btn-secondary btn-sm" onClick={() => setConfirmAll(true)}>Confirm all back</button>
        )}
      </div>

      <div className="card row-divide overflow-hidden">
        {parts.map((p) => {
          const isIn = !!p.checked_in_at;
          return (
            <div key={p.id} className="row">
              <Avatar first={p.student?.first_name} last={p.student?.last_name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{p.student ? fullName(p.student.first_name, p.student.last_name) : "—"}</p>
                <p className="text-xs text-muted flex items-center gap-1">
                  <Clock3 className="h-3 w-3" /> Out {fmtTime(p.checked_out_at)}{isIn ? ` · Back ${fmtTime(p.checked_in_at)}` : ""}
                </p>
              </div>
              {isIn ? (
                <span className="badge-ok"><Check className="h-3 w-3" /> Inside</span>
              ) : (
                <button className="btn-primary btn-sm" onClick={() => checkIn(p)}><LogIn className="h-4 w-4" /> Back inside</button>
              )}
            </div>
          );
        })}
      </div>

      {allBack && !isReturned && (
        <button className="btn-primary w-full mt-4" onClick={finalize}><Check className="h-4 w-4" /> Everyone's back — close outing</button>
      )}

      <ConfirmSheet
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        onConfirm={finalize}
        title="Confirm all children back inside?"
        message="This will mark every child on this outing as safely returned and close it out."
        confirmLabel="Yes, all back inside"
      />
    </div>
  );
}
