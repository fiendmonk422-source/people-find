import { NextRequest } from "next/server";
import { SCAN_CONFIG } from "../../../../src/lib/scan/config";
import { json, requireUser, vectorLiteral } from "../../../../src/lib/scan/server";
import { imageToEmbedding } from "../../../../src/lib/scan/vision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "invalid_form_data" }, 400);
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return json({ error: "missing_image", message: "Send an image in the image field." }, 400);
  }
  if (!file.type.startsWith("image/")) return json({ error: "invalid_file_type" }, 415);
  if (file.size <= 0 || file.size > SCAN_CONFIG.maxUploadBytes) {
    return json({ error: "image_too_large", maxBytes: SCAN_CONFIG.maxUploadBytes }, 413);
  }

  let embedding: number[];
  try {
    embedding = await imageToEmbedding(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown_image_processing_error";
    console.error("Scan image processing failed:", detail);
    return json({ error: "image_processing_failed", detail }, 422);
  }

  const { data, error } = await auth.supabase.rpc("scan_match_dolls", {
    p_query: vectorLiteral(embedding),
    p_max_distance: SCAN_CONFIG.maxDistance,
    p_limit: SCAN_CONFIG.resultLimit,
  });

  if (error) {
    const message = error.message || "match_failed";
    const status = /not_authenticated/i.test(message) ? 401
      : /not_allowed/i.test(message) ? 403
      : /rate_limited/i.test(message) ? 429
      : 500;
    console.error("Scan matching RPC failed:", message);
    return json({
      error: status === 500 ? "match_failed" : message,
      hint: status === 403 ? "This account is not enabled for Scan-to-Find." : undefined,
    }, status);
  }

  const matches = (data ?? []).map((row: {
    person_id: string;
    name: string | null;
    photo_url: string | null;
    faculty: string | null;
    distance: number;
  }) => ({
    id: row.person_id,
    name: row.name || "Unnamed person",
    photoUrl: row.photo_url,
    faculty: row.faculty,
    distance: Number(row.distance),
    profileUrl: `/people/${encodeURIComponent(row.person_id)}`,
  }));

  return json({
    matches,
    modelVersion: SCAN_CONFIG.modelVersion,
    note: matches.length
      ? "Results are ranked by visual similarity; confirm the correct person from the directory profile."
      : "No indexed image passed the current similarity threshold. This can mean the catalog is not indexed yet or the image is too different.",
  });
}
