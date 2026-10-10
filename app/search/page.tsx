"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Building2,
  ChevronDown,
  GraduationCap,
  Home,
  MapPin,
  Search as SearchIcon,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";

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
  room: string | null;
  state: string | null;
  lga: string | null;
};

type SearchFilters = {
  name: string;
  nickname: string;
  matricNumber: string;
  school: string;
  faculty: string;
  department: string;
  level: string;
  className: string;
  hostel: string;
  room: string;
  state: string;
  lga: string;
};

const emptyFilters: SearchFilters = {
  name: "",
  nickname: "",
  matricNumber: "",
  school: "",
  faculty: "",
  department: "",
  level: "",
  className: "",
  hostel: "",
  room: "",
  state: "",
  lga: "",
};

export default function SearchPage() {
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters);
  const [results, setResults] = useState<Person[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  async function handleSearch(event?: FormEvent) {
    event?.preventDefault();

    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please sign in to search the directory.");
        setResults([]);
        return;
      }

      const clean = Object.fromEntries(
        Object.entries(filters).map(([key, value]) => [
          key,
          value.trim(),
        ])
      ) as SearchFilters;

      const hasSearch =
        Object.values(clean).some(Boolean);

      if (!hasSearch) {
        setResults([]);
        setError("Enter at least one search clue.");
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
          hostel,
          room,
          state,
          lga
        `
        )
        .limit(100);

      if (clean.name) {
        const value = escapeLike(clean.name);

        query = query.or(
          [
            `name.ilike.%${value}%`,
            `first_name.ilike.%${value}%`,
            `middle_name.ilike.%${value}%`,
            `last_name.ilike.%${value}%`,
          ].join(",")
        );
      }

      if (clean.nickname) {
        query = query.ilike(
          "nickname",
          `%${escapeLike(clean.nickname)}%`
        );
      }

      if (clean.matricNumber) {
        query = query.ilike(
          "matric_number",
          `%${escapeLike(clean.matricNumber)}%`
        );
      }

      if (clean.school) {
        query = query.ilike(
          "school",
          `%${escapeLike(clean.school)}%`
        );
      }

      if (clean.faculty) {
        query = query.ilike(
          "faculty",
          `%${escapeLike(clean.faculty)}%`
        );
      }

      if (clean.department) {
        query = query.ilike(
          "department",
          `%${escapeLike(clean.department)}%`
        );
      }

      if (clean.level) {
        query = query.ilike(
          "level",
          `%${escapeLike(clean.level)}%`
        );
      }

      if (clean.className) {
        query = query.ilike(
          "class_name",
          `%${escapeLike(clean.className)}%`
        );
      }

      if (clean.hostel) {
        query = query.ilike(
          "hostel",
          `%${escapeLike(clean.hostel)}%`
        );
      }

      if (clean.room) {
        query = query.ilike(
          "room",
          `%${escapeLike(clean.room)}%`
        );
      }

      if (clean.state) {
        query = query.ilike(
          "state",
          `%${escapeLike(clean.state)}%`
        );
      }

      if (clean.lga) {
        query = query.ilike(
          "lga",
          `%${escapeLike(clean.lga)}%`
        );
      }

      const { data, error: searchError } = await query;

      if (searchError) {
        throw searchError;
      }

      setResults((data ?? []) as Person[]);
    } catch (err) {
      setResults([]);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while searching."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(
    key: keyof SearchFilters,
    value: string
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function clearSearch() {
    setFilters(emptyFilters);
    setResults([]);
    setSearched(false);
    setError("");
  }

  const activeFilterCount = Object.values(filters).filter(
    Boolean
  ).length;

  return (
    <main className="min-h-screen bg-[#0c0c0b] text-[#ebe8e1]">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:py-14">
        {/* HEADER */}
        <div className="max-w-3xl">
          <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#6c6861]">
            Directory search
          </p>

          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            Find someone from what you know.
          </h1>

          <p className="mt-4 text-sm leading-6 text-[#77736c] sm:text-base">
            Search using one clue or combine several details to narrow
            the results.
          </p>
        </div>

        {/* SEARCH PANEL */}
        <section className="mt-10 rounded-2xl border border-white/[0.07] bg-[#141413] p-4 sm:p-5">
          <form onSubmit={handleSearch}>
            {/* MAIN SEARCH */}
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <SearchIcon
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#68645d]"
                />

                <input
                  type="text"
                  value={filters.name}
                  onChange={(event) =>
                    updateFilter("name", event.target.value)
                  }
                  placeholder="Name or part of a name"
                  className="h-12 w-full rounded-xl border border-white/[0.07] bg-[#0f0f0e] pl-11 pr-4 text-sm text-[#ebe8e1] placeholder:text-[#5f5c55] focus:border-[#cdbd96]/35"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#ebe8e1] px-6 text-sm font-semibold text-[#0c0c0b] transition hover:bg-white disabled:opacity-50"
              >
                <SearchIcon size={16} />

                {loading ? "Searching..." : "Search"}
              </button>
            </div>

            {/* FILTER TOGGLE */}
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setShowFilters((current) => !current)
                }
                className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-[#88847d] transition hover:bg-[#1a1a18] hover:text-[#d6d2ca]"
              >
                <SlidersHorizontal size={14} />

                More search clues

                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-[#cdbd96]/10 px-1.5 py-0.5 text-[10px] text-[#cdbd96]">
                    {activeFilterCount}
                  </span>
                )}

                <ChevronDown
                  size={14}
                  className={`transition-transform ${
                    showFilters ? "rotate-180" : ""
                  }`}
                />
              </button>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="inline-flex items-center gap-1.5 text-xs text-[#6f6b64] transition hover:text-[#cdbd96]"
                >
                  <X size={13} />
                  Clear
                </button>
              )}
            </div>

            {/* FILTERS */}
            {showFilters && (
              <div className="mt-4 grid gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-2 lg:grid-cols-3">
                <FilterInput
                  label="Nickname"
                  value={filters.nickname}
                  onChange={(value) =>
                    updateFilter("nickname", value)
                  }
                />

                <FilterInput
                  label="Matric number"
                  value={filters.matricNumber}
                  onChange={(value) =>
                    updateFilter("matricNumber", value)
                  }
                />

                <FilterInput
                  label="School"
                  value={filters.school}
                  onChange={(value) =>
                    updateFilter("school", value)
                  }
                />

                <FilterInput
                  label="Faculty"
                  value={filters.faculty}
                  onChange={(value) =>
                    updateFilter("faculty", value)
                  }
                />

                <FilterInput
                  label="Department"
                  value={filters.department}
                  onChange={(value) =>
                    updateFilter("department", value)
                  }
                />

                <FilterInput
                  label="Level"
                  value={filters.level}
                  onChange={(value) =>
                    updateFilter("level", value)
                  }
                  placeholder="e.g. 100"
                />

                <FilterInput
                  label="Class"
                  value={filters.className}
                  onChange={(value) =>
                    updateFilter("className", value)
                  }
                />

                <FilterInput
                  label="Hostel"
                  value={filters.hostel}
                  onChange={(value) =>
                    updateFilter("hostel", value)
                  }
                />

                <FilterInput
                  label="Room"
                  value={filters.room}
                  onChange={(value) =>
                    updateFilter("room", value)
                  }
                />

                <FilterInput
                  label="State"
                  value={filters.state}
                  onChange={(value) =>
                    updateFilter("state", value)
                  }
                />

                <FilterInput
                  label="LGA"
                  value={filters.lga}
                  onChange={(value) =>
                    updateFilter("lga", value)
                  }
                />
              </div>
            )}
          </form>
        </section>

        {/* ERROR */}
        {error && (
          <div className="mt-5 rounded-xl border border-[#d98282]/20 bg-[#d98282]/[0.06] px-4 py-3 text-sm text-[#dca0a0]">
            {error}
          </div>
        )}

        {/* RESULTS HEADER */}
        {searched && !error && (
          <div className="mt-10 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#625f58]">
                Results
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                {loading
                  ? "Searching..."
                  : `${results.length} ${
                      results.length === 1 ? "person" : "people"
                    } found`}
              </h2>
            </div>

            {results.length === 100 && (
              <p className="text-xs text-[#625f58]">
                Showing the first 100 results
              </p>
            )}
          </div>
        )}

        {/* RESULTS */}
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {results.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>

        {/* EMPTY */}
        {searched &&
          !loading &&
          !error &&
          results.length === 0 && (
            <div className="mt-5 rounded-2xl border border-white/[0.07] bg-[#141413] px-6 py-14 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-[#1a1a18]">
                <SearchIcon
                  size={19}
                  className="text-[#706c64]"
                />
              </div>

              <h2 className="mt-5 text-base font-semibold">
                No matching people found
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6f6b64]">
                Try a different spelling, remove one of the clues, or
                search using another detail you know.
              </p>
            </div>
          )}

        {/* INITIAL STATE */}
        {!searched && (
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <SearchHint
              icon={<UserRound size={17} />}
              title="Name"
              text="Search a full name or part of one."
            />

            <SearchHint
              icon={<GraduationCap size={17} />}
              title="School details"
              text="Use school, faculty, department, level or class."
            />

            <SearchHint
              icon={<Home size={17} />}
              title="Location clues"
              text="Try a hostel, room, state or LGA."
            />
          </div>
        )}
      </div>
    </main>
  );
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-[#77736c]">
        {label}
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? `Search ${label.toLowerCase()}`}
        className="h-11 w-full rounded-xl border border-white/[0.07] bg-[#0f0f0e] px-3.5 text-sm text-[#ebe8e1] placeholder:text-[#55524c] focus:border-[#cdbd96]/35"
      />
    </label>
  );
}

function PersonCard({ person }: { person: Person }) {
  const displayName =
    person.name ||
    [person.first_name, person.middle_name, person.last_name]
      .filter(Boolean)
      .join(" ") ||
    "Unnamed person";

  return (
    <article className="group rounded-2xl border border-white/[0.07] bg-[#141413] p-5 transition hover:border-white/[0.12] hover:bg-[#181817]">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-[#1a1a18]">
          <UserRound
            size={18}
            strokeWidth={1.6}
            className="text-[#cdbd96]"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[#ebe8e1]">
            {displayName}
          </h3>

          {person.nickname && (
            <p className="mt-1 truncate text-xs text-[#77736c]">
              {person.nickname}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        {(person.department || person.faculty) && (
          <div className="flex gap-2 text-xs text-[#77736c]">
            <GraduationCap
              size={14}
              className="mt-0.5 shrink-0 text-[#625f58]"
            />

            <span className="line-clamp-2">
              {[person.department, person.faculty]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        )}

        {(person.school || person.level) && (
          <div className="flex gap-2 text-xs text-[#77736c]">
            <Building2
              size={14}
              className="mt-0.5 shrink-0 text-[#625f58]"
            />

            <span>
              {[person.school, person.level && `Level ${person.level}`]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        )}

        {(person.hostel || person.room) && (
          <div className="flex gap-2 text-xs text-[#77736c]">
            <Home
              size={14}
              className="mt-0.5 shrink-0 text-[#625f58]"
            />

            <span>
              {[person.hostel, person.room && `Room ${person.room}`]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        )}

        {(person.state || person.lga) && (
          <div className="flex gap-2 text-xs text-[#77736c]">
            <MapPin
              size={14}
              className="mt-0.5 shrink-0 text-[#625f58]"
            />

            <span>
              {[person.state, person.lga]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        )}

        {person.matric_number && (
          <div className="border-t border-white/[0.05] pt-3 text-xs text-[#625f58]">
            Matric:{" "}
            <span className="text-[#85817a]">
              {person.matric_number}
            </span>
          </div>
        )}
      </div>

      <Link
        href={`/people/${person.id}`}
        className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#10100f] px-3.5 py-3 text-xs font-medium text-[#918d85] transition hover:border-white/[0.11] hover:text-[#ebe8e1]"
      >
        View full profile
        <ArrowRight size={14} />
      </Link>
    </article>
  );
}

function SearchHint({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#141413] p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-[#1a1a18] text-[#cdbd96]">
        {icon}
      </div>

      <h3 className="mt-4 text-sm font-medium text-[#d1cdc5]">
        {title}
      </h3>

      <p className="mt-1.5 text-xs leading-5 text-[#68645d]">
        {text}
      </p>
    </div>
  );
}

function escapeLike(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}