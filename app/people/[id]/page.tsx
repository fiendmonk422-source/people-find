
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  GraduationCap,
  House,
  Mail,
  MapPin,
  Shield,
  UserCircle,
  Users,
} from "lucide-react";
import { createSupabaseServerClient } from "../../../src/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: person, error } = await supabase
    .from("people")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !person) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090909] px-6 text-[#E8E5DF]">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.08] bg-[#111111]">
            <UserCircle size={21} strokeWidth={1.6} />
          </div>

          <h1 className="mt-5 text-2xl font-semibold">
            Person not found
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#817D76]">
            This profile could not be found in the PeopleFind directory.
          </p>

          <Link
            href="/people"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#E8E5DF] px-5 py-3 text-sm font-semibold text-[#090909] transition hover:bg-white"
          >
            <ArrowLeft size={16} strokeWidth={1.7} />
            Back to People
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090909] text-[#E8E5DF]">
      {/* NAVIGATION */}
      <nav className="border-b border-white/[0.07] bg-[#0B0B0B]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight"
          >
            PeopleFind
          </Link>

          <div className="flex items-center gap-6 text-sm text-[#A7A39B]">
            <Link
              href="/people"
              className="flex items-center gap-2 transition hover:text-white"
            >
              <Users size={16} strokeWidth={1.7} />
              People
            </Link>

            <Link
              href="/search"
              className="transition hover:text-white"
            >
              Search
            </Link>

            <Link
              href="/auth"
              className="transition hover:text-white"
            >
              Account
            </Link>
          </div>
        </div>
      </nav>

      {/* PROFILE */}
      <section className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/people"
          className="inline-flex items-center gap-2 text-sm text-[#817D76] transition hover:text-white"
        >
          <ArrowLeft size={16} strokeWidth={1.6} />
          Back to people
        </Link>

        {/* HEADER */}
        <div className="mt-8 rounded-2xl border border-white/[0.08] bg-[#111111] p-7">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#171717] text-[#B8B4AC]">
              <UserCircle size={38} strokeWidth={1.3} />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#625F59]">
                PeopleFind Profile
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                {person.name}
              </h1>

              <p className="mt-2 text-sm text-[#A7A39B]">
                {person.department || "Department unavailable"}
              </p>

              {person.status && (
                <div className="mt-4 inline-flex items-center rounded-full border border-white/[0.07] px-3 py-1 text-xs text-[#817D76]">
                  {person.status}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          {/* ACADEMIC */}
          <ProfileSection
            icon={<GraduationCap size={18} strokeWidth={1.5} />}
            title="Academic Information"
          >
            <Info label="School" value={person.school} />
            <Info label="Faculty" value={person.faculty} />
            <Info label="Department" value={person.department} />
            <Info label="Level" value={person.level} />
            <Info label="Class" value={person.class_name} />
            <Info label="Matric Number" value={person.matric_number} />
            <Info label="Admission Year" value={person.admission_year} />
            <Info label="Graduation Year" value={person.graduation_year} />
            <Info label="Status" value={person.status} />
          </ProfileSection>

          {/* ACCOMMODATION */}
          <ProfileSection
            icon={<House size={18} strokeWidth={1.5} />}
            title="Accommodation"
          >
            <Info label="Hostel" value={person.hostel} />
            <Info label="Room" value={person.room} />
          </ProfileSection>

          {/* PERSONAL */}
          <ProfileSection
            icon={<UserCircle size={18} strokeWidth={1.5} />}
            title="Personal Information"
          >
            <Info label="First Name" value={person.first_name} />
            <Info label="Middle Name" value={person.middle_name} />
            <Info label="Last Name" value={person.last_name} />
            <Info label="Nickname" value={person.nickname} />
            <Info label="Gender" value={person.gender} />
            <Info label="State" value={person.state} />
            <Info label="Country" value={person.country} />
            <Info label="Nationality" value={person.nationality} />
            <Info
              label="Date of Birth"
              value={person.date_of_birth}
              icon={<CalendarDays size={14} strokeWidth={1.5} />}
            />
          </ProfileSection>

          {/* CONTACT */}
          <ProfileSection
            icon={<Mail size={18} strokeWidth={1.5} />}
            title="Contact Information"
          >
            <Info label="Phone" value={person.phone} />
            <Info label="Email" value={person.email} />
            <Info
              label="Address"
              value={person.address}
              icon={<MapPin size={14} strokeWidth={1.5} />}
            />
          </ProfileSection>

          {/* ID */}
          <ProfileSection
            icon={<Shield size={18} strokeWidth={1.5} />}
            title="Profile Details"
          >
            <Info label="Profile ID" value={person.id} />
          </ProfileSection>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-12 border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-8 text-sm text-[#625F59]">
          <span>PeopleFind</span>

          <div className="flex items-center gap-2">
            <Shield size={14} strokeWidth={1.5} />
            <span>Privacy focused</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ProfileSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#111111] p-6">
      <div className="flex items-center gap-3 border-b border-white/[0.07] pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.07] bg-[#171717] text-[#A7A39B]">
          {icon}
        </div>

        <h2 className="text-base font-semibold">
          {title}
        </h2>
      </div>

      <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function Info({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | number | null;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-[#625F59]">
        {icon}
        {label}
      </div>

      <p className="mt-1.5 break-words text-sm text-[#D2CEC6]">
        {value || "Not provided"}
      </p>
    </div>
  );
}
