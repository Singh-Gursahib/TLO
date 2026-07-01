"use client";

import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { fullName, fmtDate } from "@/lib/utils";
import { Loading, PageHeader, Avatar, EmptyState } from "@/components/ui/Primitives";
import { ContactActions } from "@/components/ContactActions";
import type { Staff } from "@/lib/types";
import { UsersRound, Phone, Mail, MapPin, CalendarClock, HeartPulse, Briefcase } from "lucide-react";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

async function loadStaff() {
  const { data } = await supabase.from("staff").select("*").order("first_name");
  return (data ?? []) as Staff[];
}

export default function StaffPage() {
  const { data, loading } = useAsync(loadStaff, []);
  const staff = data ?? [];

  return (
    <div className="page animate-rise max-w-3xl">
      <PageHeader title="Staff" subtitle={`${staff.length} team members`} />

      {loading ? (
        <Loading />
      ) : staff.length === 0 ? (
        <div className="card"><EmptyState icon={UsersRound} title="No staff yet" /></div>
      ) : (
        <div className="space-y-3">
          {staff.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-start gap-3">
                <Avatar first={s.first_name} last={s.last_name} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-ink">{fullName(s.first_name, s.last_name)}</p>
                    <span className="badge-teal capitalize">{s.role}</span>
                    {s.status === "inactive" && <span className="badge-slate">Inactive</span>}
                  </div>
                  <p className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                    <Briefcase className="h-3 w-3" /> {s.position || "—"}
                    {s.hire_date && <> · since {fmtDate(s.hire_date, { month: "short", year: "numeric" })}</>}
                  </p>
                </div>
                <ContactActions phone={s.phone} email={s.email} />
              </div>

              <div className="mt-3 pt-3 border-t border-line grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {s.phone && <p className="flex items-center gap-2 text-body"><Phone className="h-3.5 w-3.5 text-muted" /> {s.phone}</p>}
                {s.email && <p className="flex items-center gap-2 text-body truncate"><Mail className="h-3.5 w-3.5 text-muted" /> {s.email}</p>}
                {(s.address || s.city) && <p className="flex items-center gap-2 text-body"><MapPin className="h-3.5 w-3.5 text-muted" /> {[s.address, s.city].filter(Boolean).join(", ")}</p>}
                {s.emergency_contact_name && (
                  <p className="flex items-center gap-2 text-body">
                    <HeartPulse className="h-3.5 w-3.5 text-danger" /> {s.emergency_contact_name} ({s.emergency_contact_relation}) · {s.emergency_contact_phone}
                  </p>
                )}
              </div>

              {s.availability && Object.keys(s.availability).length > 0 && (
                <div className="mt-3 pt-3 border-t border-line">
                  <p className="text-xs text-muted flex items-center gap-1.5 mb-2"><CalendarClock className="h-3.5 w-3.5" /> Availability</p>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS.filter((d) => s.availability?.[d]).map((d) => (
                      <span key={d} className="badge-slate">
                        <span className="capitalize font-medium">{d}</span> {s.availability![d]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
