import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Search,
  ScanLine,
  Users,
  MessageSquareText,
  Activity,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0c0c0b] text-[#ebe8e1]">
      {/* HERO */}
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:pt-24">
          <div className="max-w-4xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#141413] px-3.5 py-2 text-[11px] uppercase tracking-[0.16em] text-[#85817a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#cdbd96]" />
              People directory
            </div>

            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-[#ebe8e1] sm:text-6xl lg:text-7xl">
              Find the right person.
              <br />
              <span className="text-[#918d84]">From the details you know.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-7 text-[#85817a] sm:text-lg">
              PeopleFind helps you discover people through names, schools,
              departments, matric numbers, hostels, classes, and other useful
              directory information.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/search"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ebe8e1] px-5 py-3.5 text-sm font-semibold text-[#0c0c0b] transition hover:bg-white"
              >
                <Search size={17} />
                Search People
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/people"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#141413] px-5 py-3.5 text-sm font-medium text-[#c4c0b8] transition hover:border-white/[0.13] hover:bg-[#191918] hover:text-[#ebe8e1]"
              >
                <Users size={17} />
                Browse Directory
              </Link>
            </div>
          </div>

          {/* QUICK SEARCH PANEL */}
          <div className="mt-16 max-w-5xl">
            <Link
              href="/search"
              className="group block rounded-2xl border border-white/[0.08] bg-[#141413] p-2 transition hover:border-white/[0.12]"
            >
              <div className="flex min-h-[76px] items-center gap-4 rounded-xl border border-white/[0.05] bg-[#10100f] px-4 sm:px-5">
                <Search
                  size={19}
                  className="shrink-0 text-[#77736c]"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[#85817a]">
                    Search by name, matric number, department, hostel...
                  </p>
                </div>

                <div className="hidden items-center gap-2 text-xs text-[#5f5c55] sm:flex">
                  Open search
                  <ArrowRight size={14} />
                </div>

                <ChevronRight
                  size={18}
                  className="text-[#625f58] sm:hidden"
                />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CORE TOOLS */}
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:py-20">
          <div className="mb-10 max-w-2xl">
            <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#6c6861]">
              Find people
            </p>

            <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              Built around how people actually search.
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#77736c]">
              You don't always know someone's full name. PeopleFind lets you
              work with whatever useful information you have.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              href="/search"
              icon={<Search size={19} />}
              eyebrow="01"
              title="Search"
              description="Combine names, matric numbers, departments, levels, hostels, classes, locations, and other clues."
            />

            <FeatureCard
              href="/people"
              icon={<Users size={19} />}
              eyebrow="02"
              title="Directory"
              description="Browse available people records and open a full profile for the information you need."
            />

            <FeatureCard
              href="/scan"
              icon={<ScanLine size={19} />}
              eyebrow="03"
              title="Scan to Find"
              description="Use the scan experience to turn useful information into a people-finding search."
            />
          </div>
        </div>
      </section>

      {/* REQUESTS */}
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#6c6861]">
                Community requests
              </p>

              <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Can't find them from your own clues?
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-7 text-[#77736c]">
                Create a request with the information you know. Other
                PeopleFind users can contribute useful responses, while the
                request and its activity remain organized in one place.
              </p>

              <Link
                href="/requests"
                className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-[#cdbd96] transition hover:text-[#ebe8e1]"
              >
                Explore requests
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#141413] p-5">
              <div className="space-y-2">
                <MiniTool
                  icon={<MessageSquareText size={17} />}
                  title="Create a request"
                  text="Describe who you're trying to find."
                />

                <MiniTool
                  icon={<Activity size={17} />}
                  title="Track responses"
                  text="Keep useful responses attached to the request."
                />

                <MiniTool
                  icon={<ShieldCheck size={17} />}
                  title="React to responses"
                  text="Like or unlike responses to help surface useful information."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST / STRUCTURE */}
      <section>
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:py-20">
          <div className="grid gap-8 md:grid-cols-3">
            <InfoBlock
              title="Directory-first"
              text="PeopleFind is designed around structured directory information rather than a social feed."
            />

            <InfoBlock
              title="Useful details"
              text="Search can work with partial information instead of requiring you to know someone's complete name."
            />

            <InfoBlock
              title="Growing across schools"
              text="The platform is being structured to support multiple institutions rather than being tied to one school."
            />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-[#141413]">
              <Compass size={15} className="text-[#cdbd96]" />
            </div>

            <span className="text-sm font-medium text-[#a09c94]">
              PeopleFind
            </span>
          </div>

          <p className="text-xs text-[#5f5c55]">
            A people directory built around useful information.
          </p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  href,
  icon,
  eyebrow,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/[0.07] bg-[#141413] p-6 transition hover:border-white/[0.12] hover:bg-[#181817]"
    >
      <div className="mb-8 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-[#1a1a18] text-[#cdbd96]">
          {icon}
        </div>

        <span className="text-[10px] tracking-[0.16em] text-[#55524c]">
          {eyebrow}
        </span>
      </div>

      <h3 className="text-lg font-semibold text-[#ebe8e1]">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-[#77736c]">
        {description}
      </p>

      <div className="mt-6 flex items-center gap-1.5 text-xs font-medium text-[#8e897f] transition group-hover:text-[#cdbd96]">
        Open
        <ArrowRight size={14} />
      </div>
    </Link>
  );
}

function MiniTool({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-white/[0.05] bg-[#10100f] p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-[#171716] text-[#cdbd96]">
        {icon}
      </div>

      <div>
        <p className="text-sm font-medium text-[#d6d2ca]">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-[#6f6b64]">
          {text}
        </p>
      </div>
    </div>
  );
}

function InfoBlock({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="border-l border-[#cdbd96]/20 pl-5">
      <h3 className="text-sm font-semibold text-[#d8d4cc]">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-[#6f6b64]">
        {text}
      </p>
    </div>
  );
}