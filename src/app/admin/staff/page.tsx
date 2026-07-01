"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { fullName } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Loading, Avatar, EmptyState } from "@/components/ui/Primitives";
import { Sheet, ConfirmSheet } from "@/components/ui/Sheet";
import type { Staff } from "@/lib/types";
import { Plus, Pencil, Trash2, UsersRound, KeyRound } from "lucide-react";

async function loadStaff() {
  const { data } = await supabase.from("staff").select("*").order("first_name");
  return (data ?? []) as Staff[];
}

export default function AdminStaff() {
  const { data, loading, refetch } = useAsync(loadStaff, []);
  const { toast } = useToast();
  const [editing, setEditing] = useState<Staff | "new" | null>(null);
  const [delTarget, setDelTarget] = useState<Staff | null>(null);

  const staff = data ?? [];

  async function del() {
    if (!delTarget) return;
    const { error } = await supabase.from("staff").delete().eq("id", delTarget.id);
    if (error) return toast(error.message, "error");
    toast("Staff member deleted");
    setDelTarget(null);
    refetch();
  }

  return (
    <div className="animate-rise">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Staff</h1>
          <p className="text-sm text-muted">{staff.length} team members</p>
        </div>
        <button className="btn-primary btn-sm" onClick={() => setEditing("new")}><Plus className="h-4 w-4" /> Add staff</button>
      </div>

      {loading ? (
        <Loading />
      ) : staff.length === 0 ? (
        <div className="card"><EmptyState icon={UsersRound} title="No staff yet" /></div>
      ) : (
        <div className="card row-divide overflow-hidden">
          {staff.map((s) => (
            <div key={s.id} className="row">
              <Avatar first={s.first_name} last={s.last_name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{fullName(s.first_name, s.last_name)}</p>
                <p className="text-xs text-muted truncate">@{s.username} · {s.position || s.role}{s.phone ? ` · ${s.phone}` : ""}</p>
              </div>
              <span className="badge-teal capitalize hidden sm:inline-flex">{s.role}</span>
              <button className="icon-btn text-muted hover:bg-brand-50 hover:text-brand-700" onClick={() => setEditing(s)}><Pencil className="h-[17px] w-[17px]" /></button>
              <button className="icon-btn text-muted hover:bg-danger-soft hover:text-danger" onClick={() => setDelTarget(s)}><Trash2 className="h-[17px] w-[17px]" /></button>
            </div>
          ))}
        </div>
      )}

      {editing && <StaffSheet staff={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refetch(); }} />}

      <ConfirmSheet open={!!delTarget} onClose={() => setDelTarget(null)} onConfirm={del}
        title={`Delete ${delTarget ? fullName(delTarget.first_name, delTarget.last_name) : ""}?`}
        message="This removes the staff member and their time-clock records. This cannot be undone."
        confirmLabel="Delete" danger />
    </div>
  );
}

function F({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={full ? "sm:col-span-2" : ""}><label className="label">{label}</label>{children}</div>;
}

function StaffSheet({ staff, onClose, onSaved }: { staff: Staff | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const isNew = !staff;
  const [f, setF] = useState<Partial<Staff>>(staff ?? { role: "staff", status: "active", province: "BC", city: "Kamloops" });
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Staff, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!f.first_name || !f.last_name || !f.username) return toast("Name and username are required", "error");
    if (isNew && !password) return toast("Set a password for the new staff member", "error");
    setBusy(true);
    const payload = { ...f, updated_at: new Date().toISOString() };
    delete (payload as { id?: string }).id;
    delete (payload as { created_at?: string }).created_at;
    delete (payload as { password_hash?: string }).password_hash;

    let staffId = staff?.id;
    if (isNew) {
      const { data: created, error } = await supabase.from("staff").insert(payload).select("id").single();
      if (error || !created) { setBusy(false); return toast(error?.message ?? "Failed", "error"); }
      staffId = created.id;
    } else {
      const { error } = await supabase.from("staff").update(payload).eq("id", staff!.id);
      if (error) { setBusy(false); return toast(error.message, "error"); }
    }
    if (password && staffId) {
      const { error } = await supabase.rpc("set_staff_password", { p_staff_id: staffId, p_password: password });
      if (error) { setBusy(false); return toast(error.message, "error"); }
    }
    setBusy(false);
    toast(isNew ? "Staff added" : "Staff updated");
    onSaved();
  }

  return (
    <Sheet open onClose={onClose} title={isNew ? "Add staff" : `Edit ${staff!.first_name}`} size="lg"
      footer={<button className="btn-primary w-full" onClick={save} disabled={busy}>{busy ? "Saving…" : isNew ? "Add staff" : "Save changes"}</button>}>
      <p className="eyebrow mb-3">Profile</p>
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <F label="First name"><input className="input" value={f.first_name ?? ""} onChange={(e) => set("first_name", e.target.value)} /></F>
        <F label="Last name"><input className="input" value={f.last_name ?? ""} onChange={(e) => set("last_name", e.target.value)} /></F>
        <F label="Position"><input className="input" placeholder="e.g. Educator" value={f.position ?? ""} onChange={(e) => set("position", e.target.value)} /></F>
        <F label="Role">
          <select className="select" value={f.role} onChange={(e) => set("role", e.target.value)}>
            {["staff", "lead", "admin"].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </F>
        <F label="Phone"><input className="input" value={f.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></F>
        <F label="Email"><input className="input" value={f.email ?? ""} onChange={(e) => set("email", e.target.value)} /></F>
        <F label="Hire date"><input type="date" className="input" value={f.hire_date ?? ""} onChange={(e) => set("hire_date", e.target.value)} /></F>
        <F label="Status">
          <select className="select" value={f.status} onChange={(e) => set("status", e.target.value)}>
            {["active", "inactive"].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </F>
      </div>

      <p className="eyebrow mb-3">Login credentials</p>
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <F label="Username"><input className="input" autoCapitalize="none" value={f.username ?? ""} onChange={(e) => set("username", e.target.value)} /></F>
        <F label={isNew ? "Password" : "New password (optional)"}>
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted" />
            <input className="input pl-10" type="text" placeholder={isNew ? "Set a password" : "Leave blank to keep"} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </F>
      </div>

      <p className="eyebrow mb-3">Emergency contact</p>
      <div className="grid sm:grid-cols-2 gap-3 mb-2">
        <F label="Name"><input className="input" value={f.emergency_contact_name ?? ""} onChange={(e) => set("emergency_contact_name", e.target.value)} /></F>
        <F label="Relationship"><input className="input" value={f.emergency_contact_relation ?? ""} onChange={(e) => set("emergency_contact_relation", e.target.value)} /></F>
        <F label="Phone" full><input className="input" value={f.emergency_contact_phone ?? ""} onChange={(e) => set("emergency_contact_phone", e.target.value)} /></F>
      </div>
    </Sheet>
  );
}
