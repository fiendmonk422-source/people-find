import Link from "next/link";
import {
  ArrowRight,
  Building2,
  GraduationCap,
  Home,
  Search,
  UserRound,
} from "lucide-react";

import { createSupabaseServerClient } from "../../src/lib/supabase-server";

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
};

export default async function PeoplePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0c0c0b] text-[#ebe8e1]">
        <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-[#141413]">
            <UserRound size={20} className="text-[#cdbd96]" />
          </div>

          <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">
            Sign in to browse the directory.
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#77736c]">
            Sign in to access PeopleFind directory records.
          </p>

          <Link
            href="/auth"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#ebe8e1] px-5 py-3 text-sm font-semibold text-[#0c0c0b] transition hover:bg-white"
          >
            Sign in
            <ArrowRight size={15} />
          </Link>
        </div>
      </main>
    );
  }

  const { data, error } = await supabase
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
      room
    `
    )
    .order("name", { ascending: true })
    .limit(100);

  const people = (data ?? []) as Person[];

  return (
    <main className="min-h-screen bg-[#0c0c0b] text-[#ebe8e1]">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:py-14">
        {/* HEADER */}
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#6c6861]">
              People directory
            </p>

            <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Browse the directory.
            </h1>

            <p className="mt-4 text-sm leading-6 text-[#77736c] sm:text-base">
              Explore available directory records and open a full profile
              when you find the person you're looking for.
            </p>
          </div>

          <Link
            href="/search"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#ebe8e1] px-5 py-3 text-sm font-semibold text-[#0c0c0b] transition hover:bg-white"
          >
            <Search size={16} />
            Search directory
          </Link>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mt-8 rounded-xl border border-[#d98282]/20 bg-[#d98282]/[0.06] px-4 py-3 text-sm text-[#dca0a0]">
            Unable to load the directory right now.
          </div>
        )}

        {/* DIRECTORY */}
        <section className="mt-10">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#625f58]">
                Directory
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                People
              </h2>
            </div>

            <p className="text-xs text-[#625f58]">
              Showing up to 100 records
            </p>
          </div>

          {people.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {people.map((person) => (
                <PersonCard key={person.id} person={person} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.07] bg-[#141413] px-6 py-14 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.07] bg-[#1a1a18]">
                <UserRound
                  size={19}
                  className="text-[#706c64]"
                />
              </div>

              <h2 className="mt-5 text-base font-semibold">
                No directory records found
              </h2>

              <p className="mt-2 text-sm text-[#6f6b64]">
                There are currently no records available to display.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function PersonCard({ person }: { person: Person }) {
  const displayName =
    person.name ||
    [person.first_name, person.middle_name, person.last_name]
      .filter(Boolean)
      .join(" ") ||
    "Unnamed person";

  const academicDetails = [
    person.department,
    person.faculty,
  ].filter(Boolean);

  const schoolDetails = [
    person.school,
    person.level ? `Level ${person.level}` : null,
  ].filter(Boolean);

  const accommodationDetails = [
    person.hostel,
    person.room ? `Room ${person.room}` : null,
  ].filter(Boolean);

  return (
    <article className="group rounded-2xl border border-white/[0.07] bg-[#141413] p-5 transition hover:border-white/[0.12] hover:bg-[#181817]">
      {/* Identity */}
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

      {/* Details */}
      <div className="mt-5 space-y-2.5">
        {academicDetails.length > 0 && (
          <div className="flex gap-2 text-xs text-[#77736c]">
            <GraduationCap
              size={14}
              className="mt-0.5 shrink-0 text-[#625f58]"
            />

            <span className="line-clamp-2">
              {academicDetails.join(" · ")}
            </span>
          </div>
        )}

        {schoolDetails.length > 0 && (
          <div className="flex gap-2 text-xs text-[#77736c]">
            <Building2
              size={14}
              className="mt-0.5 shrink-0 text-[#625f58]"
            />

            <span>{schoolDetails.join(" · ")}</span>
          </div>
        )}

        {person.class_name && (
          <div className="flex gap-2 text-xs text-[#77736c]">
            <GraduationCap
              size={14}
              className="mt-0.5 shrink-0 text-[#625f58]"
            />

            <span>Class: {person.class_name}</span>
          </div>
        )}

        {accommodationDetails.length > 0 && (
          <div className="flex gap-2 text-xs text-[#77736c]">
            <Home
              size={14}
              className="mt-0.5 shrink-0 text-[#625f58]"
            />

            <span>{accommodationDetails.join(" · ")}</span>
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

      {/* Profile */}
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