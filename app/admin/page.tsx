import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity, ArrowUpRight, BellRing, ClipboardList, FileSpreadsheet, Globe2, ShieldCheck, Users,
} from "lucide-react";
import { getAdminContext } from "../../src/lib/admin/server";
import AdminSetupNotice from "./AdminSetupNotice";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const access = await getAdminContext();
  if (!access.user) redirect("/auth");
  if (access.roleError) return <AdminSetupNotice />;
  if (!access.isAdmin) redirect("/");

  const [people, requests, responses, feedback, activityCount, studentActivityCount, recent] = await Promise.all([
    access.supabase.from("people").select("id", { count: "exact", head: true }),
    access.supabase.from("requests").select("id", { count: "exact", head: true }),
    access.supabase.from("request_responses").select("id", { count: "exact", head: true }),
    access.supabase.from("response_feedback").select("id", { count: "exact", head: true }),
    access.supabase.from("admin_activity_log").select("id", { count: "exact", head: true }),
    access.supabase.from("student_activity_log").select("id", { count: "exact", head: true }),
    access.supabase.from("admin_activity_log")
      .select("id, actor_email, action, target_type, target_id, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const countError = people.error || requests.error || responses.error || feedback.error || activityCount.error || studentActivityCount.error;
  const recentError = recent.error;

  return (
    <main className="min-h-screen bg-[#0c0c0b] px-4 pb-16 pt-8 text-[#ebe8e1] sm:px-6 lg:pt-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 border-b border-white/[0.07] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#cdbd96]">PeopleFind / Administration</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Admin dashboard</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#918d84]">Directory operations, community requests and administrative audit reports.</p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#91b89a]/20 bg-[#91b89a]/[0.06] px-3 py-2 text-xs text-[#a6c7ad] sm:self-auto">
            <ShieldCheck size={15} /> Authorized administrator
          </div>
        </header>

        {countError && (
          <div className="mt-6 rounded-xl border border-[#d98282]/20 bg-[#d98282]/[0.06] p-4 text-sm text-[#e0a29a]">
            Some dashboard counts could not be loaded. Verify that the admin migration and table permissions are applied.
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Metric label="Directory records" value={people.count} icon={<Users size={18} />} />
          <Metric label="Requests" value={requests.count} icon={<ClipboardList size={18} />} />
          <Metric label="Responses" value={responses.count} icon={<Activity size={18} />} />
          <Metric label="Reactions" value={feedback.count} icon={<ShieldCheck size={18} />} />
          <Metric label="Admin events" value={activityCount.count} icon={<Activity size={18} />} />
          <Metric label="Student activity" value={studentActivityCount.count} icon={<Users size={18} />} />
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="rounded-2xl border border-white/[0.08] bg-[#141413] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Recent admin activity</h2>
                <p className="mt-1 text-sm text-[#77736c]">An audit trail of administrative changes.</p>
              </div>
              <Link href="/admin/activity" className="inline-flex items-center gap-1.5 text-sm text-[#cdbd96] hover:text-[#ebe8e1]">
                View report <ArrowUpRight size={15} />
              </Link>
            </div>

            {recentError ? (
              <p className="mt-6 text-sm text-[#dca0a0]">Activity history is unavailable until the admin migration is installed.</p>
            ) : recent.data?.length ? (
              <div className="mt-5 divide-y divide-white/[0.06]">
                {recent.data.map((event) => (
                  <div key={event.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium">{event.summary}</span>
                      <time className="text-xs text-[#77736c]">{new Date(event.created_at).toLocaleString()}</time>
                    </div>
                    <p className="mt-1 text-xs text-[#77736c]">
                      {event.actor_email || "Administrator"} · {event.action} · {event.target_type}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-xl border border-dashed border-white/[0.1] p-5 text-sm text-[#77736c]">
                No admin events yet. Directory edits and request status changes will be recorded here.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <AdminLink href="/admin/people" title="Manage directory" description="Search records and correct approved directory fields." icon={<Users size={19} />} />
            <AdminLink href="/admin/people#csv-import" title="Import directory CSV" description="Import or update student records in the PeopleFind directory." icon={<FileSpreadsheet size={19} />} />
            <AdminLink href="/admin/importer" title="Student lookup importer" description="Validate up to 10,000 matric numbers, prepare batches of 10 and export lookup results to CSV without writing to the database." icon={<Globe2 size={19} />} />
            <AdminLink href="/admin/requests" title="Review requests" description="Monitor community requests and update their status." icon={<ClipboardList size={19} />} />
            <AdminLink href="/admin/announcements" title="Events & notices" description="Publish announcements, manage events, pin notices and control pop-ups." icon={<BellRing size={19} />} />
            <AdminLink href="/admin/students" title="Student activity" description="Review signed-in usage patterns and export student activity as CSV." icon={<Users size={19} />} />
            <AdminLink href="/admin/activity" title="Admin activity reports" description="Search the administrative audit log and export a CSV report." icon={<Activity size={19} />} />
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, icon }: { label: string; value: number | null; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#141413] p-5">
      <div className="flex items-center justify-between text-[#cdbd96]">
        <span className="text-xs text-[#918d84]">{label}</span>
        {icon}
      </div>
      <p className="mt-5 text-3xl font-semibold tabular-nums">{value ?? "—"}</p>
    </div>
  );
}

function AdminLink({ href, title, description, icon }: { href: string; title: string; description: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="group flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-[#141413] p-5 transition hover:border-white/[0.15] hover:bg-[#181817]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1b1b19] text-[#cdbd96]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-[#77736c]">{description}</span>
      </span>
      <ArrowUpRight size={16} className="mt-1 text-[#625f58] transition group-hover:text-[#cdbd96]" />
    </Link>
  );
}
