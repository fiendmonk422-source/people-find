"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellRing, CalendarDays, X } from "lucide-react";
import { supabase } from "../../src/lib/supabase";

type Announcement = {
  id: string;
  kind: "notice" | "event";
  title: string;
  body: string;
  event_date: string | null;
  event_time: string | null;
  venue: string | null;
  action_url: string | null;
  is_pinned: boolean;
  show_popup: boolean;
  published_at: string | null;
};

export default function AnnouncementPopup() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [popup, setPopup] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    const dismissedId = typeof window !== "undefined" ? window.sessionStorage.getItem("peoplefind-dismissed-announcement") : null;
    setDismissed(Boolean(dismissedId));

    void supabase
      .from("site_announcements")
      .select("id,kind,title,body,event_date,event_time,venue,action_url,is_pinned,show_popup,published_at")
      .eq("status", "published")
      .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (!alive || !data) return;
        const announcements = data as Announcement[];
        setItems(announcements);
        const nextPopup = announcements.find((item) => item.show_popup && item.id !== dismissedId);
        if (nextPopup) setPopup(nextPopup);
      });

    return () => { alive = false; };
  }, []);

  function closePopup() {
    if (popup) window.sessionStorage.setItem("peoplefind-dismissed-announcement", popup.id);
    setPopup(null);
    setDismissed(true);
  }

  const pinned = items.find((item) => item.is_pinned);
  return (
    <>
      {pinned && (
        <div className="border-b border-[#cdbd96]/15 bg-[#171612] px-4 py-2.5 text-sm text-[#d8d0bd]">
          <div className="mx-auto flex max-w-7xl items-center gap-2">
            <BellRing size={15} className="shrink-0 text-[#cdbd96]" />
            <span className="font-semibold">{pinned.title}</span>
            <span className="hidden text-[#918d84] sm:inline">— {pinned.body}</span>
            <Link href="/announcements" className="ml-auto shrink-0 text-xs font-semibold text-[#cdbd96] hover:text-white">View details</Link>
          </div>
        </div>
      )}
      {popup && !dismissed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="announcement-title">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#141413] p-6 shadow-2xl sm:p-8">
            <button onClick={closePopup} type="button" aria-label="Dismiss notice" className="absolute right-4 top-4 rounded-lg p-2 text-[#918d84] hover:bg-white/5 hover:text-white"><X size={18} /></button>
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-[#cdbd96]/20 bg-[#cdbd96]/[0.08] text-[#cdbd96]">
              {popup.kind === "event" ? <CalendarDays size={20} /> : <BellRing size={20} />}
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#cdbd96]">{popup.kind === "event" ? "PeopleFind event" : "Official notice"}</p>
            <h2 id="announcement-title" className="mt-2 pr-7 text-2xl font-semibold tracking-tight text-[#ebe8e1]">{popup.title}</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#a6a197]">{popup.body}</p>
            {popup.kind === "event" && (
              <div className="mt-4 space-y-1 text-sm text-[#c9c3b8]">
                {popup.event_date && <p>{new Date(popup.event_date + "T12:00:00").toLocaleDateString(undefined, { dateStyle: "full" })}{popup.event_time ? " · " + popup.event_time : ""}</p>}
                {popup.venue && <p className="text-[#918d84]">{popup.venue}</p>}
              </div>
            )}
            <div className="mt-7 flex flex-wrap gap-3">
              {popup.action_url && <a href={popup.action_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-xl bg-[#ebe8e1] px-4 py-2.5 text-sm font-semibold text-[#0c0c0b] hover:bg-white">Open link</a>}
              <Link href="/announcements" onClick={closePopup} className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-sm text-[#d5d0c7] hover:bg-white/5">All events & notices</Link>
              <button type="button" onClick={closePopup} className="ml-auto px-3 py-2.5 text-sm text-[#918d84] hover:text-white">Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
