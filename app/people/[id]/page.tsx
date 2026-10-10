import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  House,
  Mail,
  MapPin,
  ShieldCheck,
  UserCircle,
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
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#141413] text-[#918d84]">
            <UserCircle size={26} strokeWidth={1.4} />
          </div>

          <p className="mt-6 text-xs font-medium uppercase tracking-[0.2em] text-[#625f58]">
            PeopleFind
          </p>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Person not found
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#918d84]">
            This person could not be found in the directory.
          </p>

          <Link
            href="/people"
            className="pf-button-primary mt-7"
          >
            <ArrowLeft size={16} strokeWidth={1.7} />
            Back to directory
          </Link>
        </div>
      </main>
    );
  }

  const displayName =
    person.name ||
    [person.first_name, person.middle_name, person.last_name]
      .filter(Boolean)
      .join(" ") ||
    "Unnamed person";

  const subtitle = [
    person.department,
    person.faculty,
    person.school,
  ]
    .filter(Boolean)
    .join(" · ");

  const location = [
    person.hostel,
    person.room ? `Room ${person.room}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/people"
          className="inline-flex items-center gap-2 text-sm text-[#918d84] transition hover:text-[#ebe8e1]"
        >
          <ArrowLeft size={16} strokeWidth={1.7} />
          Back to directory
        </Link>

        {/* Profile header */}
        <section className="pf-surface mt-7 overflow-hidden rounded-2xl">
          <div className="border-b border-white/[0.075] px-5 py-7 sm:px-8 sm:py-9">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#1a1a18] text-[#918d84]">
                <UserCircle size={40} strokeWidth={1.25} />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#625f58]">
                    Directory profile
                  </p>

                  {person.profile_verified && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#91b89a]/20 bg-[#91b89a]/[0.07] px-2.5 py-1 text-[11px] font-medium text-[#a8c9ae]">
                      <CheckCircle2 size={13} strokeWidth={1.8} />
                      Verified
                    </span>
                  )}
                </div>

                <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight text-[#ebe8e1] sm:text-4xl">
                  {displayName}
                </h1>

                {person.nickname && (
                  <p className="mt-2 text-sm text-[#918d84]">
                    Also known as{" "}
                    <span className="text-[#cbc7be]">
                      {person.nickname}
                    </span>
                  </p>
                )}

                {subtitle && (
                  <p className="mt-3 break-words text-sm text-[#cbc7be]">
                    {subtitle}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {person.level && (
                    <Badge>{person.level}</Badge>
                  )}

                  {person.class_name && (
                    <Badge>{person.class_name}</Badge>
                  )}

                  {person.matric_number && (
                    <Badge>{person.matric_number}</Badge>
                  )}

                  {person.status && (
                    <Badge>{person.status}</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick identity details */}
          <div className="grid divide-y divide-white/[0.07] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <QuickInfo
              label="School"
              value={person.school}
            />

            <QuickInfo
              label="Department"
              value={person.department}
            />

            <QuickInfo
              label="Level"
              value={person.level}
            />
          </div>
        </section>

        {/* Academic */}
        <ProfileSection
          icon={<GraduationCap size={18} strokeWidth={1.5} />}
          title="Academic information"
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

        {/* Accommodation */}
        <ProfileSection
          icon={<House size={18} strokeWidth={1.5} />}
          title="Accommodation"
        >
          <Info label="Hostel" value={person.hostel} />
          <Info label="Room" value={person.room} />
        </ProfileSection>

        {/* Location */}
        <ProfileSection
          icon={<MapPin size={18} strokeWidth={1.5} />}
          title="Location"
        >
          <Info label="State" value={person.state} />
          <Info label="LGA" value={person.lga} />
          <Info label="Country" value={person.country} />
        </ProfileSection>

        {/* Personal */}
        <ProfileSection
          icon={<UserCircle size={18} strokeWidth={1.5} />}
          title="Personal information"
        >
          <Info label="First Name" value={person.first_name} />
          <Info label="Middle Name" value={person.middle_name} />
          <Info label="Last Name" value={person.last_name} />
          <Info label="Nickname" value={person.nickname} />
          <Info label="Gender" value={person.gender} />
          <Info
            label="Date of Birth"
            value={formatDate(person.date_of_birth)}
            icon={<CalendarDays size={13} strokeWidth={1.5} />}
          />
          <Info label="Nationality" value={person.nationality} />
        </ProfileSection>

        {/* Contact */}
        <ProfileSection
          icon={<Mail size={18} strokeWidth={1.5} />}
          title="Contact information"
        >
          <Info label="Phone" value={person.phone} />
          <Info label="Email" value={person.email} />
          <Info label="Address" value={person.address} />
        </ProfileSection>

        {/* Directory record */}
        <section className="pf-surface mt-5 rounded-2xl p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-[#1a1a18] text-[#918d84]">
              <ShieldCheck size={18} strokeWidth={1.5} />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-[#ebe8e1]">
                Directory record
              </h2>

              <p className="mt-1.5 text-sm leading-6 text-[#918d84]">
                This information is part of the PeopleFind directory
                record and is managed by authorized administrators.
              </p>

              <p className="mt-3 break-all text-xs text-[#625f58]">
                Record ID: {person.id}
              </p>
            </div>
          </div>
        </section>

        <div className="pb-8 pt-8 text-center text-xs text-[#625f58]">
          PeopleFind directory
        </div>
      </div>
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
    <section className="pf-surface mt-5 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-3 border-b border-white/[0.075] pb-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-[#1a1a18] text-[#918d84]">
          {icon}
        </div>

        <h2 className="text-sm font-semibold text-[#ebe8e1]">
          {title}
        </h2>
      </div>

      <div className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function QuickInfo({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="px-5 py-4 sm:px-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#625f58]">
        {label}
      </p>

      <p className="mt-1.5 break-words text-sm font-medium text-[#cbc7be]">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-xs text-[#a7a39b]">
      {children}
    </span>
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
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-xs text-[#625f58]">
        {icon}
        {label}
      </div>

      <p className="mt-1.5 break-words text-sm leading-5 text-[#cbc7be]">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}