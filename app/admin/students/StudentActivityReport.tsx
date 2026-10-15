"use client";

import { useMemo, useState } from "react";
import { Download, Search, Users } from "lucide-react";

export type StudentActivity = {
  id: number;
  user_id: string;
  user_email: string | null;
  event_type: string;
  page_path: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const labels: Record<string, string> = {
  page_view: "Page viewed",
  directory_search: "Directory search",
  profile_view: "Profile viewed",
  request_created: "Request created",
  response_created: "Response posted",
  reaction_created: "Reaction added",
};

export default function StudentActivityReport({ events }: { events: StudentActivity[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return events.filter((event) => (type === "all" || event.event_type === type) &&
      (!term || [event.user_email, event.user_id, event.event_type, event.page_path, JSON.stringify(event.metadata ?? {})].join(" ").toLowerCase().includes(term)));
  }, [events, query, type]);

  function exportCsv() {
    const columns = ["created_at", "user_email", "user_id", "event_type", "page_path", "metadata"];
    const quote = (value: unknown) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
    const csv = [columns.map(quote).join(","), ...filtered.map((event) => [
      event.created_at, event.user_email, event.user_id, event.event_type, event.page_path, JSON.stringify(event.metadata ?? {}),
    ].map(quote).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "peoplefind-student-activity.csv"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const uniqueStudents = new Set(events.map((event) => event.user_id)).size;
  const pageViews = events.filter((event) => event.event_type === "page_view").length;

  return (
    <section className="mt-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Tracked events" value={events.length.toLocaleString()} />
        <Metric label="Unique students" value={uniqueStudents.toLocaleString()} />
        <Metric label="Page views" value={pageViews.toLocaleString()} />
      </div>
      <div className="mt-5 grid gap-3 rounded-2xl border border-white/[0.08] bg-[#141413] p-4 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-center">
        <label className="relative block"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#77736c]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search student email, page or activity" className="h-11 w-full rounded-xl border border-white/[0.09] bg-[#0e0e0d] pl-10 pr-3 text-sm text-[#ebe8e1] placeholder:text-[#625f58]" /></label>
        <select value={type} onChange={(event) => setType(event.target.value)} className="h-11 rounded-xl border border-white/[0.09] bg-[#0e0e0d] px-3 text-sm text-[#ebe8e1]"><option value="all">All activity</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <button type="button" disabled={!filtered.length} onClick={exportCsv} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#ebe8e1] px-4 text-sm font-semibold text-[#0c0c0b] disabled:opacity-40"><Download size={16} />Export CSV</button>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-[#77736c]"><span>{filtered.length} matching events</span><span>Most recent {events.length} tracked events</span></div>
      <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141413]">
        {!filtered.length ? <div className="p-8 text-sm text-[#77736c]">No activity matches this filter yet. Activity appears as signed-in students use PeopleFind.</div> : <div className="divide-y divide-white/[0.06]">{filtered.map((event) => <article key={event.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(180px,0.7fr)_minmax(0,1.3fr)] sm:p-5"><div><p className="break-all text-sm font-medium text-[#d8d4cc]">{event.user_email || "Email unavailable"}</p><p className="mt-1 break-all text-[10px] text-[#625f58]">User ID: {event.user_id.slice(0, 8)}…</p><time className="mt-2 block text-xs text-[#918d84]">{new Date(event.created_at).toLocaleString()}</time></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-white/[0.09] bg-white/[0.03] px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-[#cdbd96]">{labels[event.event_type] || event.event_type}</span><span className="break-all text-xs text-[#918d84]">{event.page_path}</span></div>{event.metadata && Object.keys(event.metadata).length > 0 && <p className="mt-2 break-words text-xs text-[#77736c]">{JSON.stringify(event.metadata)}</p>}</div></article>)}</div>}
      </div>
      <p className="mt-4 text-xs leading-5 text-[#625f58]">Activity tracking records signed-in page visits only. It does not collect raw search terms, keystrokes, or private form contents.</p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/[0.08] bg-[#141413] p-5"><div className="flex items-center gap-2 text-xs text-[#918d84]"><Users size={14} />{label}</div><p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p></div>;
}
