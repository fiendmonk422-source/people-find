import { extractionConfig } from "./config";
import { findMatricNumber, mapSourceRecord } from "./field-mapping";
import type { ExtractionBatchResponse, ExtractionResult } from "./types";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function getNested(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    const record = asRecord(current);
    return record ? record[part] : undefined;
  }, value);
}

/**
 * Queries an institution-approved API/export endpoint. This deliberately does not
 * log into individual student accounts or accept student passwords.
 */
export async function extractStudentBatch(matricNumbers: string[]): Promise<ExtractionBatchResponse> {
  const endpoint = process.env.PEOPLEFIND_LOOKUP_API_URL?.trim() || extractionConfig.endpointUrl;
  const token = process.env.PEOPLEFIND_LOOKUP_API_TOKEN?.trim();

  if (!endpoint) {
    return {
      configured: false,
      processed: 0,
      results: [],
      message: "The authorized source endpoint is not configured yet. The URL is intentionally blank.",
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(endpoint);
  } catch {
    return { configured: false, processed: 0, results: [], message: "The source endpoint URL is invalid." };
  }
  if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost" && parsedUrl.hostname !== "127.0.0.1") {
    return { configured: false, processed: 0, results: [], message: "The source endpoint must use HTTPS." };
  }

  const uniqueMatricNumbers = [...new Set(matricNumbers.map((item) => item.trim()).filter(Boolean))]
    .slice(0, extractionConfig.maxBatchSize);
  if (!uniqueMatricNumbers.length) {
    return { configured: true, processed: 0, results: [], message: "Provide at least one matric number." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), extractionConfig.requestTimeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ matricNumbers: uniqueMatricNumbers }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        configured: true, processed: 0, results: [],
        message: `Source endpoint returned HTTP ${response.status}. Check its approved API configuration.`,
      };
    }

    const payload: unknown = await response.json();
    const list = getNested(payload, extractionConfig.resultsProperty);
    if (!Array.isArray(list)) {
      return {
        configured: true, processed: 0, results: [],
        message: `Source response must contain an array at "${extractionConfig.resultsProperty}".`,
      };
    }

    const byMatric = new Map<string, UnknownRecord>();
    for (const item of list) {
      const record = asRecord(item);
      if (!record) continue;
      const matric = findMatricNumber(record);
      if (matric) byMatric.set(matric.toLowerCase(), record);
    }

    const results: ExtractionResult[] = uniqueMatricNumbers.map((matricNumber) => {
      const source = byMatric.get(matricNumber.toLowerCase());
      if (!source) {
        return {
          matricNumber, status: "failed", data: {},
          error: "No record was returned for this matric number.",
          sourceUrl: parsedUrl.origin, collectedAt: new Date().toISOString(),
        };
      }
      const data = mapSourceRecord(source);
      const hasData = Object.values(data).some((value) => Boolean(value));
      return {
        matricNumber,
        status: hasData ? "collected" : "review",
        data,
        error: hasData ? "" : "A matching record was returned, but no recognized student fields were found.",
        sourceUrl: parsedUrl.origin,
        collectedAt: new Date().toISOString(),
      };
    });
    return {
      configured: true,
      processed: results.length,
      results,
      message: `Processed ${results.length} matric number(s). Review the results before importing them.`,
    };
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "The source endpoint timed out."
      : "Could not reach the source endpoint. Check its availability and network access.";
    return { configured: true, processed: 0, results: [], message };
  } finally {
    clearTimeout(timeout);
  }
}
