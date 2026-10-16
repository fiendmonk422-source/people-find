"use client";

import { ChangeEvent, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";

type ImportRow = Record<string, string | boolean | null>;
type ImportResult = { inserted: number; updated?: number; skipped_duplicates: number; rejected: number; submitted: number };

const aliases: Record<string, string> = {
  name: "name", fullname: "name", fullstudentname: "name", studentname: "name", displayname: "name",
  firstname: "first_name", givenname: "first_name", middlename: "middle_name", lastname: "last_name", surname: "last_name",
  nickname: "nickname", preferredname: "nickname", school: "school", institution: "school", university: "school",
  faculty: "faculty", department: "department", programme: "department", program: "department", course: "department",
  level: "level", class: "class_name", classname: "class_name", matric: "matric_number", matricno: "matric_number",
  matricnumber: "matric_number", matriculationnumber: "matric_number", studentid: "matric_number",
  hostel: "hostel", hall: "hostel", hallofresidence: "hostel", room: "room", phone: "phone", phonenumber: "phone",
  mobile: "phone", email: "email", address: "address", dob: "date_of_birth", dateofbirth: "date_of_birth",
  gender: "gender", state: "state", stateoforigin: "state", country: "country", nationality: "nationality",
  admissionyear: "admission_year", yearofadmission: "admission_year", admissionsession: "admission_year",
  graduationyear: "graduation_year", yearofgraduation: "graduation_year", status: "status",
  photourl: "photo_url", imageurl: "photo_url", profilephoto: "photo_url", lga: "lga",
  localgovernment: "lga", localgovernmentarea: "lga", leveloverride: "level_override",
  profilevisibility: "profile_visibility",
};

function normalizeHeader(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); if (row.some((v) => v.trim())) rows.push(row); row = []; field = ""; }
    else field += char;
  }
  row.push(field.replace(/\r$/, ""));
  if (row.some((v) => v.trim())) rows.push(row);
  if (quoted) throw new Error("The CSV has an unfinished quoted field. Re-export it as a standard CSV file.");
  return rows;
}

function normalizeDate(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})[\/. -](\d{1,2})[\/. -](\d{4})$/);
  if (!match) throw new Error('Date of birth "' + raw + '" is not recognized. Use YYYY-MM-DD or DD/MM/YYYY.');
  const day = Number(match[1]), month = Number(match[2]), year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error('Date of birth "' + raw + '" is not a valid calendar date.');
  }
  return [year, String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
}

function mapCsv(text: string): { rows: ImportRow[]; headers: string[]; unknown: string[] } {
  const matrix = parseCsv(text);
  if (matrix.length < 2) throw new Error("The CSV must include a header row and at least one student row.");
  const rawHeaders = matrix[0].map((v) => v.trim());
  const mapped = rawHeaders.map((header) => aliases[normalizeHeader(header)] || "");
  if (!mapped.some(Boolean)) throw new Error("None of the CSV headers matched PeopleFind fields. Use the template to check your column names.");
  const nameIndex = mapped.indexOf("name");
  const firstIndex = mapped.indexOf("first_name");
  const lastIndex = mapped.indexOf("last_name");
  if (nameIndex < 0 && firstIndex < 0 && lastIndex < 0) throw new Error("Your CSV needs a Name column, or First name and Last name columns.");
  if (matrix.length - 1 > 50000) throw new Error("This file has more than 50,000 rows. Split it into smaller CSV files.");
  const rows: ImportRow[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const values = matrix[i];
    const row: ImportRow = {};
    for (let j = 0; j < mapped.length; j++) {
      const key = mapped[j];
      if (!key || !values[j]?.trim()) continue;
      const value = values[j].trim();
      if (key === "date_of_birth") row[key] = normalizeDate(value);
      else row[key] = value;
    }
    if (!row.name) {
      const fullName = [firstIndex >= 0 ? values[firstIndex]?.trim() : "", mapped.includes("middle_name") ? values[mapped.indexOf("middle_name")]?.trim() : "", lastIndex >= 0 ? values[lastIndex]?.trim() : ""].filter(Boolean).join(" ");
      if (fullName) row.name = fullName;
    }
    if (!row.name && Object.values(row).some(Boolean)) throw new Error("Row " + (i + 1) + " has data but no full name.");
    if (row.name) rows.push(row);
  }
  if (!rows.length) throw new Error("No student rows with names were found in this CSV.");
  const unknown = rawHeaders.filter((_, i) => !mapped[i]);
  return { rows, headers: rawHeaders.filter((_, i) => Boolean(mapped[i])), unknown };
}

export default function ImportPeople({ onImported }: { onImported?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [processedRows, setProcessedRows] = useState(0);

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError(""); setResult(null); setRows([]); setHeaders([]); setUnknown([]);
    if (!file) return;
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith(".csv")) { setError("Choose a .csv file. Excel files should be saved as CSV UTF-8 first."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("This file is larger than 5 MB. Export a smaller CSV file."); return; }
    try {
      const parsed = mapCsv(await file.text());
      setRows(parsed.rows); setHeaders(parsed.headers); setUnknown(parsed.unknown);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read this CSV.");
    }
  }

  async function importRows() {
    if (!rows.length || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    setProcessedRows(0);
    const totals: ImportResult = { inserted: 0, updated: 0, skipped_duplicates: 0, rejected: 0, submitted: 0 };
    try {
      const batchSize = 5000;
      for (let offset = 0; offset < rows.length; offset += batchSize) {
        const batch = rows.slice(offset, offset + batchSize);
        const response = await fetch("/api/admin/people/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: batch }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || "CSV import failed.");
        }
        const batchResult = payload.result as ImportResult;
        totals.inserted += batchResult.inserted || 0;
        totals.updated = (totals.updated || 0) + (batchResult.updated || 0);
        totals.skipped_duplicates += batchResult.skipped_duplicates || 0;
        totals.rejected += batchResult.rejected || 0;
        totals.submitted += batchResult.submitted || batch.length;
        setProcessedRows(Math.min(offset + batch.length, rows.length));
      }

      setResult({ ...totals });
      onImported?.();
      setRows([]);
      setHeaders([]);
      setUnknown([]);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (cause) {
      setResult(totals.submitted ? { ...totals } : null);
      setError(
        totals.submitted
          ? "Import stopped after " + totals.submitted.toLocaleString() + " rows. Those batches were saved; you can safely retry the full CSV because matching student records are updated."
          : cause instanceof Error ? cause.message : "CSV import failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate() {
    const template = "Name,First Name,Last Name,School,Faculty,Department,Level,Class Name,Matric Number,Admission Year,Graduation Year,Hostel,Room,Phone,Email,Date of Birth,Gender,State,LGA,Country,Nationality,Photo URL\r\nExample Student,Example,Student,University Name,Faculty of Technology,Industrial Production Engineering,100,Group 1,ABC/2026/001,2026/2027,2030/2031,Zik Hall,12,08000000000,student@example.com,2006-01-30,Female,Oyo,Ibadan North,Nigeria,Nigerian,";
    const url = URL.createObjectURL(new Blob([template], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "peoplefind-import-template.csv"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section id="csv-import" className="mt-6 scroll-mt-28 rounded-2xl border border-white/[0.08] bg-[#141413] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#91b89a]/20 bg-[#91b89a]/[0.06] text-[#a6c7ad]"><FileSpreadsheet size={19} /></div><div><h2 className="font-semibold">Import directory from CSV</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#918d84]">Upload student records in bulk. PeopleFind previews the rows before importing and skips duplicate matric numbers within the same school.</p></div></div>
        <button type="button" onClick={downloadTemplate} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs text-[#c9c3b8] hover:bg-white/[0.04]"><Download size={14} />Download template</button>
      </div>
      <div className="mt-5 rounded-xl border border-dashed border-white/15 bg-[#10100f] p-5">
        <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={chooseFile} className="block w-full text-sm text-[#a6a197] file:mr-4 file:rounded-lg file:border-0 file:bg-[#ebe8e1] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#0c0c0b] hover:file:bg-white" />
        <p className="mt-3 text-xs leading-5 text-[#77736c]">CSV UTF-8 · Maximum 5 MB / 50,000 rows · Imported in batches of 5,000. Matching matric number + school updates an existing record; columns missing from the CSV are preserved. No table columns are added.</p>
      </div>
      {error && <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-[#d98282]/20 bg-[#d98282]/[0.06] p-3 text-sm text-[#e0a29a]"><AlertCircle size={17} className="mt-0.5 shrink-0" /><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Dismiss error" className="ml-auto"><X size={15} /></button></div>}
      {result && <div role="status" className="mt-4 rounded-xl border border-[#91b89a]/20 bg-[#91b89a]/[0.06] p-4"><div className="flex items-center gap-2 text-sm font-medium text-[#a6c7ad]"><CheckCircle2 size={17} />Import finished</div><div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4"><div className="rounded-lg bg-black/20 p-3"><strong className="block text-xl">{result.inserted}</strong><span className="text-[10px] text-[#918d84]">Added</span></div><div className="rounded-lg bg-black/20 p-3"><strong className="block text-xl">{result.updated ?? 0}</strong><span className="text-[10px] text-[#918d84]">Updated</span></div><div className="rounded-lg bg-black/20 p-3"><strong className="block text-xl">{result.skipped_duplicates}</strong><span className="text-[10px] text-[#918d84]">Duplicates skipped</span></div><div className="rounded-lg bg-black/20 p-3"><strong className="block text-xl">{result.rejected}</strong><span className="text-[10px] text-[#918d84]">Rejected rows</span></div></div></div>}
      {rows.length > 0 && <div className="mt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium">{fileName}</p><p className="mt-1 text-xs text-[#91b89a]">{rows.length.toLocaleString()} student rows ready to import</p></div><button type="button" onClick={() => { setRows([]); setFileName(""); if (inputRef.current) inputRef.current.value = ""; }} className="rounded-lg px-3 py-2 text-xs text-[#918d84] hover:bg-white/[0.04]">Remove file</button></div>
        {unknown.length > 0 && <p className="mt-3 text-xs text-[#bcae87]">Ignored columns: {unknown.join(", ")}</p>}
        <div className="mt-3 overflow-x-auto rounded-xl border border-white/[0.08]"><table className="min-w-full text-left text-xs"><thead className="bg-[#10100f] text-[#918d84]"><tr>{headers.slice(0, 6).map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-white/[0.06]">{rows.slice(0, 5).map((row, i) => <tr key={i}>{headers.slice(0, 6).map((h) => { const key = aliases[normalizeHeader(h)]; return <td key={h} className="max-w-48 truncate px-3 py-3 text-[#c9c3b8]">{String(key ? row[key] ?? "" : "")}</td>; })}</tr>)}</tbody></table></div><p className="mt-2 text-[10px] text-[#625f58]">Preview shows the first 5 rows and up to 6 recognized columns.</p>
        <button type="button" disabled={loading} onClick={() => void importRows()} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#ebe8e1] px-4 py-3 text-sm font-semibold text-[#0c0c0b] disabled:opacity-50">{loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}{loading ? "Importing " + processedRows.toLocaleString() + " / " + rows.length.toLocaleString() + "…" : "Import or update " + rows.length.toLocaleString() + " rows"}</button>
      </div>}
    </section>
  );
}
