"use client";

import { useMemo, useState } from "react";
import { Download, Play, RotateCcw } from "lucide-react";

type Field = "fullName" | "email" | "phone" | "photoUrl" | "faculty" | "department" | "level" | "admissionYear" | "hostel" | "room" | "gender" | "dateOfBirth" | "address" | "state" | "country";
type Item = { matricNumber: string; status: "collected" | "failed" | "review"; data: Partial<Record<Field, string>>; error: string; sourceUrl: string; collectedAt: string };
const FIELD_HEADERS: Record<Field, string> = {
  fullName: "full_name", email: "email", phone: "phone", photoUrl: "photo_url", faculty: "faculty",
  department: "department", level: "level", admissionYear: "admission_year", hostel: "hostel",
  room: "room", gender: "gender", dateOfBirth: "date_of_birth", address: "address", state: "state", country: "country",
};

function csvCell(value: unknown) {
  const raw = String(value ?? "");
  const safe = /^[=+@]/.test(raw) ? "'" + raw : raw;
  return /[",\r\n]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
}
function downloadResults(items: Item[]) {
  const fields = Object.keys(FIELD_HEADERS) as Field[];
  const headers = ["matric_number", ...fields.map((field) => FIELD_HEADERS[field]), "collection_status", "error", "collected_at"];
  const lines = [headers, ...items.map((item) => [
    item.matricNumber, ...fields.map((field) => item.data[field] ?? ""), item.status, item.error, item.collectedAt,
  ])].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "peoplefind-extracted-student-records.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AuthorizedExtractionPanel() {
  const [input, setInput] = useState("");
  const [batchSize, setBatchSize] = useState(10);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const matricNumbers = useMemo(() => [...new Set(input.split(/[\r\n,;\t]+/).map((value) => value.trim()).filter(Boolean))], [input]);

  async function run() {
    if (!matricNumbers.length || busy) return;
    setBusy(true); setMessage(""); setItems([]); setProgress(0);
    const all: Item[] = [];
    try {
      for (let index = 0; index < matricNumbers.length; index += batchSize) {
        const batch = matricNumbers.slice(index, index + batchSize);
        const response = await fetch("/api/admin/importer/extract", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ matricNumbers: batch }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || payload.error || `Request failed (HTTP ${response.status}).`);
        if (!payload.configured && !payload.results?.length) throw new Error(payload.message || "The approved source endpoint is not configured.");
        all.push(...(payload.results as Item[]));
        setItems([...all]);
        setProgress(Math.min(index + batch.length, matricNumbers.length));
        if (index + batchSize < matricNumbers.length) await new Promise((resolve) => setTimeout(resolve, 300));
      }
      setMessage(`Finished: ${all.filter((item) => item.status === "collected").length} collected, ${all.filter((item) => item.status === "review").length} need review, ${all.filter((item) => item.status === "failed").length} failed.`);
    } catch (error) {
      setItems(all);
      setMessage(error instanceof Error ? error.message : "Collection stopped. Export any completed results before retrying.");
    } finally { setBusy(false); }
  }

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-950/60 p-5 text-zinc-100">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Bulk record collection</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">Paste matric numbers or a CSV column. Source portal: https://cgs.ui.edu.ng/portal/. The portal reference is configured, but this sign-in page is not a bulk API. Actual extraction needs an institution-approved export/API endpoint; this panel will not log into individual student accounts.</p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">Admin only · No password storage</span>
      </div>
      <label className="mb-2 mt-4 block text-sm font-medium" htmlFor="bulk-matric-list">Matric numbers</label>
      <textarea id="bulk-matric-list" value={input} onChange={(event) => setInput(event.target.value)} rows={5} placeholder={"24/1234\n24/1235\n24/1236"} className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-zinc-500" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-zinc-300">Batch size
          <select value={batchSize} onChange={(event) => setBatchSize(Number(event.target.value))} className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2">
            {[5, 10, 20, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <span className="text-sm text-zinc-400">{matricNumbers.length.toLocaleString()} unique matric numbers</span>
        <button type="button" onClick={run} disabled={busy || !matricNumbers.length} className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50">
          <Play size={16} /> {busy ? "Collecting…" : "Start collection"}
        </button>
        <button type="button" onClick={() => { setItems([]); setProgress(0); setMessage(""); }} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm disabled:opacity-50">
          <RotateCcw size={15} /> Clear results
        </button>
        <button type="button" onClick={() => downloadResults(items)} disabled={!items.length} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm disabled:opacity-50">
          <Download size={15} /> Export results CSV
        </button>
      </div>
      {(busy || progress > 0) && <div className="mt-4"><div className="mb-1 flex justify-between text-xs text-zinc-400"><span>Progress</span><span>{progress.toLocaleString()} / {matricNumbers.length.toLocaleString()}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-zinc-200 transition-all" style={{ width: `${matricNumbers.length ? progress / matricNumbers.length * 100 : 0}%` }} /></div></div>}
      {message && <p role="status" className="mt-4 rounded-xl border border-white/10 p-3 text-sm text-zinc-300">{message}</p>}
      {items.length > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="text-xs uppercase text-zinc-500"><tr><th className="p-2">Matric number</th><th className="p-2">Name</th><th className="p-2">Status</th><th className="p-2">Notes</th></tr></thead><tbody>{items.map((item, index) => <tr key={item.matricNumber + index} className="border-t border-white/10"><td className="p-2">{item.matricNumber}</td><td className="p-2">{item.data.fullName || "—"}</td><td className="p-2">{item.status}</td><td className="p-2">{item.error || "—"}</td></tr>)}</tbody></table></div>}
    </section>
  );
}
