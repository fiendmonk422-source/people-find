"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";

export type ActivityEvent = {
  id: number;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  summary: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

export default function ActivityReport({ events }: { events: ActivityEvent[] }) {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");

  const actions = useMemo(
    () => Array.from(new Set(events.map((event) => event.action))).sort(),
    [events]
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesAction = action === "all" || event.action === action;
      const haystack = [
        event.actor_email, event.actor_user_id, event.action, event.target_type,
        event.target_id, event.summary, JSON.stringify(event.details ?? {}),
      ].join(" ").toLowerCase();
      return matchesAction && (!term || haystack.includes(term));
    });
  }, [events, query, action]);

  function exportCsv() {
    const columns = ["created_at", "actor_email", "actor_user_id", "action", "target_type", "target_id", "summary", "details"];
    const quote = (value: unknown) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
    const lines = [
      columns.map(quote).join(","),
      ...filtered.map((event) => [
        event.created_at, event.actor_email, event.actor_user_id, event.action,
        event.target_type, event.target_id, event.summary, JSON.stringify(event.details ?? {}),
      ].map(quote).join(",")),
    ];
    const blobUrl = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = "peoplefind-admin-activity.csv";
    link.click();
    URL.revokeObjectURL(blobUrl);
  }

  return (
    <section className="mt-8">
      <div className="grid gap-3 rounded-2xl border border-white/[0.08] bg-[#141413] p-4 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-center">
        <label className="relative block">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#77736c]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actions, records or admins" className="h-11 w-full rounded-xl border border-white/[0.09] bg-[#0e0e0d] pl-10 pr-3 text-sm text-[#ebe8e1] placeholder:text-[#625f58]" />
        </label>
        <select value={action} onChange={(event) => setAction(event.target.value)} className="h-11 rounded-xl border border-white/[0.09] bg-[#0e0e0d] px-3 text-sm text-[#ebe8e1]">
          <option value="all">All actions</option>
          {actions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button type="button" onClick={exportCsv} disabled={filtered.length === 0} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#ebe8e1] px-4 text-sm font-semibold text-[#0c0c0b] disabled:cursor-not-allowed disabled:opacity-45">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-[#77736c]">
        <span>{filtered.length} matching event{filtered.length === 1 ? "" : "s"}</span>
        <span>Showing up to {events.length} most recent events</span>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141413]">
        {filtered.length === 0 ? (
          <div className="p-8 text-sm text-[#77736c]">No activity matches this filter yet.</div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filtered.map((event) => (
              <article key={event.id} className="grid gap-2 p-4 sm:grid-cols-[190px_minmax(0,1fr)] sm:p-5">
                <div>
                  <time className="text-xs text-[#918d84]">{new Date(event.created_at).toLocaleString()}</time>
                  <p className="mt-1 break-all text-xs text-[#625f58]">{event.actor_email || (event.actor_user_id ? event.actor_user_id.slice(0, 8) : "Unknown administrator")}</p>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/[0.09] bg-white/[0.03] px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-[#cdbd96]">{event.action}</span>
                    <span className="text-xs text-[#77736c]">{event.target_type}{event.target_id ? " · " + event.target_id : ""}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#d6d2ca]">{event.summary}</p>
                  {event.details && Object.keys(event.details).length > 0 && (
                    <p className="mt-1 break-words text-xs leading-5 text-[#77736c]">Details: {JSON.stringify(event.details)}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
