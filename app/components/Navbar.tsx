"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  Compass,
  LogIn,
  LogOut,
  Menu,
  ScanLine,
  Search,
  UserCircle,
  Users,
  X,
} from "lucide-react";

import { supabase } from "../../src/lib/supabase";

type User = {
  id: string;
  email?: string;
  user_metadata?: {
    nickname?: string;
  };
};

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user as User | null);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser((session?.user as User | null) ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setMobileOpen(false);
    window.location.href = "/";
  }

  const nickname = user?.user_metadata?.nickname || "Account";

  const closeMobile = () => {
    setMobileOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#0c0c0b]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-6">
          {/* BRAND */}
          <Link
            href="/"
            onClick={closeMobile}
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.09] bg-[#171716]">
              <Compass
                size={18}
                strokeWidth={1.8}
                className="text-[#cdbd96]"
              />
            </div>

            <div className="leading-none">
              <div className="text-[15px] font-semibold tracking-[-0.01em] text-[#ebe8e1]">
                PeopleFind
              </div>

              <div className="mt-1 hidden text-[9px] uppercase tracking-[0.2em] text-[#625f58] sm:block">
                People directory
              </div>
            </div>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden items-center gap-1 lg:flex">
            <NavLink href="/search" icon={<Search size={15} />}>
              Search
            </NavLink>

            <NavLink href="/people" icon={<Users size={15} />}>
              People
            </NavLink>

            <NavLink href="/scan" icon={<ScanLine size={15} />}>
              Scan to Find
            </NavLink>

            <NavLink href="/requests" icon={<Compass size={15} />}>
              Requests
            </NavLink>

            {user && (
              <NavLink href="/activity" icon={<Activity size={15} />}>
                Activity
              </NavLink>
            )}
          </nav>

          {/* DESKTOP ACCOUNT */}
          <div className="hidden items-center gap-2 lg:flex">
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-[#141413] px-3 py-2 text-sm text-[#b8b4ac] transition hover:border-white/[0.12] hover:bg-[#191918] hover:text-[#ebe8e1]"
                >
                  <UserCircle size={16} />

                  <span className="max-w-[120px] truncate">
                    {nickname}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={logout}
                  title="Sign out"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-[#141413] text-[#77736d] transition hover:border-white/[0.12] hover:bg-[#191918] hover:text-[#ebe8e1]"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 rounded-xl bg-[#ebe8e1] px-4 py-2.5 text-sm font-semibold text-[#0c0c0b] transition hover:bg-white"
              >
                <LogIn size={15} />
                Sign in
              </Link>
            )}
          </div>

          {/* MOBILE MENU BUTTON */}
          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-[#141413] text-[#a7a39b] transition hover:bg-[#191918] hover:text-[#ebe8e1] lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>

        {/* MOBILE NAV */}
        {mobileOpen && (
          <div className="border-t border-white/[0.06] bg-[#0f0f0e] lg:hidden">
            <nav className="mx-auto max-w-7xl px-5 py-4 sm:px-6">
              <div className="grid gap-1">
                <MobileNavLink
                  href="/search"
                  icon={<Search size={17} />}
                  onClick={closeMobile}
                >
                  Search
                </MobileNavLink>

                <MobileNavLink
                  href="/people"
                  icon={<Users size={17} />}
                  onClick={closeMobile}
                >
                  People
                </MobileNavLink>

                <MobileNavLink
                  href="/scan"
                  icon={<ScanLine size={17} />}
                  onClick={closeMobile}
                >
                  Scan to Find
                </MobileNavLink>

                <MobileNavLink
                  href="/requests"
                  icon={<Compass size={17} />}
                  onClick={closeMobile}
                >
                  Requests
                </MobileNavLink>

                {user && (
                  <MobileNavLink
                    href="/activity"
                    icon={<Activity size={17} />}
                    onClick={closeMobile}
                  >
                    Activity
                  </MobileNavLink>
                )}
              </div>

              <div className="my-4 h-px bg-white/[0.06]" />

              {user ? (
                <div className="grid gap-1">
                  <MobileNavLink
                    href="/profile"
                    icon={<UserCircle size={17} />}
                    onClick={closeMobile}
                  >
                    {nickname}
                  </MobileNavLink>

                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#8d8982] transition hover:bg-[#181817] hover:text-[#ebe8e1]"
                  >
                    <LogOut size={17} />
                    Sign out
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth"
                  onClick={closeMobile}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#ebe8e1] px-4 py-3 text-sm font-semibold text-[#0c0c0b] transition hover:bg-white"
                >
                  <LogIn size={16} />
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] text-[#85817a] transition hover:bg-[#171716] hover:text-[#ebe8e1]"
    >
      {icon}
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#9a968e] transition hover:bg-[#181817] hover:text-[#ebe8e1]"
    >
      {icon}
      {children}
    </Link>
  );
}