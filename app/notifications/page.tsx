"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BellRing, Check, CheckCheck, Loader2, MessageCircle, CalendarDays, ThumbsUp, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../src/lib/supabase";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  notification_type: "request_reply" | "request_status" | "response_reaction" | "announcement";
  created_at: string;
  read_at: string | null;
};

const iconFor = (type: NotificationItem["notification_type"]) => {
  if (type === "request_reply") return <MessageCircle size={17} />;
  if (type === "request_status") return <Check size={17} />;
  if (type === "response_reaction") return <ThumbsUp size={17} />;
  return <CalendarDays size={17} />;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setError("Sign in to view your notifications.");
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error: queryError } = await supabase.from("notifications")
      .select("id,title,body,href,notification_type,created_at,read_at")
      .eq("recipient_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (queryError) setError("Notifications are unavailable. Confirm the student notifications migration has been applied.");
    else setItems((data ?? []) as NotificationItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function markAllRead() {
    const unreadIds = items.filter((item) => !item.read_at).map((item) => item.id);
    if (!unreadIds.length) return;
    setSaving(true);
    const { error: updateError } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
    if (updateError) setError(updateError.message);
    else setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
    setSaving(false);
  }

  async function openNotification(item: NotificationItem) {
    if (!item.read_at) {
      const now = new Date().toISOString();
      await supabase.from("notifications").update({ read_at: now }).eq("id", item.id);
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, read_at: now } : row));
    }
    router.push(item.href || "/dashboard");
  }

  const unread = items.filter((item) => !item.read_at).length;

  return <main className="min-h-screen bg-[#0c0c0b] px-4 pb-16 pt-8 text-[#ebe8e1] sm:px-6 lg:pt-12"><div className="mx-auto max-w-4xl">
    <header className="flex flex-col gap-4 border-b border-white/[0.07] pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#cdbd96]">Your updates</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Notifications</h1><p className="mt-3 text-sm leading-6 text-[#918d84]">Replies to your requests, status changes and reactions to your contributions.</p></div><button type="button" onClick={markAllRead} disabled={!unread || saving} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#141413] px-4 py-2.5 text-sm font-medium text-[#d8d4cc] transition hover:bg-[#1a1a18] disabled:cursor-not-allowed disabled:opacity-40">{saving ? <Loader2 size={15} className="animate-spin"/> : <CheckCheck size={15}/>} Mark all read</button></header>
    <div className="mt-5 flex items-center justify-between text-xs text-[#77736c]"><span>{unread} unread</span><button type="button" onClick={() => void load()} className="inline-flex items-center gap-1.5 hover:text-[#cdbd96]"><RefreshCw size={13}/> Refresh</button></div>
    {error && <div role="alert" className="mt-5 rounded-xl border border-[#d98282]/20 bg-[#d98282]/[0.06] p-4 text-sm text-[#e0a29a]">{error}{error.includes("Sign in") && <Link href="/auth" className="ml-2 underline">Sign in</Link>}</div>}
    {loading ? <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-[#918d84]"><Loader2 size={17} className="animate-spin"/>Loading notifications…</div> : items.length ? <div className="mt-5 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141413]">{items.map((item) => <button type="button" key={item.id} onClick={() => void openNotification(item)} className={"flex w-full gap-4 px-4 py-5 text-left transition hover:bg-white/[0.025] sm:px-6 " + (!item.read_at ? "bg-[#cdbd96]/[0.035]" : "")}><span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-[#1a1a18] text-[#cdbd96]">{iconFor(item.notification_type)}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-sm font-semibold">{item.title}{!item.read_at && <span className="h-1.5 w-1.5 rounded-full bg-[#cdbd96]"/>}</span><span className="mt-1.5 block text-sm leading-6 text-[#a6a197]">{item.body}</span><span className="mt-2 block text-xs text-[#77736c]">{new Date(item.created_at).toLocaleString()}</span></span><span className="mt-1 text-[#77736c]">{item.read_at ? <Check size={15}/> : <BellRing size={15}/>}</span></button>)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-10 text-center"><BellRing size={26} className="mx-auto text-[#cdbd96]"/><h2 className="mt-4 text-lg font-semibold">You're all caught up</h2><p className="mt-2 text-sm text-[#918d84]">When another student replies to your request or an important update happens, it will appear here.</p><Link href="/requests" className="mt-5 inline-flex items-center gap-2 text-sm text-[#cdbd96]">Explore requests <MessageCircle size={15}/></Link></div>}
  </div></main>;
}
