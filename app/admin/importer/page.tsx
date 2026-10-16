import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { getAdminContext } from "../../../src/lib/admin/server";
import CsvImporterClient from "./CsvImporterClient";

export const dynamic = "force-dynamic";

export default async function AdminCsvImporterPage() {
  const access = await getAdminContext();
  if (!access.user) redirect("/auth");
  if (access.roleError) {
    return (
      <main className="min-h-screen bg-[#0c0c0b] px-4 py-12 text-[#ebe8e1]">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/[0.08] bg-[#141413] p-6">
          <h1 className="text-xl font-semibold">Admin setup required</h1>
          <p className="mt-2 text-sm text-[#918d84]">The existing administrator role setup needs attention before this tool can be opened.</p>
        </div>
      </main>
    );
  }
  if (!access.isAdmin) redirect("/");

  return (
    <main className="min-h-screen bg-[#0c0c0b] px-4 pb-16 pt-8 text-[#ebe8e1] sm:px-6 lg:pt-12">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-[#918d84] transition hover:text-[#ebe8e1]">
          <ArrowLeft size={16} /> Back to admin
        </Link>

        <header className="mt-6 flex flex-col gap-4 border-b border-white/[0.07] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#cdbd96]">PeopleFind / Data tools</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Standalone CSV importer</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#918d84]">
              Validate matric-number lists and prepare a clean input file for the future 10-at-a-time lookup workflow.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#91b89a]/20 bg-[#91b89a]/[0.06] px-3 py-2 text-xs text-[#a6c7ad] sm:self-auto">
            <ShieldCheck size={15} /> Admin access
          </div>
        </header>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#cdbd96]/15 bg-[#cdbd96]/[0.04] p-4 text-sm leading-6 text-[#b8b4ac]">
          <FileSpreadsheet size={18} className="mt-1 shrink-0 text-[#cdbd96]" />
          <p><strong className="font-medium text-[#ebe8e1]">Local-only import preparation.</strong> This page does not insert, update, or delete directory records. The selected CSV is processed in your browser and is not uploaded to a database.</p>
        </div>

        <CsvImporterClient />
      </div>
    </main>
  );
}
