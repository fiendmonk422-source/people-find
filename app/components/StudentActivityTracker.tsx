"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { supabase } from "../../src/lib/supabase";

export default function StudentActivityTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/auth") || pathname.startsWith("/supabase-test")) return;
    let active = true;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;
      const activityKey = user.id + ":" + pathname;
      if (lastTracked.current === activityKey) return;
      lastTracked.current = activityKey;
      const { error } = await supabase.from("student_activity_log").insert({
        user_id: user.id,
        event_type: "page_view",
        page_path: pathname,
        metadata: {},
      });
      if (error && process.env.NODE_ENV === "development") {
        console.warn("PeopleFind activity tracking was unavailable:", error.message);
      }
    })();
    return () => { active = false; };
  }, [pathname]);

  return null;
}
