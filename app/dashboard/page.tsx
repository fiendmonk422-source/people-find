import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, ArrowRight, BellRing, CalendarDays, ClipboardList, MessageCircle, Plus, Search, Users } from "lucide-react";
import { createSupabaseServerClient } from "../../src/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/dashboard");

  const [requests, replies, notifications, announcements] = await Promise.all([
    supabase.from("requests").select("id,target_name,status,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("notifications").select("id,title,body,href,created_at,read_at").eq("recipient_user_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_user_id", user.id).is("read_at", null),
    supabase.from("site_announcements").select("id,title,kind,event_date").eq("status", "published").or("expires_at.is.null,expires_at.gt." + new Date().toISOString()).order("published_at", { ascending: false }).limit(3),
  ]);
  const myRequests = requests.data ?? [];
  const recentNotifications = replies.data ?? [];
  const recentAnnouncements = announcements.data ?? [];
  const unread = notifications.count ?? 0;
  const nickname = user.user_metadata?.nickname || user.user_metadata?.name || user.email?.split("@")[0] || "student";

  return <main className="min-h-screen bg-[#0c0c0b] px-4 pb-16 pt-8 text-[#ebe8e1] sm:px-6 lg:pt-12"><div className="mx-auto max-w-7xl">
    <header className="flex flex-col gap-5 border-b border-white/[0.07] pb-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#cdbd96]">Your PeopleFind space</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Welcome back, {nickname}</h1><p className="mt-3 text-sm leading-6 text-[#918d84]">Your requests, replies and campus updates in one place.</p></div><Link href="/requests" className="pf-button-primary"><Plus size={16}/> New request</Link></header>
    <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <DashboardLink href="/requests" icon={<ClipboardList size={19}/>} title="My requests" value={String(myRequests.length)} description="Recent requests you created"/>
      <DashboardLink href="/notifications" icon={<BellRing size={19}/>} title="Notifications" value={String(unread)} description="Unread updates"/>
      <DashboardLink href="/activity" icon={<Activity size={19}/>} title="My activity" value="View" description="Your contributions and replies"/>
      <DashboardLink href="/announcements" icon={<CalendarDays size={19}/>} title="Campus updates" value={String(recentAnnouncements.length)} description="Events and important notices"/>
    </section>
    <section className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-2xl border border-white/[0.08] bg-[#141413] p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Your recent requests</h2><p className="mt-1 text-sm text-[#77736c]">Track progress and replies.</p></div><Link href="/requests" className="inline-flex items-center gap-1 text-sm text-[#cdbd96]">All requests <ArrowRight size={14}/></Link></div>
        {myRequests.length ? <div className="mt-5 divide-y divide-white/[0.06]">{myRequests.map((item) => <Link key={item.id} href="/requests" className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-medium">{item.target_name || "Person not named"}</p><p className="mt-1 text-xs text-[#77736c]">{new Date(item.created_at).toLocaleDateString()}</p></div><span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-xs text-[#cdbd96]">{item.status || "Open"}</span></Link>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-white/10 p-6 text-sm text-[#918d84]">You haven't created a request yet. Start one and let the community help.<Link href="/requests" className="mt-3 flex items-center gap-2 text-[#cdbd96]">Create a request <ArrowRight size={14}/></Link></div>}
      </div>
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/[0.08] bg-[#141413] p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Recent notifications</h2><Link href="/notifications" className="text-xs text-[#cdbd96]">View all</Link></div>{recentNotifications.length ? <div className="mt-3 divide-y divide-white/[0.06]">{recentNotifications.map((item) => <Link key={item.id} href={item.href || "/requests"} className="block py-3 first:pt-1"><p className="text-sm font-medium">{item.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#918d84]">{item.body}</p></Link>)}</div> : <p className="mt-3 text-sm text-[#77736c]">No notifications yet. Replies to your requests will appear here.</p>}</div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#141413] p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Events & notices</h2><Link href="/announcements" className="text-xs text-[#cdbd96]">Browse</Link></div>{recentAnnouncements.length ? <div className="mt-3 space-y-3">{recentAnnouncements.map((item) => <Link key={item.id} href="/announcements" className="flex gap-3 rounded-xl border border-white/[0.05] bg-[#10100f] p-3"><span className="mt-0.5 text-[#cdbd96]">{item.kind === "event" ? <CalendarDays size={16}/> : <BellRing size={16}/>}</span><span className="min-w-0"><span className="block text-sm font-medium">{item.title}</span>{item.event_date && <span className="mt-1 block text-xs text-[#77736c]">{new Date(item.event_date + "T12:00:00").toLocaleDateString()}</span>}</span></Link>)}</div> : <p className="mt-3 text-sm text-[#77736c]">No active announcements right now.</p>}</div>
      </div>
    </section>
    <section className="mt-7 grid gap-3 sm:grid-cols-3"><QuickLink href="/search" icon={<Search size={17}/>} title="Search people" text="Find someone from details you know"/><QuickLink href="/people" icon={<Users size={17}/>} title="Browse directory" text="Explore directory records"/><QuickLink href="/requests" icon={<MessageCircle size={17}/>} title="Help someone else" text="Share a useful response"/></section>
  </div></main>;
}

function DashboardLink({href,icon,title,value,description}:{href:string;icon:React.ReactNode;title:string;value:string;description:string}) {
 return <Link href={href} className="rounded-2xl border border-white/[0.08] bg-[#141413] p-5 transition hover:border-white/[0.14] hover:bg-[#181817]"><div className="flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-[#1a1a18] text-[#cdbd96]">{icon}</span><span className="text-lg font-semibold text-[#e5d9b9]">{value}</span></div><h2 className="mt-4 text-sm font-semibold">{title}</h2><p className="mt-1 text-xs text-[#77736c]">{description}</p></Link>;
}
function QuickLink({href,icon,title,text}:{href:string;icon:React.ReactNode;title:string;text:string}) {
 return <Link href={href} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#141413] p-4 transition hover:bg-[#181817]"><span className="text-[#cdbd96]">{icon}</span><span><span className="block text-sm font-medium">{title}</span><span className="mt-1 block text-xs text-[#77736c]">{text}</span></span><ArrowRight size={14} className="ml-auto shrink-0 text-[#77736c]"/></Link>;
}
