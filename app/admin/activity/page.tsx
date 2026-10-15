import { redirect } from "next/navigation";
import { getAdminContext, adminPageSetupNotice } from "../../../src/lib/admin/server";
import ActivityReport, { type ActivityEvent } from "./ActivityReport";

export const dynamic = "force-dynamic";

export default async function AdminActivityPage() {
  const access = await getAdminContext();
  if (!access.user) redirect("/auth");
  if (access.roleError) return adminPageSetupNotice();
  if (!access.isAdmin) redirect("/");

  const { data, error } = await access.supabase
    .from("admin_activity_log")
    .select("id, actor_user_id, actor_email, action, target_type, target_id, summary, details, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <main className="min-h-screen bg-[#0c0c0b] px-4 pb-16 pt-8 text-[#ebe8e1] sm:px-6 lg:pt-12">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#cdbd96]">PeopleFind / Administration</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Activity reports</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#918d84]">Search administrative events, review which records were affected, and export the current report as CSV.</p>
        {error ? (
          <div className="mt-8 rounded-xl border border-[#d98282]/20 bg-[#d98282]/[0.06] p-4 text-sm text-[#e0a29a]">
            The activity report could not be loaded. Confirm that the admin migration is applied.
          </div>
        ) : (
          <ActivityReport events={(data ?? []) as ActivityEvent[]} />
        )}
      </div>
    </main>
  );
}
