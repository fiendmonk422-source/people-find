import { NextRequest } from "next/server";
import { adminApiError, getAdminContext } from "../../../../../src/lib/admin/server";

const TEXT_FIELDS = new Set([
  "name", "first_name", "middle_name", "last_name", "nickname", "school", "faculty",
  "department", "level", "class_name", "matric_number", "hostel", "room", "phone",
  "email", "address", "gender", "state", "country", "nationality", "admission_year",
  "graduation_year", "status", "photo_url", "lga", "level_override", "profile_visibility",
]);

export async function POST(request: NextRequest) {
  const access = await getAdminContext();
  const denied = await adminApiError(access);
  if (denied) return denied;

  let body: { rows?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json", message: "The uploaded file could not be read." }, { status: 400 });
  }

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return Response.json({ error: "empty_import", message: "Choose a CSV with at least one data row." }, { status: 400 });
  }
  if (body.rows.length > 5000) {
    return Response.json({ error: "too_many_rows", message: "Upload up to 5,000 rows at a time." }, { status: 413 });
  }

  const rows: Record<string, string | boolean | null>[] = [];
  for (let index = 0; index < body.rows.length; index++) {
    const raw = body.rows[index];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return Response.json({ error: "invalid_row", message: "Row " + (index + 2) + " is not valid." }, { status: 400 });
    }
    const row: Record<string, string | boolean | null> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (key === "date_of_birth") {
        if (value === null || value === "") row[key] = null;
        else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) row[key] = value;
        else return Response.json({ error: "invalid_date", message: "Row " + (index + 2) + " has an invalid date of birth. Use YYYY-MM-DD." }, { status: 400 });
      } else if (key === "profile_verified") {
        if (typeof value !== "boolean") return Response.json({ error: "invalid_boolean", message: "Row " + (index + 2) + " has an invalid verification value." }, { status: 400 });
        row[key] = value;
      } else if (TEXT_FIELDS.has(key)) {
        if (value !== null && typeof value !== "string") return Response.json({ error: "invalid_field", message: "Row " + (index + 2) + " has an invalid value for " + key + "." }, { status: 400 });
        const cleaned = typeof value === "string" ? value.trim() : "";
        if (cleaned.length > 1000) return Response.json({ error: "field_too_long", message: "Row " + (index + 2) + " has a value that is too long." }, { status: 400 });
        if (key === "photo_url" && cleaned) {
          try { if (new URL(cleaned).protocol !== "https:") throw new Error("https_required"); }
          catch { return Response.json({ error: "invalid_photo_url", message: "Row " + (index + 2) + " has a photo URL that must start with https://." }, { status: 400 }); }
        }
        row[key] = cleaned || null;
      }
    }
    if (typeof row.name !== "string" || !row.name.trim()) {
      return Response.json({ error: "name_required", message: "Row " + (index + 2) + " has no full name. Add a Name column or First name and Last name columns." }, { status: 400 });
    }
    rows.push(row);
  }

  const { data, error } = await access.supabase.rpc("admin_import_people", { p_rows: rows });
  if (error) {
    const status = error.code === "42501" ? 403 : 400;
    return Response.json({
      error: "import_failed",
      message: status === 403 ? "Administrator access is required." : "The import could not be completed. " + error.message,
    }, { status });
  }

  return Response.json({ ok: true, result: data }, { headers: { "Cache-Control": "no-store" } });
}
