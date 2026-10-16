"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, BellRing, CheckCircle2, Clock3, Loader2, MessageCircle, ThumbsUp } from "lucide-react";
import { supabase } from "../../src/lib/supabase";

type RequestItem = {
  id: string;
  target_name: string | null;
  status: string | null;
  created_at: string;
};
type ResponseItem = {
  id: string;
  request_id: string;
  user_id: string | null;
  response: string | null;
  created_at: string;
};
type FeedbackItem = {
  id: string;
  response_id: string;
  vote: "up" | "down" | null;
  created_at: string;
};
type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  created_at: string;
  icon: "request" | "reply" | "response" | "reaction";
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export default function MyActivityPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [myResponses, setMyResponses] = useState<ResponseItem[]>([]);
  const [replies, setReplies] = useState<ResponseItem[]>([]);
  const [reactions, setReactions] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadActivity() {
      setLoading(true);
      setError("");
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) {
          if (active) setUserId(null);
          return;
        }
        if (active) setUserId(user.id);

        const [requestResult, responseResult, reactionResult] = await Promise.all([
          supabase.from("requests")
            .select("id,target_name,status,created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase.from("request_responses")
            .select("id,request_id,user_id,response,created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase.from("response_feedback")
            .select("id,response_id,vote,created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);
        if (requestResult.error) throw requestResult.error;
        if (responseResult.error) throw responseResult.error;
        if (reactionResult.error) throw reactionResult.error;

        const ownRequests = (requestResult.data ?? []) as RequestItem[];
        let received: ResponseItem[] = [];
        if (ownRequests.length) {
          const replyResult = await supabase.from("request_responses")
            .select("id,request_id,user_id,response,created_at")
            .in("request_id", ownRequests.map((item) => item.id))
            .order("created_at", { ascending: false })
            .limit(30);
          if (replyResult.error) throw replyResult.error;
          received = ((replyResult.data ?? []) as ResponseItem[]).filter((item) => item.user_id !== user.id);
        }

        if (active) {
          setRequests(ownRequests);
          setMyResponses((responseResult.data ?? []) as ResponseItem[]);
          setReactions((reactionResult.data ?? []) as FeedbackItem[]);
          setReplies(received);
        }
      } catch (cause) {
        console.error("My Activity load failed:", cause);
        if (active) setError("We couldn't load your activity. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadActivity();
    return () => { active = false; };
  }, []);

  const replyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const reply of replies) counts.set(reply.request_id, (counts.get(reply.request_id) ?? 0) + 1);
    return counts;
  }, [replies]);

  const timeline = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [
      ...requests.map((item) => ({
        id: "request-" + item.id,
        title: "Request posted",
        detail: item.target_name ? "Looking for " + item.target_name : "Community request",
        created_at: item.created_at,
        icon: "request" as const,
      })),
      ...replies.map((item) => ({
        id: "reply-" + item.id,
        title: "New reply received",
        detail: "Someone responded to your request",
        created_at: item.created_at,
        icon: "reply" as const,
      })),
      ...myResponses.map((item) => ({
        id: "response-" + item.id,
        title: "Response sent",
        detail: "You helped with a community request",
        created_at: item.created_at,
        icon: "response" as const,
      })),
      ...reactions.map((item) => ({
        id: "reaction-" + item.id,
        title: item.vote === "down" ? "Response marked not helpful" : "Response liked",
        detail: "Your reaction was saved",
        created_at: item.created_at,
        icon: "reaction" as const,
      })),
    ];
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);
  }, [requests, replies, myResponses, reactions]);

  if (loading) {
    return <main className="min-h-screen bg-[#0c0c0b] px-5 py-20 text-[#ebe8e1]"><div className="mx-auto flex max-w-5xl items-center justify-center gap-3 text-sm text-[#918d84]"><Loader2 className="animate-spin" size={18} />Loading your activity…</div></main>;
  }

  if (!userId) {
    return <main className="min-h-screen bg-[#0c0c0b] px-5 py-16 text-[#ebe8e1]"><section className="mx-auto max-w-lg rounded-2xl border border-white/[0.08] bg-[#141413] p-8 text-center"><Activity className="mx-auto text-[#cdbd96]" size={28} /><h1 className="mt-4 text-2xl font-semibold">My Activity</h1><p className="mt-2 text-sm leading-6 text-[#918d84]">Sign in to see your requests and replies.</p><Link href="/auth" className="pf-button-primary mt-6">Sign in</Link></section></main>;
  }

  return (
    <main className="min-h-screen bg-[#0c0c0b] px-4 pb-16 pt-8 text-[#ebe8e1] sm:px-6 lg:pt-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-white/[0.07] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#cdbd96]">Account overview</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">My Activity</h1>
            <p className="mt-2 text-sm text-[#918d84]">Your requests, replies and contributions at a glance.</p>
          </div>
          <Link href="/requests" className="pf-button-primary self-start sm:self-auto">Open requests <ArrowUpRight size={15} /></Link>
        </header>

        {error ? (
          <div role="alert" className="mt-6 rounded-xl border border-[#d98282]/20 bg-[#d98282]/[0.06] p-4 text-sm text-[#e0a29a]">{error}<button type="button" onClick={() => window.location.reload()} className="ml-2 underline underline-offset-4">Retry</button></div>
        ) : (
          <>
            <section className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat label="Requests" value={requests.length} icon={<Activity size={17} />} />
              <Stat label="Replies received" value={replies.length} icon={<BellRing size={17} />} />
              <Stat label="Responses sent" value={myResponses.length} icon={<MessageCircle size={17} />} />
            </section>

            <section className="mt-7 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141413]">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
                <div><h2 className="font-semibold">Your requests</h2><p className="mt-1 text-xs text-[#77736c]">Status and replies for requests you posted.</p></div>
                <Link href="/requests" className="text-xs font-medium text-[#cdbd96] hover:text-[#ebe8e1]">View all</Link>
              </div>
              {requests.length ? <div className="divide-y divide-white/[0.06]">{requests.map((item) => (
                <Link key={item.id} href="/requests" className="flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.025] sm:px-6">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-[#1a1a18] text-[#cdbd96]"><Activity size={16} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.target_name || "Community request"}</span><span className="mt-1 block text-xs text-[#77736c]">{formatDate(item.created_at)} · {replyCounts.get(item.id) ?? 0} {(replyCounts.get(item.id) ?? 0) === 1 ? "reply" : "replies"}</span></span>
                  <span className={"shrink-0 rounded-full border px-2.5 py-1 text-[11px] " + (item.status?.toLowerCase() === "resolved" ? "border-[#91b89a]/20 bg-[#91b89a]/[0.06] text-[#a6c7ad]" : "border-white/[0.08] text-[#b8b4ac]")}>{item.status || "Open"}</span>
                </Link>
              ))}</div> : <div className="px-5 py-10 text-center"><p className="text-sm text-[#918d84]">You haven't posted a request yet.</p><Link href="/requests" className="mt-3 inline-flex text-sm text-[#cdbd96]">Create your first request <ArrowUpRight size={14} className="ml-1" /></Link></div>}
            </section>

            <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141413]">
              <div className="border-b border-white/[0.07] px-5 py-4 sm:px-6"><h2 className="font-semibold">Recent activity</h2><p className="mt-1 text-xs text-[#77736c]">Your latest updates, with no extra clutter.</p></div>
              {timeline.length ? <div className="divide-y divide-white/[0.06]">{timeline.map((item) => <Link key={item.id} href="/requests" className="flex items-center gap-3 px-5 py-4 transition hover:bg-white/[0.025] sm:px-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-[#1a1a18] text-[#cdbd96]">{item.icon === "reply" ? <BellRing size={16} /> : item.icon === "response" ? <MessageCircle size={16} /> : item.icon === "reaction" ? <ThumbsUp size={16} /> : <Activity size={16} />}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{item.title}</span><span className="mt-1 block truncate text-xs text-[#77736c]">{item.detail}</span></span>
                <span className="shrink-0 text-xs text-[#77736c]"><Clock3 size={12} className="mr-1 inline" />{formatDate(item.created_at)}</span>
              </Link>)}</div> : <div className="px-5 py-10 text-center"><CheckCircle2 className="mx-auto text-[#cdbd96]" size={24} /><p className="mt-3 text-sm text-[#918d84]">Your activity will appear here as you use PeopleFind.</p></div>}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/[0.08] bg-[#141413] p-4 sm:p-5"><div className="flex items-center justify-between text-xs text-[#918d84]"><span>{label}</span><span className="text-[#cdbd96]">{icon}</span></div><p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p></div>;
}
