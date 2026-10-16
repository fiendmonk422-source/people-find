"use client";

import { ChangeEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, CircleAlert, Download, FileSpreadsheet,
  Globe2, ListChecks, RotateCcw, UploadCloud,
} from "lucide-react";

type Row = { matricNumber: string; sourceRow: number; duplicate: boolean };
type ParseResult = { rows: Row[]; errors: string[]; hasHeader: boolean };

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_ROWS = 10000;
const MATRIC_HEADERS = new Set([
  "matric_number", "matric number", "matricno", "matric no", "matriculation number",
  "matriculation_number", "matric", "registration number", "registration_number", "reg no",
  "reg_no", "student id", "student_id",
]);

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[.-]/g, " ").replace(/\s+/g, " ");
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
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"' && cell.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      if (row.some((part) => part.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((part) => part.trim() !== "")) rows.push(row);
  if (quoted) throw new Error("The CSV contains an unclosed quoted field. Please correct the file and try again.");
  return rows;
}

function parseMatricCsv(text: string): ParseResult {
  const matrix = parseCsv(text.replace(/^\uFEFF/, ""));
  if (!matrix.length) return { rows: [], errors: ["The CSV file is empty."], hasHeader: false };

  const first = matrix[0].map(normalizeHeader);
  const headerIndex = first.findIndex((value) => MATRIC_HEADERS.has(value));
  const hasHeader = headerIndex >= 0;
  const data = hasHeader ? matrix.slice(1) : matrix;
  const errors: string[] = [];
  const values: { matricNumber: string; sourceRow: number }[] = [];

  if (hasHeader && headerIndex < 0) {
    errors.push("No matric-number column was found.");
    return { rows: [], errors, hasHeader };
  }

  if (!hasHeader && matrix.some((line) => line.length > 1)) {
    errors.push("This file has multiple columns but no recognized matric-number header. Add a column named matric_number or matric no.");
    return { rows: [], errors, hasHeader };
  }

  const column = hasHeader ? headerIndex : 0;
  data.forEach((line, index) => {
    const value = (line[column] ?? "").trim();
    if (!value) return;
    values.push({ matricNumber: value, sourceRow: hasHeader ? index + 2 : index + 1 });
  });

  if (values.length > MAX_ROWS) {
    errors.push(`This importer currently accepts up to ${MAX_ROWS.toLocaleString()} matric numbers per file. Split the CSV into smaller files.`);
  }

  const seen = new Set<string>();
  const rows = values.map((item) => {
    const key = item.matricNumber.toLocaleLowerCase();
    const duplicate = seen.has(key);
    seen.add(key);
    return { ...item, duplicate };
  });
  const duplicateCount = rows.filter((row) => row.duplicate).length;
  if (duplicateCount) errors.push(`${duplicateCount.toLocaleString()} duplicate matric number(s) were found. Duplicates are flagged and won't be counted as separate lookup jobs.`);

  return { rows, errors, hasHeader };
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((value) => {
    const safe = String(value ?? "");
    return /[",\r\n]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
  }).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function CsvLookupImporter() {
  const [lookupUrl, setLookupUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [hasHeader, setHasHeader] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const uniqueRows = useMemo(() => rows.filter((row) => !row.duplicate), [rows]);
  const duplicateCount = rows.length - uniqueRows.length;
  const validUrl = useMemo(() => {
    if (!lookupUrl.trim()) return false;
    try {
      const url = new URL(lookupUrl.trim());
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, [lookupUrl]);

  async function handleFile(file?: File) {
    setNotice("");
    setErrors([]);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setFileName("");
      setRows([]);
      setErrors(["Choose a .csv file. Excel workbooks (.xlsx) are not supported in this first version."]);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileName("");
      setRows([]);
      setErrors(["This file is larger than 20 MB. Save it as a smaller CSV and try again."]);
      return;
    }

    setBusy(true);
    setFileName(file.name);
    try {
      const parsed = parseMatricCsv(await file.text());
      setRows(parsed.rows);
      setErrors(parsed.errors);
      setHasHeader(parsed.hasHeader);
      if (parsed.rows.length && !parsed.errors.some((error) => error.startsWith("This importer currently accepts"))) {
        setNotice(`Validated ${parsed.rows.length.toLocaleString()} non-empty matric-number row(s).`);
      }
    } catch (error) {
      setRows([]);
      setErrors([error instanceof Error ? error.message : "Could not read this CSV file."]);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setLookupUrl("");
    setFileName("");
    setRows([]);
    setErrors([]);
    setHasHeader(false);
    setNotice("");
  }

  function exportQueue() {
    downloadCsv("peoplefind-validated-queue.csv", [
      ["matric_number", "source_csv_row", "duplicate"],
      ...rows.map((row) => [row.matricNumber, String(row.sourceRow), row.duplicate ? "yes" : "no"]),
    ]);
  }

  function exportReportTemplate() {
    downloadCsv("peoplefind-lookup-results-template.csv", [
      ["matric_number", "lookup_status", "full_name", "email", "phone", "photo_url", "error"],
      ...uniqueRows.map((row) => [row.matricNumber, "pending", "", "", "", "", ""]),
    ]);
  }

  async function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    await handleFile(event.target.files?.[0]);
    event.target.value = "";
  }

  return (
    <main className="min-h-screen bg-[#0c0c0b] px-4 pb-16 pt-8 text-[#ebe8e1] sm:px-6 lg:pt-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-[#a29d92] transition hover:text-[#ebe8e1]">
          <ArrowLeft size={16} /> Back to admin
        </Link>

        <header className="mt-6 flex flex-col gap-4 border-b border-white/[0.08] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#cdbd96]">PeopleFind / Admin tools</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Student lookup importer</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#918d84]">
              Validate a large matric-number CSV, prepare batches of 10 and export a lookup queue. This tool does not write to Supabase or change directory records.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#91b89a]/20 bg-[#91b89a]/[0.06] px-3 py-2 text-xs text-[#a6c7ad] sm:self-auto">
            <FileSpreadsheet size={15} /> CSV-only · up to 10,000 rows
          </div>
        </header>

        <section className="mt-6 rounded-2xl border border-white/[0.08] bg-[#141413] p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1b1b19] text-[#cdbd96]"><Globe2 size={19} /></span>
            <div>
              <h2 className="font-semibold">Lookup website</h2>
              <p className="mt-1 text-sm text-[#77736c]">Leave this blank until the original lookup website is ready.</p>
            </div>
          </div>
          <label htmlFor="lookup-url" className="mt-5 block text-sm font-medium text-[#d6d1c7]">Website URL</label>
          <input
            id="lookup-url"
            type="url"
            value={lookupUrl}
            onChange={(event) => setLookupUrl(event.target.value)}
            placeholder="https://"
            autoComplete="url"
            className="mt-2 w-full rounded-xl border border-white/[0.12] bg-[#0d0d0c] px-4 py-3 text-sm text-[#ebe8e1] outline-none transition placeholder:text-[#55524b] focus:border-[#cdbd96]/60"
          />
          {lookupUrl.trim() && !validUrl && <p className="mt-2 text-xs text-[#e0a29a]">Enter a complete http:// or https:// URL.</p>}
          <p className="mt-3 text-xs leading-5 text-[#77736c]">
            The URL is intentionally empty by default. Automated lookups still need the website’s form fields and result layout mapped before they can run safely.
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-white/[0.08] bg-[#141413] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">1. Upload matric numbers</h2>
              <p className="mt-1 text-sm text-[#77736c]">Use a CSV with a matric_number column, or a single-column CSV with one matric number per row.</p>
            </div>
            <span className="rounded-full border border-white/[0.08] px-3 py-1 text-xs text-[#918d84]">20 MB file limit</span>
          </div>

          <label
            htmlFor="csv-file"
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void handleFile(event.dataTransfer.files?.[0]);
            }}
            className={`mt-5 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-5 py-8 text-center transition ${dragging ? "border-[#cdbd96] bg-[#cdbd96]/[0.06]" : "border-white/[0.14] bg-[#0d0d0c] hover:border-white/[0.25]"}`}
          >
            <UploadCloud size={26} className="text-[#cdbd96]" />
            <span className="mt-3 text-sm font-medium">{busy ? "Reading CSV…" : fileName || "Choose a CSV or drop it here"}</span>
            <span className="mt-1 text-xs text-[#77736c]">The file is read locally in your browser.</span>
            <input id="csv-file" type="file" accept=".csv,text/csv" onChange={onFileInput} className="sr-only" />
          </label>

          {notice && <p className="mt-4 flex items-center gap-2 text-sm text-[#a6c7ad]"><CheckCircle2 size={16} />{notice}</p>}
          {errors.length > 0 && (
            <div className="mt-4 rounded-xl border border-[#d98282]/20 bg-[#d98282]/[0.06] p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-[#e0a29a]"><CircleAlert size={16} />Validation notes</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#c9948d]">
                {errors.map((error, index) => <li key={index}>{error}</li>)}
              </ul>
            </div>
          )}
        </section>

        {rows.length > 0 && (
          <>
            <section className="mt-5 grid gap-3 sm:grid-cols-3">
              <Stat label="Rows found" value={rows.length} />
              <Stat label="Unique lookup jobs" value={uniqueRows.length} />
              <Stat label="Duplicates flagged" value={duplicateCount} />
            </section>

            <section className="mt-5 rounded-2xl border border-white/[0.08] bg-[#141413] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">2. Review the queue</h2>
                  <p className="mt-1 text-sm text-[#77736c]">
                    {hasHeader ? "Matric numbers were read from the detected header column." : "No header was detected; the first column is treated as matric numbers."}
                    {" "}Duplicate values remain visible in the preview but are excluded from unique jobs.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={exportQueue} className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] px-3 py-2 text-sm transition hover:bg-white/[0.04]">
                    <Download size={15} /> Export queue
                  </button>
                  <button type="button" onClick={exportReportTemplate} className="inline-flex items-center gap-2 rounded-xl bg-[#cdbd96] px-3 py-2 text-sm font-medium text-[#181713] transition hover:bg-[#e0d2b4]">
                    <Download size={15} /> Export results template
                  </button>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto rounded-xl border border-white/[0.08]">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-[#1b1b19] text-xs uppercase tracking-wide text-[#918d84]">
                    <tr><th className="px-4 py-3 font-medium">CSV row</th><th className="px-4 py-3 font-medium">Matric number</th><th className="px-4 py-3 font-medium">Validation</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {rows.slice(0, 50).map((row) => (
                      <tr key={row.sourceRow} className="text-[#d6d1c7]">
                        <td className="px-4 py-3 tabular-nums text-[#77736c]">{row.sourceRow}</td>
                        <td className="px-4 py-3 font-mono text-xs">{row.matricNumber}</td>
                        <td className="px-4 py-3">
                          {row.duplicate
                            ? <span className="text-[#e0b27f]">Duplicate</span>
                            : <span className="inline-flex items-center gap-1.5 text-[#a6c7ad]"><CheckCircle2 size={14} />Ready</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 50 && <p className="mt-3 text-xs text-[#77736c]">Showing the first 50 of {rows.length.toLocaleString()} rows. The full queue is retained for export.</p>}
            </section>

            <section className="mt-5 rounded-2xl border border-[#cdbd96]/20 bg-[#cdbd96]/[0.04] p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#cdbd96]/20 bg-[#cdbd96]/[0.06] text-[#cdbd96]"><ListChecks size={19} /></span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">3. Lookup batches</h2>
                  <p className="mt-1 text-sm leading-6 text-[#918d84]">
                    The queue is prepared for batches of 10 ({Math.ceil(uniqueRows.length / 10).toLocaleString()} batch(es) for this file). The live lookup runner is intentionally not started because the target URL and page-specific form/result mapping are not configured yet.
                  </p>
                  <button
                    type="button"
                    disabled
                    className="mt-4 inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-sm text-[#77736c]"
                    title="Requires the lookup website URL and page mapping."
                  >
                    <Globe2 size={16} /> Start website lookup (not configured)
                  </button>
                  <p className="mt-3 text-xs leading-5 text-[#77736c]">
                    Once the website is available, we can connect its two matric-number inputs and submit button, map the returned student fields, and add pause/resume plus checkpointed CSV exports. No database writes are performed by this page.
                  </p>
                </div>
              </div>
            </section>

            <div className="mt-5 flex justify-end">
              <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] px-4 py-2.5 text-sm text-[#a29d92] transition hover:bg-white/[0.04] hover:text-[#ebe8e1]">
                <RotateCcw size={15} /> Clear importer
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#141413] p-5">
      <p className="text-xs text-[#918d84]">{label}</p>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}
