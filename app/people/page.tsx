import Link from "next/link";
import {
  Search,
  Users,
  UserRound,
  MapPin,
  GraduationCap,
} from "lucide-react";

import Navbar from "../components/Navbar";
import { createSupabaseServerClient } from "../../src/lib/supabase-server";

type Person = {
  id: string;
  name: string | null;
  department: string | null;
  faculty: string | null;
  level: string | null;
  matric_number: string | null;
  hostel: string | null;
};

export default async function PeoplePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-[#090909] text-[#E8E5DF]">
        <Navbar />

        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <Users
            size={42}
            className="mx-auto mb-5 text-[#77736D]"
          />

          <h1 className="text-3xl font-semibold">
            Sign in to view people
          </h1>

          <p className="mt-3 text-[#77736D]">
            PeopleFind is available to authenticated users.
          </p>

          <Link
            href="/auth"
            className="mt-7 inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#E8E5DF] px-5 py-3 text-sm font-medium text-[#090909] transition hover:bg-white"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("people")
    .select(
      "id, name, department, faculty, level, matric_number, hostel"
    )
    .order("name", { ascending: true })
    .limit(100);

  const people = (data ?? []) as Person[];

  return (
    <main className="min-h-screen bg-[#090909] text-[#E8E5DF]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.07] bg-[#151515]">
              <Users size={20} className="text-[#A7A39B]" />
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">
              People
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#77736D]">
              Browse people currently available in the PeopleFind network.
            </p>
          </div>

          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#151515] px-4 py-3 text-sm text-[#E8E5DF] transition hover:border-white/[0.14] hover:bg-[#1B1B1B]"
          >
            <Search size={16} />
            Search people
          </Link>
        </div>

        {error ? (
          <div className="mt-10 rounded-2xl border border-red-500/10 bg-red-500/[0.04] p-6">
            <p className="text-sm text-red-300">
              Unable to load people.
            </p>

            <p className="mt-2 text-xs text-[#77736D]">
              {error.message}
            </p>
          </div>
        ) : people.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/[0.06] bg-[#111111] p-12 text-center">
            <Users
              size={34}
              className="mx-auto mb-4 text-[#5F5C57]"
            />

            <h2 className="text-lg font-medium">
              No people found
            </h2>

            <p className="mt-2 text-sm text-[#77736D]">
              People added to the network will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-10 flex items-center gap-2 text-xs text-[#77736D]">
              <Users size={14} />
              Showing {people.length} people
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {people.map((person) => (
                <Link
                  key={person.id}
                  href={`/people/${person.id}`}
                  className="group rounded-2xl border border-white/[0.06] bg-[#111111] p-5 transition hover:border-white/[0.12] hover:bg-[#151515]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-[#181818]">
                      <UserRound
                        size={19}
                        className="text-[#A7A39B]"
                      />
                    </div>

                    <span className="rounded-lg border border-white/[0.06] px-2 py-1 text-[10px] text-[#77736D]">
                      {person.level || "—"}
                    </span>
                  </div>

                  <h2 className="mt-5 truncate text-base font-medium text-[#E8E5DF] group-hover:text-white">
                    {person.name || "Anonymous"}
                  </h2>

                  <p className="mt-1 truncate text-xs text-[#77736D]">
                    {person.department || "Department unavailable"}
                  </p>

                  <div className="mt-5 space-y-2 border-t border-white/[0.05] pt-4">
                    <div className="flex items-center gap-2 text-xs text-[#77736D]">
                      <GraduationCap size={14} />
                      <span className="truncate">
                        {person.faculty || "Faculty unavailable"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#77736D]">
                      <MapPin size={14} />
                      <span className="truncate">
                        {person.hostel || "Hostel unavailable"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}