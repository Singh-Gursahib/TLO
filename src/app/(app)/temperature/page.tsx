"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceArea, CartesianGrid, Dot,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useAsync } from "@/lib/useAsync";
import { todayISO, fmtDate } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Loading, PageHeader, StatCard } from "@/components/ui/Primitives";
import { Segmented } from "@/components/ui/Segmented";
import type { FridgeTempLog } from "@/lib/types";
import { Thermometer, Check, TriangleAlert, Snowflake } from "lucide-react";

const RANGE = { min: 0, max: 4 };

async function loadTemps() {
  const { data } = await supabase
    .from("fridge_temp_logs")
    .select("*")
    .order("date", { ascending: false })
    .limit(60);
  return (data ?? []) as FridgeTempLog[];
}

export default function TemperaturePage() {
  const { data, loading, refetch } = useAsync(loadTemps, []);
  const { toast } = useToast();
  const [range, setRange] = useState<"week" | "month">("week");
  const [temp, setTemp] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const logs = data ?? [];
  const today = todayISO();
  const todayLog = logs.find((l) => l.date === today);

  const chartData = useMemo(() => {
    const days = range === "week" ? 7 : 30;
    const cutoff = new Date(Date.now() - days * 86400000);
    return logs
      .filter((l) => new Date(l.date) >= cutoff)
      .slice()
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((l) => ({
        date: new Date(l.date + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
        temp: Number(l.temp_c),
        inRange: l.temp_c >= RANGE.min && l.temp_c <= RANGE.max,
      }));
  }, [logs, range]);

  const periodLogs = useMemo(() => {
    const days = range === "week" ? 7 : 30;
    const cutoff = new Date(Date.now() - days * 86400000);
    return logs.filter((l) => new Date(l.date) >= cutoff);
  }, [logs, range]);

  const outOfRange = periodLogs.filter((l) => l.temp_c < RANGE.min || l.temp_c > RANGE.max).length;
  const avg = periodLogs.length ? (periodLogs.reduce((s, l) => s + Number(l.temp_c), 0) / periodLogs.length).toFixed(1) : "—";

  async function logTemp() {
    const t = parseFloat(temp);
    if (Number.isNaN(t)) return toast("Enter a valid temperature", "error");
    setBusy(true);
    const payload = {
      date: today,
      temp_c: t,
      in_range: t >= RANGE.min && t <= RANGE.max,
      notes: note || null,
      recorded_at: new Date().toISOString(),
    };
    // upsert on date to keep one-per-day
    const existing = logs.find((l) => l.date === today);
    const res = existing
      ? await supabase.from("fridge_temp_logs").update(payload).eq("id", existing.id)
      : await supabase.from("fridge_temp_logs").insert(payload);
    setBusy(false);
    if (res.error) return toast(res.error.message, "error");
    toast(payload.in_range ? "Temperature logged — within range ✓" : "Logged — reading is out of range!", payload.in_range ? "success" : "error");
    setTemp("");
    setNote("");
    refetch();
  }

  return (
    <div className="page animate-rise max-w-3xl">
      <PageHeader title="Fridge Temperature" subtitle={`Safe range ${RANGE.min}–${RANGE.max}°C`} />

      {/* Today's reading */}
      <div className="card p-5 mb-6">
        {todayLog ? (
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${todayLog.in_range ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
              {todayLog.in_range ? <Check className="h-7 w-7" /> : <TriangleAlert className="h-7 w-7" />}
            </div>
            <div>
              <p className="text-2xl font-semibold text-ink">{todayLog.temp_c}°C</p>
              <p className="text-sm text-muted">Logged today {todayLog.in_range ? "· within safe range" : "· out of range"}</p>
            </div>
          </div>
        ) : (
          <>
            <p className="section-title mb-3 flex items-center gap-2"><Snowflake className="h-4 w-4 text-brand-600" /> Log today&apos;s reading</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Thermometer className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted" />
                <input
                  className="input pl-10"
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="Temperature °C"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                />
              </div>
              <button className="btn-primary" onClick={logTemp} disabled={busy}>{busy ? "Saving…" : "Log"}</button>
            </div>
            <input className="input mt-2" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          </>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon={Thermometer} value={`${avg}°`} label={`Avg (${range})`} />
        <StatCard icon={Check} tone="ok" value={periodLogs.length - outOfRange} label="In range" />
        <StatCard icon={TriangleAlert} tone={outOfRange ? "danger" : "teal"} value={outOfRange} label="Out of range" />
      </div>

      {/* Chart */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="section-title">Trend</p>
          <Segmented
            value={range}
            onChange={setRange}
            options={[{ value: "week", label: "Week" }, { value: "month", label: "Month" }]}
          />
        </div>
        {loading ? (
          <Loading />
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted text-center py-10">No readings in this period.</p>
        ) : (
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f1" vertical={false} />
                <ReferenceArea y1={RANGE.min} y2={RANGE.max} fill="#2f9e6f" fillOpacity={0.08} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7d7a" }} tickLine={false} axisLine={{ stroke: "#e6ebe9" }} minTickGap={16} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7d7a" }} tickLine={false} axisLine={false} domain={[-2, 8]} unit="°" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e6ebe9", fontSize: 13, boxShadow: "0 8px 24px -12px rgba(16,64,62,0.28)" }}
                  formatter={(v) => [`${v}°C`, "Temp"]}
                />
                <Line
                  type="monotone"
                  dataKey="temp"
                  stroke="#1e4d4b"
                  strokeWidth={2.5}
                  dot={(props) => {
                    const { cx, cy, payload, index } = props;
                    return (
                      <Dot key={index} cx={cx} cy={cy} r={3.5} fill={payload.inRange ? "#1e4d4b" : "#d24d4d"} stroke="#fff" strokeWidth={1.5} />
                    );
                  }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent log */}
      <div>
        <p className="section-title mb-2.5 px-1">Recent readings</p>
        <div className="card row-divide overflow-hidden">
          {logs.slice(0, 12).map((l) => (
            <div key={l.id} className="row">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${l.in_range ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
                <Thermometer className="h-[18px] w-[18px]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">{l.temp_c}°C</p>
                <p className="text-xs text-muted">{fmtDate(l.date, { weekday: "short", month: "short", day: "numeric" })}{l.notes ? ` · ${l.notes}` : ""}</p>
              </div>
              {l.in_range ? <span className="badge-ok">In range</span> : <span className="badge-danger">Out of range</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
