import Link from "next/link";
import { BellRing, CalendarDays, ExternalLink, Pin } from "lucide-react";
import { createSupabaseServerClient } from "../../src/lib/supabase-server";

export const dynamic = "force-dynamic";

type Announcement = {
  id: string; kind: "notice" | "event"; title: string; body: string;
  event_date: string | null; event_time: string | null; venue: string | null;
  image_url: string | null; action_url: string | null; is_pinned: boolean;
  published_at: string | null;
};

export default async function AnnouncementsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("site_announcements")
    .select("id,kind,title,body,event_date,event_time,venue,image_url,action_url,is_pinned,published_at")
    .eq("status", "published")
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false });

  const announcements = (data || []) as Announcement[];
  const notices = announcements.filter((item) => item.kind === "notice");
  const events = announcements.filter((item) => item.kind === "event");

  return (
    <main className="min-h-screen bg-[#0c0c0b] px-4 pb-16 pt-10 text-[#ebe8e1] sm:px-6 lg:pt-14">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#cdbd96]">PeopleFind / Updates</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Events & notices</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#918d84]">Important updates, announcements and upcoming events published by PeopleFind administrators.</p>
        {announcements.length === 0 ? <div className="mt-10 rounded-2xl border border-dashed border-white/10 p-8 text-sm text-[#77736c]">There are no active events or notices right now. Check back later.</div> : (
          <div className="mt-9 grid gap-10 lg:grid-cols-2">
            {[{ title: "Notices", kind: "notice" as const, rows: notices }, { title: "Upcoming events", kind: "event" as const, rows: events }].map((group) => (
              <section key={group.kind}>
                <div className="mb-4 flex items-center gap-2"><span className="text-[#cdbd96]">{group.kind === "notice" ? <BellRing size={18} /> : <CalendarDays size={18} />}</span><h2 className="text-xl font-semibold">{group.title}</h2><span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-[#918d84]">{group.rows.length}</span></div>
                {group.rows.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-[#77736c]">No {group.kind === "notice" ? "notices" : "upcoming events"} at the moment.</p> : <div className="space-y-4">{group.rows.map((item) => (
                  <article key={item.id} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141413]">
                    {item.image_url && <img src={item.image_url} alt="" className="max-h-64 w-full object-cover" />}
                    <div className="p-5 sm:p-6">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#cdbd96]">{item.is_pinned && <Pin size={13} />}<span>{item.kind === "event" ? "Event" : "Notice"}</span>{item.published_at && <span className="text-[#625f58]">· {new Date(item.published_at).toLocaleDateString()}</span>}</div>
                      <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#a6a197]">{item.body}</p>
                      {item.kind === "event" && <div className="mt-4 space-y-1 text-sm text-[#c9c3b8]">{item.event_date && <p>{new Date(item.event_date + "T12:00:00").toLocaleDateString(undefined, { dateStyle: "full" })}{item.event_time ? " · " + item.event_time : ""}</p>}{item.venue && <p className="text-[#918d84]">{item.venue}</p>}</div>}
                      {item.action_url && <a href={item.action_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#cdbd96] hover:text-white">More information <ExternalLink size={14} /></a>}
                    </div>
                  </article>
                ))}</div>}
              </section>
            ))}
          </div>
        )}
        <div className="mt-12 border-t border-white/[0.07] pt-6"><Link href="/" className="text-sm text-[#918d84] hover:text-[#ebe8e1]">← Back to PeopleFind</Link></div>
      </div>
    </main>
  );
}
