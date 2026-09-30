"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AtSign,
  LogOut,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { supabase } from "../../src/lib/supabase";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
      setLoading(false);
    }

    loadUser();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#090909] text-[#E8E5DF]">
        <Navbar />
        <div className="mx-auto max-w-3xl px-6 py-12">
          <p className="text-sm text-[#77736D]">Loading profile...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#090909] text-[#E8E5DF]">
        <Navbar />

        <div className="mx-auto max-w-3xl px-6 py-12">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2 text-sm text-[#8D8982] hover:text-[#E8E5DF]"
          >
            <ArrowLeft size={16} />
            Back home
          </Link>

          <div className="rounded-2xl border border-white/[0.08] bg-[#111111] p-8">
            <UserCircle size={32} className="mb-4 text-[#8D8982]" />

            <h1 className="text-2xl font-semibold">
              You are not signed in
            </h1>

            <p className="mt-2 text-sm text-[#77736D]">
              Sign in to view your PeopleFind account.
            </p>

            <Link
              href="/auth"
              className="mt-6 inline-flex rounded-xl bg-[#E8E5DF] px-5 py-3 text-sm font-medium text-[#090909] hover:bg-white"
            >
              Sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const nickname = user.user_metadata?.nickname || "Anonymous";

  return (
    <main className="min-h-screen bg-[#090909] text-[#E8E5DF]">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-[#625F59]">
            Account
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Your Profile
          </h1>

          <p className="mt-2 text-sm text-[#77736D]">
            Manage your PeopleFind account information.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111111]">
          <div className="border-b border-white/[0.07] p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-[#171717]">
                <UserCircle size={30} className="text-[#A7A39B]" />
              </div>

              <div>
                <h2 className="text-xl font-medium">{nickname}</h2>
                <p className="mt-1 text-sm text-[#77736D]">
                  PeopleFind account
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/[0.06]">
            <div className="flex items-center gap-4 p-6">
              <AtSign size={19} className="text-[#77736D]" />

              <div>
                <p className="text-xs uppercase tracking-wider text-[#625F59]">
                  Email
                </p>

                <p className="mt-1 text-sm text-[#D5D1CA]">
                  {user.email || "Not available"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-6">
              <ShieldCheck size={19} className="text-[#77736D]" />

              <div>
                <p className="text-xs uppercase tracking-wider text-[#625F59]">
                  Account status
                </p>

                <p className="mt-1 text-sm text-[#D5D1CA]">
                  Authenticated
                </p>
              </div>
            </div>

            <div className="p-6">
              <p className="text-xs uppercase tracking-wider text-[#625F59]">
                User ID
              </p>

              <p className="mt-2 break-all font-mono text-xs text-[#77736D]">
                {user.id}
              </p>
            </div>
          </div>

          <div className="border-t border-white/[0.07] p-6">
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#171717] px-4 py-3 text-sm text-[#A7A39B] transition hover:bg-[#202020] hover:text-[#E8E5DF]"
            >
              <LogOut size={17} />
              Sign out
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}