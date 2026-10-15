import "server-only";

import { createSupabaseServerClient } from "../supabase-server";

export async function getAdminContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      user: null,
      role: null as string | null,
      roleError: null,
      isAdmin: false,
    };
  }

  const { data: roleRecord, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = roleRecord?.role ?? null;

  return {
    supabase,
    user,
    role,
    roleError,
    isAdmin: !roleError && (role === "admin" || role === "super_admin"),
  };
}

export async function adminApiError(
  access: Awaited<ReturnType<typeof getAdminContext>>
): Promise<Response | null> {
  if (!access.user) {
    return Response.json({ error: "not_authenticated", message: "Please sign in first." }, { status: 401 });
  }

  if (access.roleError) {
    return Response.json({
      error: "admin_schema_not_ready",
      message: "Admin access is not configured yet. Apply the admin database migration first.",
    }, { status: 503 });
  }

  if (!access.isAdmin) {
    return Response.json({ error: "admin_access_required", message: "This action is available to authorized administrators only." }, { status: 403 });
  }

  return null;
}

export function adminPageSetupNotice() {
  return (
    <main className="min-h-screen bg-[#0c0c0b] px-5 py-16 text-[#ebe8e1]">
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/[0.08] bg-[#141413] p-7">
        <p className="text-xs uppercase tracking-[0.18em] text-[#cdbd96]">Admin setup</p>
        <h1 className="mt-3 text-2xl font-semibold">Administrator access is not configured yet.</h1>
        <p className="mt-3 text-sm leading-6 text-[#918d84]">
          Apply the admin migration and assign an administrator through the Supabase SQL Editor. Normal users cannot grant themselves admin access.
        </p>
      </div>
    </main>
  );
}
