"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  Activity,
  BellRing,
  Check,
  ShieldCheck,
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

type Notice = { id: string; title: string; body: string; href: string | null; created_at: string; read_at: string | null };

type User = {
  id: string;
  email?: string;
  user_metadata?: {
    nickname?: string;
  };
};

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [noticeLoading, setNoticeLoading] = useState(false);
  const router = useRouter();

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

  useEffect(() => {
    let active = true;
    if (!user?.id) {
      setNotices([]);
      return () => { active = false; };
    }
    setNoticeLoading(true);
    void supabase.from("notifications")
      .select("id,title,body,href,created_at,read_at")
      .eq("recipient_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data, error }) => {
        if (active) setNotices(error ? [] : (data ?? []) as Notice[]);
      })
      .finally(() => { if (active) setNoticeLoading(false); });
    return () => { active = false; };
  }, [user?.id]);

  async function openNotice(item: Notice) {
    if (!item.read_at) {
      const now = new Date().toISOString();
      const { error } = await supabase.from("notifications").update({ read_at: now }).eq("id", item.id);
      if (!error) setNotices((current) => current.map((row) => row.id === item.id ? { ...row, read_at: now } : row));
    }
    setNoticeOpen(false);
    setMobileOpen(false);
    router.push(item.href || "/dashboard");
  }

  async function markNoticesRead() {
    const ids = notices.filter((item) => !item.read_at).map((item) => item.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from("notifications").update({ read_at: now }).in("id", ids);
    if (!error) setNotices((current) => current.map((row) => ({ ...row, read_at: row.read_at || now })));
  }

  const unreadNotices = notices.filter((item) => !item.read_at).length;

  useEffect(() => {
    let active = true;
    const userId = user?.id;
    if (!userId) {
      return () => {
        active = false;
      };
    }

    void supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle()
      .then(
        ({ data, error }) => {
          if (active) {
            setAdminUserId(
              !error && (data?.role === "admin" || data?.role === "super_admin")
                ? userId
                : null
            );
          }
        },
        () => {
          if (active) setAdminUserId(null);
        }
      );

    return () => {
      active = false;
    };
  }, [user?.id]);

  async function logout() {
    await supabase.auth.signOut();
    setMobileOpen(false);
    window.location.href = "/";
  }

  const isAdmin = Boolean(user?.id && adminUserId === user.id);
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
            {user && <NavLink href="/dashboard" icon={<Compass size={15} />}>Home</NavLink>}
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
                My Activity
              </NavLink>
            )}

            <NavLink href="/announcements" icon={<BellRing size={15} />}>
              Updates
            </NavLink>

            {isAdmin && (
              <NavLink href="/admin" icon={<ShieldCheck size={15} />}>
                Admin
              </NavLink>
            )}
          </nav>

          {/* DESKTOP ACCOUNT */}
          <div className="hidden items-center gap-2 lg:flex">
            {user && (
              <div className="relative">
                <button type="button" onClick={() => setNoticeOpen((open) => !open)} aria-label={`Notifications, ${unreadNotices} unread`} aria-expanded={noticeOpen} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-[#141413] text-[#cdbd96] transition hover:border-white/[0.12] hover:bg-[#191918]">
                  <BellRing size={17} />
                  {unreadNotices > 0 && <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#0c0c0b] bg-[#cdbd96] px-1 text-[10px] font-bold text-[#0c0c0b]">{unreadNotices > 9 ? "9+" : unreadNotices}</span>}
                </button>
                {noticeOpen && <div className="absolute right-0 top-12 z-[70] w-[min(90vw,360px)] overflow-hidden rounded-2xl border border-white/10 bg-[#141413] shadow-2xl shadow-black/40">
                  <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3"><div><p className="text-sm font-semibold text-[#ebe8e1]">Notifications</p><p className="mt-0.5 text-xs text-[#77736c]">{unreadNotices} unread</p></div><button type="button" onClick={() => void markNoticesRead()} disabled={!unreadNotices} className="text-xs text-[#cdbd96] hover:text-[#ebe8e1] disabled:opacity-40">Mark all read</button></div>
                  {noticeLoading ? <p className="px-4 py-7 text-center text-sm text-[#918d84]">Loading updates…</p> : notices.length ? <div className="max-h-[360px] overflow-y-auto">{notices.map((item) => <button type="button" key={item.id} onClick={() => void openNotice(item)} className={"block w-full border-b border-white/[0.05] px-4 py-3 text-left transition hover:bg-white/[0.03] " + (!item.read_at ? "bg-[#cdbd96]/[0.035]" : "")}><span className="flex items-start gap-2"><span className={"mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full " + (!item.read_at ? "bg-[#cdbd96]" : "bg-transparent")}}></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[#ebe8e1]">{item.title}</span><span className="mt-1 block line-clamp-2 text-xs leading-5 text-[#918d84]">{item.body}</span><span className="mt-1.5 block text-[10px] text-[#77736c]">{new Date(item.created_at).toLocaleString()}</span></span>{item.read_at && <Check size={13} className="mt-1 text-[#77736c]"/>}</span></button>)}</div> : <p className="px-4 py-7 text-center text-sm text-[#918d84]">You're all caught up. Important replies and updates will appear here.</p>}
                  <Link href="/dashboard#notifications" onClick={() => setNoticeOpen(false)} className="block border-t border-white/[0.07] px-4 py-3 text-center text-xs font-medium text-[#cdbd96] hover:bg-white/[0.03]">View on student home</Link>
                </div>}
              </div>
            )}
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
          {user && <button type="button" onClick={() => setNoticeOpen((open) => !open)} aria-label={`Notifications, ${unreadNotices} unread`} className="relative mr-2 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-[#141413] text-[#cdbd96] transition hover:bg-[#191918] lg:hidden"><BellRing size={17}/>{unreadNotices > 0 && <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#0c0c0b] bg-[#cdbd96] px-1 text-[10px] font-bold text-[#0c0c0b]">{unreadNotices > 9 ? "9+" : unreadNotices}</span>}</button>}
          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-[#141413] text-[#a7a39b] transition hover:bg-[#191918] hover:text-[#ebe8e1] lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>

        {user && noticeOpen && <div className="absolute right-4 top-[64px] z-[70] w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-white/10 bg-[#141413] shadow-2xl shadow-black/40 lg:hidden">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3"><div><p className="text-sm font-semibold text-[#ebe8e1]">Notifications</p><p className="mt-0.5 text-xs text-[#77736c]">{unreadNotices} unread</p></div><button type="button" onClick={() => void markNoticesRead()} disabled={!unreadNotices} className="text-xs text-[#cdbd96] disabled:opacity-40">Mark all read</button></div>
          {noticeLoading ? <p className="px-4 py-7 text-center text-sm text-[#918d84]">Loading updates…</p> : notices.length ? <div className="max-h-[55vh] overflow-y-auto">{notices.map((item) => <button type="button" key={item.id} onClick={() => void openNotice(item)} className={"block w-full border-b border-white/[0.05] px-4 py-3 text-left hover:bg-white/[0.03] " + (!item.read_at ? "bg-[#cdbd96]/[0.035]" : "")}><span className="flex items-start gap-2"><span className={"mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full " + (!item.read_at ? "bg-[#cdbd96]" : "bg-transparent")}></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-[#ebe8e1]">{item.title}</span><span className="mt-1 block line-clamp-2 text-xs leading-5 text-[#918d84]">{item.body}</span><span className="mt-1.5 block text-[10px] text-[#77736c]">{new Date(item.created_at).toLocaleString()}</span></span></span></button>)}</div> : <p className="px-4 py-7 text-center text-sm text-[#918d84]">You're all caught up. Important replies and updates will appear here.</p>}
          <Link href="/dashboard#notifications" onClick={() => setNoticeOpen(false)} className="block border-t border-white/[0.07] px-4 py-3 text-center text-xs font-medium text-[#cdbd96]">View on student home</Link>
        </div>}
        {/* MOBILE NAV */}
        {mobileOpen && (
          <div className="border-t border-white/[0.06] bg-[#0f0f0e] lg:hidden">
            <nav className="mx-auto max-w-7xl px-5 py-4 sm:px-6">
              <div className="grid gap-1">
                {user && <MobileNavLink href="/dashboard" icon={<Compass size={17} />} onClick={closeMobile}>Student home</MobileNavLink>}
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
                    My Activity
                  </MobileNavLink>
                )}

                <MobileNavLink
                  href="/announcements"
                  icon={<BellRing size={17} />}
                  onClick={closeMobile}
                >
                  Events & notices
                </MobileNavLink>

                {isAdmin && (
                  <MobileNavLink
                    href="/admin"
                    icon={<ShieldCheck size={17} />}
                    onClick={closeMobile}
                  >
                    Admin
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