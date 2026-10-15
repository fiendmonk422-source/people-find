"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Search, Save, UserRound, X } from "lucide-react";
import ImportPeople from "./ImportPeople";

type Person = {
  id: string;
  name: string | null;
  school: string | null;
  faculty: string | null;
  department: string | null;
  level: string | null;
  matric_number: string | null;
  updated_at: string | null;
  [key: string]: unknown;
};

const fields = [
  ["name", "Full name"], ["first_name", "First name"], ["middle_name", "Middle name"],
  ["last_name", "Last name"], ["nickname", "Nickname"], ["school", "School"],
  ["faculty", "Faculty"], ["department", "Department"], ["level", "Level"],
  ["class_name", "Class"], ["matric_number", "Matric number"], ["admission_year", "Admission year"],
  ["graduation_year", "Graduation year"], ["hostel", "Hostel"], ["room", "Room"],
  ["phone", "Phone"], ["email", "Email"], ["address", "Address"],
  ["date_of_birth", "Date of birth"], ["gender", "Gender"], ["state", "State"],
  ["lga", "LGA"], ["country", "Country"], ["nationality", "Nationality"],
  ["status", "Status"], ["photo_url", "Photo URL"], ["level_override", "Level override"],
  ["profile_visibility", "Profile visibility"],
] as const;

export default function AdminPeoplePage() {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Person | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadPeople(search: string) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/people?q=" + encodeURIComponent(search), { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || "Could not load directory records.");
      setPeople((payload.people ?? []) as Person[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load directory records.");
      setPeople([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPeople("");
  }, []);

  function selectPerson(person: Person) {
    setSelected(person);
    const next: Record<string, string | boolean> = {};
    for (const [key] of fields) {
      const value = person[key];
      next[key] = value === null || value === undefined ? "" : String(value);
    }
    next.profile_verified = Boolean(person.profile_verified);
    setForm(next);
    setNotice("");
  }

  function updateField(key: string, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSelected(null);
    setNotice("");
    await loadPeople(query);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || saving) return;

    const changes: Record<string, string | boolean | null> = {};
    const normalize = (value: unknown) => {
      if (value === null || value === undefined) return null;
      const text = String(value).trim();
      return text ? text : null;
    };

    for (const [key] of fields) {
      const value = form[key];
      const cleaned = typeof value === "string" && !value.trim() ? null : value as string | null;
      if (normalize(selected[key]) !== normalize(cleaned)) changes[key] = cleaned;
    }
    const verified = Boolean(form.profile_verified);
    if (Boolean(selected.profile_verified) !== verified) changes.profile_verified = verified;

    if (Object.keys(changes).length === 0) {
      setError("");
      setNotice("No changes detected. The directory record was left untouched.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/people", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: selected.id, changes }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || "The record could not be updated.");
      setNotice("Directory record saved. The change was added to the admin activity log.");
      await loadPeople(query);
      setSelected((current) => current
        ? ({ ...current, ...changes, ...(payload.person ?? {}) } as Person)
        : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The record could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0c0c0b] px-4 pb-16 pt-8 text-[#ebe8e1] sm:px-6 lg:pt-12">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#cdbd96]">PeopleFind / Administration</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Manage directory</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#918d84]">Only authorized administrators can correct directory records. Each successful save creates an audit event.</p>

        <ImportPeople onImported={() => void loadPeople(query)} />

        <form onSubmit={search} className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#141413] p-4 sm:flex-row">
          <label className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#77736c]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, matric number, school or department" className="h-12 w-full rounded-xl border border-white/[0.09] bg-[#0e0e0d] pl-10 pr-4 text-sm placeholder:text-[#625f58]" />
          </label>
          <button type="submit" disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#ebe8e1] px-5 text-sm font-semibold text-[#0c0c0b] disabled:opacity-50"><Search size={16} /> Search records</button>
        </form>

        {error && <div role="alert" className="mt-5 rounded-xl border border-[#d98282]/20 bg-[#d98282]/[0.06] p-4 text-sm text-[#e0a29a]">{error}</div>}
        {notice && <div role="status" className="mt-5 rounded-xl border border-[#91b89a]/20 bg-[#91b89a]/[0.06] p-4 text-sm text-[#b4cfba]">{notice}</div>}

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141413]">
            <div className="flex items-center justify-between border-b border-white/[0.07] p-4">
              <h2 className="font-semibold">Directory results</h2>
              <span className="text-xs text-[#77736c]">{people.length} shown</span>
            </div>
            {loading ? <p className="p-5 text-sm text-[#77736c]">Loading records…</p> :
             people.length ? (
              <div className="max-h-[720px] overflow-y-auto divide-y divide-white/[0.06]">
                {people.map((person) => (
                  <button key={person.id} type="button" onClick={() => selectPerson(person)} className={"block w-full p-4 text-left transition hover:bg-white/[0.03] " + (selected?.id === person.id ? "bg-white/[0.04]" : "")}>
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1b1b19] text-[#cdbd96]"><UserRound size={16} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{person.name || "Unnamed person"}</span>
                        <span className="mt-1 block truncate text-xs text-[#77736c]">{[person.department, person.school].filter(Boolean).join(" · ") || "No academic details"}</span>
                        <span className="mt-1 block truncate text-[11px] text-[#625f58]">{person.matric_number || person.id}</span>
                      </span>
                      {selected?.id === person.id && <Check size={16} className="text-[#cdbd96]" />}
                    </span>
                  </button>
                ))}
              </div>
            ) : <p className="p-5 text-sm text-[#77736c]">No records found for this search.</p>}
          </section>

          <section className="rounded-2xl border border-white/[0.08] bg-[#141413] p-4 sm:p-6">
            {!selected ? (
              <div className="flex min-h-56 flex-col items-center justify-center text-center">
                <UserRound size={27} className="text-[#625f58]" />
                <h2 className="mt-4 font-semibold">Select a directory record</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[#77736c]">Choose a person from the results to review and correct their directory information.</p>
              </div>
            ) : (
              <form onSubmit={save}>
                <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] pb-4">
                  <div>
                    <h2 className="text-lg font-semibold">Edit directory record</h2>
                    <p className="mt-1 break-all text-xs text-[#625f58]">Record ID: {selected.id}</p>
                  </div>
                  <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-white/[0.08] p-2 text-[#918d84] hover:text-white" aria-label="Close edit form"><X size={16} /></button>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {fields.map(([key, label]) => (
                    <label key={key} className="block">
                      <span className="mb-2 block text-xs font-medium text-[#918d84]">{label}</span>
                      <input type={key === "date_of_birth" ? "date" : "text"} value={typeof form[key] === "string" ? form[key] as string : ""} onChange={(event) => updateField(key, event.target.value)} className="h-10 w-full rounded-xl border border-white/[0.09] bg-[#0e0e0d] px-3 text-sm" />
                    </label>
                  ))}
                  <label className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#10100f] p-3">
                    <input type="checkbox" checked={Boolean(form.profile_verified)} onChange={(event) => updateField("profile_verified", event.target.checked)} />
                    <span className="text-sm text-[#cfcac1]">Mark profile as verified</span>
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#ebe8e1] px-5 py-3 text-sm font-semibold text-[#0c0c0b] disabled:opacity-50"><Save size={16} /> {saving ? "Saving…" : "Save changes"}</button>
                  <button type="button" onClick={() => selectPerson(selected)} disabled={saving} className="rounded-xl border border-white/[0.09] px-4 py-3 text-sm text-[#918d84] hover:text-white disabled:opacity-50">Discard edits</button>
                  <span className="text-xs text-[#625f58]">Changes are audit logged.</span>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
