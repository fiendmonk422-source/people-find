"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  LogOut,
  Mail,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { supabase } from "../../src/lib/supabase";

type AccountUser = {
  id: string;
  email?: string;
  created_at?: string;
  user_metadata?: {
    nickname?: string;
  };
};

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<AccountUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function loadAccount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth");
        return;
      }

      setUser(user as AccountUser);
      setLoading(false);
    }

    loadAccount();
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);

    await supabase.auth.signOut();

    router.replace("/");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0c0c0b] text-[#ebe8e1]">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#cdbd96]/20 border-t-[#cdbd96]" />
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const displayName =
    user.user_metadata?.nickname?.trim() || "PeopleFind account";

  const createdDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Unavailable";

  return (
    <main className="min-h-screen bg-[#0c0c0b] text-[#ebe8e1]">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 lg:py-14">
        {/* Back */}
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-[#77736c] transition hover:text-[#ebe8e1]"
        >
          <ArrowLeft size={16} />
          Back to PeopleFind
        </Link>

        {/* Header */}
        <div className="mb-10">
          <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#6c6861]">
            Account
          </p>

          <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Your PeopleFind account
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#85817a]">
            Manage your account information and access the directory tools
            available to you.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Main account card */}
          <section className="rounded-2xl border border-white/[0.07] bg-[#141413] p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1a1a18]">
                <UserCircle
                  size={24}
                  strokeWidth={1.6}
                  className="text-[#cdbd96]"
                />
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-[#ebe8e1]">
                  {displayName}
                </h2>

                <p className="mt-1 text-sm text-[#77736c]">
                  PeopleFind account
                </p>
              </div>
            </div>

            <div className="my-7 h-px bg-white/[0.06]" />

            <div className="space-y-5">
              <AccountRow
                icon={<Mail size={17} />}
                label="Email"
                value={user.email || "Not available"}
              />

              <AccountRow
                icon={<UserCircle size={17} />}
                label="Display name"
                value={displayName}
              />

              <AccountRow
                icon={<ShieldCheck size={17} />}
                label="Account status"
                value="Active"
              />

              <AccountRow
                icon={<ShieldCheck size={17} />}
                label="Member since"
                value={createdDate}
              />
            </div>
          </section>

          {/* Side information */}
          <aside className="space-y-5">
            <section className="rounded-2xl border border-white/[0.07] bg-[#141413] p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1a1a18]">
                <ShieldCheck
                  size={18}
                  className="text-[#cdbd96]"
                />
              </div>

              <h2 className="text-sm font-semibold text-[#ebe8e1]">
                Directory access
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#77736c]">
                Your account gives you access to the PeopleFind directory and
                the features enabled for your account.
              </p>
            </section>

            <section className="rounded-2xl border border-white/[0.07] bg-[#141413] p-6">
              <h2 className="text-sm font-semibold text-[#ebe8e1]">
                Directory records
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#77736c]">
                Student directory information is managed separately from your
                PeopleFind account. Directory records are maintained by
                authorized administrators.
              </p>
            </section>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-[#141413] px-4 py-3 text-sm font-medium text-[#9a958d] transition hover:border-[#d98282]/20 hover:bg-[#191817] hover:text-[#dca0a0] disabled:opacity-50"
            >
              <LogOut size={16} />

              {loggingOut ? "Signing out..." : "Sign out"}
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}

function AccountRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-[#69655e]">{icon}</div>

      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[#625f58]">
          {label}
        </p>

        <p className="mt-1 break-words text-sm text-[#c6c2ba]">
          {value}
        </p>
      </div>
    </div>
  );
}