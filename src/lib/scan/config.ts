/** Server-only configuration for Scan-to-Find. */
const configuredDistance = Number(process.env.SCAN_MAX_DISTANCE ?? "0.28");

export const SCAN_CONFIG = {
  maxUploadBytes: 8 * 1024 * 1024,
  maxImagePixels: 40_000_000,
  maxReferenceImagesPerRun: 10,
  resultLimit: 5,
  // Keep the value inside the valid cosine-distance range if the env var is malformed.
  maxDistance: Number.isFinite(configuredDistance) && configuredDistance >= 0 && configuredDistance <= 2
    ? configuredDistance
    : 0.28,
  embeddingDimensions: 512,
  modelVersion: "Xenova/clip-vit-base-patch32",
} as const;
