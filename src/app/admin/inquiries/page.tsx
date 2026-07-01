"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { fmtDate } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Loading, EmptyState } from "@/components/ui/Primitives";
import { Segmented } from "@/components/ui/Segmented";
import { ConfirmSheet } from "@/components/ui/Sheet";
import { ContactActions } from "@/components/ContactActions";
import type { Inquiry, InquiryStatus } from "@/lib/types";
import { Inbox, Trash2, Baby } from "lucide-react";

const STATUSES: InquiryStatus[] = ["new", "contacted", "admission_sent", "enrolled", "closed"];
const label: Record<InquiryStatus, string> = {
  new: "New", contacted: "Contacted", admission_sent: "Admission sent", enrolled: "Enrolled", closed: "Closed",
};

async function loadInquiries() {
  const { data } = await supabase.from("inquiries").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Inquiry[];
}

export default function AdminInquiries() {
  const { data, loading, refetch } = useAsync(loadInquiries, []);
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | InquiryStatus>("all");
  const [delTarget, setDelTarget] = useState<Inquiry | null>(null);

  const inquiries = data ?? [];
  const filtered = useMemo(() => filter === "all" ? inquiries : inquiries.filter((i) => i.status === filter), [inquiries, filter]);

  async function setStatus(i: Inquiry, status: InquiryStatus) {
    const { error } = await supabase.from("inquiries").update({ status, updated_at: new Date().toISOString() }).eq("id", i.id);
    if (error) return toast(error.message, "error");
    toast("Status updated");
    refetch();
  }

  async function del() {
    if (!delTarget) return;
    await supabase.from("inquiries").delete().eq("id", delTarget.id);
    toast("Inquiry deleted");
    setDelTarget(null);
    refetch();
  }

  return (
    <div className="animate-rise">
      <h1 className="text-2xl font-semibold text-ink tracking-tight mb-1">Inquiries</h1>
      <p className="text-sm text-muted mb-5">Leads from the website contact form.</p>

      <Segmented className="mb-4" value={filter} onChange={setFilter}
        options={[{ value: "all", label: "All" }, ...STATUSES.map((s) => ({ value: s, label: label[s], count: inquiries.filter((i) => i.status === s).length }))]} />

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="card"><EmptyState icon={Inbox} title="No inquiries" description="New leads from the website will appear here." /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((i) => (
            <div key={i.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{i.parent_name || "—"}</p>
                  <p className="text-xs text-muted flex items-center gap-1.5">
                    <Baby className="h-3 w-3" /> {i.child_name || "—"}{i.child_age ? `, age ${i.child_age}` : ""} · {fmtDate(i.created_at, { month: "short", day: "numeric" })}
                  </p>
                </div>
                <ContactActions phone={i.phone} email={i.email} />
              </div>
              {i.message && <p className="text-sm text-body mt-3 bg-canvas rounded-xl p-3">{i.message}</p>}
              <div className="mt-3 flex items-center gap-2">
                <select className="select h-9 !w-auto text-[13px]" value={i.status} onChange={(e) => setStatus(i, e.target.value as InquiryStatus)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{label[s]}</option>)}
                </select>
                <button className="icon-btn text-muted hover:bg-danger-soft hover:text-danger ml-auto" onClick={() => setDelTarget(i)}><Trash2 className="h-[17px] w-[17px]" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmSheet open={!!delTarget} onClose={() => setDelTarget(null)} onConfirm={del} title="Delete inquiry?" message="This removes the lead permanently." confirmLabel="Delete" danger />
    </div>
  );
}
