import { NextRequest } from "next/server";
import { adminApiError, getAdminContext } from "../../../../src/lib/admin/server";

const PEOPLE_COLUMNS = [
  "id", "name", "first_name", "middle_name", "last_name", "nickname",
  "school", "faculty", "department", "level", "class_name", "matric_number",
  "hostel", "room", "phone", "email", "address", "date_of_birth", "gender",
  "state", "country", "nationality", "admission_year", "graduation_year",
  "status", "photo_url", "lga", "level_override", "profile_verified",
  "profile_visibility", "updated_at",
].join(",");

export async function GET(request: NextRequest) {
  const access = await getAdminContext();
  const denied = await adminApiError(access);
  if (denied) return denied;

  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const term = rawQuery.trim().slice(0, 80).replace(/[%*(),]/g, " ").trim();

  if (!term) {
    const { data, error } = await access.supabase
      .from("people")
      .select(PEOPLE_COLUMNS)
      .order("name", { ascending: true })
      .limit(100);

    if (error) {
      return Response.json({ error: "people_query_failed", message: error.message }, { status: 500 });
    }

    return Response.json({ people: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const columns = ["name", "matric_number", "school", "department"] as const;
  const results = await Promise.all(columns.map((column) =>
    access.supabase
      .from("people")
      .select(PEOPLE_COLUMNS)
      .ilike(column, "%" + term + "%")
      .order("name", { ascending: true })
      .limit(35)
  ));

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    return Response.json({ error: "people_query_failed", message: failed.error.message }, { status: 500 });
  }

  const byId = new Map<string, (typeof results)[number]["data"] extends (infer T)[] | null ? T : never>();
  for (const result of results) {
    for (const row of result.data ?? []) {
      byId.set(row.id, row as never);
    }
  }

  return Response.json({ people: Array.from(byId.values()).slice(0, 100) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const access = await getAdminContext();
  const denied = await adminApiError(access);
  if (denied) return denied;

  let body: { personId?: unknown; changes?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  if (typeof body.personId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.personId)) {
    return Response.json({ error: "invalid_person_id" }, { status: 400 });
  }

  if (!body.changes || typeof body.changes !== "object" || Array.isArray(body.changes)) {
    return Response.json({ error: "invalid_changes" }, { status: 400 });
  }

  const textFields = new Set([
    "name", "first_name", "middle_name", "last_name", "nickname",
    "school", "faculty", "department", "level", "class_name", "matric_number",
    "hostel", "room", "phone", "email", "address", "gender", "state",
    "country", "nationality", "status", "photo_url", "lga", "level_override",
    "profile_visibility",
  ]);
  const changes: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(body.changes as Record<string, unknown>)) {
    if (textFields.has(key)) {
      if (value !== null && typeof value !== "string") {
        return Response.json({ error: "invalid_field_type", field: key }, { status: 400 });
      }
      const cleaned = typeof value === "string" ? value.trim() : null;
      if (cleaned && cleaned.length > 1000) {
        return Response.json({ error: "field_too_long", field: key }, { status: 400 });
      }
      if (key === "photo_url" && cleaned) {
        try {
          const photo = new URL(cleaned);
          if (photo.protocol !== "https:") throw new Error("https_required");
        } catch {
          return Response.json({ error: "photo_url_must_be_https", field: key }, { status: 400 });
        }
      }
      changes[key] = cleaned || null;
      continue;
    }

    if (key === "date_of_birth") {
      if (value === null || value === "") {
        changes[key] = null;
      } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        changes[key] = value;
      } else {
        return Response.json({ error: "invalid_date", field: key }, { status: 400 });
      }
      continue;
    }

    if (key === "admission_year" || key === "graduation_year") {
      if (value === null || value === "") {
        changes[key] = null;
      } else {
        const year = typeof value === "number" ? value : Number(value);
        if (!Number.isInteger(year) || year < 1900 || year > 2200) {
          return Response.json({ error: "invalid_year", field: key }, { status: 400 });
        }
        changes[key] = year;
      }
      continue;
    }

    if (key === "profile_verified") {
      if (typeof value !== "boolean") {
        return Response.json({ error: "invalid_boolean", field: key }, { status: 400 });
      }
      changes[key] = value;
      continue;
    }

    return Response.json({ error: "unsupported_field", field: key }, { status: 400 });
  }

  if (Object.keys(changes).length === 0) {
    return Response.json({ error: "empty_changes" }, { status: 400 });
  }

  const { data, error } = await access.supabase.rpc("admin_update_person", {
    p_person_id: body.personId,
    p_changes: changes,
  });

  if (error) {
    const status = error.code === "42501" ? 403 : error.code === "P0002" ? 404 : 400;
    return Response.json({
      error: status === 403 ? "admin_access_required" : status === 404 ? "person_not_found" : "person_update_failed",
      message: status === 403 ? "Administrator access is required." : status === 404 ? "That directory record was not found." : "The update was rejected. Check the field values and database migration.",
    }, { status });
  }

  return Response.json({ person: data }, { headers: { "Cache-Control": "no-store" } });
}
