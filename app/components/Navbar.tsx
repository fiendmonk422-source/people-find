"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Compass,
  LogIn,
  LogOut,
  Search,
  UserCircle,
  Users,
} from "lucide-react";
import { supabase } from "../../src/lib/supabase";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const nickname = user?.user_metadata?.nickname || "Anonymous";

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#090909]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 text-[#E8E5DF]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-[#151515]">
            <Compass size={19} className="text-[#A7A39B]" />
          </div>

          <span className="text-sm font-semibold tracking-wide">
            PeopleFind
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/search"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#85817A] transition hover:bg-[#151515] hover:text-[#E8E5DF]"
          >
            <Search size={16} />
            Search
          </Link>

          <Link
            href="/people"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#85817A] transition hover:bg-[#151515] hover:text-[#E8E5DF]"
          >
            <Users size={16} />
            People
          </Link>

          <Link
            href="/requests"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#85817A] transition hover:bg-[#151515] hover:text-[#E8E5DF]"
          >
            <Compass size={16} />
            Requests
          </Link>
        </nav>

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-[#A7A39B] transition hover:bg-[#151515] hover:text-[#E8E5DF]"
            >
              <UserCircle size={17} />
              <span className="hidden sm:inline">{nickname}</span>
            </Link>

            <button
              onClick={logout}
              title="Sign out"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.07] bg-[#111111] text-[#77736D] transition hover:bg-[#181818] hover:text-[#E8E5DF]"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link
            href="/auth"
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#171717] px-4 py-2.5 text-sm text-[#D5D1CA] transition hover:bg-[#202020] hover:text-white"
          >
            <LogIn size={16} />
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}