import { redirect } from "next/navigation";
import { getAdminContext } from "../../../src/lib/admin/server";
import AdminSetupNotice from "../AdminSetupNotice";
import StudentActivityReport, { type StudentActivity } from "./StudentActivityReport";

export const dynamic = "force-dynamic";

export default async function StudentActivityPage() {
  const access = await getAdminContext();
  if (!access.user) redirect("/auth");
  if (access.roleError) return <AdminSetupNotice />;
  if (!access.isAdmin) redirect("/");

  const { data, error } = await access.supabase
    .from("student_activity_log")
    .select("id,user_id,user_email,event_type,page_path,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  return (
    <main className="min-h-screen bg-[#0c0c0b] px-4 pb-16 pt-8 text-[#ebe8e1] sm:px-6 lg:pt-12">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#cdbd96]">PeopleFind / Administration</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Student activity</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#918d84]">See signed-in usage patterns, recent page visits and active students. Export the filtered report as CSV.</p>
        {error ? <div className="mt-8 rounded-xl border border-[#d98282]/20 bg-[#d98282]/[0.06] p-4 text-sm text-[#e0a29a]">Student activity is not available. Confirm the student activity migration has been applied.</div> : <StudentActivityReport events={(data ?? []) as StudentActivity[]} />}
      </div>
    </main>
  );
}
