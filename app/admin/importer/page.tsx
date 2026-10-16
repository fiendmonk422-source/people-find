import { redirect } from "next/navigation";
import { getAdminContext } from "../../../src/lib/admin/server";
import AdminSetupNotice from "../AdminSetupNotice";
import CsvLookupImporter from "./CsvLookupImporter";

export const dynamic = "force-dynamic";

export default async function CsvLookupImporterPage() {
  const access = await getAdminContext();
  if (!access.user) redirect("/auth");
  if (access.roleError) return <AdminSetupNotice />;
  if (!access.isAdmin) redirect("/");

  return <CsvLookupImporter />;
}
