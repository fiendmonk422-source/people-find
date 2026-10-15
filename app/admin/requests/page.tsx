"use client";

import { useEffect, useState } from "react";
import { ClipboardList, RefreshCw } from "lucide-react";

type AdminRequest = {
  id: string;
  requester_name: string | null;
  target_name: string | null;
  school: string | null;
  faculty: string | null;
  department: string | null;
  level: string | null;
  hostel: string | null;
  clues: string | null;
  status: string | null;
  created_at: string;
};

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadRequests() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/requests", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || "Could not load requests.");
      setRequests(payload.requests ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  async function changeStatus(item: AdminRequest, status: string) {
    setSavingId(item.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: item.id, status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || "Could not update request.");
      setNotice("Request status saved and recorded in the admin activity log.");
      await loadRequests();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update request.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#0c0c0b] px-4 pb-16 pt-8 text-[#ebe8e1] sm:px-6 lg:pt-12">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#cdbd96]">PeopleFind / Administration</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Request review</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#918d84]">Review community requests and record status changes for the admin report.</p>
          </div>
          <button type="button" onClick={() => void loadRequests()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/[0.09] px-4 py-3 text-sm text-[#cfcac1] disabled:opacity-50"><RefreshCw size={15} /> Refresh</button>
        </div>

        {error && <div role="alert" className="mt-5 rounded-xl border border-[#d98282]/20 bg-[#d98282]/[0.06] p-4 text-sm text-[#e0a29a]">{error}</div>}
        {notice && <div role="status" className="mt-5 rounded-xl border border-[#91b89a]/20 bg-[#91b89a]/[0.06] p-4 text-sm text-[#b4cfba]">{notice}</div>}

        {loading ? <p className="mt-8 text-sm text-[#77736c]">Loading requests…</p> :
         requests.length ? (
          <div className="mt-8 space-y-3">
            {requests.map((item) => (
              <article key={item.id} className="grid gap-5 rounded-2xl border border-white/[0.08] bg-[#141413] p-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-[#cdbd96]">{item.status || "Open"}</span>
                    <span className="text-xs text-[#77736c]">{new Date(item.created_at).toLocaleString()}</span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold">{item.target_name || "Person not named"}</h2>
                  <p className="mt-1 text-xs text-[#918d84]">Requested by {item.requester_name || "Member"}{item.school ? " · " + item.school : ""}</p>
                  <p className="mt-3 text-sm leading-6 text-[#cbc7be]">{item.clues || "No additional clues supplied."}</p>
                  <p className="mt-2 text-xs text-[#77736c]">{[item.faculty, item.department, item.level ? item.level + " Level" : null, item.hostel].filter(Boolean).join(" · ")}</p>
                </div>
                <label className="block">
                  <span className="mb-2 block text-xs text-[#918d84]">Update status</span>
                  <select value={["Open", "Resolved", "Closed"].includes(item.status || "") ? item.status || "Open" : "Open"} disabled={savingId === item.id} onChange={(event) => void changeStatus(item, event.target.value)} className="h-11 w-full rounded-xl border border-white/[0.09] bg-[#0e0e0d] px-3 text-sm">
                    <option value="Open">Open</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                  {savingId === item.id && <span className="mt-2 block text-xs text-[#77736c]">Saving status…</span>}
                </label>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-white/[0.1] p-10 text-center">
            <ClipboardList size={25} className="mx-auto text-[#625f58]" />
            <p className="mt-3 text-sm text-[#77736c]">No community requests are available.</p>
          </div>
        )}
      </div>
    </main>
  );
}
