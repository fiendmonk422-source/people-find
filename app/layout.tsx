import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import AnnouncementPopup from "./components/AnnouncementPopup";
import StudentActivityTracker from "./components/StudentActivityTracker";
import { createSupabaseServerClient } from "../src/lib/supabase-server";

export const metadata: Metadata = {
  title: "PeopleFind",
  description: "Find people through trusted directory information.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("site_announcements")
    .select("id,kind,title,body,event_date,event_time,venue,action_url,is_pinned,show_popup,published_at")
    .eq("status", "published")
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(50);

  return (
    <html lang="en">
      <body>
        <Navbar />
        <AnnouncementPopup items={(data ?? []) as Array<{
          id: string; kind: "notice" | "event"; title: string; body: string;
          event_date: string | null; event_time: string | null; venue: string | null;
          action_url: string | null; is_pinned: boolean; show_popup: boolean; published_at: string | null;
        }>} />
        <StudentActivityTracker />
        {children}
      </body>
    </html>
  );
}