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
