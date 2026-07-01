"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { ageFromDob, fullName } from "@/lib/utils";
import { Loading, PageHeader, Avatar, EmptyState } from "@/components/ui/Primitives";
import type { Student } from "@/lib/types";
import { Search, Users, ChevronRight, TriangleAlert } from "lucide-react";

async function loadStudents() {
  const { data } = await supabase
    .from("students")
    .select("*")
    .neq("status", "withdrawn")
    .order("first_name");
  return (data ?? []) as Student[];
}

export default function StudentsPage() {
  const { data, loading } = useAsync(loadStudents, []);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (!q.trim()) return list;
    const t = q.toLowerCase();
    return list.filter(
      (s) =>
        fullName(s.first_name, s.last_name).toLowerCase().includes(t) ||
        (s.school_name ?? "").toLowerCase().includes(t)
    );
  }, [data, q]);

  return (
    <div className="page animate-rise">
      <PageHeader title="Students" subtitle={`${data?.length ?? 0} enrolled`} />

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted" />
        <input
          className="input pl-10"
          placeholder="Search students or schools…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <div className="card"><EmptyState icon={Users} title="No students found" description="Try a different search." /></div>
      ) : (
        <div className="card overflow-hidden row-divide">
          {filtered.map((s) => {
            const age = ageFromDob(s.dob);
            return (
              <Link key={s.id} href={`/students/${s.id}`} className="row hover:bg-canvas">
                <Avatar first={s.first_name} last={s.last_name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{fullName(s.first_name, s.last_name)}</p>
                  <p className="text-xs text-muted truncate">
                    {[age ? `${age} yrs` : null, s.grade, s.school_name].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {s.allergies && (
                  <span className="badge-warn mr-1" title={`Allergy: ${s.allergies}`}>
                    <TriangleAlert className="h-3 w-3" /> Allergy
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
