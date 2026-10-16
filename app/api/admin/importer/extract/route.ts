import { NextRequest, NextResponse } from "next/server";
import { extractStudentBatch } from "@/lib/csv-importer/extraction/extractor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Keep extraction off public routes. The approved admin session check must be
  // wired to this project's existing authorization helper before production use.
  const adminKey = process.env.PEOPLEFIND_IMPORTER_ADMIN_KEY;
  const suppliedKey = request.headers.get("x-peoplefind-importer-key");
  if (!adminKey || !suppliedKey || suppliedKey !== adminKey) {
    return NextResponse.json(
      { configured: false, processed: 0, results: [], message: "Importer authorization is not configured or was rejected." },
      { status: 401, headers: { "cache-control": "no-store" } },
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
