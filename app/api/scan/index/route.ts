import { NextRequest } from "next/server";
import { isIP } from "node:net";
import { SCAN_CONFIG } from "../../../../src/lib/scan/config";
import { createSupabaseAdmin, json } from "../../../../src/lib/scan/server";
import { imageToEmbedding } from "../../../../src/lib/scan/vision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAllowedPhotoUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("reference_url_must_use_https");
  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("reference_url_host_not_allowed");
  }
  // Refuse literal IP addresses to avoid accidental private-network access.
  if (isIP(host.replace(/^\[|\]$/g, ""))) throw new Error("reference_url_ip_not_allowed");

  const configuredHosts = (process.env.SCAN_ALLOWED_IMAGE_HOSTS ?? "")
    .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (configuredHosts.length && !configuredHosts.includes(host)) {
    throw new Error("reference_url_host_not_allowlisted");
  }
  return url;
}

async function readLimited(response: Response, maxBytes: number): Promise<Buffer> {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new Error("reference_image_too_large");
  if (!response.body) throw new Error("reference_image_empty");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("reference_image_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), total);
}

/** Secret-protected batch indexer. Never call this route from the public browser UI. */
export async function POST(request: NextRequest) {
  const expected = process.env.SCAN_INDEX_SECRET;
  if (!expected) return json({ error: "indexer_not_configured" }, 503);
  if (request.headers.get("x-scan-index-secret") !== expected) {
    return json({ error: "forbidden" }, 403);
  }

  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch {
    return json({ error: "indexer_not_configured" }, 503);
  }

  const { data: pending, error: listError } = await admin
    .from("scan_reference_index")
    .select("person_id,photo_url_snapshot,attempts")
    .eq("status", "pending")
    .not("photo_url_snapshot", "is", null)
    .order("created_at", { ascending: true })
    .limit(SCAN_CONFIG.maxReferenceImagesPerRun);

  if (listError) {
    console.error("Scan index query failed:", listError.message);
    return json({ error: "index_query_failed" }, 500);
  }

  const results: Array<{ personId: string; status: string; detail?: string }> = [];
  for (const item of pending ?? []) {
    const nextAttempts = Number(item.attempts ?? 0) + 1;
    const { error: claimError } = await admin.from("scan_reference_index")
      .update({ status: "processing", attempts: nextAttempts, error_message: null, last_attempt_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("person_id", item.person_id)
      .eq("photo_url_snapshot", item.photo_url_snapshot)
      .eq("status", "pending");

    if (claimError) {
      results.push({ personId: item.person_id, status: "skipped", detail: "Could not claim queued row." });
      continue;
    }

    try {
      const url = isAllowedPhotoUrl(item.photo_url_snapshot);
      const response = await fetch(url, {
        signal: AbortSignal.timeout(12000),
        headers: { Accept: "image/*" },
        redirect: "manual",
      });
      if (response.status >= 300 && response.status < 400) throw new Error("reference_redirect_not_allowed");
      if (!response.ok) throw new Error(`reference_fetch_http_${response.status}`);
      if (!(response.headers.get("content-type") ?? "").toLowerCase().startsWith("image/")) {
        throw new Error("reference_url_did_not_return_image");
      }

      const bytes = await readLimited(response, SCAN_CONFIG.maxUploadBytes);
      const embedding = await imageToEmbedding(bytes);
      const { error: saveError } = await admin.from("scan_reference_index").update({
        embedding: `[${embedding.join(",")}]`,
        status: "ready",
        model_version: SCAN_CONFIG.modelVersion,
        error_message: null,
        indexed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
        .eq("person_id", item.person_id)
        .eq("photo_url_snapshot", item.photo_url_snapshot);

      if (saveError) throw new Error(saveError.message);
      results.push({ personId: item.person_id, status: "ready" });
    } catch (error) {
      const detail = error instanceof Error ? error.message.slice(0, 240) : "unknown_index_error";
      await admin.from("scan_reference_index").update({
        status: "failed",
        error_message: detail,
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
        .eq("person_id", item.person_id)
        .eq("photo_url_snapshot", item.photo_url_snapshot);
      results.push({ personId: item.person_id, status: "failed", detail });
    }
  }

  return json({
    processed: results.length,
    results,
    batchLimit: SCAN_CONFIG.maxReferenceImagesPerRun,
  });
}
