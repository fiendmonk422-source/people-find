import Link from "next/link";
import AuthButton from "./components/AuthButton";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#090909] text-[#E8E5DF]">
      {/* NAVBAR */}
      <nav className="border-b border-white/[0.07] bg-[#0B0B0B]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight"
          >
            PeopleFind
          </Link>

          <div className="flex items-center gap-6 text-sm text-[#A7A39B]">
            <Link href="/search" className="hover:text-white">
              🔎 Search
            </Link>

            <Link href="/people" className="hover:text-white">
              👥 People
            </Link>

            <Link href="/requests" className="hover:text-white">
              💬 Requests
            </Link>

            <AuthButton />
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <p className="mb-5 text-xs uppercase tracking-[0.25em] text-[#77736D]">
            👋 Welcome to PeopleFind
          </p>

          <h1 className="text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Find the people
            <br />
            you’re looking for.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-[#817D76]">
            🔎 Search for people using names, departments, faculties,
            hostels, matric numbers and other useful clues.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/search"
              className="rounded-xl bg-[#E8E5DF] px-6 py-3 text-sm font-semibold text-[#090909] transition hover:bg-white"
            >
              🔎 Start Searching
            </Link>

            <Link
              href="/requests"
              className="rounded-xl border border-white/[0.1] bg-[#171717] px-6 py-3 text-sm font-medium transition hover:bg-[#202020]"
            >
              💬 Ask the Community
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          <Feature
            icon="🔎"
            title="Search"
            text="Find people using different pieces of information instead of relying only on a name."
            href="/search"
          />

          <Feature
            icon="👥"
            title="People"
            text="Browse available profiles and view the information that has been made available."
            href="/people"
          />

          <Feature
            icon="💬"
            title="Requests"
            text="Can't find someone? Ask other people in the community for clues."
            href="/requests"
          />
        </div>
      </section>

      {/* PRIVACY */}
      <section className="border-t border-white/[0.07] bg-[#0B0B0B]">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.2em] text-[#625F59]">
              🛡️ Privacy
            </p>

            <h2 className="mt-3 text-2xl font-semibold">
              Find people without exposing everything.
            </h2>

            <p className="mt-4 text-sm leading-7 text-[#817D76]">
              PeopleFind is being designed around controlled information
              sharing. Users can interact using nicknames or anonymously
              where appropriate.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-[#625F59] sm:flex-row sm:items-center sm:justify-between">
          <span>PeopleFind</span>

          <span>
            🔐 Built with privacy in mind.
          </span>
        </div>
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  text,
  href,
}: {
  icon: string;
  title: string;
  text: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/[0.08] bg-[#111111] p-6 transition hover:border-white/[0.15] hover:bg-[#151515]"
    >
      <div className="text-2xl">{icon}</div>

      <h3 className="mt-5 text-lg font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-[#817D76]">
        {text}
      </p>

      <p className="mt-5 text-sm text-[#A7A39B] transition group-hover:text-white">
        Open →
      </p>
    </Link>
  );
}