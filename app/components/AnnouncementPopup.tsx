"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellRing, CalendarDays, ExternalLink, X } from "lucide-react";

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

const DISMISSED_KEY = "peoplefind-dismissed-announcements-v1";

export default function AnnouncementPopup({ items }: { items: Announcement[] }) {
  const [popup, setPopup] = useState<Announcement | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(DISMISSED_KEY) || "[]");
      if (Array.isArray(saved)) setDismissedIds(saved.filter((id): id is string => typeof id === "string"));
    } catch {
      setDismissedIds([]);
    }
  }, []);

  useEffect(() => {
    if (dismissedIds.length < 0) return;
    const next = items.find((item) => item.show_popup && !dismissedIds.includes(item.id));
    if (!next) { setPopup(null); return; }
    const timer = window.setTimeout(() => setPopup(next), 650);
    return () => window.clearTimeout(timer);
  }, [items, dismissedIds]);

  useEffect(() => {
    if (!popup) return;
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") closePopup(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [popup]);

  function closePopup() {
    if (!popup) return;
    const next = Array.from(new Set([...dismissedIds, popup.id]));
    setDismissedIds(next);
    try { window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(next)); } catch {}
    setPopup(null);
  }

  const pinned = items.find((item) => item.is_pinned);
  return (
    <>
      {pinned && (
        <div className="sticky top-[72px] z-40 border-b border-[#cdbd96]/20 bg-[#171612]/95 px-4 py-2.5 text-sm text-[#d8d0bd] shadow-lg shadow-black/10 backdrop-blur-xl" role="region" aria-label="Pinned PeopleFind announcement">
          <div className="mx-auto flex max-w-7xl items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#cdbd96]/20 bg-[#cdbd96]/[0.08] text-[#cdbd96]"><BellRing size={14} /></span>
            <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#cdbd96] sm:inline">Important</span>
            <span className="min-w-0 flex-1 truncate font-medium text-[#ebe8e1]">{pinned.title}<span className="hidden font-normal text-[#a6a197] sm:inline"> — {pinned.body}</span></span>
            <Link href="/announcements" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#cdbd96]/20 px-3 py-1.5 text-xs font-semibold text-[#e5d9b9] transition hover:bg-[#cdbd96]/10">View <ExternalLink size={12} /></Link>
          </div>
        </div>
      )}
      {popup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="presentation">
          <section className="relative max-h-[min(85vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#141413] shadow-2xl shadow-black/50" role="dialog" aria-modal="true" aria-labelledby="announcement-title">
            <div className="h-1 w-full bg-gradient-to-r from-[#8f7b52] via-[#d6c59c] to-[#8f7b52]" />
            <div className="p-6 sm:p-8">
              <button onClick={closePopup} type="button" aria-label="Dismiss notice" className="absolute right-4 top-4 rounded-lg p-2 text-[#918d84] transition hover:bg-white/5 hover:text-white"><X size={18} /></button>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-[#cdbd96]/20 bg-[#cdbd96]/[0.08] text-[#cdbd96]">{popup.kind === "event" ? <CalendarDays size={20} /> : <BellRing size={20} />}</div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#cdbd96]">{popup.kind === "event" ? "PeopleFind event" : "Official notice"}</p>
              <h2 id="announcement-title" className="mt-2 pr-7 text-2xl font-semibold tracking-tight text-[#ebe8e1]">{popup.title}</h2>
              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-[#a6a197]">{popup.body}</p>
              {popup.kind === "event" && <div className="mt-4 space-y-1 text-sm text-[#c9c3b8]">{popup.event_date && <p>{new Date(popup.event_date + "T12:00:00").toLocaleDateString(undefined, { dateStyle: "full" })}{popup.event_time ? " · " + popup.event_time : ""}</p>}{popup.venue && <p className="text-[#918d84]">{popup.venue}</p>}</div>}
              <div className="mt-7 flex flex-wrap gap-3">
                {popup.action_url && <a href={popup.action_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ebe8e1] px-4 py-2.5 text-sm font-semibold text-[#0c0c0b] transition hover:bg-white">Open link <ExternalLink size={14} /></a>}
                <Link href="/announcements" onClick={closePopup} className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-sm text-[#d5d0c7] transition hover:bg-white/5">All events & notices</Link>
                <button type="button" onClick={closePopup} className="ml-auto rounded-xl px-3 py-2.5 text-sm text-[#918d84] transition hover:text-white">Dismiss</button>
              </div>
              <p className="mt-5 text-[10px] text-[#625f58]">This notice won’t pop up again on this browser after you dismiss it.</p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
