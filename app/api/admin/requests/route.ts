import { NextRequest } from "next/server";
import { adminApiError, getAdminContext } from "../../../../src/lib/admin/server";

export async function GET() {
  const access = await getAdminContext();
  const denied = await adminApiError(access);
  if (denied) return denied;

  const { data, error } = await access.supabase
    .from("requests")
    .select("id, requester_name, target_name, school, faculty, department, level, hostel, clues, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return Response.json({ error: "requests_query_failed", message: error.message }, { status: 500 });
  }

  return Response.json({ requests: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const access = await getAdminContext();
  const denied = await adminApiError(access);
  if (denied) return denied;

  let body: { requestId?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof body.requestId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId)) {
    return Response.json({ error: "invalid_request_id" }, { status: 400 });
  }

  if (typeof body.status !== "string" ||
      !["Open", "Resolved", "Closed"].includes(body.status)) {
    return Response.json({ error: "invalid_status", message: "Choose Open, Resolved or Closed." }, { status: 400 });
  }

  const { data, error } = await access.supabase.rpc("admin_update_request_status", {
    p_request_id: body.requestId,
    p_status: body.status,
  });

  if (error) {
    const status = error.code === "42501" ? 403 : error.code === "P0002" ? 404 : 400;
    return Response.json({
      error: status === 403 ? "admin_access_required" : status === 404 ? "request_not_found" : "request_update_failed",
      message: status === 403 ? "Administrator access is required." : status === 404 ? "That request was not found." : "The status change was rejected. Check the database migration.",
    }, { status });
  }

  return Response.json({ result: data }, { headers: { "Cache-Control": "no-store" } });
}
