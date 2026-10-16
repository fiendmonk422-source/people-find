import { NextRequest, NextResponse } from "next/server";
import { extractStudentBatch } from "@/lib/csv-importer/extraction/extractor";
import { getAdminContext, adminApiError } from "@/lib/admin/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const access = await getAdminContext();
  const authError = await adminApiError(access);
  if (authError) {
    return NextResponse.json(
      await authError.json(),
      { status: authError.status, headers: { "cache-control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !Array.isArray((body as { matricNumbers?: unknown }).matricNumbers)) {
    return NextResponse.json({ message: "Send { matricNumbers: string[] }." }, { status: 400 });
  }

  const raw = (body as { matricNumbers: unknown[] }).matricNumbers;
  if (raw.some((value) => typeof value !== "string")) {
    return NextResponse.json({ message: "Every matric number must be a string." }, { status: 400 });
  }

  const result = await extractStudentBatch(raw as string[]);
  return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
}