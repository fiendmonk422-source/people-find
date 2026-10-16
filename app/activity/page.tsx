"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, BellRing, CheckCircle2, Clock3, Loader2, MessageCircle, ThumbsDown, ThumbsUp } from "lucide-react";
import { supabase } from "../../src/lib/supabase";

type RequestItem = {
  id: string;
  target_name: string | null;
  school: string | null;
  faculty: string | null;
  department: string | null;
  level: string | null;
  clues: string | null;
  status: string | null;
  created_at: string;
};
type ResponseItem = {
  id: string;
  request_id: string;
  user_id: string | null;
  responder_name: string | null;
  response: string | null;
  created_at: string;
};
type FeedbackItem = {
  id: string;
  response_id: string;
  user_id: string | null;
  vote: "up" | "down" | null;
  created_at?: string;
};
type TimelineItem = {
  id: string;
  type: "request" | "response" | "reaction" | "reply";
  title: string;
  detail: string;
  date: string;
  href: string;
};

const dateLabel = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

export default function MyActivityPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [myResponses, setMyResponses] = useState<ResponseItem[]>([]);
  const [responsesToMyRequests, setResponsesToMyRequests] = useState<ResponseItem[]>([]);
  const [myReactions, setMyReactions] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | TimelineItem["type"]>("all");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) {
          if (active) {
            setUserId(null);
            setLoading(false);
          }
          return;
        }
        if (active) setUserId(user.id);

        const [requestResult, responseResult, feedbackResult] = await Promise.all([
          supabase.from("requests")
            .select("id,target_name,school,faculty,department,level,clues,status,created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase.from("request_responses")
            .select("id,request_id,user_id,responder_name,response,created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase.from("response_feedback")
            .select("id,response_id,user_id,vote,created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        ]);
        if (requestResult.error) throw requestResult.error;
        if (responseResult.error) throw responseResult.error;
        if (feedbackResult.error) throw feedbackResult.error;

        const ownRequests = (requestResult.data ?? []) as RequestItem[];
        const ownResponses = (responseResult.data ?? []) as ResponseItem[];
        const ownFeedback = (feedbackResult.data ?? []) as FeedbackItem[];
        let replies: ResponseItem[] = [];
        if (ownRequests.length) {
          const replyResult = await supabase.from("request_responses")
            .select("id,request_id,user_id,responder_name,response,created_at")
            .in("request_id", ownRequests.map((item) => item.id))
            .order("created_at", { ascending: false });
          if (replyResult.error) throw replyResult.error;
          replies = ((replyResult.data ?? []) as ResponseItem[]).filter((item) => item.user_id !== user.id);
        }

        if (active) {
          setRequests(ownRequests);
          setMyResponses(ownResponses);
          setMyReactions(ownFeedback);
          setResponsesToMyRequests(replies);
        }
      } catch (e) {
        console.error("My activity load error:", e);
        if (active) setError(e instanceof Error ? e.message : "We couldn't load your activity. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const requestById = useMemo(() => new Map(requests.map((item) => [item.id, item])), [requests]);

  const timeline = useMemo(() => {
    const items: TimelineItem[] = [
      ...requests.map((item) => ({
        id: `request-${item.id}`,
        type: "request" as const,
        title: "You posted a request",
        detail: item.target_name ? `Looking for ${item.target_name}` : "Community request",
        date: item.created_at,
        href: "/requests",
      })),
      ...myResponses.map((item) => ({
        id: `response-${item.id}`,
        type: "response" as const,
        title: "You responded to a request",
        detail: "Response posted",
        date: item.created_at,
        href: "/requests",
      })),
      ...myReactions.map((item) => ({
        id: `reaction-${item.id}`,
        type: "reaction" as const,
        title: item.vote === "down" ? "You disliked a response" : "You liked a response",
        detail: "Reaction saved",
        date: item.created_at || new Date().toISOString(),
        href: "/requests",
      })),
      ...responsesToMyRequests.map((item) => {
        const request = requestById.get(item.request_id);
        return {
          id: `reply-${item.id}`,
          type: "reply" as const,
          title: "Someone responded to your request",
          detail: `${request?.target_name ? `About ${request.target_name}: ` : ""}${item.response || "Open your request to view the response"}`.slice(0, 160),
          date: item.created_at,
          href: "/requests",
        };
      }),
    ];
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [requests, myResponses, myReactions, responsesToMyRequests, requestById]);

  const visibleTimeline = filter === "all" ? timeline : timeline.filter((item) => item.type === filter);
  const repliesCount = responsesToMyRequests.length;

  if (!loading && !userId) {
    return (
      <main className="min-h-screen bg-[#0c0c0b] px-5 py-16 text-[#ebe8e1]">
        <section className="mx-auto max-w-xl rounded-3xl border border-white/[0.08] bg-[#121211] p-8 text-center sm:p-10">
          <Activity className="mx-auto text-[#cdbd96]" size={30} />
          <h1 className="mt-5 text-2xl font-semibold">My Activity</h1>
          <p className="mt-3 text-sm leading-6 text-[#918d84]">Sign in to see the requests you’ve posted, responses you’ve sent, reactions you’ve made, and replies from other students.</p>
          <Link href="/auth" className="mt-6 inline-flex rounded-xl bg-[#ebe8e1] px-5 py-3 text-sm font-semibold text-[#0c0c0b]">Sign in</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0c0c0b] px-4 pb-16 pt-8 text-[#ebe8e1] sm:px-6 lg:pt-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 border-b border-white/[0.07] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#cdbd96]">Your PeopleFind space</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">My Activity</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#918d84]">Keep track of your requests, the responses you’ve shared, reactions you’ve made, and replies to your requests.</p>
          </div>
          <Link href="/requests" className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-[#ebe8e1] px-4 py-3 text-sm font-semibold text-[#0c0c0b] transition hover:bg-white sm:self-auto">Open Requests <ArrowUpRight size={16} /></Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-sm text-[#918d84]"><Loader2 className="animate-spin" size={18} /> Loading your activity…</div>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-[#d98282]/20 bg-[#d98282]/[0.06] p-5 text-sm leading-6 text-[#e0a29a]">
            We couldn't load your activity. {error}
            <button onClick={() => window.location.reload()} className="ml-2 underline underline-offset-4">Try again</button>
          </div>
        ) : (
          <>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Requests posted" value={requests.length} icon={<Activity size={18} />} />
              <Stat label="Responses you sent" value={myResponses.length} icon={<MessageCircle size={18} />} />
              <Stat label="Replies to your requests" value={repliesCount} icon={<BellRing size={18} />} />
              <Stat label="Reactions you made" value={myReactions.length} icon={<ThumbsUp size={18} />} />
            </div>

            <section className="mt-8 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111110]">
              <div className="flex flex-col gap-2 border-b border-white/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="text-lg font-semibold">My requests</h2>
                  <p className="mt-1 text-xs text-[#77736d]">Check each request’s status and how many replies it has received.</p>
                </div>
                <Link href="/requests" className="inline-flex items-center gap-2 text-sm text-[#d7c69f] hover:text-[#ebe8e1]">View community requests <ArrowUpRight size={15} /></Link>
              </div>
              {requests.length === 0 ? (
                <div className="px-6 py-8 text-sm text-[#77736d]">You haven’t posted a request yet.</div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {requests.map((request) => {
                    const replyCount = responsesToMyRequests.filter((reply) => reply.request_id === request.id).length;
                    return (
                      <div key={request.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#e5e1d9]">{request.target_name ? `Looking for ${request.target_name}` : "People-finding request"}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-[#918d84]">{request.clues || [request.school, request.faculty, request.department, request.level].filter(Boolean).join(" · ") || "No extra details added"}</p>
                          <p className="mt-2 text-xs text-[#77736d]">Posted {dateLabel(request.created_at)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-[#b8b4ac]">{request.status || "Open"}</span>
                          <span className="text-xs text-[#cdbd96]">{replyCount} {replyCount === 1 ? "reply" : "replies"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-8 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#111110]">
              <div className="flex flex-col gap-4 border-b border-white/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h2 className="text-lg font-semibold">Recent activity</h2>
                  <p className="mt-1 text-xs text-[#77736d]">Only activity related to your account is shown here.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {([
                    ["all", "Everything"],
                    ["reply", "Replies"],
                    ["request", "My requests"],
                    ["response", "My responses"],
                    ["reaction", "My reactions"],
                  ] as const).map(([value, label]) => (
                    <button key={value} onClick={() => setFilter(value)} className={`rounded-lg border px-3 py-2 text-xs transition ${filter === value ? "border-[#cdbd96]/30 bg-[#cdbd96]/10 text-[#e7d7b3]" : "border-white/[0.07] text-[#918d84] hover:bg-white/[0.04]"}`}>{label}</button>
                  ))}
                </div>
              </div>

              {visibleTimeline.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <CheckCircle2 className="mx-auto text-[#cdbd96]" size={26} />
                  <p className="mt-4 text-sm font-medium">{timeline.length ? "Nothing in this filter yet" : "Your activity will appear here"}</p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#77736d]">{timeline.length ? "Choose another filter to see more of your activity." : "Post a request or respond to someone in the community to get started."}</p>
                  <Link href="/requests" className="mt-5 inline-flex items-center gap-2 text-sm text-[#d7c69f] hover:text-[#ebe8e1]">Go to Requests <ArrowUpRight size={15} /></Link>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {visibleTimeline.map((item) => (
                    <Link key={item.id} href={item.href} className="group flex gap-4 px-5 py-5 transition hover:bg-white/[0.025] sm:px-6">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-[#191918] text-[#cdbd96]">
                        {item.type === "reply" ? <BellRing size={17} /> : item.type === "response" ? <MessageCircle size={17} /> : item.type === "reaction" ? (item.title.includes("disliked") ? <ThumbsDown size={17} /> : <ThumbsUp size={17} />) : <Activity size={17} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm font-medium text-[#e5e1d9] group-hover:text-white">{item.title}</p>
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-[#77736d]"><Clock3 size={12} />{dateLabel(item.date)}</span>
                        </div>
                        <p className="mt-1 break-words text-sm leading-6 text-[#918d84]">{item.detail}</p>
                      </div>
                      <ArrowUpRight className="mt-1 shrink-0 text-[#625f58] transition group-hover:text-[#cdbd96]" size={16} />
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#111110] p-5">
      <div className="flex items-center justify-between text-[#918d84]"><span className="text-xs">{label}</span><span className="text-[#cdbd96]">{icon}</span></div>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-[#ebe8e1]">{value}</p>
    </div>
  );
}
