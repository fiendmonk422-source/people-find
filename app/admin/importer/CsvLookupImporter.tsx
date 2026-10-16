"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, CircleAlert, Download, FileSpreadsheet,
  Save, Search, UploadCloud, RotateCcw, Database, Pause, Play, RefreshCw,
} from "lucide-react";

type Status = "pending" | "collected" | "failed" | "review";
type RecordRow = {
  matricNumber: string;
  sourceRow: number;
  duplicate: boolean;
  status: Status;
  fullName: string;
  email: string;
  phone: string;
  photoUrl: string;
  source: string;
  notes: string;
  updatedAt: string;
};
type ParseResult = { rows: RecordRow[]; errors: string[]; hasHeader: boolean };

const STORAGE_KEY = "peoplefind-csv-collection-checkpoint-v1";
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_ROWS = 10000;
const HEADERS: Record<string, keyof Pick<RecordRow, "matricNumber" | "fullName" | "email" | "phone" | "photoUrl" | "source" | "notes" | "status">> = {
  matric_number: "matricNumber", "matric number": "matricNumber", matricno: "matricNumber",
  "matric no": "matricNumber", matriculation_number: "matricNumber",
  "matriculation number": "matricNumber", matric: "matricNumber",
  registration_number: "matricNumber", "registration number": "matricNumber",
  reg_no: "matricNumber", "reg no": "matricNumber", student_id: "matricNumber",
  full_name: "fullName", "full name": "fullName", name: "fullName", student_name: "fullName",
  email: "email", email_address: "email", "email address": "email",
  phone: "phone", phone_number: "phone", "phone number": "phone", mobile: "phone",
  photo_url: "photoUrl", "photo url": "photoUrl", image_url: "photoUrl",
  source: "source", data_source: "source", notes: "notes", error: "notes",
  lookup_status: "status", status: "status", collection_status: "status",
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[.-]/g, " ").replace(/\s+/g, " ");
}

function headerKey(value: string) {
  return normalizeHeader(value).replace(/\s/g, "_");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1; }
        else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"' && cell.length === 0) quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      if (row.some((part) => part.trim() !== "")) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  row.push(cell);
  if (row.some((part) => part.trim() !== "")) rows.push(row);
  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  return rows;
}

function blankRecord(matricNumber: string, sourceRow: number, duplicate = false): RecordRow {
  return {
    matricNumber, sourceRow, duplicate, status: duplicate ? "review" : "pending",
    fullName: "", email: "", phone: "", photoUrl: "", source: "", notes: "",
    updatedAt: "",
  };
}

function parseMatricCsv(text: string): ParseResult {
  const matrix = parseCsv(text.replace(/^\uFEFF/, ""));
  if (!matrix.length) return { rows: [], errors: ["The CSV file is empty."], hasHeader: false };
  const first = matrix[0].map((v) => headerKey(v));
  const headerIndex = first.findIndex((v) => HEADERS[v] === "matricNumber");
  const hasHeader = headerIndex >= 0;
  const data = hasHeader ? matrix.slice(1) : matrix;
  const errors: string[] = [];
  if (!hasHeader && matrix.some((line) => line.length > 1)) {
    return { rows: [], errors: ["This CSV has multiple columns but no recognized matric-number header. Add a matric_number column."], hasHeader: false };
  }
  const values = data.map((line, index) => ({
    matricNumber: (line[hasHeader ? headerIndex : 0] ?? "").trim(),
    sourceRow: hasHeader ? index + 2 : index + 1,
  })).filter((item) => item.matricNumber);
  if (values.length > MAX_ROWS) errors.push(`Maximum ${MAX_ROWS.toLocaleString()} records per file; split this CSV into smaller files.`);
  const seen = new Set<string>();
  const rows = values.map((item) => {
    const key = item.matricNumber.toLowerCase();
    const duplicate = seen.has(key);
    seen.add(key);
    return blankRecord(item.matricNumber, item.sourceRow, duplicate);
  });
  const duplicateCount = rows.filter((item) => item.duplicate).length;
  if (duplicateCount) errors.push(`${duplicateCount.toLocaleString()} duplicate matric number(s) were flagged for review.`);
  return { rows, errors, hasHeader };
}

function parseResultCsv(text: string) {
  const matrix = parseCsv(text.replace(/^\uFEFF/, ""));
  if (matrix.length < 2) throw new Error("The results CSV has no data rows.");
  const header = matrix[0].map(headerKey);
  const matricIndex = header.findIndex((key) => HEADERS[key] === "matricNumber");
  if (matricIndex < 0) throw new Error("Results CSV must contain a matric_number column.");
  const rows: Partial<RecordRow>[] = [];
  for (const cells of matrix.slice(1)) {
    const matricNumber = (cells[matricIndex] ?? "").trim();
    if (!matricNumber) continue;
    const item: Partial<RecordRow> = { matricNumber };
    header.forEach((key, index) => {
      const field = HEADERS[key];
      const value = (cells[index] ?? "").trim();
      if (!field || field === "matricNumber" || !value) return;
      if (field === "status") {
        const status = value.toLowerCase();
        if (["pending", "collected", "failed", "review"].includes(status)) item.status = status as Status;
      } else {
        (item as RecordRow)[field] = value;
      }
    });
    rows.push(item);
  }
  return rows;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((value) => {
    const safe = String(value ?? "");
    const formulaSafe = /^[=+@]/.test(safe) ? "'" + safe : safe;
    return /[",\r\n]/.test(formulaSafe) ? '"' + formulaSafe.replace(/"/g, '""') + '"' : formulaSafe;
  }).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function exportRecords(filename: string, records: RecordRow[]) {
  downloadCsv(filename, [
    ["matric_number", "full_name", "email", "phone", "photo_url", "collection_status", "source", "notes", "source_csv_row", "updated_at"],
    ...records.map((r) => [r.matricNumber, r.fullName, r.email, r.phone, r.photoUrl, r.status, r.source, r.notes, String(r.sourceRow), r.updatedAt]),
  ]);
}

function statusLabel(status: Status) {
  return ({ pending: "Pending", collected: "Collected", failed: "Failed", review: "Needs review" })[status];
}

export default function CsvLookupImporter() {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(true);
  const [batchSize, setBatchSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { records?: RecordRow[]; fileName?: string; batchSize?: number };
        if (Array.isArray(parsed.records)) setRecords(parsed.records);
        if (typeof parsed.fileName === "string") setFileName(parsed.fileName);
        if (typeof parsed.batchSize === "number") setBatchSize(parsed.batchSize);
      }
    } catch {
      setErrors(["A saved browser checkpoint could not be read. You can import a backup CSV to restore your work."]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ records, fileName, batchSize, savedAt: new Date().toISOString() }));
    } catch {
      setNotice("Browser storage is full or unavailable. Export a backup CSV to avoid losing progress.");
    }
  }, [records, fileName, batchSize, hydrated]);

  const uniqueRecords = useMemo(() => records.filter((r) => !r.duplicate), [records]);
  const counts = useMemo(() => ({
    total: records.length,
    unique: uniqueRecords.length,
    pending: uniqueRecords.filter((r) => r.status === "pending").length,
    collected: uniqueRecords.filter((r) => r.status === "collected").length,
    failed: uniqueRecords.filter((r) => r.status === "failed").length,
    review: records.filter((r) => r.status === "review" || r.duplicate).length,
  }), [records, uniqueRecords]);
  const filtered = useMemo(() => records.filter((r) => {
    const q = search.trim().toLowerCase();
    const matchesQuery = !q || [r.matricNumber, r.fullName, r.email, r.phone].some((v) => v.toLowerCase().includes(q));
    return matchesQuery && (statusFilter === "all" || r.status === statusFilter);
  }), [records, search, statusFilter]);
  const visible = showAll ? filtered : filtered.slice(0, 50);
  const nextBatch = useMemo(() => uniqueRecords.filter((r) => r.status === "pending").slice(0, batchSize), [uniqueRecords, batchSize]);

  async function readFile(file?: File, mode: "queue" | "results" = "queue") {
    setNotice(""); setErrors([]);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setErrors(["Choose a CSV file. Excel .xlsx files are not supported."]); return;
    }
    if (file.size > MAX_FILE_BYTES) { setErrors(["This file exceeds the 20 MB limit."]); return; }
    setBusy(true);
    try {
      const text = await file.text();
      if (mode === "queue") {
        const parsed = parseMatricCsv(text);
        if (parsed.rows.length > MAX_ROWS) { setErrors(parsed.errors); return; }
        if (!parsed.rows.length) { setErrors(parsed.errors.length ? parsed.errors : ["No matric numbers were found."]); return; }
        setRecords(parsed.rows);
        setFileName(file.name);
        setPaused(true);
        setNotice(`Loaded ${parsed.rows.length.toLocaleString()} records. Review the queue, then start collection when ready.`);
        setErrors(parsed.errors);
      } else {
        const imported = parseResultCsv(text);
        const lookup = new Map(imported.map((r) => [String(r.matricNumber).trim().toLowerCase(), r]));
        let matched = 0;
        setRecords((current) => current.map((record) => {
          const incoming = lookup.get(record.matricNumber.toLowerCase());
          if (!incoming) return record;
          matched += 1;
          const hasDetails = Boolean(incoming.fullName || incoming.email || incoming.phone || incoming.photoUrl);
          return {
            ...record,
            fullName: incoming.fullName || record.fullName,
            email: incoming.email || record.email,
            phone: incoming.phone || record.phone,
            photoUrl: incoming.photoUrl || record.photoUrl,
            source: incoming.source || record.source,
            notes: incoming.notes || record.notes,
            status: incoming.status || (hasDetails ? "collected" : record.status),
            updatedAt: new Date().toISOString(),
          };
        }));
        setNotice(`Imported result rows and matched ${matched.toLocaleString()} existing matric number(s). Unmatched rows were ignored.`);
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Could not process this CSV."]);
    } finally { setBusy(false); }
  }

  async function onQueueFile(event: ChangeEvent<HTMLInputElement>) {
    await readFile(event.target.files?.[0], "queue"); event.target.value = "";
  }
  async function onResultsFile(event: ChangeEvent<HTMLInputElement>) {
    await readFile(event.target.files?.[0], "results"); event.target.value = "";
  }

  function updateRecord(matricNumber: string, field: keyof RecordRow, value: string) {
    setRecords((current) => current.map((r) => r.matricNumber === matricNumber
      ? { ...r, [field]: value, updatedAt: new Date().toISOString() }
      : r));
  }

  function setStatus(matricNumber: string, status: Status) {
    updateRecord(matricNumber, "status", status);
  }

  function updateNextBatch(status: Status) {
    const keys = new Set(nextBatch.map((r) => r.matricNumber.toLowerCase()));
    if (!keys.size) { setNotice("There are no pending records in the next batch."); return; }
    setRecords((current) => current.map((r) => keys.has(r.matricNumber.toLowerCase())
      ? { ...r, status, updatedAt: new Date().toISOString() }
      : r));
    setNotice(`Updated ${keys.size} record(s) in the next batch to “${statusLabel(status)}”.`);
    if (status === "collected") setPaused(true);
  }

  function retryFailed() {
    setRecords((current) => current.map((r) => r.status === "failed" ? { ...r, status: "pending", notes: "", updatedAt: new Date().toISOString() } : r));
    setNotice("Failed records have been returned to the pending queue.");
  }

  function clearWorkspace() {
    if (!window.confirm("Clear this collection workspace and its browser checkpoint? Export a backup first if you need these records.")) return;
    setRecords([]); setFileName(""); setErrors([]); setNotice(""); setPaused(true);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <main className="min-h-screen bg-[#0c0c0b] px-4 pb-16 pt-8 text-[#ebe8e1] sm:px-6 lg:pt-12">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-[#a29d92] transition hover:text-[#ebe8e1]">
          <ArrowLeft size={16} /> Back to admin
        </Link>
        <header className="mt-6 flex flex-col gap-4 border-b border-white/[0.08] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#cdbd96]">PeopleFind / Admin tools</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">CSV collection workspace</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#918d84]">
              Collect, reconcile, review and export student data without touching the PeopleFind directory table. Website automation is intentionally disconnected for now.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#91b89a]/20 bg-[#91b89a]/[0.06] px-3 py-2 text-xs text-[#a6c7ad] sm:self-auto">
            <FileSpreadsheet size={15} /> CSV-only · up to 10,000 rows
          </div>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Stat label="Total rows" value={counts.total} />
          <Stat label="Unique records" value={counts.unique} />
          <Stat label="Pending" value={counts.pending} />
          <Stat label="Collected" value={counts.collected} />
          <Stat label="Failed" value={counts.failed} />
          <Stat label="Review / duplicates" value={counts.review} />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.08] bg-[#141413] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1b1b19] text-[#cdbd96]"><UploadCloud size={19} /></span>
              <div><h2 className="font-semibold">1. Load matric-number queue</h2><p className="mt-1 text-sm text-[#77736c]">A single matric_number column or one matric number per row.</p></div>
            </div>
            <label htmlFor="queue-file" className="mt-5 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.14] bg-[#0d0d0c] px-5 py-6 text-center hover:border-white/[0.25]">
              <FileSpreadsheet size={24} className="text-[#cdbd96]" />
              <span className="mt-3 text-sm font-medium">{busy ? "Processing CSV…" : fileName || "Choose matric-number CSV"}</span>
              <span className="mt-1 text-xs text-[#77736c]">Up to 20 MB. Data stays in this browser.</span>
              <input id="queue-file" type="file" accept=".csv,text/csv" onChange={onQueueFile} className="sr-only" />
            </label>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#141413] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1b1b19] text-[#cdbd96]"><Database size={19} /></span>
              <div><h2 className="font-semibold">2. Import collected results</h2><p className="mt-1 text-sm text-[#77736c]">Merge a results CSV into matching matric numbers.</p></div>
            </div>
            <label htmlFor="results-file" className="mt-5 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.14] bg-[#0d0d0c] px-5 py-6 text-center hover:border-white/[0.25]">
              <UploadCloud size={24} className="text-[#cdbd96]" />
              <span className="mt-3 text-sm font-medium">Choose results CSV to merge</span>
              <span className="mt-1 text-xs text-[#77736c]">Match by matric number; unmatched rows are skipped.</span>
              <input id="results-file" type="file" accept=".csv,text/csv" onChange={onResultsFile} className="sr-only" />
            </label>
          </div>
        </section>

        {notice && <p className="mt-4 flex items-center gap-2 rounded-xl border border-[#91b89a]/20 bg-[#91b89a]/[0.06] p-3 text-sm text-[#a6c7ad]"><CheckCircle2 size={16} />{notice}</p>}
        {errors.length > 0 && <div className="mt-4 rounded-xl border border-[#d98282]/20 bg-[#d98282]/[0.06] p-4"><p className="flex items-center gap-2 text-sm font-medium text-[#e0a29a]"><CircleAlert size={16} />Import notes</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#c9948d]">{errors.map((error, i) => <li key={i}>{error}</li>)}</ul></div>}

        <section className="mt-5 rounded-2xl border border-white/[0.08] bg-[#141413] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h2 className="font-semibold">3. Batch and recovery controls</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#77736c]">The queue is organised into small batches. Without a configured source website, these controls manage collection statuses only; they do not invent or fetch student data.</p></div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] px-3 py-2 text-xs text-[#a29d92]"><Save size={14} />{hydrated ? "Browser checkpoint active" : "Loading checkpoint…"}</span>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label className="text-sm text-[#a29d92]" htmlFor="batch-size">Batch size</label>
            <select id="batch-size" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} className="rounded-lg border border-white/[0.12] bg-[#0d0d0c] px-3 py-2 text-sm">
              {[5, 10, 20, 25, 50].map((n) => <option key={n} value={n}>{n} records</option>)}
            </select>
            <span className="text-sm text-[#77736c]">Next batch: {nextBatch.length} pending record(s)</span>
            <button type="button" onClick={() => setPaused((v) => !v)} className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] px-3 py-2 text-sm hover:bg-white/[0.04]">{paused ? <Play size={15} /> : <Pause size={15} />}{paused ? "Resume workflow" : "Pause workflow"}</button>
            <button type="button" onClick={() => updateNextBatch("review")} disabled={!nextBatch.length} className="rounded-xl border border-white/[0.12] px-3 py-2 text-sm disabled:opacity-40">Send next batch to review</button>
            <button type="button" onClick={retryFailed} disabled={!counts.failed} className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] px-3 py-2 text-sm disabled:opacity-40"><RefreshCw size={15} />Retry failed</button>
          </div>
          {!paused && <p className="mt-3 text-xs text-[#cdbd96]">Workflow resumed. The workspace is ready for result imports and status updates; no background website lookups run until a data source is configured.</p>}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.08] pt-5">
            <button type="button" onClick={() => exportRecords("peoplefind-collection-backup.csv", records)} disabled={!records.length} className="inline-flex items-center gap-2 rounded-xl bg-[#cdbd96] px-3 py-2 text-sm font-medium text-[#181713] disabled:opacity-40"><Download size={15} />Export full backup</button>
            <button type="button" onClick={() => exportRecords("peoplefind-collected.csv", records.filter((r) => r.status === "collected"))} disabled={!counts.collected} className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] px-3 py-2 text-sm disabled:opacity-40"><Download size={15} />Export collected</button>
            <button type="button" onClick={() => exportRecords("peoplefind-pending.csv", records.filter((r) => r.status === "pending"))} disabled={!counts.pending} className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] px-3 py-2 text-sm disabled:opacity-40"><Download size={15} />Export pending</button>
            <button type="button" onClick={() => exportRecords("peoplefind-failed.csv", records.filter((r) => r.status === "failed"))} disabled={!counts.failed} className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] px-3 py-2 text-sm disabled:opacity-40"><Download size={15} />Export failed</button>
            <button type="button" onClick={clearWorkspace} disabled={!records.length} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-[#d98282]/20 px-3 py-2 text-sm text-[#e0a29a] disabled:opacity-40"><RotateCcw size={15} />Clear workspace</button>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-white/[0.08] bg-[#141413] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><h2 className="font-semibold">4. Review and edit records</h2><p className="mt-1 text-sm text-[#77736c]">Edit the first 50 visible records, change statuses, or search the complete queue.</p></div>
            <div className="flex flex-wrap gap-2">
              <label className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#77736c]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search matric/name/email" className="w-56 rounded-xl border border-white/[0.12] bg-[#0d0d0c] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#cdbd96]/60" /></label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-white/[0.12] bg-[#0d0d0c] px-3 py-2 text-sm"><option value="all">All statuses</option><option value="pending">Pending</option><option value="collected">Collected</option><option value="failed">Failed</option><option value="review">Needs review</option></select>
            </div>
          </div>
          {!records.length ? <div className="mt-6 rounded-xl border border-dashed border-white/[0.12] p-8 text-center"><FileSpreadsheet size={28} className="mx-auto text-[#77736c]" /><p className="mt-3 text-sm font-medium">No collection loaded yet</p><p className="mt-1 text-xs text-[#77736c]">Upload your matric-number CSV to create the queue.</p></div> : <>
            <div className="mt-5 overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full min-w-[1300px] text-left text-sm">
                <thead className="bg-[#1b1b19] text-xs uppercase tracking-wide text-[#918d84]"><tr>
                  <th className="px-3 py-3 font-medium">Matric number</th><th className="px-3 py-3 font-medium">Full name</th><th className="px-3 py-3 font-medium">Email</th><th className="px-3 py-3 font-medium">Phone</th><th className="px-3 py-3 font-medium">Photo URL</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Notes / error</th>
                </tr></thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {visible.map((r) => <tr key={r.matricNumber + "-" + r.sourceRow} className="align-top">
                    <td className="px-3 py-3 font-mono text-xs">{r.matricNumber}{r.duplicate && <span className="mt-1 block text-[10px] text-[#e0b27f]">Duplicate</span>}</td>
                    <td className="px-2 py-2"><Cell value={r.fullName} label="Full name" onChange={(v) => updateRecord(r.matricNumber, "fullName", v)} /></td>
                    <td className="px-2 py-2"><Cell value={r.email} label="Email" onChange={(v) => updateRecord(r.matricNumber, "email", v)} /></td>
                    <td className="px-2 py-2"><Cell value={r.phone} label="Phone" onChange={(v) => updateRecord(r.matricNumber, "phone", v)} /></td>
                    <td className="px-2 py-2"><Cell value={r.photoUrl} label="Photo URL" onChange={(v) => updateRecord(r.matricNumber, "photoUrl", v)} /></td>
                    <td className="px-2 py-2"><select value={r.status} onChange={(e) => setStatus(r.matricNumber, e.target.value as Status)} className="w-32 rounded-lg border border-white/[0.12] bg-[#0d0d0c] px-2 py-2 text-xs"><option value="pending">Pending</option><option value="collected">Collected</option><option value="failed">Failed</option><option value="review">Needs review</option></select></td>
                    <td className="px-2 py-2"><Cell value={r.notes} label="Notes or error" onChange={(v) => updateRecord(r.matricNumber, "notes", v)} /></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#77736c]">
              <span>Showing {visible.length.toLocaleString()} of {filtered.length.toLocaleString()} filtered records. Changes checkpoint automatically in this browser.</span>
              {filtered.length > 50 && <button type="button" onClick={() => setShowAll((v) => !v)} className="rounded-lg border border-white/[0.12] px-3 py-2 text-[#d6d1c7]">{showAll ? "Show first 50" : "Show all filtered rows"}</button>}
            </div>
          </>}
        </section>
        <p className="mt-5 text-xs leading-5 text-[#77736c]">Privacy and backup: records are stored in this browser's local storage, not Supabase. Use this only on a device you control, export backups regularly, and avoid shared/public computers. Clearing browser data can erase the checkpoint.</p>
      </div>
    </main>
  );
}

function Cell({ value, label, onChange }: { value: string; label: string; onChange: (value: string) => void }) {
  return <input value={value} aria-label={label} onChange={(e) => onChange(e.target.value)} placeholder={label} className="w-44 rounded-lg border border-white/[0.08] bg-[#0d0d0c] px-2 py-2 text-xs text-[#ebe8e1] outline-none placeholder:text-[#55524b] focus:border-[#cdbd96]/60" />;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/[0.08] bg-[#141413] p-4"><p className="text-xs text-[#918d84]">{label}</p><p className="mt-3 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p></div>;
}
