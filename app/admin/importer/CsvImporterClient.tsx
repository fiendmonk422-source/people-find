"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import {
  AlertCircle, CheckCircle2, Download, FileSpreadsheet, FileUp, RotateCcw,
  ShieldCheck, Trash2, Upload, XCircle,
} from "lucide-react";

type CsvRecord = {
  rowNumber: number;
  matricNumber: string;
  status: "valid" | "duplicate" | "missing";
  message: string;
};

const MATRIC_HEADERS = new Set([
  "matric_number", "matric number", "matricnumber", "matric_no", "matric no",
  "matriculation_number", "matriculation number", "matriculation_no",
  "registration_number", "registration number", "reg_no", "reg no", "matric",
]);

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[.-]/g, "_").replace(/\s+/g, " ").replace(/_+$/g, "");
}

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = "\uFEFF" + rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function CsvImporterClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<CsvRecord[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const stats = useMemo(() => ({
    total: records.length,
    valid: records.filter((record) => record.status === "valid").length,
    duplicates: records.filter((record) => record.status === "duplicate").length,
    missing: records.filter((record) => record.status === "missing").length,
  }), [records]);

  const visibleRecords = showAll ? records : records.slice(0, 50);

  async function handleFile(file?: File) {
    setError("");
    setNotice("");
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setError("Please choose a .csv file. Excel .xlsx files are not supported yet.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("This file is larger than 15 MB. Split it into smaller CSV files and try again.");
      return;
    }

    try {
      const text = (await file.text()).replace(/^\uFEFF/, "");
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        setError("The file appears to be empty.");
        return;
      }

      const firstRow = parsed[0].map(normalizeHeader);
      let matricIndex = firstRow.findIndex((header) => MATRIC_HEADERS.has(header));
      let dataRows = parsed.slice(1);
      let headerless = false;

      if (matricIndex === -1) {
        // Accept a headerless, single-column list of matric numbers.
        if (parsed.every((row) => row.length <= 1)) {
          matricIndex = 0;
          dataRows = parsed;
          headerless = true;
        } else {
          setError('Could not find a matric-number column. Use a header such as "matric_number" or "matric_no".');
          return;
        }
      }

      if (!headerless && dataRows.length === 0) {
        setError("The CSV contains a header but no student rows.");
        return;
      }

      const seen = new Set<string>();
      const checked: CsvRecord[] = dataRows.map((row, index) => {
        const matricNumber = (row[matricIndex] ?? "").trim();
        if (!matricNumber) {
          return { rowNumber: headerless ? index + 1 : index + 2, matricNumber: "", status: "missing", message: "Matric number is blank" };
        }
        const key = matricNumber.toLocaleUpperCase();
        if (seen.has(key)) {
          return { rowNumber: headerless ? index + 1 : index + 2, matricNumber, status: "duplicate", message: "Duplicate of an earlier matric number" };
        }
        seen.add(key);
        return { rowNumber: headerless ? index + 1 : index + 2, matricNumber, status: "valid", message: "Ready for lookup" };
      });

      setRecords(checked);
      setFileName(file.name);
      setShowAll(false);
      setNotice(`Loaded ${checked.length.toLocaleString()} rows from ${file.name}.`);
    } catch {
      setError("The file could not be read. Please save it as UTF-8 CSV and try again.");
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    void handleFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files?.[0]);
  }

  function reset() {
    setRecords([]);
    setFileName("");
    setError("");
    setNotice("");
    setShowAll(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function exportValid() {
    const valid = records.filter((record) => record.status === "valid");
    if (!valid.length) return;
    downloadCsv("peoplefind-matric-numbers-cleaned.csv", [
      ["matric_number"],
      ...valid.map((record) => [record.matricNumber]),
    ]);
  }

  function exportReport() {
    if (!records.length) return;
    downloadCsv("peoplefind-csv-validation-report.csv", [
      ["source_row", "matric_number", "status", "message"],
      ...records.map((record) => [String(record.rowNumber), record.matricNumber, record.status, record.message]),
    ]);
  }

  return (
    <section className="mt-6 space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div className="rounded-2xl border border-white/[0.08] bg-[#141413] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1b1b19] text-[#cdbd96]">
              <FileSpreadsheet size={20} />
            </span>
            <div>
              <h2 className="text-lg font-semibold">1. Upload matric numbers</h2>
              <p className="mt-1 text-sm leading-6 text-[#918d84]">Choose a CSV with a matric-number column, or a plain one-column list.</p>
            </div>
          </div>

          <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={onInputChange} className="sr-only" aria-label="Choose CSV file" />

          <div
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`mt-5 rounded-xl border border-dashed p-7 text-center transition sm:p-9 ${dragging ? "border-[#cdbd96] bg-[#cdbd96]/[0.06]" : "border-white/[0.15] bg-[#10100f] hover:border-white/[0.25]"}`}
          >
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1b1b19] text-[#cdbd96]">
              <FileUp size={22} />
            </span>
            <p className="mt-4 text-sm font-medium text-[#ebe8e1]">Drop your CSV here</p>
            <p className="mt-1 text-xs text-[#77736c]">or browse files · CSV only · up to 15 MB</p>
            <button type="button" onClick={() => inputRef.current?.click()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ebe8e1] px-4 py-2.5 text-sm font-semibold text-[#0c0c0b] transition hover:bg-white">
              <Upload size={15} /> Choose CSV
            </button>
          </div>

          {fileName && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#10100f] p-3">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <FileSpreadsheet size={17} className="shrink-0 text-[#a6c7ad]" />
                <span className="truncate">{fileName}</span>
              </div>
              <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 text-xs text-[#918d84] hover:text-[#ebe8e1]">
                <Trash2 size={14} /> Clear
              </button>
            </div>
          )}

          {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-[#d98282]/25 bg-[#d98282]/[0.06] p-3 text-sm leading-5 text-[#e0a29a]"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
          {notice && !error && <div role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-[#91b89a]/20 bg-[#91b89a]/[0.06] p-3 text-sm leading-5 text-[#a6c7ad]"><CheckCircle2 size={17} className="mt-0.5 shrink-0" />{notice}</div>}
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#141413] p-5 sm:p-6">
          <h2 className="text-lg font-semibold">2. Validation summary</h2>
          <p className="mt-1 text-sm text-[#77736c]">We check the list before any future website lookups.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Stat label="Rows checked" value={stats.total} tone="neutral" />
            <Stat label="Unique & valid" value={stats.valid} tone="success" />
            <Stat label="Duplicates" value={stats.duplicates} tone="warning" />
            <Stat label="Blank entries" value={stats.missing} tone="danger" />
          </div>
          <div className="mt-5 rounded-xl border border-white/[0.07] bg-[#10100f] p-4">
            <div className="flex items-start gap-2">
              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#cdbd96]" />
              <p className="text-xs leading-5 text-[#918d84]">Your file is read in this browser. No student rows are sent to PeopleFind, Supabase, or another server by this importer page.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <button type="button" disabled={stats.valid === 0} onClick={exportValid} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ebe8e1] px-3 py-2.5 text-sm font-semibold text-[#0c0c0b] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">
              <Download size={15} /> Clean CSV
            </button>
            <button type="button" disabled={records.length === 0} onClick={exportReport} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] px-3 py-2.5 text-sm text-[#c6c1b7] transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40">
              <Download size={15} /> Full report
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#141413] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">3. Preview records</h2>
            <p className="mt-1 text-sm text-[#77736c]">Duplicates and blank rows are excluded from the clean CSV but remain visible in the report.</p>
          </div>
          {records.length > 0 && (
            <button type="button" onClick={() => setShowAll((value) => !value)} className="self-start rounded-lg border border-white/[0.1] px-3 py-2 text-xs text-[#c6c1b7] hover:bg-white/[0.04]">
              {showAll ? "Show first 50" : `Show all ${records.length.toLocaleString()} rows`}
            </button>
          )}
        </div>

        {records.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-white/[0.1] px-4 py-12 text-center">
            <FileSpreadsheet size={26} className="mx-auto text-[#625f58]" />
            <p className="mt-3 text-sm font-medium text-[#b8b4ac]">No CSV loaded yet</p>
            <p className="mt-1 text-xs text-[#77736c]">Upload a file to see its validation results here.</p>
          </div>
        ) : (
          <>
            <div className="mt-5 overflow-x-auto rounded-xl border border-white/[0.07]">
              <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                <thead className="bg-[#10100f] text-xs uppercase tracking-wide text-[#77736c]">
                  <tr>
                    <th className="px-4 py-3 font-medium">CSV row</th>
                    <th className="px-4 py-3 font-medium">Matric number</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {visibleRecords.map((record) => (
                    <tr key={record.rowNumber} className="text-[#c6c1b7]">
                      <td className="px-4 py-3 tabular-nums text-[#77736c]">{record.rowNumber}</td>
                      <td className="px-4 py-3 font-mono text-xs">{record.matricNumber || "—"}</td>
                      <td className="px-4 py-3"><Status status={record.status} /></td>
                      <td className="px-4 py-3 text-xs text-[#918d84]">{record.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!showAll && records.length > 50 && <p className="mt-3 text-xs text-[#77736c]">Showing 50 of {records.length.toLocaleString()} rows.</p>}
          </>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-[#111110] p-4">
        <AlertCircle size={17} className="mt-0.5 shrink-0 text-[#cdbd96]" />
        <div>
          <p className="text-sm font-medium text-[#c6c1b7]">Next phase: lookup automation</p>
          <p className="mt-1 text-xs leading-5 text-[#77736c]">This first version only validates and exports matric numbers. It does not yet open the original website, fill its two fields, collect student details, or run batches of 10.</p>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "neutral" | "success" | "warning" | "danger" }) {
  const colors = {
    neutral: "text-[#ebe8e1]",
    success: "text-[#a6c7ad]",
    warning: "text-[#d6bd83]",
    danger: "text-[#e0a29a]",
  };
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#10100f] p-4">
      <p className="text-xs text-[#77736c]">{label}</p>
      <p className={`mt-3 text-2xl font-semibold tabular-nums ${colors[tone]}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function Status({ status }: { status: CsvRecord["status"] }) {
  if (status === "valid") return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#91b89a]/[0.08] px-2.5 py-1 text-xs text-[#a6c7ad]"><CheckCircle2 size={13} /> Valid</span>;
  if (status === "duplicate") return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#cdbd96]/[0.08] px-2.5 py-1 text-xs text-[#d6bd83]"><RotateCcw size={13} /> Duplicate</span>;
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d98282]/[0.08] px-2.5 py-1 text-xs text-[#e0a29a]"><XCircle size={13} /> Missing</span>;
}
