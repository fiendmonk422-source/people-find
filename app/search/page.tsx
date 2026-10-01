
"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  UserRound,
  X,
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

import Navbar from "../components/Navbar";
import { supabase } from "../../src/lib/supabase";

type Person = {
  id: string;
  name: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  nickname: string | null;
  school: string | null;
  faculty: string | null;
  department: string | null;
  level: string | null;
  class_name: string | null;
  matric_number: string | null;
  hostel: string | null;
};

type SearchForm = {
  name: string;
  nickname: string;
  department: string;
  faculty: string;
  level: string;
  matricNumber: string;
  hostel: string;
  className: string;
};

const emptyForm: SearchForm = {
  name: "",
  nickname: "",
  department: "",
  faculty: "",
  level: "",
  matricNumber: "",
  hostel: "",
  className: "",
};

export default function SearchPage() {
  const [form, setForm] = useState<SearchForm>(emptyForm);
  const [results, setResults] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await searchPeople(emptyForm, false);
    }

    setInitialLoading(false);
  }

  async function searchPeople(
    searchForm: SearchForm,
    markAsSearched = true
  ) {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setResults([]);
        setError("Please sign in to search PeopleFind.");
        return;
      }

      let query = supabase
        .from("people")
        .select(
          `
            id,
            name,
            first_name,
            middle_name,
            last_name,
            nickname,
            school,
            faculty,
            department,
            level,
            class_name,
            matric_number,
            hostel
          `
        )
        .order("name", { ascending: true });

      const name = searchForm.name.trim();
      const nickname = searchForm.nickname.trim();
      const department = searchForm.department.trim();
      const faculty = searchForm.faculty.trim();
      const level = searchForm.level.trim();
      const matricNumber = searchForm.matricNumber.trim();
      const hostel = searchForm.hostel.trim();
      const className = searchForm.className.trim();

      /*
       * Each filled field adds another filter.
       * Multiple fields therefore narrow the result.
       */

      if (name) {
        query = query.or(
          `name.ilike.%${name}%,first_name.ilike.%${name}%,middle_name.ilike.%${name}%,last_name.ilike.%${name}%`
        );
      }

      if (nickname) {
        query = query.ilike("nickname", `%${nickname}%`);
      }

      if (department) {
        query = query.ilike("department", `%${department}%`);
      }

      if (faculty) {
        query = query.ilike("faculty", `%${faculty}%`);
      }

      if (level) {
        query = query.ilike("level", `%${level}%`);
      }

      if (matricNumber) {
        query = query.ilike("matric_number", `%${matricNumber}%`);
      }

      if (hostel) {
        query = query.ilike("hostel", `%${hostel}%`);
      }

      if (className) {
        query = query.ilike("class_name", `%${className}%`);
      }

      const { data, error: searchError } = await query;

      if (searchError) {
        throw searchError;
      }

      setResults((data ?? []) as Person[]);
      setSearched(markAsSearched);
    } catch (err: any) {
      console.error("People search error:", err);

      setResults([]);
      setError(
        err?.message ||
          "We couldn't complete the search. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const hasSearchValue = Object.values(form).some(
      (value) => value.trim().length > 0
    );

    if (!hasSearchValue) {
      setError("Enter at least one clue to search.");
      return;
    }

    await searchPeople(form);
  }

  function updateField(field: keyof SearchForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function clearSearch() {
    setForm(emptyForm);
    setResults([]);
    setError("");
    setSearched(false);
  }

  if (initialLoading) {
    return (
      <main className="min-h-screen bg-[#090909] text-[#E8E5DF]">
        <Navbar />

        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-[#77736D]">
            <Loader2 size={18} className="animate-spin" />
            Loading search...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090909] text-[#E8E5DF]">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#77736D]">
            PeopleFind
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Search people
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8E8A83]">
            Find someone using whatever information you know. You can use one
            clue or combine several clues to narrow the results.
          </p>
        </div>

        {/* Search panel */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#111111] p-6">
          <form onSubmit={handleSearch}>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal
                  size={17}
                  className="text-[#8E8A83]"
                />

                <h2 className="text-sm font-medium text-[#C9C5BE]">
                  Search clues
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowFilters((value) => !value)}
                className="text-xs text-[#77736D] transition hover:text-[#C9C5BE]"
              >
                {showFilters ? "Hide filters" : "Show filters"}
              </button>
            </div>

            {showFilters && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <SearchField
                  label="Name"
                  value={form.name}
                  onChange={(value) => updateField("name", value)}
                  placeholder="e.g. Daniel"
                />

                <SearchField
                  label="Nickname"
                  value={form.nickname}
                  onChange={(value) => updateField("nickname", value)}
                  placeholder="Nickname"
                />

                <SearchField
                  label="Department"
                  value={form.department}
                  onChange={(value) => updateField("department", value)}
                  placeholder="e.g. Computer Science"
                />

                <SearchField
                  label="Faculty"
                  value={form.faculty}
                  onChange={(value) => updateField("faculty", value)}
                  placeholder="e.g. Technology"
                />

                <SearchField
                  label="Level"
                  value={form.level}
                  onChange={(value) => updateField("level", value)}
                  placeholder="e.g. 100"
                />

                <SearchField
                  label="Matric number"
                  value={form.matricNumber}
                  onChange={(value) =>
                    updateField("matricNumber", value)
                  }
                  placeholder="Matric number"
                />

                <SearchField
                  label="Hostel"
                  value={form.hostel}
                  onChange={(value) => updateField("hostel", value)}
                  placeholder="e.g. Kuti Hall"
                />

                <SearchField
                  label="Class"
                  value={form.className}
                  onChange={(value) => updateField("className", value)}
                  placeholder="e.g. IPE 100"
                />
              </div>
            )}

            {error && (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-4">
                <AlertCircle
                  size={17}
                  className="mt-0.5 shrink-0 text-red-400"
                />

                <p className="break-words text-sm text-red-300">
                  {error}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#E8E5DF] px-5 py-3 text-sm font-medium text-[#090909] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}

                {loading ? "Searching..." : "Search people"}
              </button>

              <button
                type="button"
                onClick={clearSearch}
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-5 py-3 text-sm text-[#9B978F] transition hover:bg-[#171717]"
              >
                <X size={16} />
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        <div className="mt-8">
          {loading ? (
            <div className="flex min-h-[250px] items-center justify-center rounded-2xl border border-white/[0.07] bg-[#111111]">
              <div className="flex items-center gap-3 text-sm text-[#77736D]">
                <Loader2 size={18} className="animate-spin" />
                Searching...
              </div>
            </div>
          ) : searched ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium text-[#A7A39B]">
                  Search results
                </h2>

                <span className="text-xs text-[#5F5C57]">
                  {results.length} result
                  {results.length === 1 ? "" : "s"}
                </span>
              </div>

              {results.length === 0 ? (
                <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-white/[0.07] bg-[#111111] px-6 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#171717]">
                    <Search size={20} className="text-[#77736D]" />
                  </div>

                  <h3 className="font-medium">
                    No matching person found
                  </h3>

                  <p className="mt-2 max-w-md text-sm leading-6 text-[#77736D]">
                    Try removing one clue or searching with a different
                    spelling.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {results.map((person) => (
                    <PersonCard key={person.id} person={person} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-white/[0.07] bg-[#111111] px-6 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#171717]">
                <Search size={20} className="text-[#77736D]" />
              </div>

              <h3 className="font-medium">
                Start with a clue
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-[#77736D]">
                Enter a name, hostel, department, matric number, or any other
                information you know.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function SearchField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-[#9B978F]">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/[0.08] bg-[#090909] px-4 py-3 text-sm text-[#E8E5DF] outline-none placeholder:text-[#55524D] transition focus:border-white/[0.18]"
      />
    </div>
  );
}

function PersonCard({ person }: { person: Person }) {
  return (
    <article className="rounded-2xl border border-white/[0.07] bg-[#111111] p-5 transition hover:border-white/[0.12]">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#171717]">
          <UserRound size={19} className="text-[#A7A39B]" />
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-[#E8E5DF]">
            {person.name || "Unnamed person"}
          </h3>

          {person.nickname && (
            <p className="mt-1 text-xs text-[#77736D]">
              @{person.nickname}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-2 text-sm">
        {person.department && (
          <Detail
            label="Department"
            value={person.department}
          />
        )}

        {person.faculty && (
          <Detail
            label="Faculty"
            value={person.faculty}
          />
        )}

        {person.level && (
          <Detail
            label="Level"
            value={person.level}
          />
        )}

        {person.class_name && (
          <Detail
            label="Class"
            value={person.class_name}
          />
        )}

        {person.hostel && (
          <Detail
            label="Hostel"
            value={person.hostel}
          />
        )}

        {person.matric_number && (
          <Detail
            label="Matric"
            value={person.matric_number}
          />
        )}
      </div>

      {/* NEW: Full profile link */}
      <a
        href={`/people/${person.id}`}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#171717] px-4 py-3 text-sm font-medium text-[#A7A39B] transition hover:border-white/[0.15] hover:bg-[#1D1D1D] hover:text-[#E8E5DF]"
      >
        View Full Profile
        <ArrowRight size={15} />
      </a>
    </article>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 border-b border-white/[0.04] py-2 last:border-0">
      <span className="w-24 shrink-0 text-xs text-[#5F5C57]">
        {label}
      </span>

      <span className="min-w-0 text-xs text-[#A7A39B]">
        {value}
      </span>
    </div>
  );
}